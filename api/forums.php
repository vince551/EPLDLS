<?php
require_once __DIR__ . '/db.php';

$pdo = getPDO();
$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? $_POST['action'] ?? '';

// LIST FORUMS
if ($method === 'GET' && ($action === 'list' || $action === '')) {
    $gameId = isset($_GET['game_id']) ? (int)$_GET['game_id'] : (isset($_GET['gameId']) ? (int)$_GET['gameId'] : null);

    if ($gameId !== null && $gameId > 0) {
        $stmt = $pdo->prepare("SELECT f.*, u.name as creatorName, u.pic as creatorPic, g.name as gameName, g.icon as gameIcon FROM forums f LEFT JOIN users u ON f.created_by = u.id LEFT JOIN games g ON f.game_id = g.id WHERE f.game_id = ? OR f.game_id IS NULL ORDER BY f.is_pinned DESC, f.created_at DESC");
        $stmt->execute([$gameId]);
    } else {
        $stmt = $pdo->query("SELECT f.*, u.name as creatorName, u.pic as creatorPic, g.name as gameName, g.icon as gameIcon FROM forums f LEFT JOIN users u ON f.created_by = u.id LEFT JOIN games g ON f.game_id = g.id ORDER BY f.is_pinned DESC, f.created_at DESC");
    }

    $forums = $stmt->fetchAll();

    foreach ($forums as &$f) {
        $f['id'] = (int)$f['id'];
        $f['gameId'] = $f['game_id'] ? (int)$f['game_id'] : null;
        $f['createdBy'] = (int)$f['created_by'];
        $f['isPinned'] = (bool)$f['is_pinned'];
        $f['isLocked'] = (bool)$f['is_locked'];

        // Get post count & last post info
        $pStmt = $pdo->prepare("SELECT COUNT(*) FROM forum_posts WHERE forum_id = ?");
        $pStmt->execute([$f['id']]);
        $f['postCount'] = (int)$pStmt->fetchColumn();

        $lastStmt = $pdo->prepare("SELECT fp.created_at, u.name as authorName FROM forum_posts fp JOIN users u ON fp.user_id = u.id WHERE fp.forum_id = ? ORDER BY fp.created_at DESC LIMIT 1");
        $lastStmt->execute([$f['id']]);
        $lastPost = $lastStmt->fetch();

        $f['lastPostTime'] = $lastPost ? $lastPost['created_at'] : $f['created_at'];
        $f['lastPostAuthor'] = $lastPost ? $lastPost['authorName'] : $f['creatorName'];
    }

    jsonResponse($forums);
}

// GET SINGLE FORUM DETAILS
if ($method === 'GET' && $action === 'get') {
    $id = (int)($_GET['id'] ?? 0);
    $userId = (int)($_GET['user_id'] ?? $_GET['userId'] ?? 0);

    if (!$id) {
        jsonResponse(['error' => 'Forum ID is required.'], 400);
    }

    $stmt = $pdo->prepare("SELECT f.*, u.name as creatorName, u.pic as creatorPic, g.name as gameName, g.icon as gameIcon FROM forums f LEFT JOIN users u ON f.created_by = u.id LEFT JOIN games g ON f.game_id = g.id WHERE f.id = ?");
    $stmt->execute([$id]);
    $forum = $stmt->fetch();

    if (!$forum) {
        jsonResponse(['error' => 'Forum not found.'], 404);
    }

    $forum['id'] = (int)$forum['id'];
    $forum['gameId'] = $forum['game_id'] ? (int)$forum['game_id'] : null;
    $forum['createdBy'] = (int)$forum['created_by'];
    $forum['isPinned'] = (bool)$forum['is_pinned'];
    $forum['isLocked'] = (bool)$forum['is_locked'];

    // Fetch posts in this forum with optional quote-reply parent
    $postStmt = $pdo->prepare("
        SELECT fp.id, fp.forum_id as forumId, fp.user_id as userId, fp.content, fp.reply_to_id as replyToId,
               fp.created_at as createdAt, u.name as authorName, u.team as authorTeam, u.pic as authorPic, u.role as authorRole,
               parent.content as replyToContentRaw, pu.name as replyToAuthorName
        FROM forum_posts fp
        JOIN users u ON fp.user_id = u.id
        LEFT JOIN forum_posts parent ON parent.id = fp.reply_to_id
        LEFT JOIN users pu ON pu.id = parent.user_id
        WHERE fp.forum_id = ?
        ORDER BY fp.created_at ASC
    ");
    $postStmt->execute([$id]);
    $posts = $postStmt->fetchAll();

    foreach ($posts as &$p) {
        $p['id'] = (int)$p['id'];
        $p['forumId'] = (int)$p['forumId'];
        $p['userId'] = (int)$p['userId'];
        $p['replyToId'] = $p['replyToId'] !== null ? (int)$p['replyToId'] : null;
        if (!empty($p['replyToContentRaw'])) {
            $raw = $p['replyToContentRaw'];
            $p['replyToContent'] = mb_strlen($raw) > 80 ? mb_substr($raw, 0, 80) . '…' : $raw;
        } else {
            $p['replyToContent'] = null;
        }
        unset($p['replyToContentRaw']);

        // Get likes count
        $likeStmt = $pdo->prepare("SELECT COUNT(*) FROM forum_post_likes WHERE post_id = ?");
        $likeStmt->execute([$p['id']]);
        $p['likeCount'] = (int)$likeStmt->fetchColumn();

        // Check if current user liked it
        $p['isLiked'] = false;
        if ($userId > 0) {
            $userLikeStmt = $pdo->prepare("SELECT COUNT(*) FROM forum_post_likes WHERE post_id = ? AND user_id = ?");
            $userLikeStmt->execute([$p['id'], $userId]);
            $p['isLiked'] = ($userLikeStmt->fetchColumn() > 0);
        }

        // Fetch emoji reaction counts
        $rStmt = $pdo->prepare("SELECT reaction, COUNT(*) as cnt FROM forum_post_reactions WHERE post_id = ? GROUP BY reaction");
        $rStmt->execute([$p['id']]);
        $p['reactions'] = [];
        foreach ($rStmt->fetchAll() as $r) {
            $p['reactions'][$r['reaction']] = (int)$r['cnt'];
        }
        // Current user's reaction
        $p['myReaction'] = null;
        if ($userId > 0) {
            $myRStmt = $pdo->prepare("SELECT reaction FROM forum_post_reactions WHERE post_id = ? AND user_id = ?");
            $myRStmt->execute([$p['id'], $userId]);
            $myRRow = $myRStmt->fetch();
            if ($myRRow) $p['myReaction'] = $myRRow['reaction'];
        }
    }

    jsonResponse(['forum' => $forum, 'posts' => $posts]);
}

// POST ACTIONS
if ($method === 'POST') {
    $input = getJsonInput();

    if ($action === 'create') {
        $userId = (int)($input['userId'] ?? 0);
        $gameId = !empty($input['gameId']) ? (int)$input['gameId'] : null;
        $title = trim($input['title'] ?? '');
        $description = trim($input['description'] ?? '');

        if (!$userId || !$title) {
            jsonResponse(['error' => 'User ID and Title are required.'], 400);
        }

        // Any logged-in user can create forums
        $userStmt = $pdo->prepare("SELECT id, name FROM users WHERE id = ? AND role = 'user'");
        $userStmt->execute([$userId]);
        $user = $userStmt->fetch();

        if (!$user) {
            jsonResponse(['error' => 'User not found.'], 404);
        }

        $stmt = $pdo->prepare("INSERT INTO forums (game_id, title, description, created_by) VALUES (?, ?, ?, ?)");
        $stmt->execute([$gameId, $title, $description, $userId]);
        $newId = (int)$pdo->lastInsertId();

        // Also add initial description as first post if provided
        if ($description) {
            $pStmt = $pdo->prepare("INSERT INTO forum_posts (forum_id, user_id, content) VALUES (?, ?, ?)");
            $pStmt->execute([$newId, $userId, $description]);
        }

        // Send notification about new forum
        $notif = $pdo->prepare("INSERT INTO notifications (user_id, text) VALUES (?, ?)");
        $notifStmt = $pdo->query("SELECT id FROM users WHERE role = 'admin'");
        foreach ($notifStmt->fetchAll() as $admin) {
            $notif->execute([$admin['id'], "New forum '{$title}' created by {$user['name']}"]);
        }

        jsonResponse(['success' => true, 'id' => $newId]);
    }

    if ($action === 'toggle_pin') {
        $id = (int)($input['id'] ?? 0);
        if (!$id) jsonResponse(['error' => 'Forum ID required.'], 400);

        $stmt = $pdo->prepare("UPDATE forums SET is_pinned = NOT is_pinned WHERE id = ?");
        $stmt->execute([$id]);

        jsonResponse(['success' => true]);
    }

    if ($action === 'toggle_lock') {
        $id = (int)($input['id'] ?? 0);
        if (!$id) jsonResponse(['error' => 'Forum ID required.'], 400);

        $stmt = $pdo->prepare("UPDATE forums SET is_locked = NOT is_locked WHERE id = ?");
        $stmt->execute([$id]);

        jsonResponse(['success' => true]);
    }

    // ── Emoji Reactions ────────────────────────────────────────────────────
    if ($action === 'react') {
        $postId = (int)($input['postId'] ?? 0);
        $userId = (int)($input['userId'] ?? 0);
        $reaction = trim($input['reaction'] ?? '');

        if (!$postId || !$userId || !$reaction) {
            jsonResponse(['error' => 'postId, userId and reaction are required.'], 400);
        }

        // Toggle: if same reaction exists for user+post, remove it; otherwise upsert
        $existing = $pdo->prepare("SELECT id, reaction FROM forum_post_reactions WHERE post_id = ? AND user_id = ?");
        $existing->execute([$postId, $userId]);
        $row = $existing->fetch();

        if ($row) {
            if ($row['reaction'] === $reaction) {
                // Same emoji → remove (toggle off)
                $pdo->prepare("DELETE FROM forum_post_reactions WHERE post_id = ? AND user_id = ?")->execute([$postId, $userId]);
            } else {
                // Different emoji → switch
                $pdo->prepare("UPDATE forum_post_reactions SET reaction = ? WHERE post_id = ? AND user_id = ?")->execute([$reaction, $postId, $userId]);
            }
        } else {
            // No existing → insert
            $pdo->prepare("INSERT INTO forum_post_reactions (post_id, user_id, reaction) VALUES (?, ?, ?)")->execute([$postId, $userId, $reaction]);
        }

        // Return updated counts
        $counts = $pdo->prepare("SELECT reaction, COUNT(*) as cnt FROM forum_post_reactions WHERE post_id = ? GROUP BY reaction");
        $counts->execute([$postId]);
        $reactionData = [];
        foreach ($counts->fetchAll() as $r) {
            $reactionData[$r['reaction']] = (int)$r['cnt'];
        }

        $myReaction = null;
        $myStmt = $pdo->prepare("SELECT reaction FROM forum_post_reactions WHERE post_id = ? AND user_id = ?");
        $myStmt->execute([$postId, $userId]);
        $myRow = $myStmt->fetch();
        if ($myRow) $myReaction = $myRow['reaction'];

        jsonResponse(['reactions' => $reactionData, 'myReaction' => $myReaction]);
    }
}

if ($method === 'DELETE' || $action === 'delete') {
    $id = (int)($_GET['id'] ?? getJsonInput()['id'] ?? 0);
    if (!$id) jsonResponse(['error' => 'Forum ID required.'], 400);

    $stmt = $pdo->prepare("DELETE FROM forums WHERE id = ?");
    $stmt->execute([$id]);

    jsonResponse(['success' => true]);
}

jsonResponse(['error' => 'Invalid action.'], 400);
