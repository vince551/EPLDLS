-- ==========================================================================
-- GameVerse HUB Database Schema for HostAfrica MySQL / phpMyAdmin
-- ==========================================================================

-- 1. Users Table
CREATE TABLE IF NOT EXISTS `users` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `username` VARCHAR(100) NULL UNIQUE,
    `name` VARCHAR(100) NOT NULL UNIQUE,
    `team` VARCHAR(100) NOT NULL,
    `pass` VARCHAR(255) NOT NULL,
    `role` ENUM('admin', 'user') DEFAULT 'user',
    `online` TINYINT(1) DEFAULT 0,
    `status_color` VARCHAR(50) DEFAULT 'status-offline',
    `pic` TEXT,
    `bio` TEXT,
    `favorite_game` VARCHAR(50) DEFAULT 'DLS',
    `can_create_forums` TINYINT(1) DEFAULT 0,
    `twitter` VARCHAR(100) NULL DEFAULT NULL,
    `instagram` VARCHAR(100) NULL DEFAULT NULL,
    `tiktok` VARCHAR(100) NULL DEFAULT NULL,
    `discord` VARCHAR(100) NULL DEFAULT NULL,
    `youtube` VARCHAR(100) NULL DEFAULT NULL,
    `last_seen` TIMESTAMP NULL DEFAULT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Games Catalog Table
CREATE TABLE IF NOT EXISTS `games` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(100) NOT NULL,
    `slug` VARCHAR(50) NOT NULL UNIQUE,
    `icon` TEXT,
    `banner` TEXT,
    `description` TEXT,
    `is_active` TINYINT(1) DEFAULT 1,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Tournaments Table
CREATE TABLE IF NOT EXISTS `tournaments` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `game_id` INT DEFAULT NULL,
    `name` VARCHAR(150) NOT NULL,
    `rules` TEXT,
    `bg_image` TEXT,
    `tournament_type` ENUM('league', 'knockout', 'group_knockout') DEFAULT 'knockout' COMMENT 'league: round-robin, knockout: direct elimination, group_knockout: groups then knockout',
    `status` ENUM('draft', 'group_stage', 'knockout_stage', 'completed') DEFAULT 'draft',
    `current_round` VARCHAR(50) DEFAULT NULL COMMENT 'e.g., GROUP_STAGE, RO16, QUARTERFINAL, SEMIFINAL, FINAL',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Fixtures Table
CREATE TABLE IF NOT EXISTS `fixtures` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `tourn_id` INT NOT NULL,
    `home_team` VARCHAR(100) NOT NULL,
    `away_team` VARCHAR(100) NOT NULL,
    `match_date` DATE NOT NULL,
    `weekday` VARCHAR(30) NOT NULL,
    `match_time` VARCHAR(20) NOT NULL,
    `played` TINYINT(1) DEFAULT 0,
    `home_score` INT DEFAULT NULL,
    `away_score` INT DEFAULT NULL,
    `stage` VARCHAR(50) DEFAULT 'GROUP_STAGE' COMMENT 'GROUP_STAGE, RO16, QUARTERFINAL, SEMIFINAL, FINAL',
    `group_name` VARCHAR(50) DEFAULT NULL COMMENT 'e.g., Group A, Group B (for group stage)',
    `bracket_position` INT DEFAULT NULL COMMENT 'bracket position for knockout stages',
    `next_fixture_id` INT DEFAULT NULL COMMENT 'fixture_id of next round match this winner feeds into',
    `winner_slot` ENUM('home', 'away') DEFAULT NULL COMMENT 'which team slot (home/away) in next_fixture_id',
    `score_submitted_at` TIMESTAMP NULL DEFAULT NULL COMMENT 'when fixture score was first submitted (allows edits for 30 mins)',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`tourn_id`) REFERENCES `tournaments`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`next_fixture_id`) REFERENCES `fixtures`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Friends Connections Table
CREATE TABLE IF NOT EXISTS `friends` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL,
    `friend_id` INT NOT NULL,
    `status` ENUM('pending', 'accepted') DEFAULT 'pending',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`friend_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    UNIQUE KEY `user_friend_unique` (`user_id`, `friend_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. Direct Messages Table (with Read Receipts)
CREATE TABLE IF NOT EXISTS `messages` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `sender_id` INT NOT NULL,
    `receiver_id` INT NOT NULL,
    `message` TEXT NOT NULL,
    `reply_to_id` INT NULL DEFAULT NULL,
    `is_read` TINYINT(1) DEFAULT 0,
    `read_at` TIMESTAMP NULL DEFAULT NULL,
    `sent_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`sender_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`receiver_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`reply_to_id`) REFERENCES `messages`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7. Notifications Table
CREATE TABLE IF NOT EXISTS `notifications` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL,
    `text` TEXT NOT NULL,
    `is_read` TINYINT(1) DEFAULT 0,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 8. Forums Topics Table
CREATE TABLE IF NOT EXISTS `forums` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `game_id` INT DEFAULT NULL,
    `title` VARCHAR(200) NOT NULL,
    `description` TEXT,
    `created_by` INT NOT NULL,
    `is_pinned` TINYINT(1) DEFAULT 0,
    `is_locked` TINYINT(1) DEFAULT 0,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 9. Forum Posts Table
CREATE TABLE IF NOT EXISTS `forum_posts` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `forum_id` INT NOT NULL,
    `user_id` INT NOT NULL,
    `content` TEXT NOT NULL,
    `reply_to_id` INT NULL DEFAULT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NULL DEFAULT NULL,
    FOREIGN KEY (`forum_id`) REFERENCES `forums`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`reply_to_id`) REFERENCES `forum_posts`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 10. Forum Post Likes Table
CREATE TABLE IF NOT EXISTS `forum_post_likes` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `post_id` INT NOT NULL,
    `user_id` INT NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`post_id`) REFERENCES `forum_posts`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    UNIQUE KEY `unique_post_user_like` (`post_id`, `user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 12. Tournament Standings Table (for group stages and league)
CREATE TABLE IF NOT EXISTS `tournament_standings` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `tourn_id` INT NOT NULL,
    `team_name` VARCHAR(100) NOT NULL,
    `group_name` VARCHAR(50) DEFAULT NULL COMMENT 'Group A, B, etc for group stage',
    `played` INT DEFAULT 0,
    `wins` INT DEFAULT 0,
    `draws` INT DEFAULT 0,
    `losses` INT DEFAULT 0,
    `goals_for` INT DEFAULT 0,
    `goals_against` INT DEFAULT 0,
    `goal_difference` INT GENERATED ALWAYS AS (goals_for - goals_against) STORED,
    `points` INT GENERATED ALWAYS AS (wins * 3 + draws * 1) STORED,
    `qualified_to_knockout` TINYINT(1) DEFAULT 0,
    `position_in_knockout` INT DEFAULT NULL COMMENT 'position number in knockout bracket',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY `tournament_team_group` (`tourn_id`, `team_name`, `group_name`),
    FOREIGN KEY (`tourn_id`) REFERENCES `tournaments`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 13. Player Followers Table (for social following system)
CREATE TABLE IF NOT EXISTS `followers` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `follower_id` INT NOT NULL,
    `following_id` INT NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY `follower_following_unique` (`follower_id`, `following_id`),
    FOREIGN KEY (`follower_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`following_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ==========================================================================
-- SEED INITIAL DATA
-- ==========================================================================

-- Seed Featured Games
INSERT INTO `games` (`id`, `name`, `slug`, `icon`, `banner`, `description`, `is_active`)
VALUES 
(1, 'Dream League Soccer (DLS)', 'dls', '⚽', 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=800', 'Mobile football manager & arcade simulator. Compete in DLS custom leagues.', 1),
(2, 'eFootball (PES)', 'efootball', '🎮', 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800', 'Konami ultra-realistic football action for mobile and console esports.', 1),
(3, 'Call of Duty Mobile', 'codm', '🎯', 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800', 'Fast-paced FPS multiplayer and battle royale combat.', 1),
(4, 'PUBG Mobile', 'pubg', '🪂', 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=800', '100-player tactical battle royale survival shooter.', 1),
(5, 'Free Fire', 'freefire', '🔥', 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800', '50-player intense 10-minute battle royale matches.', 1),
(6, 'EA Sports FC / FIFA', 'eafc', '🏆', 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=800', 'Ultimate team building and global competitive tournament football.', 1)
ON DUPLICATE KEY UPDATE `name`=`name`;

-- Seed Default Admin & Player Accounts
INSERT INTO `users` (`id`, `username`, `name`, `team`, `pass`, `role`, `online`, `status_color`, `pic`, `bio`, `favorite_game`, `can_create_forums`) 
VALUES 
(1, 'admin', 'Admin', 'System HQ', '$2y$10$E9qYkKkZ88M2Z9.1gV9hEuK9V1E6eLz7eX.6v7R.7M7a7.7.7.7', 'admin', 1, 'status-online', '', 'System Administrator & Tournament Host', 'DLS', 1),
(2, 'alexmercer', 'Alex Mercer', 'Shadow Strikers', '$2y$10$E9qYkKkZ88M2Z9.1gV9hEuK9V1E6eLz7eX.6v7R.7M7a7.7.7.7', 'user', 0, 'status-offline', '', 'Competitive DLS & CoD player', 'DLS', 0),
(3, 'johndoe', 'John Doe', 'Red Dragons', '$2y$10$E9qYkKkZ88M2Z9.1gV9hEuK9V1E6eLz7eX.6v7R.7M7a7.7.7.7', 'user', 0, 'status-offline', '', 'PUBG & eFootball enthusiast', 'eFootball', 0),
(4, 'mastermind', 'Mastermind', 'Elite Squad', '$2y$10$E9qYkKkZ88M2Z9.1gV9hEuK9V1E6eLz7eX.6v7R.7M7a7.7.7.7', 'user', 1, 'status-online', '', 'Strategic gamer & tournament organizer', 'DLS', 0),
(5, 'visca', 'Visca', 'Blue Force', '$2y$10$E9qYkKkZ88M2Z9.1gV9hEuK9V1E6eLz7eX.6v7R.7M7a7.7.7.7', 'user', 0, 'status-offline', '', 'Casual player exploring all games', 'PUBG', 0)
ON DUPLICATE KEY UPDATE `id`=`id`;

-- Seed Friend Connections (for testing chat)
INSERT INTO `friends` (`id`, `user_id`, `friend_id`, `status`)
VALUES 
(1, 1, 2, 'accepted'),
(2, 1, 4, 'accepted'),
(3, 2, 4, 'accepted'),
(4, 2, 5, 'accepted'),
(5, 4, 1, 'accepted'),
(6, 4, 2, 'accepted'),
(7, 5, 2, 'accepted')
ON DUPLICATE KEY UPDATE `id`=`id`;

-- Seed Sample Messages (for testing chat display)
INSERT INTO `messages` (`id`, `sender_id`, `receiver_id`, `message`, `reply_to_id`, `is_read`, `sent_at`)
VALUES 
(1, 1, 4, 'Hey Mastermind! How are you doing today?', NULL, 1, DATE_SUB(NOW(), INTERVAL 30 MINUTE)),
(2, 4, 1, 'Hey Admin! Doing great, just preparing for the tournament.', NULL, 1, DATE_SUB(NOW(), INTERVAL 28 MINUTE)),
(3, 1, 4, 'That sounds awesome! Let me know if you need any help with setup.', NULL, 1, DATE_SUB(NOW(), INTERVAL 25 MINUTE)),
(4, 4, 1, 'Thanks! I will definitely reach out. What game mode are we focusing on?', 3, 1, DATE_SUB(NOW(), INTERVAL 20 MINUTE)),
(5, 1, 4, 'DLS Season 26 mainly, but we could add eFootball too.', NULL, 1, DATE_SUB(NOW(), INTERVAL 18 MINUTE)),
(6, 2, 4, 'Mastermind, are you up for the friendly match tomorrow?', NULL, 0, DATE_SUB(NOW(), INTERVAL 15 MINUTE)),
(7, 4, 2, 'Yeah, I am in! What time works for you?', NULL, 0, DATE_SUB(NOW(), INTERVAL 12 MINUTE)),
(8, 2, 4, 'How about 8 PM? My usual time.', NULL, 0, DATE_SUB(NOW(), INTERVAL 10 MINUTE)),
(9, 4, 2, 'Perfect! See you then. Let''s make it competitive!', NULL, 0, DATE_SUB(NOW(), INTERVAL 8 MINUTE)),
(10, 2, 5, 'Hey Visca! New to the community?', NULL, 0, DATE_SUB(NOW(), INTERVAL 5 MINUTE)),
(11, 5, 2, 'Yes! Just joined yesterday. Looking forward to playing with everyone!', NULL, 0, DATE_SUB(NOW(), INTERVAL 2 MINUTE))
ON DUPLICATE KEY UPDATE `id`=`id`;

-- Seed Sample Tournament with game_id=1 (DLS)
INSERT INTO `tournaments` (`id`, `game_id`, `name`, `rules`, `bg_image`)
VALUES (1, 1, 'Premier League DLS Cup', '1. Respect match times.\n2. Submit screenshot proofs of final scores.', '')
ON DUPLICATE KEY UPDATE `id`=`id`;

-- Seed Sample Fixtures
INSERT INTO `fixtures` (`id`, `tourn_id`, `home_team`, `away_team`, `match_date`, `weekday`, `match_time`, `played`, `home_score`, `away_score`)
VALUES 
(101, 1, 'Shadow Strikers', 'Red Dragons', '2026-06-01', 'Monday', '18:00', 1, 3, 1),
(102, 1, 'Red Dragons', 'System HQ', '2026-06-03', 'Wednesday', '20:00', 0, NULL, NULL)
ON DUPLICATE KEY UPDATE `id`=`id`;

-- Seed Initial General Discussion Forum
INSERT INTO `forums` (`id`, `game_id`, `title`, `description`, `created_by`, `is_pinned`)
VALUES 
(1, NULL, '🌐 Welcome & General Community Lounge', 'Official welcome lounge for all GameVerse players. Introduce yourself and meet fellow gamers!', 1, 1),
(2, 1, '⚽ DLS Season 26 Tactics & Transfer Discussion', 'Share your dream team formations, player skill upgrades, and kit codes.', 1, 1),
(3, 3, '🎯 CoD Mobile Loadouts & Clan Recruitment', 'Discuss top weapon builds, gunsmith setups, and form tournament squads.', 1, 0)
ON DUPLICATE KEY UPDATE `id`=`id`;
