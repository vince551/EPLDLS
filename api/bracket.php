<?php
require_once __DIR__ . '/db.php';

try {
    $pdo = getPDO();
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    $action = $_GET['action'] ?? $_POST['action'] ?? '';

    // ========== GET TOURNAMENT BRACKET ==========
    if ($method === 'GET' && $action === 'get_bracket') {
        $tournId = (int)($_GET['tourn_id'] ?? $_GET['tournId'] ?? 0);
        if (!$tournId) {
            jsonResponse(['error' => 'Tournament ID required'], 400);
        }

        // Get tournament info
        $tStmt = $pdo->prepare("SELECT * FROM tournaments WHERE id = ?");
        $tStmt->execute([$tournId]);
        $tournament = $tStmt->fetch();
        if (!$tournament) {
            jsonResponse(['error' => 'Tournament not found'], 404);
        }

        // Get all fixtures organized by stage
        $fStmt = $pdo->prepare("SELECT * FROM fixtures WHERE tourn_id = ? ORDER BY stage, bracket_position, match_date");
        $fStmt->execute([$tournId]);
        $fixtures = $fStmt->fetchAll();

        // Organize by stage
        $bracket = [];
        foreach ($fixtures as $f) {
            $stage = $f['stage'] ?? 'GROUP_STAGE';
            if (!isset($bracket[$stage])) {
                $bracket[$stage] = [];
            }
            $bracket[$stage][] = $f;
        }

        // Get standings for group stage
        $standings = [];
        if ($tournament['status'] === 'group_stage' || $tournament['status'] === 'draft') {
            $sStmt = $pdo->prepare("SELECT * FROM tournament_standings WHERE tourn_id = ? ORDER BY group_name, points DESC, goal_difference DESC, team_name");
            $sStmt->execute([$tournId]);
            $standings = $sStmt->fetchAll();
        }

        jsonResponse([
            'tournament' => $tournament,
            'bracket' => $bracket,
            'standings' => $standings
        ]);
    }

    // ========== START KNOCKOUT STAGE ==========
    if ($method === 'POST' && $action === 'start_knockout_stage') {
        $tournId = (int)($_POST['tourn_id'] ?? getJsonInput()['tourn_id'] ?? 0);
        $qualifiedTeams = getJsonInput()['qualified_teams'] ?? []; // array of teams that qualified
        
        if (!$tournId || empty($qualifiedTeams)) {
            jsonResponse(['error' => 'Tournament ID and qualified teams required'], 400);
        }

        $tStmt = $pdo->prepare("SELECT * FROM tournaments WHERE id = ?");
        $tStmt->execute([$tournId]);
        $tournament = $tStmt->fetch();
        if (!$tournament) {
            jsonResponse(['error' => 'Tournament not found'], 404);
        }

        // Update tournament status
        $pdo->prepare("UPDATE tournaments SET status = ?, current_round = ? WHERE id = ?")
            ->execute(['knockout_stage', 'RO' . count($qualifiedTeams), $tournId]);

        // Generate knockout fixtures
        $fixtureCount = generateKnockoutFixtures($pdo, $tournId, $qualifiedTeams);

        jsonResponse(['success' => true, 'fixtures_created' => $fixtureCount]);
    }

    // ========== ADVANCE TEAMS FROM GROUP STAGE ==========
    if ($method === 'POST' && $action === 'advance_from_groups') {
        $tournId = (int)($_POST['tourn_id'] ?? getJsonInput()['tourn_id'] ?? 0);
        $teamsPerGroup = (int)(getJsonInput()['teams_per_group'] ?? 2); // how many teams from each group advance
        
        if (!$tournId) {
            jsonResponse(['error' => 'Tournament ID required'], 400);
        }

        // Get all groups
        $groupsStmt = $pdo->prepare("SELECT DISTINCT group_name FROM tournament_standings WHERE tourn_id = ? ORDER BY group_name");
        $groupsStmt->execute([$tournId]);
        $groups = $groupsStmt->fetchAll(PDO::FETCH_COLUMN);

        $qualifiedTeams = [];
        foreach ($groups as $groupName) {
            // Get top N teams from this group
            $topStmt = $pdo->prepare("SELECT team_name FROM tournament_standings WHERE tourn_id = ? AND group_name = ? ORDER BY points DESC, goal_difference DESC LIMIT ?");
            $topStmt->execute([$tournId, $groupName, $teamsPerGroup]);
            $topTeams = $topStmt->fetchAll(PDO::FETCH_COLUMN);
            
            foreach ($topTeams as $idx => $teamName) {
                $qualifiedTeams[] = [
                    'name' => $teamName,
                    'source_group' => $groupName,
                    'seed' => count($qualifiedTeams) + 1 // seed number for bracket placement
                ];
            }
        }

        // Mark teams as qualified in standings
        $markStmt = $pdo->prepare("UPDATE tournament_standings SET qualified_to_knockout = 1 WHERE tourn_id = ? AND team_name = ?");
        foreach ($qualifiedTeams as $team) {
            $markStmt->execute([$tournId, $team['name']]);
        }

        // Update tournament
        $pdo->prepare("UPDATE tournaments SET status = ?, current_round = ? WHERE id = ?")
            ->execute(['knockout_stage', 'RO' . count($qualifiedTeams), $tournId]);

        // Generate knockout fixtures
        $fixtureCount = generateKnockoutFixtures($pdo, $tournId, array_column($qualifiedTeams, 'name'));

        jsonResponse([
            'success' => true,
            'qualified_teams' => $qualifiedTeams,
            'fixtures_created' => $fixtureCount
        ]);
    }

    // ========== GET STANDINGS ==========
    if ($method === 'GET' && $action === 'standings') {
        $tournId = (int)($_GET['tourn_id'] ?? $_GET['tournId'] ?? 0);
        $groupName = $_GET['group'] ?? null;
        
        if (!$tournId) {
            jsonResponse(['error' => 'Tournament ID required'], 400);
        }

        $sql = "SELECT * FROM tournament_standings WHERE tourn_id = ?";
        $params = [$tournId];
        
        if ($groupName) {
            $sql .= " AND group_name = ?";
            $params[] = $groupName;
        }
        
        $sql .= " ORDER BY group_name, points DESC, goal_difference DESC";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $standings = $stmt->fetchAll();

        jsonResponse($standings);
    }

    // ========== UPDATE FIXTURE RESULT & AUTO-ADVANCE ==========
    if ($method === 'POST' && $action === 'update_fixture') {
        $fixtureId = (int)(getJsonInput()['fixture_id'] ?? 0);
        $homeScore = (int)(getJsonInput()['home_score'] ?? 0);
        $awayScore = (int)(getJsonInput()['away_score'] ?? 0);
        
        if (!$fixtureId) {
            jsonResponse(['error' => 'Fixture ID required'], 400);
        }

        $fStmt = $pdo->prepare("SELECT * FROM fixtures WHERE id = ?");
        $fStmt->execute([$fixtureId]);
        $fixture = $fStmt->fetch();
        if (!$fixture) {
            jsonResponse(['error' => 'Fixture not found'], 404);
        }

        // Update fixture result
        $updateStmt = $pdo->prepare("UPDATE fixtures SET home_score = ?, away_score = ?, played = 1 WHERE id = ?");
        $updateStmt->execute([$homeScore, $awayScore, $fixtureId]);

        $winner = null;
        if ($homeScore > $awayScore) {
            $winner = $fixture['home_team'];
            $winnerSlot = 'home';
        } elseif ($awayScore > $homeScore) {
            $winner = $fixture['away_team'];
            $winnerSlot = 'away';
        } else {
            // Draw - for now, no advancement (can be customized)
            jsonResponse(['success' => true, 'message' => 'Match is a draw']);
        }

        // If this is group stage, update standings
        if ($fixture['stage'] === 'GROUP_STAGE' || $fixture['stage'] === 'group_stage') {
            updateGroupStandings($pdo, $fixture['tourn_id'], $fixture, $homeScore, $awayScore);
        }

        // If there's a next fixture, advance winner
        if ($fixture['next_fixture_id'] && $winner) {
            advanceWinner($pdo, $fixture['next_fixture_id'], $winner, $fixture['winner_slot']);
        }

        jsonResponse(['success' => true, 'winner' => $winner]);
    }

    jsonResponse(['error' => 'Invalid action'], 400);

} catch (Throwable $t) {
    error_log("[bracket.php] Exception: " . $t->getMessage() . " in " . $t->getFile() . ":" . $t->getLine());
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Server error']);
    exit();
}

// ========== HELPER FUNCTIONS ==========

/**
 * Generate knockout fixtures from qualified teams
 */
function generateKnockoutFixtures($pdo, $tournId, $qualifiedTeams) {
    $teamCount = count($qualifiedTeams);
    
    // Determine initial round
    $rounds = [];
    if ($teamCount === 2) {
        $rounds = ['FINAL' => 2];
    } elseif ($teamCount === 4) {
        $rounds = ['SEMIFINAL' => 4];
    } elseif ($teamCount <= 8) {
        $rounds = ['QUARTERFINAL' => 8];
    } elseif ($teamCount <= 16) {
        $rounds = ['RO16' => 16, 'QUARTERFINAL' => 8, 'SEMIFINAL' => 4, 'FINAL' => 2];
    } else {
        // Default bracket
        $rounds = ['RO32' => 32, 'RO16' => 16, 'QUARTERFINAL' => 8, 'SEMIFINAL' => 4, 'FINAL' => 2];
    }

    $createdCount = 0;
    $currentRoundTeams = $qualifiedTeams;
    $previousRoundFixtures = [];

    foreach ($rounds as $roundName => $expectedTeams) {
        $roundFixtures = [];
        
        // Pair teams for this round
        for ($i = 0; $i < count($currentRoundTeams); $i += 2) {
            $homeTeam = $currentRoundTeams[$i];
            $awayTeam = $currentRoundTeams[$i + 1] ?? 'TBD';

            $stmt = $pdo->prepare("INSERT INTO fixtures (tourn_id, home_team, away_team, stage, match_date, weekday, match_time, bracket_position) 
                                  VALUES (?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL ? DAY), ?, ?, ?)");
            $stmt->execute([
                $tournId,
                $homeTeam,
                $awayTeam,
                $roundName,
                ($createdCount + 1) * 7, // space matches 7 days apart
                'TBD',
                '18:00',
                ($i / 2) + 1
            ]);
            
            $fixtureId = (int)$pdo->lastInsertId();
            $roundFixtures[] = $fixtureId;
            $createdCount++;
        }

        // Link previous round winners to this round's fixtures
        if (!empty($previousRoundFixtures)) {
            for ($i = 0; $i < count($previousRoundFixtures); $i += 2) {
                $fixture1Id = $previousRoundFixtures[$i];
                $fixture2Id = $previousRoundFixtures[$i + 1] ?? null;
                
                $nextFixtureId = $roundFixtures[$i / 2] ?? null;
                if ($nextFixtureId) {
                    $pdo->prepare("UPDATE fixtures SET next_fixture_id = ?, winner_slot = 'home' WHERE id = ?")
                        ->execute([$nextFixtureId, $fixture1Id]);
                    if ($fixture2Id) {
                        $pdo->prepare("UPDATE fixtures SET next_fixture_id = ?, winner_slot = 'away' WHERE id = ?")
                            ->execute([$nextFixtureId, $fixture2Id]);
                    }
                }
            }
        }

        $previousRoundFixtures = $roundFixtures;
        $currentRoundTeams = array_fill(0, count($roundFixtures), 'TBD');
    }

    return $createdCount;
}

/**
 * Update group stage standings after a match
 */
function updateGroupStandings($pdo, $tournId, $fixture, $homeScore, $awayScore) {
    $homeTeam = $fixture['home_team'];
    $awayTeam = $fixture['away_team'];
    $groupName = $fixture['group_name'];

    // Ensure both teams exist in standings
    ensureTeamInStandings($pdo, $tournId, $homeTeam, $groupName);
    ensureTeamInStandings($pdo, $tournId, $awayTeam, $groupName);

    if ($homeScore > $awayScore) {
        // Home team wins
        $pdo->prepare("UPDATE tournament_standings SET wins = wins + 1, played = played + 1, goals_for = goals_for + ?, goals_against = goals_against + ? WHERE tourn_id = ? AND team_name = ? AND group_name = ?")
            ->execute([$homeScore, $awayScore, $tournId, $homeTeam, $groupName]);
        $pdo->prepare("UPDATE tournament_standings SET losses = losses + 1, played = played + 1, goals_for = goals_for + ?, goals_against = goals_against + ? WHERE tourn_id = ? AND team_name = ? AND group_name = ?")
            ->execute([$awayScore, $homeScore, $tournId, $awayTeam, $groupName]);
    } elseif ($awayScore > $homeScore) {
        // Away team wins
        $pdo->prepare("UPDATE tournament_standings SET wins = wins + 1, played = played + 1, goals_for = goals_for + ?, goals_against = goals_against + ? WHERE tourn_id = ? AND team_name = ? AND group_name = ?")
            ->execute([$awayScore, $homeScore, $tournId, $awayTeam, $groupName]);
        $pdo->prepare("UPDATE tournament_standings SET losses = losses + 1, played = played + 1, goals_for = goals_for + ?, goals_against = goals_against + ? WHERE tourn_id = ? AND team_name = ? AND group_name = ?")
            ->execute([$homeScore, $awayScore, $tournId, $homeTeam, $groupName]);
    } else {
        // Draw
        $pdo->prepare("UPDATE tournament_standings SET draws = draws + 1, played = played + 1, goals_for = goals_for + ?, goals_against = goals_against + ? WHERE tourn_id = ? AND team_name = ? AND group_name = ?")
            ->execute([$homeScore, $awayScore, $tournId, $homeTeam, $groupName]);
        $pdo->prepare("UPDATE tournament_standings SET draws = draws + 1, played = played + 1, goals_for = goals_for + ?, goals_against = goals_against + ? WHERE tourn_id = ? AND team_name = ? AND group_name = ?")
            ->execute([$awayScore, $homeScore, $tournId, $awayTeam, $groupName]);
    }
}

/**
 * Ensure team exists in standings
 */
function ensureTeamInStandings($pdo, $tournId, $teamName, $groupName) {
    $checkStmt = $pdo->prepare("SELECT id FROM tournament_standings WHERE tourn_id = ? AND team_name = ? AND group_name = ?");
    $checkStmt->execute([$tournId, $teamName, $groupName]);
    if (!$checkStmt->fetch()) {
        $pdo->prepare("INSERT INTO tournament_standings (tourn_id, team_name, group_name) VALUES (?, ?, ?)")
            ->execute([$tournId, $teamName, $groupName]);
    }
}

/**
 * Advance winner to next round
 */
function advanceWinner($pdo, $nextFixtureId, $winnerName, $winnerSlot) {
    $column = ($winnerSlot === 'home') ? 'home_team' : 'away_team';
    $pdo->prepare("UPDATE fixtures SET $column = ? WHERE id = ?")
        ->execute([$winnerName, $nextFixtureId]);
}
