<?php
require_once __DIR__ . '/config.php';

function ensureSchema($pdo) {
    static $migrated = false;
    if ($migrated) return;
    $migrated = true;

    try {
        // Create games table
        $pdo->exec("CREATE TABLE IF NOT EXISTS `games` (
            `id` INT AUTO_INCREMENT PRIMARY KEY,
            `name` VARCHAR(100) NOT NULL,
            `slug` VARCHAR(50) NOT NULL UNIQUE,
            `icon` TEXT,
            `banner` TEXT,
            `description` TEXT,
            `is_active` TINYINT(1) DEFAULT 1,
            `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

        // Seed default games if empty
        $stmt = $pdo->query("SELECT COUNT(*) FROM `games`");
        if ($stmt->fetchColumn() == 0) {
            $pdo->exec("INSERT INTO `games` (`id`, `name`, `slug`, `icon`, `banner`, `description`, `is_active`) VALUES
                (1, 'Dream League Soccer (DLS)', 'dls', '⚽', 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=800', 'Mobile football manager & arcade simulator. Compete in DLS custom leagues.', 1),
                (2, 'eFootball (PES)', 'efootball', '🎮', 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800', 'Konamis ultra-realistic football action for mobile and console esports.', 1),
                (3, 'Call of Duty Mobile', 'codm', '🎯', 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800', 'Fast-paced FPS multiplayer and battle royale combat.', 1),
                (4, 'PUBG Mobile', 'pubg', '🪂', 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=800', '100-player tactical battle royale survival shooter.', 1),
                (5, 'Free Fire', 'freefire', '🔥', 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800', '50-player intense 10-minute battle royale matches.', 1),
                (6, 'EA Sports FC / FIFA', 'eafc', '🏆', 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=800', 'Ultimate team building and global competitive tournament football.', 1)
            ");
        }

        // Add missing columns to users
        $cols = $pdo->query("SHOW COLUMNS FROM `users`")->fetchAll(PDO::FETCH_COLUMN);
        if (!in_array('username', $cols)) $pdo->exec("ALTER TABLE `users` ADD COLUMN `username` VARCHAR(100) NULL");
        if (!in_array('bio', $cols)) $pdo->exec("ALTER TABLE `users` ADD COLUMN `bio` TEXT");
        if (!in_array('favorite_game', $cols)) $pdo->exec("ALTER TABLE `users` ADD COLUMN `favorite_game` VARCHAR(50) DEFAULT 'DLS'");
        if (!in_array('can_create_forums', $cols)) $pdo->exec("ALTER TABLE `users` ADD COLUMN `can_create_forums` TINYINT(1) DEFAULT 0");
        if (!in_array('last_seen', $cols)) $pdo->exec("ALTER TABLE `users` ADD COLUMN `last_seen` TIMESTAMP NULL DEFAULT NULL");
        if (!in_array('typing_to', $cols)) $pdo->exec("ALTER TABLE `users` ADD COLUMN `typing_to` INT DEFAULT NULL");
        if (!in_array('typing_at', $cols)) $pdo->exec("ALTER TABLE `users` ADD COLUMN `typing_at` TIMESTAMP NULL DEFAULT NULL");
        if (!in_array('twitter', $cols)) $pdo->exec("ALTER TABLE `users` ADD COLUMN `twitter` VARCHAR(100) NULL DEFAULT NULL");
        if (!in_array('instagram', $cols)) $pdo->exec("ALTER TABLE `users` ADD COLUMN `instagram` VARCHAR(100) NULL DEFAULT NULL");
        if (!in_array('tiktok', $cols)) $pdo->exec("ALTER TABLE `users` ADD COLUMN `tiktok` VARCHAR(100) NULL DEFAULT NULL");
        if (!in_array('discord', $cols)) $pdo->exec("ALTER TABLE `users` ADD COLUMN `discord` VARCHAR(100) NULL DEFAULT NULL");
        if (!in_array('youtube', $cols)) $pdo->exec("ALTER TABLE `users` ADD COLUMN `youtube` VARCHAR(100) NULL DEFAULT NULL");

        // Add game_id to tournaments
        $tournCols = $pdo->query("SHOW COLUMNS FROM `tournaments`")->fetchAll(PDO::FETCH_COLUMN);
        if (!in_array('game_id', $tournCols)) $pdo->exec("ALTER TABLE `tournaments` ADD COLUMN `game_id` INT DEFAULT 1");

        // Add is_read, read_at to messages
        $msgCols = $pdo->query("SHOW COLUMNS FROM `messages`")->fetchAll(PDO::FETCH_COLUMN);
        if (!in_array('is_read', $msgCols)) $pdo->exec("ALTER TABLE `messages` ADD COLUMN `is_read` TINYINT(1) DEFAULT 0");
        if (!in_array('read_at', $msgCols)) $pdo->exec("ALTER TABLE `messages` ADD COLUMN `read_at` TIMESTAMP NULL DEFAULT NULL");

        // Create forums table
        $pdo->exec("CREATE TABLE IF NOT EXISTS `forums` (
            `id` INT AUTO_INCREMENT PRIMARY KEY,
            `game_id` INT DEFAULT NULL,
            `title` VARCHAR(200) NOT NULL,
            `description` TEXT,
            `created_by` INT NOT NULL,
            `is_pinned` TINYINT(1) DEFAULT 0,
            `is_locked` TINYINT(1) DEFAULT 0,
            `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

        // Create forum_posts table
        $pdo->exec("CREATE TABLE IF NOT EXISTS `forum_posts` (
            `id` INT AUTO_INCREMENT PRIMARY KEY,
            `forum_id` INT NOT NULL,
            `user_id` INT NOT NULL,
            `content` TEXT NOT NULL,
            `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            `updated_at` TIMESTAMP NULL DEFAULT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

        // Create forum_post_likes table
        $pdo->exec("CREATE TABLE IF NOT EXISTS `forum_post_likes` (
            `id` INT AUTO_INCREMENT PRIMARY KEY,
            `post_id` INT NOT NULL,
            `user_id` INT NOT NULL,
            `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY `unique_post_user_like` (`post_id`, `user_id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

        // Seed default forums if empty
        $stmtF = $pdo->query("SELECT COUNT(*) FROM `forums`");
        if ($stmtF->fetchColumn() == 0) {
            $pdo->exec("INSERT INTO `forums` (`id`, `game_id`, `title`, `description`, `created_by`, `is_pinned`) VALUES
                (1, NULL, '🌐 Welcome & General Community Lounge', 'Official welcome lounge for all GameVerse players. Introduce yourself and meet fellow gamers!', 1, 1),
                (2, 1, '⚽ DLS Season 26 Tactics & Transfer Discussion', 'Share your dream team formations, player skill upgrades, and kit codes.', 1, 1),
                (3, 3, '🎯 CoD Mobile Loadouts & Squad Recruitment', 'Discuss top weapon builds, gunsmith setups, and form tournament squads.', 1, 0)
            ");
        }

    } catch (Exception $e) {
        // Silently skip schema errors if DB is constrained or already migrated
    }
}

function getPDO() {
    static $pdo = null;
    if ($pdo === null) {
        try {
            $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4";
            $pdo = new PDO($dsn, DB_USER, DB_PASS, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ]);
            ensureSchema($pdo);
        } catch (PDOException $e) {
            jsonResponse(['error' => 'Database connection failed: ' . $e->getMessage()], 500);
        }
    }
    return $pdo;
}

function jsonResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    header('Content-Type: application/json');
    echo json_encode($data);
    exit();
}

function getJsonInput() {
    $rawInput = file_get_contents('php://input');
    return json_decode($rawInput, true) ?? [];
}

