<?php
require_once __DIR__ . '/db.php';

$pdo = getPDO();
$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? $_POST['action'] ?? '';

if ($method === 'GET' || $action === 'list') {
    $gameId = isset($_GET['game_id']) ? (int)$_GET['game_id'] : (isset($_GET['gameId']) ? (int)$_GET['gameId'] : null);

    if ($gameId !== null && $gameId > 0) {
        $stmt = $pdo->prepare("SELECT t.id, t.game_id as gameId, t.name, t.rules, t.bg_image as bgImage, g.name as gameName, g.icon as gameIcon FROM tournaments t LEFT JOIN games g ON t.game_id = g.id WHERE t.game_id = ? ORDER BY t.id DESC");
        $stmt->execute([$gameId]);
    } else {
        $stmt = $pdo->query("SELECT t.id, t.game_id as gameId, t.name, t.rules, t.bg_image as bgImage, g.name as gameName, g.icon as gameIcon FROM tournaments t LEFT JOIN games g ON t.game_id = g.id ORDER BY t.id DESC");
    }

    $tournaments = $stmt->fetchAll();
    foreach ($tournaments as &$t) {
        $t['id'] = (int)$t['id'];
        $t['gameId'] = $t['gameId'] ? (int)$t['gameId'] : 1;
    }
    jsonResponse($tournaments);
}

if ($method === 'POST') {
    $input = getJsonInput();

    if ($action === 'create') {
        $name = trim($input['name'] ?? '');
        $gameId = (int)($input['gameId'] ?? $input['game_id'] ?? 1);
        $rules = trim($input['rules'] ?? '');
        $bgImage = trim($input['bgImage'] ?? '');

        if (!$name) {
            jsonResponse(['error' => 'Tournament name is required.'], 400);
        }

        $stmt = $pdo->prepare("INSERT INTO tournaments (game_id, name, rules, bg_image) VALUES (?, ?, ?, ?)");
        $stmt->execute([$gameId, $name, $rules, $bgImage]);
        $newId = (int)$pdo->lastInsertId();

        jsonResponse(['success' => true, 'id' => $newId]);
    }
}

if ($method === 'DELETE' || $action === 'delete') {
    $id = (int)($_GET['id'] ?? getJsonInput()['id'] ?? 0);
    if (!$id) {
        jsonResponse(['error' => 'Tournament ID is required.'], 400);
    }

    $stmt = $pdo->prepare("DELETE FROM tournaments WHERE id = ?");
    $stmt->execute([$id]);

    jsonResponse(['success' => true]);
}

jsonResponse(['error' => 'Invalid action.'], 400);
