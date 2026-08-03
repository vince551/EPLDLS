<?php
require_once __DIR__ . '/db.php';

$pdo = getPDO();
$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? $_POST['action'] ?? '';

if ($method === 'GET' || $action === 'list') {
    $userId = (int)($_GET['userId'] ?? 0);

    if (!$userId) {
        jsonResponse([]);
    }

    $stmt = $pdo->prepare("SELECT id, user_id as userId, text, is_read as isRead, created_at FROM notifications WHERE user_id = ? ORDER BY id DESC");
    $stmt->execute([$userId]);
    $notifs = $stmt->fetchAll();

    foreach ($notifs as &$n) {
        $n['id'] = (int)$n['id'];
        $n['userId'] = (int)$n['userId'];
        $n['isRead'] = (bool)$n['isRead'];
    }

    jsonResponse($notifs);
}

if ($method === 'POST') {
    $input = getJsonInput();

    if ($action === 'broadcast') {
        $text = trim($input['text'] ?? '');
        if (!$text) {
            jsonResponse(['error' => 'Notification text is required.'], 400);
        }

        $usersStmt = $pdo->query("SELECT id FROM users WHERE role != 'admin'");
        $users = $usersStmt->fetchAll();

        $insertStmt = $pdo->prepare("INSERT INTO notifications (user_id, text) VALUES (?, ?)");
        $broadcastText = "[Admin Broadcast]: " . $text;

        foreach ($users as $u) {
            $insertStmt->execute([$u['id'], $broadcastText]);
        }

        jsonResponse(['success' => true]);
    }
}

jsonResponse(['error' => 'Invalid action.'], 400);
