-- Discord Bot Database Setup Script
-- Run this in your MySQL console or client to create the database and user

-- Create database
CREATE DATABASE IF NOT EXISTS discord_bot CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Use the database
USE discord_bot;

-- Optional: Create a dedicated user for the bot
-- Replace 'your_password_here' with a strong password
-- CREATE USER 'discord_bot_user'@'localhost' IDENTIFIED BY 'your_password_here';
-- GRANT ALL PRIVILEGES ON discord_bot.* TO 'discord_bot_user'@'localhost';
-- FLUSH PRIVILEGES;

-- The bot will automatically create all tables on first run, but here they are for reference:

-- Guild configuration table
CREATE TABLE IF NOT EXISTS guild_config (
    guild_id VARCHAR(20) PRIMARY KEY,
    prefix VARCHAR(10) DEFAULT '!',
    mod_log_channel_id VARCHAR(20),
    welcome_channel_id VARCHAR(20),
    goodbye_channel_id VARCHAR(20),
    welcome_message TEXT,
    goodbye_message TEXT,
    auto_role_id VARCHAR(20),
    auto_mod_enabled BOOLEAN DEFAULT FALSE,
    anti_spam_enabled BOOLEAN DEFAULT FALSE,
    anti_link_enabled BOOLEAN DEFAULT FALSE,
    anti_invite_enabled BOOLEAN DEFAULT FALSE,
    max_warnings INT DEFAULT 3,
    mute_role_id VARCHAR(20),
    blizzard_api_enabled BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Moderation logs table
CREATE TABLE IF NOT EXISTS mod_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    guild_id VARCHAR(20) NOT NULL,
    user_id VARCHAR(20) NOT NULL,
    moderator_id VARCHAR(20) NOT NULL,
    action VARCHAR(50) NOT NULL,
    reason TEXT,
    duration INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_guild_user (guild_id, user_id),
    INDEX idx_action (action)
);

-- Warnings table
CREATE TABLE IF NOT EXISTS warnings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    guild_id VARCHAR(20) NOT NULL,
    user_id VARCHAR(20) NOT NULL,
    moderator_id VARCHAR(20) NOT NULL,
    reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_guild_user (guild_id, user_id)
);

-- Temporary bans table
CREATE TABLE IF NOT EXISTS temp_bans (
    guild_id VARCHAR(20) NOT NULL,
    user_id VARCHAR(20) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    reason TEXT,
    PRIMARY KEY (guild_id, user_id),
    INDEX idx_expires (expires_at)
);

-- Command usage statistics
CREATE TABLE IF NOT EXISTS command_stats (
    id INT AUTO_INCREMENT PRIMARY KEY,
    guild_id VARCHAR(20) NOT NULL,
    user_id VARCHAR(20) NOT NULL,
    command_name VARCHAR(50) NOT NULL,
    used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_guild_command (guild_id, command_name)
);

-- Auto-mod violations
CREATE TABLE IF NOT EXISTS automod_violations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    guild_id VARCHAR(20) NOT NULL,
    user_id VARCHAR(20) NOT NULL,
    violation_type VARCHAR(50) NOT NULL,
    content TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_guild_user (guild_id, user_id)
);

-- Blizzard API cache
CREATE TABLE IF NOT EXISTS blizzard_cache (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cache_key VARCHAR(255) UNIQUE NOT NULL,
    cache_data JSON,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_key_expires (cache_key, expires_at)
);

-- User levels and XP
CREATE TABLE IF NOT EXISTS user_levels (
    guild_id VARCHAR(20) NOT NULL,
    user_id VARCHAR(20) NOT NULL,
    xp INT DEFAULT 0,
    level INT DEFAULT 0,
    messages_sent INT DEFAULT 0,
    last_xp_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (guild_id, user_id),
    INDEX idx_level (guild_id, level DESC)
);

-- Custom commands
CREATE TABLE IF NOT EXISTS custom_commands (
    id INT AUTO_INCREMENT PRIMARY KEY,
    guild_id VARCHAR(20) NOT NULL,
    trigger_word VARCHAR(100) NOT NULL,
    response TEXT NOT NULL,
    created_by VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_trigger (guild_id, trigger_word)
);

-- Scheduled messages
CREATE TABLE IF NOT EXISTS scheduled_messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    guild_id VARCHAR(20) NOT NULL,
    channel_id VARCHAR(20) NOT NULL,
    message TEXT NOT NULL,
    cron_expression VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Show tables
SHOW TABLES;

-- All done! The bot will handle the rest automatically.
SELECT 'Database setup complete! You can now start your bot.' AS Status;
