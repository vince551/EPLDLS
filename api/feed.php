<?php
require_once __DIR__ . '/db.php';

try {
    $pdo = getPDO();
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    $action = $_GET['action'] ?? $_POST['action'] ?? '';

    // ========== GET PERSONAL FEED (activity from followed players & friends) ==========
    if ($method === 'GET' && $action === 'personal') {
        $userId = (int)($_GET['user_id'] ?? $_GET['userId'] ?? 0);
        $limit = min(50, (int)($_GET['limit'] ?? 20));
        $offset = (int)($_GET['offset'] ?? 0);

        if (!$userId) {
            jsonResponse(['error' => 'User ID required'], 400);
        }

        // Get followed users
        $followStmt = $pdo->prepare("SELECT following_id FROM followers WHERE follower_id = ?");
        $followStmt->execute([$userId]);
        $followed = $followStmt->fetchAll(PDO::FETCH_COLUMN);

        // Get friends
        $friendStmt = $pdo->prepare("SELECT CASE WHEN user_id = ? THEN friend_id ELSE user_id END as friend_id
                                    FROM friends WHERE (user_id = ? OR friend_id = ?) AND status = 'accepted'");
        $friendStmt->execute([$userId, $userId, $userId]);
        $friends = $friendStmt->fetchAll(PDO::FETCH_COLUMN);

        $relevantUsers = array_unique(array_merge($followed, $friends));

        if (empty($relevantUsers)) {
            jsonResponse([]);
        }

        // Get forums created by these users
        $inClause = implode(',', array_fill(0, count($relevantUsers), '?'));
        $sql = "SELECT f.id, f.title, f.description, f.created_by as createdBy, f.is_pinned as isPinned, u.name as creatorName, u.pic as creatorPic,
                       g.name as gameName, f.created_at as createdAt,
                       (SELECT COUNT(*) FROM forum_posts WHERE forum_id = f.id) as postCount
                FROM forums f
                JOIN users u ON u.id = f.created_by
                LEFT JOIN games g ON g.id = f.game_id
                WHERE f.created_by IN ($inClause)
                ORDER BY f.created_at DESC
                LIMIT ? OFFSET ?";
        
        $params = array_merge($relevantUsers, [$limit, $offset]);
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $feedItems = $stmt->fetchAll();

        jsonResponse($feedItems);
    }

    // ========== GET GLOBAL FEED (all recent activity) ==========
    if ($method === 'GET' && $action === 'global') {
        $limit = min(50, (int)($_GET['limit'] ?? 20));
        $offset = (int)($_GET['offset'] ?? 0);
        $gameFilter = trim($_GET['game'] ?? '');

        $sql = "SELECT f.id, f.title, f.description, f.created_by as createdBy, f.is_pinned as isPinned, u.name as creatorName, u.pic as creatorPic, u.online,
                       g.name as gameName, f.created_at as createdAt,
                       (SELECT COUNT(*) FROM forum_posts WHERE forum_id = f.id) as postCount
                FROM forums f
                JOIN users u ON u.id = f.created_by
                LEFT JOIN games g ON g.id = f.game_id
                WHERE f.is_locked = 0";
        $params = [];

        if ($gameFilter) {
            $sql .= " AND (g.id = ? OR f.game_id = ?)";
            $params[] = $gameFilter;
            $params[] = $gameFilter;
        }

        $sql .= " ORDER BY f.is_pinned DESC, f.created_at DESC LIMIT ? OFFSET ?";
        $params[] = $limit;
        $params[] = $offset;

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $feedItems = $stmt->fetchAll();

        jsonResponse($feedItems);
    }

    // ========== GET PLAYER ACTIVITY FEED ==========
    if ($method === 'GET' && $action === 'player') {
        $playerId = (int)($_GET['player_id'] ?? $_GET['id'] ?? 0);
        $limit = min(50, (int)($_GET['limit'] ?? 20));
        $offset = (int)($_GET['offset'] ?? 0);

        if (!$playerId) {
            jsonResponse(['error' => 'Player ID required'], 400);
        }

        $sql = "SELECT f.id, f.title, f.description, f.created_by as createdBy, f.is_pinned as isPinned, u.name as creatorName, u.pic as creatorPic,
                       g.name as gameName, f.created_at as createdAt,
                       (SELECT COUNT(*) FROM forum_posts WHERE forum_id = f.id) as postCount
                FROM forums f
                JOIN users u ON u.id = f.created_by
                LEFT JOIN games g ON g.id = f.game_id
                WHERE f.created_by = ?
                ORDER BY f.created_at DESC
                LIMIT ? OFFSET ?";

        $stmt = $pdo->prepare($sql);
        $stmt->execute([$playerId, $limit, $offset]);
        $feedItems = $stmt->fetchAll();

        jsonResponse($feedItems);
    }

    // ========== TRENDING FORUMS (by post count & recent activity) ==========
    if ($method === 'GET' && $action === 'trending') {
        $limit = min(50, (int)($_GET['limit'] ?? 15));
        $gameFilter = trim($_GET['game'] ?? '');

        $sql = "SELECT f.id, f.title, f.description, f.created_by as createdBy, u.name as creatorName, u.pic as creatorPic,
                       g.name as gameName, f.created_at as createdAt,
                       (SELECT COUNT(*) FROM forum_posts WHERE forum_id = f.id) as postCount,
                       (SELECT COUNT(*) FROM forum_post_likes WHERE post_id IN (SELECT id FROM forum_posts WHERE forum_id = f.id)) as totalLikes
                FROM forums f
                JOIN users u ON u.id = f.created_by
                LEFT JOIN games g ON g.id = f.game_id
                WHERE f.is_locked = 0 AND f.created_at > DATE_SUB(NOW(), INTERVAL 7 DAY)";
        $params = [];

        if ($gameFilter) {
            $sql .= " AND g.id = ?";
            $params[] = $gameFilter;
        }

        $sql .= " ORDER BY (postCount + totalLikes) DESC LIMIT ?";
        $params[] = $limit;

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $trending = $stmt->fetchAll();

        jsonResponse($trending);
    }

    jsonResponse(['error' => 'Invalid action'], 400);

} catch (Throwable $t) {
    error_log("[feed.php] Exception: " . $t->getMessage());
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Server error']);
    exit();
}
