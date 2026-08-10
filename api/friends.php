<?php
require_once __DIR__ . '/db.php';

$pdo = getPDO();
$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? $_POST['action'] ?? '';

if ($method === 'GET' || $action === 'list') {
    $userId = (int)($_GET['userId'] ?? 0);

    // Fetch all regular users
    $stmt = $pdo->query("SELECT id, name, team, online, status_color as statusColor, pic, last_seen as lastSeen, twitter, instagram, tiktok, discord, youtube FROM users WHERE role != 'admin' ORDER BY id ASC");
    $users = $stmt->fetchAll();

    // Fetch friends & friend requests for $userId
    $friends = [];
    $incomingRequests = [];
    $outgoingRequests = [];

    if ($userId > 0) {
        $fStmt = $pdo->prepare("SELECT user_id, friend_id, status FROM friends WHERE user_id = ? OR friend_id = ?");
        $fStmt->execute([$userId, $userId]);
        $rows = $fStmt->fetchAll();

        foreach ($rows as $r) {
            $uId = (int)$r['user_id'];
            $fId = (int)$r['friend_id'];
            $status = $r['status'];

            if ($status === 'accepted') {
                $otherId = ($uId === $userId) ? $fId : $uId;
                $friends[] = $otherId;
            } else if ($status === 'pending') {
                if ($uId === $userId) {
                    $outgoingRequests[] = $fId;
                } else {
                    $incomingRequests[] = $uId;
                }
            }
        }
    }

    foreach ($users as &$u) {
        $u['id'] = (int)$u['id'];
        $u['online'] = !empty($u['lastSeen']) && (time() - strtotime($u['lastSeen'])) < 300;
        $u['friends'] = $friends;
        $u['friendRequests'] = $incomingRequests;
        $u['outgoingRequests'] = $outgoingRequests;
    }

    jsonResponse([
        'users' => $users,
        'friends' => $friends,
        'incomingRequests' => $incomingRequests,
        'outgoingRequests' => $outgoingRequests
    ]);
}

if ($method === 'POST') {
    $input = getJsonInput();

    if ($action === 'request') {
        $userId = (int)($input['userId'] ?? 0);
        $targetId = (int)($input['targetId'] ?? 0);

        if (!$userId || !$targetId) {
            jsonResponse(['error' => 'User ID and Target ID are required.'], 400);
        }

        $stmt = $pdo->prepare("INSERT INTO friends (user_id, friend_id, status) VALUES (?, ?, 'pending') ON DUPLICATE KEY UPDATE status='pending'");
        $stmt->execute([$userId, $targetId]);

        // Get sender name
        $userStmt = $pdo->prepare("SELECT name FROM users WHERE id = ?");
        $userStmt->execute([$userId]);
        $sender = $userStmt->fetch();
        $senderName = $sender['name'] ?? 'A player';

        // Send notification
        $notifStmt = $pdo->prepare("INSERT INTO notifications (user_id, text) VALUES (?, ?)");
        $notifStmt->execute([$targetId, "{$senderName} sent you a friend request!"]);

        jsonResponse(['success' => true]);
    }

    if ($action === 'accept') {
        $userId = (int)($input['userId'] ?? 0);
        $requesterId = (int)($input['requesterId'] ?? 0);

        if (!$userId || !$requesterId) {
            jsonResponse(['error' => 'User ID and Requester ID are required.'], 400);
        }

        $stmt = $pdo->prepare("UPDATE friends SET status = 'accepted' WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)");
        $stmt->execute([$requesterId, $userId, $userId, $requesterId]);

        jsonResponse(['success' => true]);
    }
}

jsonResponse(['error' => 'Invalid action.'], 400);
