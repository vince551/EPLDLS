<?php
require_once __DIR__ . '/db.php';

try {
    $pdo = getPDO();
    $method = $_SERVER['REQUEST_METHOD'];
    $action = $_GET['action'] ?? $_POST['action'] ?? '';

    if ($method === 'GET' || $action === 'list') {
        $tournId = $_GET['tourn_id'] ?? $_GET['tournId'] ?? null;
        $stage = $_GET['stage'] ?? null;
        
        $sql = "SELECT id, tourn_id as tournId, home_team as home, away_team as away, match_date as date, weekday, match_time as time, played, home_score as homeScore, away_score as awayScore, stage, group_name as groupName, bracket_position as bracketPosition, score_edit_count as scoreEditCount, score_submitted_at as scoreSubmittedAt FROM fixtures";
        $params = [];
        
        if ($tournId) {
            $sql .= " WHERE tourn_id = ?";
            $params[] = $tournId;
        }
        
        if ($stage) {
            $sql .= ($tournId ? " AND" : " WHERE") . " stage = ?";
            $params[] = $stage;
        }
        
        $sql .= " ORDER BY match_date ASC, match_time ASC";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $fixtures = $stmt->fetchAll();
        
        foreach ($fixtures as &$f) {
            $f['id'] = (int)$f['id'];
            $f['tournId'] = (int)$f['tournId'];
            $f['played'] = (bool)$f['played'];
            $f['homeScore'] = $f['homeScore'] !== null ? (int)$f['homeScore'] : null;
            $f['awayScore'] = $f['awayScore'] !== null ? (int)$f['awayScore'] : null;
            if ($f['bracketPosition']) $f['bracketPosition'] = (int)$f['bracketPosition'];
            $f['scoreEditCount'] = (int)($f['scoreEditCount'] ?? 0);
            $f['scoreSubmittedAt'] = $f['scoreSubmittedAt'] ?: null;
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
            $stage = trim($input['stage'] ?? 'GROUP_STAGE');
            $groupName = trim($input['groupName'] ?? null) ?: null;

            if (!$tournId || !$home || !$away || !$date || !$time) {
                jsonResponse(['error' => 'All fixture fields are required.'], 400);
            }

            if ($home === $away) {
                jsonResponse(['error' => 'Home team and Away team cannot be the same.'], 400);
            }

            $stmt = $pdo->prepare("INSERT INTO fixtures (tourn_id, home_team, away_team, match_date, weekday, match_time, played, stage, group_name) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)");
            $stmt->execute([$tournId, $home, $away, $date, $weekday, $time, $stage, $groupName]);
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

            $fixStmt = $pdo->prepare("SELECT * FROM fixtures WHERE id = ?");
            $fixStmt->execute([$fixId]);
            $fixture = $fixStmt->fetch();
            if (!$fixture) {
                jsonResponse(['error' => 'Fixture not found'], 404);
            }

            $stmt = $pdo->prepare("UPDATE fixtures SET played = 1, home_score = ?, away_score = ?, score_submitted_at = CURRENT_TIMESTAMP WHERE id = ?");
            $stmt->execute([$homeScore, $awayScore, $fixId]);

            // Update group standings if group stage
            if ($fixture['stage'] === 'GROUP_STAGE') {
                require_once __DIR__ . '/bracket.php';
                updateGroupStandings($pdo, $fixture['tourn_id'], $fixture, $homeScore, $awayScore);
            }

            // Advance winner if knockout stage
            if ($fixture['next_fixture_id']) {
                require_once __DIR__ . '/bracket.php';
                if ($homeScore > $awayScore) {
                    advanceWinner($pdo, $fixture['next_fixture_id'], $fixture['home_team'], $fixture['winner_slot']);
                } elseif ($awayScore > $homeScore) {
                    advanceWinner($pdo, $fixture['next_fixture_id'], $fixture['away_team'], $fixture['winner_slot']);
                }
            }

            // Get fixture details for notification
            $notifText = "Match Result: {$fixture['home_team']} {$homeScore} - {$awayScore} {$fixture['away_team']}";
            // Send notification to all users
            $usersStmt = $pdo->query("SELECT id FROM users");
            $users = $usersStmt->fetchAll();
            $notifInsert = $pdo->prepare("INSERT INTO notifications (user_id, text) VALUES (?, ?)");
            foreach ($users as $u) {
                $notifInsert->execute([$u['id'], $notifText]);
            }

            jsonResponse(['success' => true]);
        }

        if ($action === 'update_score') {
            $fixId = (int)($input['id'] ?? 0);
            $newHomeScore = (int)($input['homeScore'] ?? 0);
            $newAwayScore = (int)($input['awayScore'] ?? 0);

            if (!$fixId) {
                jsonResponse(['error' => 'Fixture ID is required.'], 400);
            }

            $fixStmt = $pdo->prepare("SELECT * FROM fixtures WHERE id = ?");
            $fixStmt->execute([$fixId]);
            $fixture = $fixStmt->fetch();
            if (!$fixture) {
                jsonResponse(['error' => 'Fixture not found'], 404);
            }

            if (!$fixture['played']) {
                jsonResponse(['error' => 'This fixture has not been played yet. Use submit_score instead.'], 400);
            }

            $submittedAt = $fixture['score_submitted_at'];
            if (!$submittedAt) {
                jsonResponse(['error' => 'No submission timestamp recorded. Scores cannot be edited.'], 403);
            }

            $submittedTime = strtotime($submittedAt);
            if (!$submittedTime || (time() - $submittedTime) > 1800) {
                jsonResponse(['error' => 'Scores can only be edited within 30 minutes of initial saving.'], 403);
            }

            $oldHomeScore = (int)$fixture['home_score'];
            $oldAwayScore = (int)$fixture['away_score'];

            // Reverse old standings if group stage
            if ($fixture['stage'] === 'GROUP_STAGE') {
                require_once __DIR__ . '/bracket.php';
                reverseGroupStandings($pdo, $fixture['tourn_id'], $fixture, $oldHomeScore, $oldAwayScore);
            }

            // Update scores
            $stmt = $pdo->prepare("UPDATE fixtures SET home_score = ?, away_score = ? WHERE id = ?");
            $stmt->execute([$newHomeScore, $newAwayScore, $fixId]);

            // Apply new standings if group stage
            if ($fixture['stage'] === 'GROUP_STAGE') {
                if (!function_exists('updateGroupStandings')) {
                    require_once __DIR__ . '/bracket.php';
                }
                updateGroupStandings($pdo, $fixture['tourn_id'], $fixture, $newHomeScore, $newAwayScore);
            }

            // Re-advance winner if knockout stage
            if ($fixture['next_fixture_id']) {
                if (!function_exists('advanceWinner')) {
                    require_once __DIR__ . '/bracket.php';
                }
                if ($newHomeScore > $newAwayScore) {
                    advanceWinner($pdo, $fixture['next_fixture_id'], $fixture['home_team'], $fixture['winner_slot']);
                } elseif ($newAwayScore > $newHomeScore) {
                    advanceWinner($pdo, $fixture['next_fixture_id'], $fixture['away_team'], $fixture['winner_slot']);
                }
            }

            // Send updated result notification
            $notifText = "Score Updated: {$fixture['home_team']} {$newHomeScore} - {$newAwayScore} {$fixture['away_team']} (was {$oldHomeScore} - {$oldAwayScore})";
            $usersStmt = $pdo->query("SELECT id FROM users");
            $users = $usersStmt->fetchAll();
            $notifInsert = $pdo->prepare("INSERT INTO notifications (user_id, text) VALUES (?, ?)");
            foreach ($users as $u) {
                $notifInsert->execute([$u['id'], $notifText]);
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

} catch (Throwable $t) {
    error_log("[fixtures.php] Exception: " . $t->getMessage());
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Server error']);
    exit();
}
