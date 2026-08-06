<?php
require_once __DIR__ . '/db.php';

$pdo = getPDO();
$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? $_POST['action'] ?? '';

if ($method === 'GET' || $action === 'list') {
    $stmt = $pdo->query("SELECT id, tourn_id as tournId, home_team as home, away_team as away, match_date as date, weekday, match_time as time, played, home_score as homeScore, away_score as awayScore FROM fixtures ORDER BY match_date ASC, match_time ASC");
    $fixtures = $stmt->fetchAll();
    foreach ($fixtures as &$f) {
        $f['id'] = (int)$f['id'];
        $f['tournId'] = (int)$f['tournId'];
        $f['played'] = (bool)$f['played'];
        $f['homeScore'] = $f['homeScore'] !== null ? (int)$f['homeScore'] : null;
        $f['awayScore'] = $f['awayScore'] !== null ? (int)$f['awayScore'] : null;
    }
    jsonResponse($fixtures);
}

if ($method === 'POST') {
    $input = getJsonInput();

    if ($action === 'create') {
        $tournId = (int)($input['tournId'] ?? 0);
        $home = trim($input['home'] ?? '');
        $away = trim($input['away'] ?? '');
        $date = trim($input['date'] ?? '');
        $weekday = trim($input['weekday'] ?? 'Thursday');
        $time = trim($input['time'] ?? '');

        if (!$tournId || !$home || !$away || !$date || !$time) {
            jsonResponse(['error' => 'All fixture fields are required.'], 400);
        }

        if ($home === $away) {
            jsonResponse(['error' => 'Home team and Away team cannot be the same.'], 400);
        }

        $stmt = $pdo->prepare("INSERT INTO fixtures (tourn_id, home_team, away_team, match_date, weekday, match_time, played) VALUES (?, ?, ?, ?, ?, ?, 0)");
        $stmt->execute([$tournId, $home, $away, $date, $weekday, $time]);
        $newId = (int)$pdo->lastInsertId();

        jsonResponse(['success' => true, 'id' => $newId]);
    }

    if ($action === 'update') {
        $id = (int)($input['id'] ?? 0);
        $tournId = (int)($input['tournId'] ?? 0);
        $home = trim($input['home'] ?? '');
        $away = trim($input['away'] ?? '');
        $date = trim($input['date'] ?? '');
        $time = trim($input['time'] ?? '');

        if (!$id || !$tournId || !$home || !$away || !$date || !$time) {
            jsonResponse(['error' => 'All fixture fields are required.'], 400);
        }

        if ($home === $away) {
            jsonResponse(['error' => 'Home team and Away team cannot be the same.'], 400);
        }

        $weekday = trim($input['weekday'] ?? '');
        if (!$weekday) {
            $ts = strtotime($date);
            $weekday = $ts ? date('l', $ts) : 'Thursday';
        }

        $stmt = $pdo->prepare("UPDATE fixtures SET tourn_id = ?, home_team = ?, away_team = ?, match_date = ?, weekday = ?, match_time = ? WHERE id = ?");
        $stmt->execute([$tournId, $home, $away, $date, $weekday, $time, $id]);

        jsonResponse(['success' => true]);
    }

    if ($action === 'submit_score') {
        $fixId = (int)($input['id'] ?? 0);
        $homeScore = (int)($input['homeScore'] ?? 0);
        $awayScore = (int)($input['awayScore'] ?? 0);

        if (!$fixId) {
            jsonResponse(['error' => 'Fixture ID is required.'], 400);
        }

        $stmt = $pdo->prepare("UPDATE fixtures SET played = 1, home_score = ?, away_score = ? WHERE id = ?");
        $stmt->execute([$homeScore, $awayScore, $fixId]);

        // Get fixture details
        $fixStmt = $pdo->prepare("SELECT home_team, away_team FROM fixtures WHERE id = ?");
        $fixStmt->execute([$fixId]);
        $fix = $fixStmt->fetch();

        if ($fix) {
            $notifText = "Match Result: {$fix['home_team']} {$homeScore} - {$awayScore} {$fix['away_team']}";
            // Send notification to all regular users
            $usersStmt = $pdo->query("SELECT id FROM users WHERE role != 'admin'");
            $users = $usersStmt->fetchAll();
            $notifInsert = $pdo->prepare("INSERT INTO notifications (user_id, text) VALUES (?, ?)");
            foreach ($users as $u) {
                $notifInsert->execute([$u['id'], $notifText]);
            }
        }

        jsonResponse(['success' => true]);
    }
}

if ($method === 'DELETE' || $action === 'delete') {
    $id = (int)($_GET['id'] ?? getJsonInput()['id'] ?? 0);
    if (!$id) {
        jsonResponse(['error' => 'Fixture ID is required.'], 400);
    }

    $stmt = $pdo->prepare("DELETE FROM fixtures WHERE id = ?");
    $stmt->execute([$id]);

    jsonResponse(['success' => true]);
}

jsonResponse(['error' => 'Invalid action.'], 400);
