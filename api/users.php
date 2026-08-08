<?php
require_once __DIR__ . '/db.php';

$pdo = getPDO();
$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? $_POST['action'] ?? '';

if ($method === 'GET' && ($action === 'list' || $action === '')) {
    $stmt = $pdo->query("SELECT id, name, team, role, online, status_color as statusColor, pic, bio, favorite_game as favoriteGame, can_create_forums as canCreateForums, last_seen as lastSeen, twitter, instagram, tiktok, discord, youtube FROM users WHERE role != 'admin' ORDER BY id ASC");
    $users = $stmt->fetchAll();

    foreach ($users as &$u) {
        $u['id'] = (int)$u['id'];
        // Online = last_seen within 5 minutes
        $u['online'] = !empty($u['lastSeen']) && (time() - strtotime($u['lastSeen'])) < 300;
        $u['canCreateForums'] = (bool)$u['canCreateForums'];
    }

    jsonResponse($users);
}

if ($method === 'GET' && $action === 'get') {
    $id = (int)($_GET['id'] ?? 0);
    if (!$id) jsonResponse(['error' => 'User ID is required.'], 400);

    $stmt = $pdo->prepare("SELECT id, name, team, role, online, status_color as statusColor, pic, bio, favorite_game as favoriteGame, can_create_forums as canCreateForums, last_seen as lastSeen, twitter, instagram, tiktok, discord, youtube FROM users WHERE id = ?");
    $stmt->execute([$id]);
    $user = $stmt->fetch();

    if (!$user) jsonResponse(['error' => 'User not found.'], 404);

    $user['id'] = (int)$user['id'];
    $user['online'] = !empty($user['lastSeen']) && (time() - strtotime($user['lastSeen'])) < 300;
    $user['canCreateForums'] = (bool)$user['canCreateForums'];

    jsonResponse($user);
}

if ($method === 'DELETE' || $action === 'delete') {
    $id = (int)($_GET['id'] ?? getJsonInput()['id'] ?? 0);
    if (!$id) {
        jsonResponse(['error' => 'User ID is required.'], 400);
    }

    $stmt = $pdo->prepare("DELETE FROM users WHERE id = ?");
    $stmt->execute([$id]);

    jsonResponse(['success' => true]);
}

jsonResponse(['error' => 'Invalid action.'], 400);
