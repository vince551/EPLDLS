<?php
require_once __DIR__ . '/db.php';

$pdo = getPDO();
$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? $_POST['action'] ?? '';

if ($method === 'POST') {
    $input = getJsonInput();

    // CREATE POST REPLY
    if ($action === 'create' || $action === '') {
        $forumId = (int)($input['forumId'] ?? 0);
        $userId = (int)($input['userId'] ?? 0);
        $content = trim($input['content'] ?? '');

        if (!$forumId || !$userId || !$content) {
            jsonResponse(['error' => 'Forum ID, User ID, and Content are required.'], 400);
        }

        // Check if forum is locked
        $fStmt = $pdo->prepare("SELECT is_locked FROM forums WHERE id = ?");
        $fStmt->execute([$forumId]);
        $forum = $fStmt->fetch();

        if (!$forum) {
            jsonResponse(['error' => 'Forum not found.'], 404);
        }
        if ($forum['is_locked']) {
            jsonResponse(['error' => 'This forum thread is locked by an admin.'], 403);
        }

        $stmt = $pdo->prepare("INSERT INTO forum_posts (forum_id, user_id, content) VALUES (?, ?, ?)");
        $stmt->execute([$forumId, $userId, $content]);
        $newId = (int)$pdo->lastInsertId();

        // Fetch created post details
        $postStmt = $pdo->prepare("SELECT fp.id, fp.forum_id as forumId, fp.user_id as userId, fp.content, fp.created_at as createdAt, u.name as authorName, u.team as authorTeam, u.pic as authorPic, u.role as authorRole FROM forum_posts fp JOIN users u ON fp.user_id = u.id WHERE fp.id = ?");
        $postStmt->execute([$newId]);
        $post = $postStmt->fetch();
        $post['id'] = (int)$post['id'];
        $post['forumId'] = (int)$post['forumId'];
        $post['userId'] = (int)$post['userId'];
        $post['likeCount'] = 0;
        $post['isLiked'] = false;

        jsonResponse(['success' => true, 'post' => $post]);
    }

    // TOGGLE LIKE
    if ($action === 'like') {
        $postId = (int)($input['postId'] ?? 0);
        $userId = (int)($input['userId'] ?? 0);

        if (!$postId || !$userId) {
            jsonResponse(['error' => 'Post ID and User ID are required.'], 400);
        }

        // Check if already liked
        $check = $pdo->prepare("SELECT id FROM forum_post_likes WHERE post_id = ? AND user_id = ?");
        $check->execute([$postId, $userId]);
        $existing = $check->fetch();

        if ($existing) {
            // Unlike
            $del = $pdo->prepare("DELETE FROM forum_post_likes WHERE id = ?");
            $del->execute([$existing['id']]);
            $isLiked = false;
        } else {
            // Like
            $ins = $pdo->prepare("INSERT INTO forum_post_likes (post_id, user_id) VALUES (?, ?)");
            $ins->execute([$postId, $userId]);
            $isLiked = true;
        }

        // Return updated count
        $cntStmt = $pdo->prepare("SELECT COUNT(*) FROM forum_post_likes WHERE post_id = ?");
        $cntStmt->execute([$postId]);
        $likeCount = (int)$cntStmt->fetchColumn();

        jsonResponse(['success' => true, 'isLiked' => $isLiked, 'likeCount' => $likeCount]);
    }
}

if ($method === 'DELETE' || $action === 'delete') {
    $id = (int)($_GET['id'] ?? getJsonInput()['id'] ?? 0);
    if (!$id) {
        jsonResponse(['error' => 'Post ID is required.'], 400);
    }

    $stmt = $pdo->prepare("DELETE FROM forum_posts WHERE id = ?");
    $stmt->execute([$id]);

    jsonResponse(['success' => true]);
}

jsonResponse(['error' => 'Invalid action.'], 400);
