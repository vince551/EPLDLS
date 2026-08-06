<?php
require_once __DIR__ . '/db.php';

try {
    $pdo = getPDO();
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    $action = $_GET['action'] ?? $_POST['action'] ?? '';

    // Check if user is admin
    $authToken = $_GET['token'] ?? $_POST['token'] ?? '';
    // Note: Implement proper auth check here based on your auth system
    // For now, assuming this is called from trusted admin frontend

    // ========== GET TOURNAMENT SUMMARY ==========
    if ($method === 'GET' && $action === 'summary') {
        $tournId = (int)($_GET['tourn_id'] ?? 0);
        if (!$tournId) {
            jsonResponse(['error' => 'Tournament ID required'], 400);
        }

        $tStmt = $pdo->prepare("SELECT * FROM tournaments WHERE id = ?");
        $tStmt->execute([$tournId]);
        $tournament = $tStmt->fetch();

        $groupsStmt = $pdo->prepare("SELECT DISTINCT group_name, COUNT(*) as team_count FROM tournament_standings WHERE tourn_id = ? GROUP BY group_name");
        $groupsStmt->execute([$tournId]);
        $groups = $groupsStmt->fetchAll();

        $fixturesStmt = $pdo->prepare("SELECT stage, COUNT(*) as total, SUM(played) as completed FROM fixtures WHERE tourn_id = ? GROUP BY stage");
        $fixturesStmt->execute([$tournId]);
        $fixturesByStage = $fixturesStmt->fetchAll();

        $qualifiedStmt = $pdo->prepare("SELECT COUNT(*) as total FROM tournament_standings WHERE tourn_id = ? AND qualified_to_knockout = 1");
        $qualifiedStmt->execute([$tournId]);
        $qualifiedCount = $qualifiedStmt->fetch()['total'];

        jsonResponse([
            'tournament' => $tournament,
            'groups' => $groups,
            'fixturesByStage' => $fixturesByStage,
            'qualifiedTeams' => $qualifiedCount
        ]);
    }

    // ========== GET TEAMS FOR KNOCKOUT ==========
    if ($method === 'GET' && $action === 'get_qualified_teams') {
        $tournId = (int)($_GET['tourn_id'] ?? 0);
        if (!$tournId) {
            jsonResponse(['error' => 'Tournament ID required'], 400);
        }

        $stmt = $pdo->prepare("SELECT team_name, group_name, points, wins, draws, losses, goals_for, goals_against FROM tournament_standings WHERE tourn_id = ? AND qualified_to_knockout = 1 ORDER BY group_name, points DESC");
        $stmt->execute([$tournId]);
        $teams = $stmt->fetchAll();

        jsonResponse($teams);
    }

    // ========== REGENERATE KNOCKOUT BRACKET ==========
    if ($method === 'POST' && $action === 'regenerate_knockout') {
        $tournId = (int)(getJsonInput()['tourn_id'] ?? 0);
        if (!$tournId) {
            jsonResponse(['error' => 'Tournament ID required'], 400);
        }

        // Get qualified teams
        $stmt = $pdo->prepare("SELECT team_name FROM tournament_standings WHERE tourn_id = ? AND qualified_to_knockout = 1 ORDER BY group_name, points DESC");
        $stmt->execute([$tournId]);
        $teams = $stmt->fetchAll(PDO::FETCH_COLUMN);

        if (empty($teams)) {
            jsonResponse(['error' => 'No qualified teams found'], 400);
        }

        // Delete existing knockout fixtures
        $pdo->prepare("DELETE FROM fixtures WHERE tourn_id = ? AND stage != 'GROUP_STAGE'")
            ->execute([$tournId]);

        // Regenerate
        require_once __DIR__ . '/bracket.php';
        $count = generateKnockoutFixtures($pdo, $tournId, $teams);

        jsonResponse(['success' => true, 'fixtures_created' => $count]);
    }

    // ========== EDIT FIXTURE DATE & TIME ==========
    if ($method === 'POST' && $action === 'edit_fixture') {
        $input = getJsonInput();
        $fixtureId = (int)($input['id'] ?? 0);
        $matchDate = trim($input['date'] ?? '');
        $matchTime = trim($input['time'] ?? '');

        if (!$fixtureId || !$matchDate || !$matchTime) {
            jsonResponse(['error' => 'Fixture ID, date, and time required'], 400);
        }

        $weekday = $input['weekday'] ?? date('l', strtotime($matchDate));
        
        $pdo->prepare("UPDATE fixtures SET match_date = ?, weekday = ?, match_time = ? WHERE id = ?")
            ->execute([$matchDate, $weekday, $matchTime, $fixtureId]);

        jsonResponse(['success' => true]);
    }

    // ========== FORCE ADVANCE WINNER (in case of penalty shootout or special case) ==========
    if ($method === 'POST' && $action === 'force_advance_winner') {
        $input = getJsonInput();
        $fixtureId = (int)($input['fixture_id'] ?? 0);
        $winnerName = trim($input['winner_name'] ?? '');

        if (!$fixtureId || !$winnerName) {
            jsonResponse(['error' => 'Fixture ID and winner name required'], 400);
        }

        $fStmt = $pdo->prepare("SELECT * FROM fixtures WHERE id = ?");
        $fStmt->execute([$fixtureId]);
        $fixture = $fStmt->fetch();

        if (!$fixture) {
            jsonResponse(['error' => 'Fixture not found'], 404);
        }

        if (!$fixture['next_fixture_id']) {
            jsonResponse(['error' => 'No next fixture to advance to'], 400);
        }

        require_once __DIR__ . '/bracket.php';
        advanceWinner($pdo, $fixture['next_fixture_id'], $winnerName, $fixture['winner_slot']);

        // Mark fixture as played with admin note
        $pdo->prepare("UPDATE fixtures SET played = 1 WHERE id = ?")
            ->execute([$fixtureId]);

        jsonResponse(['success' => true, 'message' => "$winnerName advanced to next round"]);
    }

    // ========== COMPLETE TOURNAMENT ==========
    if ($method === 'POST' && $action === 'complete_tournament') {
        $tournId = (int)(getJsonInput()['tourn_id'] ?? 0);
        if (!$tournId) {
            jsonResponse(['error' => 'Tournament ID required'], 400);
        }

        // Mark final match as played
        $finalStmt = $pdo->prepare("SELECT id FROM fixtures WHERE tourn_id = ? AND stage = 'FINAL' LIMIT 1");
        $finalStmt->execute([$tournId]);
        $final = $finalStmt->fetch();

        if ($final && !$final['played']) {
            jsonResponse(['error' => 'Final match must be played first'], 400);
        }

        $pdo->prepare("UPDATE tournaments SET status = 'completed' WHERE id = ?")
            ->execute([$tournId]);

        // Get winner
        $winnerStmt = $pdo->prepare("SELECT home_team, away_team, home_score, away_score FROM fixtures WHERE tourn_id = ? AND stage = 'FINAL'");
        $winnerStmt->execute([$tournId]);
        $final = $winnerStmt->fetch();

        $winner = ($final['home_score'] > $final['away_score']) ? $final['home_team'] : $final['away_team'];

        jsonResponse(['success' => true, 'champion' => $winner]);
    }

    jsonResponse(['error' => 'Invalid action'], 400);

} catch (Throwable $t) {
    error_log("[admin_tournament.php] Exception: " . $t->getMessage());
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Server error']);
    exit();
}
