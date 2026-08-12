<?php
require_once __DIR__ . '/db.php';

$pdo = getPDO();
$method = $_SERVER['REQUEST_METHOD'];

if ($method !== 'POST') {
    jsonResponse(['error' => 'Method not allowed.'], 405);
}

// ------------------------------------------------------------------
// Context-aware upload: forum / chat images
// ------------------------------------------------------------------
$context = trim($_POST['context'] ?? '');

if ($context === 'forum' || $context === 'chat') {
    // Validate that a file was provided under the 'image' field
    if (!isset($_FILES['image']) || $_FILES['image']['error'] !== UPLOAD_ERR_OK) {
        jsonResponse(['error' => 'No image file provided.'], 400);
    }

    $tmpName  = $_FILES['image']['tmp_name'];
    $origName = basename($_FILES['image']['name']);
    $fileSize = $_FILES['image']['size'];

    // Enforce 5 MB size limit (Requirements 1.3)
    $maxBytes = 5 * 1024 * 1024; // 5 MB
    if ($fileSize > $maxBytes) {
        jsonResponse(['error' => 'Image must be under 5 MB.'], 400);
    }

    // Validate MIME type via finfo (Requirements 1.2)
    $allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    $finfo        = new finfo(FILEINFO_MIME_TYPE);
    $mimeType     = $finfo->file($tmpName);

    if (!in_array($mimeType, $allowedMimes, true)) {
        jsonResponse(['error' => 'Invalid image format. Allowed: JPG, PNG, GIF, WEBP'], 400);
    }

    // Map MIME type to extension
    $mimeToExt = [
        'image/jpeg' => 'jpg',
        'image/png'  => 'png',
        'image/gif'  => 'gif',
        'image/webp' => 'webp',
    ];
    $ext = $mimeToExt[$mimeType];

    // Create upload directory if absent (Requirements 1.4)
    $uploadDir = __DIR__ . '/uploads/images/';
    if (!file_exists($uploadDir)) {
        mkdir($uploadDir, 0755, true);
    }

    // Build base URL for uploaded images
    $scheme    = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $host      = $_SERVER['HTTP_HOST'] ?? 'localhost';
    $scriptDir = str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME']));
    $imagesBaseUrl = $scheme . '://' . $host . $scriptDir . '/uploads/images/';

    // Generate unique filename (Requirements 1.5): img_{context}_{time}.{ext}
    $fileName   = 'img_' . $context . '_' . time() . '.' . $ext;
    $targetPath = $uploadDir . $fileName;

    if (!move_uploaded_file($tmpName, $targetPath)) {
        jsonResponse(['error' => 'Failed to save uploaded file.'], 500);
    }

    $fileUrl = $imagesBaseUrl . $fileName;
    jsonResponse(['success' => true, 'url' => $fileUrl]);
    exit;
}

// ------------------------------------------------------------------
// Legacy avatar upload — requires userId
// ------------------------------------------------------------------
$userId = (int)($_POST['userId'] ?? 0);
if (!$userId) {
    // Check JSON fallback
    $input = getJsonInput();
    $userId = (int)($input['userId'] ?? 0);
}

if (!$userId) {
    jsonResponse(['error' => 'User ID is required.'], 400);
}

$uploadDir = __DIR__ . '/uploads/avatars/';
if (!file_exists($uploadDir)) {
    mkdir($uploadDir, 0755, true);
}

// Build absolute base URL for uploaded files so they work cross-origin
$scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
$host = $_SERVER['HTTP_HOST'] ?? 'localhost';
// Derive the API base path from the current script directory relative to doc root
$scriptDir = str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME']));
$uploadsBaseUrl = $scheme . '://' . $host . $scriptDir . '/uploads/avatars/';

$fileUrl = null;

// Case 1: Standard File Upload via $_FILES
if (isset($_FILES['avatar']) && $_FILES['avatar']['error'] === UPLOAD_ERR_OK) {
    $tmpName = $_FILES['avatar']['tmp_name'];
    $name = basename($_FILES['avatar']['name']);
    $ext = strtolower(pathinfo($name, PATHINFO_EXTENSION));

    $allowed = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
    if (!in_array($ext, $allowed)) {
        jsonResponse(['error' => 'Invalid image format. Allowed: JPG, PNG, GIF, WEBP'], 400);
    }

    $fileName = 'avatar_' . $userId . '_' . time() . '.' . $ext;
    $targetPath = $uploadDir . $fileName;

    if (move_uploaded_file($tmpName, $targetPath)) {
        $fileUrl = $uploadsBaseUrl . $fileName;
    } else {
        jsonResponse(['error' => 'Failed to save uploaded file.'], 500);
    }
}
// Case 2: Base64 Upload (Fallback for cross-origin or quick previews)
else if (!empty($input['base64'])) {
    $base64Data = $input['base64'];
    if (preg_match('/^data:image\/(\w+);base64,/', $base64Data, $type)) {
        $data = substr($base64Data, strpos($base64Data, ',') + 1);
        $type = strtolower($type[1]);
        if ($type === 'jpeg') $type = 'jpg';

        $data = base64_decode($data);
        if ($data === false) {
            jsonResponse(['error' => 'Invalid base64 encoding.'], 400);
        }

        $fileName = 'avatar_' . $userId . '_' . time() . '.' . $type;
        $targetPath = $uploadDir . $fileName;

        if (file_put_contents($targetPath, $data)) {
            $fileUrl = $uploadsBaseUrl . $fileName;
        } else {
            jsonResponse(['error' => 'Failed to save base64 avatar file.'], 500);
        }
    } else {
        jsonResponse(['error' => 'Invalid base64 image data.'], 400);
    }
} else {
    jsonResponse(['error' => 'No image file or base64 data provided.'], 400);
}

// Update DB
if ($fileUrl) {
    $stmt = $pdo->prepare("UPDATE users SET pic = ? WHERE id = ?");
    $stmt->execute([$fileUrl, $userId]);

    $userStmt = $pdo->prepare("SELECT id, name, team, role, online, status_color, pic, bio, favorite_game, can_create_forums FROM users WHERE id = ?");
    $userStmt->execute([$userId]);
    $user = $userStmt->fetch();
    if ($user) $user['id'] = (int)$user['id'];

    jsonResponse([
        'success' => true,
        'url' => $fileUrl,
        'user' => $user
    ]);
}

jsonResponse(['error' => 'Upload failed.'], 500);
