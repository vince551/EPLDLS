-- Migration: quote-reply support for messages and forum_posts
-- Safe to re-run: checks information_schema before ALTER

SET @db := DATABASE();

-- messages.reply_to_id
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'messages' AND COLUMN_NAME = 'reply_to_id'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE messages ADD COLUMN reply_to_id INT NULL DEFAULT NULL, ADD CONSTRAINT fk_messages_reply_to FOREIGN KEY (reply_to_id) REFERENCES messages(id) ON DELETE SET NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- forum_posts.reply_to_id
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'forum_posts' AND COLUMN_NAME = 'reply_to_id'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE forum_posts ADD COLUMN reply_to_id INT NULL DEFAULT NULL, ADD CONSTRAINT fk_forum_posts_reply_to FOREIGN KEY (reply_to_id) REFERENCES forum_posts(id) ON DELETE SET NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
