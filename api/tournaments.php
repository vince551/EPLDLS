<?php
require_once __DIR__ . '/db.php';

$pdo = getPDO();
$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? $_POST['action'] ?? '';

if ($method === 'GET' || $action === 'list') {
    $stmt = $pdo->query("SELECT id, name, rules, bg_image as bgImage FROM tournaments ORDER BY id DESC");
    $tournaments = $stmt->fetchAll();
    foreach ($tournaments as &$t) {
        $t['id'] = (int)$t['id'];
    }
    jsonResponse($tournaments);
}

if ($method === 'POST') {
    $input = getJsonInput();

    if ($action === 'create') {
        $name = trim($input['name'] ?? '');
        $rules = trim($input['rules'] ?? '');
        $bgImage = trim($input['bgImage'] ?? '');

        if (!$name) {
            jsonResponse(['error' => 'Tournament name is required.'], 400);
        }

        $stmt = $pdo->prepare("INSERT INTO tournaments (name, rules, bg_image) VALUES (?, ?, ?)");
        $stmt->execute([$name, $rules, $bgImage]);
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
