const mysql = require('mysql2/promise');
const logger = require('../utils/logger');

let pool;

async function init() {
    try {
        pool = mysql.createPool({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0,
            authPlugins: {
                mysql_native_password: () => () => {
                    const crypto = require('crypto');
                    return (pluginData) => {
                        const password = Buffer.from(process.env.DB_PASSWORD);
                        const token = Buffer.from(pluginData.slice(0, 20));
                        
                        const stage1 = crypto.createHash('sha1').update(password).digest();
                        const stage2 = crypto.createHash('sha1').update(stage1).digest();
                        const stage3 = crypto.createHash('sha1').update(token).update(stage2).digest();
                        
                        const result = Buffer.alloc(20);
                        for (let i = 0; i < 20; i++) {
                            result[i] = stage1[i] ^ stage3[i];
                        }
                        
                        return result;
                    };
                }
            }
        });

        const connection = await pool.getConnection();
        logger.info('Database connected successfully');
        connection.release();

        await createTables();
    } catch (error) {
        logger.error('Database connection error:', error);
        throw error;
    }
}

async function createTables() {
    const connection = await pool.getConnection();
    
    try {
        await connection.query(`
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
            )
        `);

        await connection.query(`
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
            )
        `);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS warnings (
                id INT AUTO_INCREMENT PRIMARY KEY,
                guild_id VARCHAR(20) NOT NULL,
                user_id VARCHAR(20) NOT NULL,
                moderator_id VARCHAR(20) NOT NULL,
                reason TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_guild_user (guild_id, user_id)
            )
        `);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS temp_bans (
                guild_id VARCHAR(20) NOT NULL,
                user_id VARCHAR(20) NOT NULL,
                expires_at TIMESTAMP NOT NULL,
                reason TEXT,
                PRIMARY KEY (guild_id, user_id),
                INDEX idx_expires (expires_at)
            )
        `);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS command_stats (
                id INT AUTO_INCREMENT PRIMARY KEY,
                guild_id VARCHAR(20) NOT NULL,
                user_id VARCHAR(20) NOT NULL,
                command_name VARCHAR(50) NOT NULL,
                used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_guild_command (guild_id, command_name)
            )
        `);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS automod_violations (
                id INT AUTO_INCREMENT PRIMARY KEY,
                guild_id VARCHAR(20) NOT NULL,
                user_id VARCHAR(20) NOT NULL,
                violation_type VARCHAR(50) NOT NULL,
                content TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_guild_user (guild_id, user_id)
            )
        `);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS blizzard_cache (
                id INT AUTO_INCREMENT PRIMARY KEY,
                cache_key VARCHAR(255) UNIQUE NOT NULL,
                cache_data JSON,
                expires_at TIMESTAMP NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_key_expires (cache_key, expires_at)
            )
        `);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS user_levels (
                guild_id VARCHAR(20) NOT NULL,
                user_id VARCHAR(20) NOT NULL,
                xp INT DEFAULT 0,
                level INT DEFAULT 0,
                messages_sent INT DEFAULT 0,
                last_xp_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (guild_id, user_id),
                INDEX idx_level (guild_id, level DESC)
            )
        `);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS custom_commands (
                id INT AUTO_INCREMENT PRIMARY KEY,
                guild_id VARCHAR(20) NOT NULL,
                trigger_word VARCHAR(100) NOT NULL,
                response TEXT NOT NULL,
                created_by VARCHAR(20) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY unique_trigger (guild_id, trigger_word)
            )
        `);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS scheduled_messages (
                id INT AUTO_INCREMENT PRIMARY KEY,
                guild_id VARCHAR(20) NOT NULL,
                channel_id VARCHAR(20) NOT NULL,
                message TEXT NOT NULL,
                cron_expression VARCHAR(100) NOT NULL,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS guild_events (
                id INT AUTO_INCREMENT PRIMARY KEY,
                guild_id VARCHAR(20) NOT NULL,
                organizer_id VARCHAR(20) NOT NULL,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                event_date TIMESTAMP NOT NULL,
                event_type VARCHAR(50) NOT NULL,
                max_participants INT DEFAULT 0,
                channel_id VARCHAR(20),
                message_id VARCHAR(20),
                is_cancelled BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_guild_date (guild_id, event_date),
                INDEX idx_organizer (organizer_id)
            )
        `);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS event_participants (
                id INT AUTO_INCREMENT PRIMARY KEY,
                event_id INT NOT NULL,
                user_id VARCHAR(20) NOT NULL,
                status ENUM('accepted', 'declined', 'tentative', 'late') DEFAULT 'tentative',
                wow_class VARCHAR(50),
                wow_role VARCHAR(50),
                notes TEXT,
                joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY unique_participation (event_id, user_id),
                FOREIGN KEY (event_id) REFERENCES guild_events(id) ON DELETE CASCADE,
                INDEX idx_event_status (event_id, status)
            )
        `);

        logger.info('All database tables created/verified');
    } catch (error) {
        logger.error('Error creating tables:', error);
        throw error;
    } finally {
        connection.release();
    }
}

async function getGuildConfig(guildId) {
    const [rows] = await pool.query(
        'SELECT * FROM guild_config WHERE guild_id = ?',
        [guildId]
    );
    return rows[0] || null;
}

async function createGuildConfig(guildId) {
    await pool.query(
        'INSERT INTO guild_config (guild_id) VALUES (?) ON DUPLICATE KEY UPDATE guild_id = guild_id',
        [guildId]
    );
    return await getGuildConfig(guildId);
}

async function updateGuildConfig(guildId, updates) {
    const allowedFields = [
        'prefix', 'mod_log_channel_id', 'welcome_channel_id', 'goodbye_channel_id',
        'welcome_message', 'goodbye_message', 'auto_role_id', 'auto_mod_enabled',
        'anti_spam_enabled', 'anti_link_enabled', 'anti_invite_enabled',
        'max_warnings', 'mute_role_id', 'blizzard_api_enabled'
    ];
    
    const updateFields = Object.keys(updates)
        .filter(key => allowedFields.includes(key))
        .map(key => `${key} = ?`)
        .join(', ');
    
    if (updateFields.length === 0) return;
    
    const values = Object.keys(updates)
        .filter(key => allowedFields.includes(key))
        .map(key => updates[key]);
    
    values.push(guildId);
    
    await pool.query(
        `UPDATE guild_config SET ${updateFields} WHERE guild_id = ?`,
        values
    );
}

async function addModLog(guildId, userId, moderatorId, action, reason, duration = null) {
    await pool.query(
        'INSERT INTO mod_logs (guild_id, user_id, moderator_id, action, reason, duration) VALUES (?, ?, ?, ?, ?, ?)',
        [guildId, userId, moderatorId, action, reason, duration]
    );
}

async function getModLogs(guildId, userId) {
    const [rows] = await pool.query(
        'SELECT * FROM mod_logs WHERE guild_id = ? AND user_id = ? ORDER BY created_at DESC',
        [guildId, userId]
    );
    return rows;
}

async function getAllModLogs(guildId, limit = 50) {
    const [rows] = await pool.query(
        'SELECT * FROM mod_logs WHERE guild_id = ? ORDER BY created_at DESC LIMIT ?',
        [guildId, limit]
    );
    return rows;
}

async function addWarning(guildId, userId, moderatorId, reason) {
    await pool.query(
        'INSERT INTO warnings (guild_id, user_id, moderator_id, reason) VALUES (?, ?, ?, ?)',
        [guildId, userId, moderatorId, reason]
    );
}

async function getWarnings(guildId, userId) {
    const [rows] = await pool.query(
        'SELECT * FROM warnings WHERE guild_id = ? AND user_id = ? ORDER BY created_at DESC',
        [guildId, userId]
    );
    return rows;
}

async function getWarningCount(guildId, userId) {
    const [rows] = await pool.query(
        'SELECT COUNT(*) as count FROM warnings WHERE guild_id = ? AND user_id = ?',
        [guildId, userId]
    );
    return rows[0].count;
}

async function clearWarnings(guildId, userId) {
    await pool.query(
        'DELETE FROM warnings WHERE guild_id = ? AND user_id = ?',
        [guildId, userId]
    );
}

async function addTempBan(guildId, userId, expiresAt, reason) {
    await pool.query(
        'INSERT INTO temp_bans (guild_id, user_id, expires_at, reason) VALUES (?, ?, ?, ?)',
        [guildId, userId, expiresAt, reason]
    );
}

async function removeTempBan(guildId, userId) {
    await pool.query(
        'DELETE FROM temp_bans WHERE guild_id = ? AND user_id = ?',
        [guildId, userId]
    );
}

async function getExpiredTempBans() {
    const [rows] = await pool.query(
        'SELECT * FROM temp_bans WHERE expires_at <= NOW()'
    );
    return rows;
}

async function logCommand(guildId, userId, commandName) {
    await pool.query(
        'INSERT INTO command_stats (guild_id, user_id, command_name) VALUES (?, ?, ?)',
        [guildId, userId, commandName]
    );
}

async function getCommandStats(guildId) {
    const [rows] = await pool.query(
        `SELECT command_name, COUNT(*) as count 
         FROM command_stats 
         WHERE guild_id = ? 
         GROUP BY command_name 
         ORDER BY count DESC`,
        [guildId]
    );
    return rows;
}

async function addAutoModViolation(guildId, userId, violationType, content) {
    await pool.query(
        'INSERT INTO automod_violations (guild_id, user_id, violation_type, content) VALUES (?, ?, ?, ?)',
        [guildId, userId, violationType, content]
    );
}

async function getAutoModViolations(guildId, userId) {
    const [rows] = await pool.query(
        'SELECT * FROM automod_violations WHERE guild_id = ? AND user_id = ? ORDER BY created_at DESC LIMIT 20',
        [guildId, userId]
    );
    return rows;
}

async function getCachedBlizzardData(key) {
    const [rows] = await pool.query(
        'SELECT cache_data FROM blizzard_cache WHERE cache_key = ? AND expires_at > NOW()',
        [key]
    );
    return rows[0] ? rows[0].cache_data : null;
}

async function setCachedBlizzardData(key, data, ttlMinutes = 60) {
    const expiresAt = new Date(Date.now() + ttlMinutes * 60000);
    await pool.query(
        'INSERT INTO blizzard_cache (cache_key, cache_data, expires_at) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE cache_data = ?, expires_at = ?',
        [key, JSON.stringify(data), expiresAt, JSON.stringify(data), expiresAt]
    );
}

async function addXP(guildId, userId, amount) {
    await pool.query(
        `INSERT INTO user_levels (guild_id, user_id, xp, messages_sent, last_xp_at) 
         VALUES (?, ?, ?, 1, NOW()) 
         ON DUPLICATE KEY UPDATE 
            xp = xp + ?, 
            messages_sent = messages_sent + 1, 
            last_xp_at = NOW()`,
        [guildId, userId, amount, amount]
    );
    
    const [rows] = await pool.query(
        'SELECT xp, level FROM user_levels WHERE guild_id = ? AND user_id = ?',
        [guildId, userId]
    );
    
    if (rows[0]) {
        const newLevel = Math.floor(rows[0].xp / 100);
        if (newLevel > rows[0].level) {
            await pool.query(
                'UPDATE user_levels SET level = ? WHERE guild_id = ? AND user_id = ?',
                [newLevel, guildId, userId]
            );
            return { leveledUp: true, newLevel };
        }
    }
    
    return { leveledUp: false };
}

async function getUserLevel(guildId, userId) {
    const [rows] = await pool.query(
        'SELECT * FROM user_levels WHERE guild_id = ? AND user_id = ?',
        [guildId, userId]
    );
    return rows[0] || null;
}

async function getLeaderboard(guildId, limit = 10) {
    const [rows] = await pool.query(
        'SELECT * FROM user_levels WHERE guild_id = ? ORDER BY xp DESC LIMIT ?',
        [guildId, limit]
    );
    return rows;
}

async function addCustomCommand(guildId, trigger, response, createdBy) {
    await pool.query(
        'INSERT INTO custom_commands (guild_id, trigger_word, response, created_by) VALUES (?, ?, ?, ?)',
        [guildId, trigger, response, createdBy]
    );
}

async function getCustomCommand(guildId, trigger) {
    const [rows] = await pool.query(
        'SELECT * FROM custom_commands WHERE guild_id = ? AND trigger_word = ?',
        [guildId, trigger]
    );
    return rows[0] || null;
}

async function deleteCustomCommand(guildId, trigger) {
    await pool.query(
        'DELETE FROM custom_commands WHERE guild_id = ? AND trigger_word = ?',
        [guildId, trigger]
    );
}

async function getAllCustomCommands(guildId) {
    const [rows] = await pool.query(
        'SELECT * FROM custom_commands WHERE guild_id = ? ORDER BY trigger_word',
        [guildId]
    );
    return rows;
}

async function createEvent(guildId, organizerId, title, description, eventDate, eventType, maxParticipants) {
    const [result] = await pool.query(
        `INSERT INTO guild_events (guild_id, organizer_id, title, description, event_date, event_type, max_participants)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [guildId, organizerId, title, description, eventDate, eventType, maxParticipants]
    );
    return result.insertId;
}

async function getEvent(eventId) {
    const [rows] = await pool.query(
        'SELECT * FROM guild_events WHERE id = ? AND is_cancelled = FALSE',
        [eventId]
    );
    return rows[0] || null;
}

async function getGuildEvents(guildId, includeOld = false) {
    let query = 'SELECT * FROM guild_events WHERE guild_id = ? AND is_cancelled = FALSE';
    
    if (!includeOld) {
        query += ' AND event_date >= NOW()';
    }
    
    query += ' ORDER BY event_date ASC';
    
    const [rows] = await pool.query(query, [guildId]);
    return rows;
}

async function updateEventMessage(eventId, channelId, messageId) {
    await pool.query(
        'UPDATE guild_events SET channel_id = ?, message_id = ? WHERE id = ?',
        [channelId, messageId, eventId]
    );
}

async function cancelEvent(eventId) {
    await pool.query(
        'UPDATE guild_events SET is_cancelled = TRUE WHERE id = ?',
        [eventId]
    );
}

async function deleteEvent(eventId) {
    await pool.query(
        'DELETE FROM guild_events WHERE id = ?',
        [eventId]
    );
}

async function addEventParticipant(eventId, userId, status = 'tentative') {
    await pool.query(
        `INSERT INTO event_participants (event_id, user_id, status)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE status = ?, updated_at = CURRENT_TIMESTAMP`,
        [eventId, userId, status, status]
    );
}

async function removeEventParticipant(eventId, userId) {
    await pool.query(
        'DELETE FROM event_participants WHERE event_id = ? AND user_id = ?',
        [eventId, userId]
    );
}

async function getEventParticipants(eventId) {
    const [rows] = await pool.query(
        'SELECT * FROM event_participants WHERE event_id = ? ORDER BY joined_at ASC',
        [eventId]
    );
    return rows;
}

async function getParticipantCount(eventId, status = null) {
    let query = 'SELECT COUNT(*) as count FROM event_participants WHERE event_id = ?';
    const params = [eventId];
    
    if (status) {
        query += ' AND status = ?';
        params.push(status);
    }
    
    const [rows] = await pool.query(query, params);
    return rows[0].count;
}

async function updateParticipantClass(eventId, userId, wowClass, wowRole) {
    await pool.query(
        'UPDATE event_participants SET wow_class = ?, wow_role = ?, updated_at = CURRENT_TIMESTAMP WHERE event_id = ? AND user_id = ?',
        [wowClass, wowRole, eventId, userId]
    );
}

async function updateParticipantNotes(eventId, userId, notes) {
    await pool.query(
        'UPDATE event_participants SET notes = ?, updated_at = CURRENT_TIMESTAMP WHERE event_id = ? AND user_id = ?',
        [notes, eventId, userId]
    );
}

async function getUpcomingEvents(guildId, limit = 25) {
    const [rows] = await pool.query(
        'SELECT * FROM guild_events WHERE guild_id = ? AND is_cancelled = FALSE AND event_date >= NOW() ORDER BY event_date ASC LIMIT ?',
        [guildId, limit]
    );
    return rows;
}

async function updateEventMessageId(eventId, messageId) {
    await pool.query(
        'UPDATE guild_events SET message_id = ? WHERE id = ?',
        [messageId, eventId]
    );
}

async function cleanupOldData() {
    await pool.query(
        'DELETE FROM command_stats WHERE used_at < DATE_SUB(NOW(), INTERVAL 90 DAY)'
    );
    
    await pool.query(
        'DELETE FROM automod_violations WHERE created_at < DATE_SUB(NOW(), INTERVAL 30 DAY)'
    );
    
    await pool.query(
        'DELETE FROM blizzard_cache WHERE expires_at < NOW()'
    );
    
    await pool.query(
        'DELETE FROM guild_events WHERE event_date < DATE_SUB(NOW(), INTERVAL 90 DAY) AND is_cancelled = TRUE'
    );
}

async function close() {
    if (pool) {
        await pool.end();
        logger.info('Database connection closed');
    }
}

init();

module.exports = {
    getGuildConfig,
    createGuildConfig,
    updateGuildConfig,
    addModLog,
    getModLogs,
    getAllModLogs,
    addWarning,
    getWarnings,
    getWarningCount,
    clearWarnings,
    addTempBan,
    removeTempBan,
    getExpiredTempBans,
    logCommand,
    getCommandStats,
    addAutoModViolation,
    getAutoModViolations,
    getCachedBlizzardData,
    setCachedBlizzardData,
    addXP,
    getUserLevel,
    getLeaderboard,
    addCustomCommand,
    getCustomCommand,
    deleteCustomCommand,
    getAllCustomCommands,
    createEvent,
    getEvent,
    getGuildEvents,
    updateEventMessage,
    cancelEvent,
    deleteEvent,
    addEventParticipant,
    removeEventParticipant,
    getEventParticipants,
    getParticipantCount,
    updateParticipantClass,
    updateParticipantNotes,
    cleanupOldData,
    close
};
