<?php
require_once __DIR__ . '/db.php';

$pdo = getPDO();
$method = $_SERVER['REQUEST_METHOD'];

if ($method !== 'GET') {
    jsonResponse(['error' => 'Method not allowed.'], 405);
}

$events = [];

// ── 1. Recent played match results (last 12) ──────────────────────────────
$matchStmt = $pdo->query("
    SELECT 
        f.id, f.home_team, f.away_team, f.home_score, f.away_score, f.match_date,
        t.name as tournament_name
    FROM fixtures f
    LEFT JOIN tournaments t ON f.tourn_id = t.id
    WHERE f.played = 1 AND f.home_score IS NOT NULL
    ORDER BY f.match_date DESC, f.id DESC
    LIMIT 12
");
foreach ($matchStmt->fetchAll() as $m) {
    $hS = (int)$m['home_score'];
    $aS = (int)$m['away_score'];

    if ($hS > $aS) {
        $outcome = "🏆 <strong>{$m['home_team']}</strong> beat {$m['away_team']} <strong>{$hS}–{$aS}</strong>";
    } elseif ($aS > $hS) {
        $outcome = "🏆 <strong>{$m['away_team']}</strong> beat {$m['home_team']} <strong>{$aS}–{$hS}</strong>";
    } else {
        $outcome = "🤝 {$m['home_team']} drew with {$m['away_team']} <strong>{$hS}–{$aS}</strong>";
    }

    $events[] = [
        'type'      => 'match',
        'icon'      => '⚽',
        'color'     => '#00ff87',
        'text'      => $outcome,
        'sub'       => $m['tournament_name'] ?? 'Tournament',
        'timestamp' => $m['match_date'] . ' 00:00:00',
    ];
}

// ── 2. Recent forum threads (last 8) ─────────────────────────────────────
$forumStmt = $pdo->query("
    SELECT f.id, f.title, f.created_at, u.name as creator, g.name as game_name
    FROM forums f
    LEFT JOIN users u ON f.created_by = u.id
    LEFT JOIN games g ON f.game_id = g.id
    ORDER BY f.created_at DESC
    LIMIT 8
");
foreach ($forumStmt->fetchAll() as $f) {
    $events[] = [
        'type'      => 'forum',
        'icon'      => '💬',
        'color'     => '#e90052',
        'text'      => "New thread: <strong>" . htmlspecialchars($f['title']) . "</strong>",
        'sub'       => "by " . ($f['creator'] ?? 'Gamer') . ($f['game_name'] ? " · " . $f['game_name'] : ''),
        'timestamp' => $f['created_at'],
        'link'      => '/forums/' . $f['id'],
    ];
}

// ── 3. Recent new player registrations (last 5) ───────────────────────────
$userStmt = $pdo->query("
    SELECT name, team, favorite_game, created_at
    FROM users
    WHERE role = 'user'
    ORDER BY created_at DESC
    LIMIT 5
");
foreach ($userStmt->fetchAll() as $u) {
    $events[] = [
        'type'      => 'player',
        'icon'      => '🎮',
        'color'     => '#04f5ff',
        'text'      => "<strong>" . htmlspecialchars($u['name']) . "</strong> joined the arena",
        'sub'       => ($u['team'] ?? 'No Team') . ($u['favorite_game'] ? " · " . $u['favorite_game'] : ''),
        'timestamp' => $u['created_at'],
    ];
}

// ── 4. Recent tournament creations (last 4) ───────────────────────────────
$tournStmt = $pdo->query("
    SELECT t.id, t.name, t.created_at, g.name as game_name
    FROM tournaments t
    LEFT JOIN games g ON t.game_id = g.id
    ORDER BY t.created_at DESC
    LIMIT 4
");
foreach ($tournStmt->fetchAll() as $t) {
    $events[] = [
        'type'      => 'tournament',
        'icon'      => '🏆',
        'color'     => '#ffd700',
        'text'      => "Tournament launched: <strong>" . htmlspecialchars($t['name']) . "</strong>",
        'sub'       => $t['game_name'] ?? 'All Games',
        'timestamp' => $t['created_at'],
    ];
}

// ── Sort all events by timestamp DESC and cap at 20 ──────────────────────
usort($events, fn($a, $b) => strcmp($b['timestamp'], $a['timestamp']));
$events = array_slice($events, 0, 20);

jsonResponse($events);
