<?php
require_once __DIR__ . '/db.php';

$pdo = getPDO();
$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? $_POST['action'] ?? '';

// LIST MESSAGES (and auto-mark received ones as read)
if ($method === 'GET' && ($action === 'list' || $action === '')) {
    $userId = (int)($_GET['user_id'] ?? $_GET['userId'] ?? 0);
    $friendId = (int)($_GET['friend_id'] ?? $_GET['friendId'] ?? 0);

    if (!$userId || !$friendId) {
        jsonResponse([]);
    }

    // Auto-mark incoming messages from friend as read
    $markStmt = $pdo->prepare("UPDATE messages SET is_read = 1, read_at = NOW() WHERE sender_id = ? AND receiver_id = ? AND is_read = 0");
    $markStmt->execute([$friendId, $userId]);

    // Fetch conversation messages
    $stmt = $pdo->prepare("SELECT id, sender_id as senderId, receiver_id as receiverId, message, is_read as isRead, read_at as readAt, sent_at as timestamp FROM messages WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?) ORDER BY sent_at ASC");
    $stmt->execute([$userId, $friendId, $friendId, $userId]);
    $messages = $stmt->fetchAll();

    foreach ($messages as &$m) {
        $m['id'] = (int)$m['id'];
        $m['senderId'] = (int)$m['senderId'];
        $m['receiverId'] = (int)$m['receiverId'];
        $m['isRead'] = (bool)$m['isRead'];
    }

    jsonResponse($messages);
}

// GET UNREAD MESSAGE COUNTS PER FRIEND
if ($method === 'GET' && $action === 'unread_counts') {
    $userId = (int)($_GET['user_id'] ?? $_GET['userId'] ?? 0);
    if (!$userId) {
        jsonResponse(['total' => 0, 'byFriend' => (object)[]]);
    }

    $stmt = $pdo->prepare("SELECT sender_id, COUNT(*) as unread_count FROM messages WHERE receiver_id = ? AND is_read = 0 GROUP BY sender_id");
    $stmt->execute([$userId]);
    $rows = $stmt->fetchAll();

    $byFriend = [];
    $total = 0;
    foreach ($rows as $r) {
        $fId = (int)$r['sender_id'];
        $cnt = (int)$r['unread_count'];
        $byFriend[$fId] = $cnt;
        $total += $cnt;
    }

    jsonResponse(['total' => $total, 'byFriend' => (object)$byFriend]);
}

// GET CONVERSATIONS OVERVIEW (FOR CHAT INBOX LIST)
if ($method === 'GET' && $action === 'conversations') {
    $userId = (int)($_GET['user_id'] ?? $_GET['userId'] ?? 0);
    if (!$userId) {
        jsonResponse([]);
    }

    // Get all friends first
    $fStmt = $pdo->prepare("SELECT user_id, friend_id FROM friends WHERE (user_id = ? OR friend_id = ?) AND status = 'accepted'");
    $fStmt->execute([$userId, $userId]);
    $fRows = $fStmt->fetchAll();

    $friendIds = [];
    foreach ($fRows as $r) {
        $uId = (int)$r['user_id'];
        $fId = (int)$r['friend_id'];
        $friendIds[] = ($uId === $userId) ? $fId : $uId;
    }

    if (empty($friendIds)) {
        jsonResponse([]);
    }

    // Fetch friend profiles
    $inClause = implode(',', array_fill(0, count($friendIds), '?'));
    $uStmt = $pdo->prepare("SELECT id, name, team, online, status_color as statusColor, pic, bio, favorite_game as favoriteGame, last_seen as lastSeen, typing_to, typing_at FROM users WHERE id IN ($inClause)");
    $uStmt->execute($friendIds);
    $friends = $uStmt->fetchAll();

    // Map each friend with last message & unread count
    $result = [];
    foreach ($friends as $f) {
        $fId = (int)$f['id'];

        // Last message
        $lastStmt = $pdo->prepare("SELECT message, sender_id, sent_at, is_read FROM messages WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?) ORDER BY sent_at DESC LIMIT 1");
        $lastStmt->execute([$userId, $fId, $fId, $userId]);
        $lastMsg = $lastStmt->fetch();

        // Unread count from this friend
        $unStmt = $pdo->prepare("SELECT COUNT(*) FROM messages WHERE sender_id = ? AND receiver_id = ? AND is_read = 0");
        $unStmt->execute([$fId, $userId]);
        $unreadCount = (int)$unStmt->fetchColumn();

        $f['id'] = $fId;
        $f['online'] = (bool)$f['online'];
        $f['lastMessage'] = $lastMsg ? $lastMsg['message'] : '';
        $f['lastMessageTime'] = $lastMsg ? $lastMsg['sent_at'] : '';
        $f['lastMessageIsMine'] = $lastMsg ? ((int)$lastMsg['sender_id'] === $userId) : false;
        $f['lastMessageIsRead'] = $lastMsg ? (bool)$lastMsg['is_read'] : false;
        $f['unreadCount'] = $unreadCount;
        $f['isTyping'] = ($f['typing_to'] == $userId && strtotime($f['typing_at']) >= time() - 10);

        $result[] = $f;
    }

    // Sort by most recent message timestamp
    usort($result, function($a, $b) {
        return strtotime($b['lastMessageTime'] ?: '1970-01-01') - strtotime($a['lastMessageTime'] ?: '1970-01-01');
    });

    jsonResponse($result);
}

// POST ACTIONS
if ($method === 'POST') {
    $input = getJsonInput();

    // SEND MESSAGE
    if ($action === 'send') {
        $senderId = (int)($input['senderId'] ?? 0);
        $receiverId = (int)($input['receiverId'] ?? 0);
        $message = trim($input['message'] ?? '');

        if (!$senderId || !$receiverId || !$message) {
            jsonResponse(['error' => 'Sender, receiver, and message text are required.'], 400);
        }

        $stmt = $pdo->prepare("INSERT INTO messages (sender_id, receiver_id, message, is_read) VALUES (?, ?, ?, 0)");
        $stmt->execute([$senderId, $receiverId, $message]);
        $newId = (int)$pdo->lastInsertId();

        $msg = [
            'id' => $newId,
            'senderId' => $senderId,
            'receiverId' => $receiverId,
            'message' => $message,
            'isRead' => false,
            'readAt' => null,
            'timestamp' => date('Y-m-d H:i:s')
        ];

        jsonResponse(['success' => true, 'message' => $msg]);
    }

    // MARK MESSAGES AS READ
    if ($action === 'mark_read') {
        $userId = (int)($input['userId'] ?? 0);
        $senderId = (int)($input['senderId'] ?? 0);

        if (!$userId || !$senderId) {
            jsonResponse(['error' => 'User ID and Sender ID are required.'], 400);
        }

        $stmt = $pdo->prepare("UPDATE messages SET is_read = 1, read_at = NOW() WHERE sender_id = ? AND receiver_id = ? AND is_read = 0");
        $stmt->execute([$senderId, $userId]);

        jsonResponse(['success' => true]);
    }

    // SET TYPING STATUS
    if ($action === 'typing') {
        $userId = (int)($input['userId'] ?? 0);
        $friendId = (int)($input['friendId'] ?? 0);
        $isTyping = (bool)($input['isTyping'] ?? false);

        if (!$userId) jsonResponse(['error' => 'User ID required'], 400);

        if ($isTyping && $friendId) {
            $stmt = $pdo->prepare("UPDATE users SET typing_to = ?, typing_at = NOW() WHERE id = ?");
            $stmt->execute([$friendId, $userId]);
        } else {
            $stmt = $pdo->prepare("UPDATE users SET typing_to = NULL, typing_at = NULL WHERE id = ?");
            $stmt->execute([$userId]);
        }
        jsonResponse(['success' => true]);
    }
}

jsonResponse(['error' => 'Invalid action or request method.'], 400);
