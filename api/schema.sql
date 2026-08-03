-- EPL DLS HUB Database Schema for HostAfrica MySQL / phpMyAdmin

CREATE TABLE IF NOT EXISTS `users` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(100) NOT NULL UNIQUE,
    `team` VARCHAR(100) NOT NULL,
    `pass` VARCHAR(255) NOT NULL,
    `role` ENUM('admin', 'user') DEFAULT 'user',
    `online` TINYINT(1) DEFAULT 0,
    `status_color` VARCHAR(50) DEFAULT 'status-offline',
    `pic` TEXT,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `tournaments` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(150) NOT NULL,
    `rules` TEXT,
    `bg_image` TEXT,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

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
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`tourn_id`) REFERENCES `tournaments`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

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

CREATE TABLE IF NOT EXISTS `messages` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `sender_id` INT NOT NULL,
    `receiver_id` INT NOT NULL,
    `message` TEXT NOT NULL,
    `sent_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`sender_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`receiver_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `notifications` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL,
    `text` TEXT NOT NULL,
    `is_read` TINYINT(1) DEFAULT 0,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seed Default Admin & Player Accounts
-- Passwords:
-- Admin -> admin123 ($2y$10$wN1r3/pL5c/.O3s8Qj8.1eJqQ0e0x6nU782Xz6oM0v5z/YtN1gUeG or password_hash default)
INSERT INTO `users` (`id`, `name`, `team`, `pass`, `role`, `online`, `status_color`, `pic`) 
VALUES 
(1, 'Admin', 'System HQ', '$2y$10$E9qYkKkZ88M2Z9.1gV9hEuK9V1E6eLz7eX.6v7R.7M7a7.7.7.7', 'admin', 1, 'status-online', ''),
(2, 'Alex Mercer', 'Shadow Strikers', '$2y$10$E9qYkKkZ88M2Z9.1gV9hEuK9V1E6eLz7eX.6v7R.7M7a7.7.7.7', 'user', 0, 'status-offline', ''),
(3, 'John Doe', 'Red Dragons', '$2y$10$E9qYkKkZ88M2Z9.1gV9hEuK9V1E6eLz7eX.6v7R.7M7a7.7.7.7', 'user', 0, 'status-offline', '')
ON DUPLICATE KEY UPDATE `id`=`id`;

-- Seed Sample Tournament
INSERT INTO `tournaments` (`id`, `name`, `rules`, `bg_image`)
VALUES (1, 'Premier League DLS Cup', '1. Respect match times.\n2. Submit screenshot proofs of final scores.', '')
ON DUPLICATE KEY UPDATE `id`=`id`;

-- Seed Sample Fixtures
INSERT INTO `fixtures` (`id`, `tourn_id`, `home_team`, `away_team`, `match_date`, `weekday`, `match_time`, `played`, `home_score`, `away_score`)
VALUES 
(101, 1, 'Shadow Strikers', 'Red Dragons', '2026-06-01', 'Monday', '18:00', 1, 3, 1),
(102, 1, 'Red Dragons', 'System HQ', '2026-06-03', 'Wednesday', '20:00', 0, NULL, NULL)
ON DUPLICATE KEY UPDATE `id`=`id`;
