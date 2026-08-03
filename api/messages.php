<?php
require_once __DIR__ . '/db.php';

$pdo = getPDO();
$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? $_POST['action'] ?? '';

if ($method === 'GET' || $action === 'list') {
    $userId = (int)($_GET['user_id'] ?? 0);
    $friendId = (int)($_GET['friend_id'] ?? 0);

    if (!$userId || !$friendId) {
        jsonResponse([]);
    }

    $stmt = $pdo->prepare("SELECT id, sender_id as senderId, receiver_id as receiverId, message, sent_at as timestamp FROM messages WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?) ORDER BY sent_at ASC");
    $stmt->execute([$userId, $friendId, $friendId, $userId]);
    $messages = $stmt->fetchAll();

    foreach ($messages as &$m) {
        $m['id'] = (int)$m['id'];
        $m['senderId'] = (int)$m['senderId'];
        $m['receiverId'] = (int)$m['receiverId'];
    }

    jsonResponse($messages);
}

if ($method === 'POST') {
    $input = getJsonInput();

    if ($action === 'send') {
        $senderId = (int)($input['senderId'] ?? 0);
        $receiverId = (int)($input['receiverId'] ?? 0);
        $message = trim($input['message'] ?? '');

        if (!$senderId || !$receiverId || !$message) {
            jsonResponse(['error' => 'Sender, receiver, and message text are required.'], 400);
        }

        $stmt = $pdo->prepare("INSERT INTO messages (sender_id, receiver_id, message) VALUES (?, ?, ?)");
        $stmt->execute([$senderId, $receiverId, $message]);
        $newId = (int)$pdo->lastInsertId();

        $msg = [
            'id' => $newId,
            'senderId' => $senderId,
            'receiverId' => $receiverId,
            'message' => $message,
            'timestamp' => date('Y-m-d H:i:s')
        ];

        jsonResponse(['success' => true, 'message' => $msg]);
    }
}

jsonResponse(['error' => 'Invalid action.'], 400);
