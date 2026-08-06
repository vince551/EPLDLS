<?php
require_once __DIR__ . '/db.php';

try {
    $pdo = getPDO();
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    $action = $_GET['action'] ?? $_POST['action'] ?? '';

    // ========== DISCOVER PLAYERS (with filters) ==========
    if ($method === 'GET' && ($action === 'discover' || $action === 'list')) {
        $userId = (int)($_GET['user_id'] ?? $_GET['userId'] ?? 0);
        $gameFilter = trim($_GET['game'] ?? '');
        $teamFilter = trim($_GET['team'] ?? '');
        $search = trim($_GET['search'] ?? '');
        $online = $_GET['online'] ?? null;
        $limit = min(50, (int)($_GET['limit'] ?? 20));
        $offset = (int)($_GET['offset'] ?? 0);

        $sql = "SELECT u.id, u.name, u.team, u.online, u.status_color as statusColor, u.pic, u.bio, u.favorite_game as favoriteGame, u.last_seen as lastSeen, u.twitter, u.instagram, u.discord, u.youtube, u.tiktok
                FROM users u WHERE u.role = 'user'";
        $params = [];

        // Exclude self
        if ($userId) {
            $sql .= " AND u.id != ?";
            $params[] = $userId;
        }

        // Filter by game
        if ($gameFilter) {
            $sql .= " AND u.favorite_game = ?";
            $params[] = $gameFilter;
        }

        // Filter by team
        if ($teamFilter) {
            $sql .= " AND u.team LIKE ?";
            $params[] = "%$teamFilter%";
        }

        // Search by name or team
        if ($search) {
            $sql .= " AND (u.name LIKE ? OR u.team LIKE ?)";
            $params[] = "%$search%";
            $params[] = "%$search%";
        }

        // Filter by online status
        if ($online === 'true') {
            $sql .= " AND u.online = 1";
        } elseif ($online === 'false') {
            $sql .= " AND u.online = 0";
        }

        $sql .= " ORDER BY u.online DESC, u.last_seen DESC LIMIT ? OFFSET ?";
        $params[] = $limit;
        $params[] = $offset;

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $players = $stmt->fetchAll();

        // Get friend status for each player
        if ($userId) {
            $friendStatuses = [];
            foreach ($players as $p) {
                $fs = $pdo->prepare("SELECT status FROM friends WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?) LIMIT 1");
                $fs->execute([$userId, $p['id'], $p['id'], $userId]);
                $status = $fs->fetch();
                $friendStatuses[$p['id']] = $status ? $status['status'] : null;
            }
            foreach ($players as &$p) {
                $p['friendStatus'] = $friendStatuses[$p['id']] ?? null; // null, 'pending', 'accepted'
            }
        }

        jsonResponse($players);
    }

    // ========== GET PLAYER PROFILE ==========
    if ($method === 'GET' && $action === 'profile') {
        $profileId = (int)($_GET['profile_id'] ?? $_GET['id'] ?? 0);
        $viewerId = (int)($_GET['user_id'] ?? $_GET['viewer_id'] ?? 0);

        if (!$profileId) {
            jsonResponse(['error' => 'Player ID required'], 400);
        }

        $stmt = $pdo->prepare("SELECT u.id, u.name, u.team, u.online, u.status_color as statusColor, u.pic, u.bio, u.favorite_game as favoriteGame, u.last_seen as lastSeen, u.twitter, u.instagram, u.discord, u.youtube, u.tiktok, u.created_at as joinedDate
                             FROM users u WHERE u.id = ? AND u.role = 'user'");
        $stmt->execute([$profileId]);
        $profile = $stmt->fetch();

        if (!$profile) {
            jsonResponse(['error' => 'Player not found'], 404);
        }

        // Get player stats
        $statsStmt = $pdo->prepare("SELECT COUNT(*) as forumsCreated FROM forums WHERE created_by = ?");
        $statsStmt->execute([$profileId]);
        $stats = $statsStmt->fetch();

        // Get friend/follower counts
        $friendsStmt = $pdo->prepare("SELECT COUNT(*) as count FROM friends WHERE (user_id = ? OR friend_id = ?) AND status = 'accepted'");
        $friendsStmt->execute([$profileId, $profileId]);
        $friendCount = $friendsStmt->fetch()['count'];

        $followersStmt = $pdo->prepare("SELECT COUNT(*) as count FROM followers WHERE following_id = ?");
        $followersStmt->execute([$profileId]);
        $followers = $followersStmt->fetch()['count'];

        // Get friend status if viewer specified
        $friendStatus = null;
        if ($viewerId && $viewerId !== $profileId) {
            $fs = $pdo->prepare("SELECT status FROM friends WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)");
            $fs->execute([$viewerId, $profileId, $profileId, $viewerId]);
            $status = $fs->fetch();
            $friendStatus = $status ? $status['status'] : null;

            // Check if viewer follows profile
            $followStmt = $pdo->prepare("SELECT id FROM followers WHERE follower_id = ? AND following_id = ?");
            $followStmt->execute([$viewerId, $profileId]);
            $profile['isFollowing'] = $followStmt->fetch() ? true : false;
        }

        // Get recent forums created by player
        $forumsStmt = $pdo->prepare("SELECT id, title, created_at as createdAt FROM forums WHERE created_by = ? ORDER BY created_at DESC LIMIT 5");
        $forumsStmt->execute([$profileId]);
        $recentForums = $forumsStmt->fetchAll();

        $profile['friendStatus'] = $friendStatus;
        $profile['stats'] = [
            'forumsCreated' => $stats['forumsCreated'],
            'friends' => $friendCount,
            'followers' => $followers
        ];
        $profile['recentForums'] = $recentForums;

        jsonResponse($profile);
    }

    // ========== SEND FRIEND REQUEST ==========
    if ($method === 'POST' && $action === 'send_request') {
        $userId = (int)(getJsonInput()['userId'] ?? getJsonInput()['user_id'] ?? 0);
        $targetId = (int)(getJsonInput()['targetId'] ?? getJsonInput()['target_id'] ?? 0);

        if (!$userId || !$targetId) {
            jsonResponse(['error' => 'User ID and Target ID required'], 400);
        }

        if ($userId === $targetId) {
            jsonResponse(['error' => 'Cannot send friend request to yourself'], 400);
        }

        // Check if already friends
        $checkStmt = $pdo->prepare("SELECT id, status FROM friends WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)");
        $checkStmt->execute([$userId, $targetId, $targetId, $userId]);
        $existing = $checkStmt->fetch();

        if ($existing) {
            if ($existing['status'] === 'accepted') {
                jsonResponse(['error' => 'Already friends'], 400);
            } else {
                jsonResponse(['error' => 'Request already pending'], 400);
            }
        }

        $stmt = $pdo->prepare("INSERT INTO friends (user_id, friend_id, status) VALUES (?, ?, 'pending')");
        $stmt->execute([$userId, $targetId]);

        // Send notification to target
        $notif = $pdo->prepare("INSERT INTO notifications (user_id, text) VALUES (?, ?)");
        $notif->execute([$targetId, "New friend request from player"]);

        jsonResponse(['success' => true]);
    }

    // ========== ACCEPT FRIEND REQUEST ==========
    if ($method === 'POST' && $action === 'accept_request') {
        $userId = (int)(getJsonInput()['userId'] ?? getJsonInput()['user_id'] ?? 0);
        $requesterId = (int)(getJsonInput()['requesterId'] ?? getJsonInput()['requester_id'] ?? 0);

        if (!$userId || !$requesterId) {
            jsonResponse(['error' => 'User ID and Requester ID required'], 400);
        }

        $stmt = $pdo->prepare("UPDATE friends SET status = 'accepted' WHERE (user_id = ? AND friend_id = ? AND status = 'pending') OR (user_id = ? AND friend_id = ? AND status = 'pending')");
        $stmt->execute([$requesterId, $userId, $userId, $requesterId]);

        // Send notification
        $notif = $pdo->prepare("INSERT INTO notifications (user_id, text) VALUES (?, ?)");
        $notif->execute([$requesterId, "Friend request accepted"]);

        jsonResponse(['success' => true]);
    }

    // ========== FOLLOW PLAYER ==========
    if ($method === 'POST' && $action === 'follow') {
        $followerId = (int)(getJsonInput()['follower_id'] ?? getJsonInput()['userId'] ?? 0);
        $followingId = (int)(getJsonInput()['following_id'] ?? getJsonInput()['targetId'] ?? 0);

        if (!$followerId || !$followingId) {
            jsonResponse(['error' => 'Follower ID and Following ID required'], 400);
        }

        if ($followerId === $followingId) {
            jsonResponse(['error' => 'Cannot follow yourself'], 400);
        }

        // Check if already following
        $check = $pdo->prepare("SELECT id FROM followers WHERE follower_id = ? AND following_id = ?");
        $check->execute([$followerId, $followingId]);
        if ($check->fetch()) {
            jsonResponse(['error' => 'Already following'], 400);
        }

        $stmt = $pdo->prepare("INSERT INTO followers (follower_id, following_id) VALUES (?, ?)");
        $stmt->execute([$followerId, $followingId]);

        // Send notification
        $notif = $pdo->prepare("INSERT INTO notifications (user_id, text) VALUES (?, ?)");
        $notif->execute([$followingId, "New follower"]);

        jsonResponse(['success' => true]);
    }

    // ========== UNFOLLOW PLAYER ==========
    if ($method === 'POST' && $action === 'unfollow') {
        $followerId = (int)(getJsonInput()['follower_id'] ?? getJsonInput()['userId'] ?? 0);
        $followingId = (int)(getJsonInput()['following_id'] ?? getJsonInput()['targetId'] ?? 0);

        if (!$followerId || !$followingId) {
            jsonResponse(['error' => 'Follower ID and Following ID required'], 400);
        }

        $stmt = $pdo->prepare("DELETE FROM followers WHERE follower_id = ? AND following_id = ?");
        $stmt->execute([$followerId, $followingId]);

        jsonResponse(['success' => true]);
    }

    // ========== GET FOLLOWERS ==========
    if ($method === 'GET' && $action === 'followers') {
        $userId = (int)($_GET['user_id'] ?? $_GET['userId'] ?? 0);
        if (!$userId) {
            jsonResponse(['error' => 'User ID required'], 400);
        }

        $stmt = $pdo->prepare("SELECT u.id, u.name, u.team, u.online, u.pic, u.favorite_game as favoriteGame
                             FROM followers f
                             JOIN users u ON u.id = f.follower_id
                             WHERE f.following_id = ?
                             ORDER BY f.created_at DESC");
        $stmt->execute([$userId]);
        $followers = $stmt->fetchAll();

        jsonResponse($followers);
    }

    // ========== GET FOLLOWING ==========
    if ($method === 'GET' && $action === 'following') {
        $userId = (int)($_GET['user_id'] ?? $_GET['userId'] ?? 0);
        if (!$userId) {
            jsonResponse(['error' => 'User ID required'], 400);
        }

        $stmt = $pdo->prepare("SELECT u.id, u.name, u.team, u.online, u.pic, u.favorite_game as favoriteGame
                             FROM followers f
                             JOIN users u ON u.id = f.following_id
                             WHERE f.follower_id = ?
                             ORDER BY f.created_at DESC");
        $stmt->execute([$userId]);
        $following = $stmt->fetchAll();

        jsonResponse($following);
    }

    jsonResponse(['error' => 'Invalid action'], 400);

} catch (Throwable $t) {
    error_log("[players.php] Exception: " . $t->getMessage());
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Server error']);
    exit();
}
