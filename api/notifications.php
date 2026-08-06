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

    $stmt = $pdo->prepare("SELECT id, user_id as userId, text, is_read as isRead, created_at as createdAt FROM notifications WHERE user_id = ? ORDER BY id DESC");
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

    if ($action === 'mark_read') {
        $id = (int)($input['id'] ?? 0);
        $userId = (int)($input['userId'] ?? 0);

        if (!$id || !$userId) {
            jsonResponse(['error' => 'Notification ID and User ID are required.'], 400);
        }

        $stmt = $pdo->prepare("UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?");
        $stmt->execute([$id, $userId]);

        jsonResponse(['success' => true]);
    }

    if ($action === 'mark_all_read') {
        $userId = (int)($input['userId'] ?? 0);

        if (!$userId) {
            jsonResponse(['error' => 'User ID is required.'], 400);
        }

        $stmt = $pdo->prepare("UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0");
        $stmt->execute([$userId]);

        jsonResponse(['success' => true, 'marked' => $stmt->rowCount()]);
    }
}

jsonResponse(['error' => 'Invalid action.'], 400);
