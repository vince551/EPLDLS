<?php
require_once __DIR__ . '/db.php';

$pdo = getPDO();
$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? $_POST['action'] ?? '';

// LIST GAMES
if ($method === 'GET' || $action === 'list') {
    $includeInactive = isset($_GET['all']) && $_GET['all'] == 1;
    $sql = $includeInactive ? "SELECT * FROM games ORDER BY id ASC" : "SELECT * FROM games WHERE is_active = 1 ORDER BY id ASC";
    $stmt = $pdo->query($sql);
    $games = $stmt->fetchAll();

    foreach ($games as &$g) {
        $g['id'] = (int)$g['id'];
        $g['isActive'] = (bool)$g['is_active'];
        
        // Count tournaments and forums for this game
        $tStmt = $pdo->prepare("SELECT COUNT(*) FROM tournaments WHERE game_id = ?");
        $tStmt->execute([$g['id']]);
        $g['tournamentCount'] = (int)$tStmt->fetchColumn();

        $fStmt = $pdo->prepare("SELECT COUNT(*) FROM forums WHERE game_id = ?");
        $fStmt->execute([$g['id']]);
        $g['forumCount'] = (int)$fStmt->fetchColumn();
    }

    jsonResponse($games);
}

// CREATE / EDIT / DELETE (ADMIN ACTIONS)
if ($method === 'POST') {
    $input = getJsonInput();

    if ($action === 'create') {
        $name = trim($input['name'] ?? '');
        $slug = trim($input['slug'] ?? strtolower(preg_replace('/[^a-zA-Z0-9]+/', '', $name)));
        $icon = trim($input['icon'] ?? '🎮');
        $banner = trim($input['banner'] ?? '');
        $description = trim($input['description'] ?? '');

        if (!$name) {
            jsonResponse(['error' => 'Game name is required.'], 400);
        }

        $stmt = $pdo->prepare("INSERT INTO games (name, slug, icon, banner, description, is_active) VALUES (?, ?, ?, ?, ?, 1)");
        $stmt->execute([$name, $slug, $icon, $banner, $description]);
        $newId = (int)$pdo->lastInsertId();

        jsonResponse(['success' => true, 'id' => $newId]);
    }

    if ($action === 'update') {
        $id = (int)($input['id'] ?? 0);
        $name = trim($input['name'] ?? '');
        $icon = trim($input['icon'] ?? '🎮');
        $banner = trim($input['banner'] ?? '');
        $description = trim($input['description'] ?? '');
        $isActive = isset($input['isActive']) ? ($input['isActive'] ? 1 : 0) : 1;

        if (!$id || !$name) {
            jsonResponse(['error' => 'Game ID and Name are required.'], 400);
        }

        $stmt = $pdo->prepare("UPDATE games SET name = ?, icon = ?, banner = ?, description = ?, is_active = ? WHERE id = ?");
        $stmt->execute([$name, $icon, $banner, $description, $isActive, $id]);

        jsonResponse(['success' => true]);
    }
}

if ($method === 'DELETE' || $action === 'delete') {
    $id = (int)($_GET['id'] ?? getJsonInput()['id'] ?? 0);
    if (!$id) {
        jsonResponse(['error' => 'Game ID is required.'], 400);
    }

    $stmt = $pdo->prepare("DELETE FROM games WHERE id = ?");
    $stmt->execute([$id]);

    jsonResponse(['success' => true]);
}

jsonResponse(['error' => 'Invalid action.'], 400);
