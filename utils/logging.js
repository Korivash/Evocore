const winston = require('winston');
const path = require('path');
const fs = require('fs');
const { EmbedBuilder } = require('discord.js');

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir);
}

// Define log format
const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.printf(info => {
        return `${info.timestamp} [${info.level.toUpperCase()}]: ${info.message}${info.stack ? '\n' + info.stack : ''}`;
    })
);

// Create logger
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: logFormat,
    transports: [
        // Write all logs to console
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                logFormat
            )
        }),
        // Write all logs to combined.log
        new winston.transports.File({
            filename: path.join(logsDir, 'combined.log'),
            maxsize: 5242880, // 5MB
            maxFiles: 5
        }),
        // Write errors to error.log
        new winston.transports.File({
            filename: path.join(logsDir, 'error.log'),
            level: 'error',
            maxsize: 5242880,
            maxFiles: 5
        })
    ]
});

// Store client reference for Discord logging
let discordClient = null;

/**
 * Initialize Discord logging with client reference
 * @param {Client} client - Discord.js client
 */
function initializeDiscordLogging(client) {
    discordClient = client;
    logger.info('Discord logging initialized');
}

/**
 * Log errors to Discord error channel
 * @param {Error} error - The error object
 * @param {string} context - Additional context about where/when the error occurred
 */
async function logErrorToDiscord(error, context = '') {
    if (!discordClient) {
        logger.warn('Discord client not initialized - skipping Discord error log');
        return;
    }

    const ERROR_LOG_CHANNEL_ID = process.env.ERROR_LOG_CHANNEL_ID;
    if (!ERROR_LOG_CHANNEL_ID) {
        logger.warn('ERROR_LOG_CHANNEL_ID not configured - skipping Discord error log');
        return;
    }
    
    try {
        const channel = await discordClient.channels.fetch(ERROR_LOG_CHANNEL_ID).catch(() => null);
        if (!channel) {
            logger.warn(`Error log channel ${ERROR_LOG_CHANNEL_ID} not found or bot lacks access`);
            return;
        }

        const errorStack = error.stack || error.message || String(error);
        const truncatedStack = errorStack.length > 2000 ? errorStack.substring(0, 2000) + '...' : errorStack;

        const embed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('🚨 Bot Error')
            .setDescription(`\`\`\`js\n${truncatedStack}\`\`\``)
            .addFields(
                { name: 'Context', value: context.substring(0, 1024) || 'No context provided', inline: false },
                { name: 'Timestamp', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false },
                { name: 'Error Type', value: error.name || 'Unknown', inline: true },
                { name: 'Guilds Active', value: discordClient.guilds.cache.size.toString(), inline: true }
            )
            .setTimestamp()
            .setFooter({ text: `Bot: ${discordClient.user?.tag || 'Unknown'}` });

        await channel.send({ embeds: [embed] });
        logger.info('✅ Error logged to Discord channel');
    } catch (err) {
        logger.error('❌ Failed to log error to Discord:', err.message);
    }
}

/**
 * Log server join/leave events to Discord
 * @param {Guild} guild - The Discord guild object
 * @param {string} type - 'join' or 'leave'
 */
async function logServerEvent(guild, type) {
    if (!discordClient) {
        logger.warn('Discord client not initialized - skipping server event log');
        return;
    }

    const SERVER_LOG_CHANNEL_ID = process.env.SERVER_LOG_CHANNEL_ID;
    const ERROR_LOG_CHANNEL_ID = process.env.ERROR_LOG_CHANNEL_ID;
    const channelId = SERVER_LOG_CHANNEL_ID || ERROR_LOG_CHANNEL_ID;
    
    if (!channelId) {
        logger.warn('Neither SERVER_LOG_CHANNEL_ID nor ERROR_LOG_CHANNEL_ID configured - skipping server event log');
        return;
    }
    
    try {
        const channel = await discordClient.channels.fetch(channelId).catch(() => null);
        if (!channel) {
            logger.warn(`Server log channel ${channelId} not found or bot lacks access`);
            return;
        }

        const isJoin = type === 'join';
        const embed = new EmbedBuilder()
            .setColor(isJoin ? '#00ff00' : '#ff0000')
            .setTitle(isJoin ? '🎉 Bot Joined Server' : '👋 Bot Left Server')
            .setThumbnail(guild.iconURL({ dynamic: true, size: 256 }) || null)
            .addFields(
                { name: '📋 Server Name', value: guild.name, inline: true },
                { name: '🆔 Server ID', value: guild.id, inline: true },
                { name: '👥 Members', value: guild.memberCount.toString(), inline: true },
                { name: '👑 Owner', value: `<@${guild.ownerId}>`, inline: true },
                { name: '📅 Created', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`, inline: true },
                { name: '🌐 Total Servers', value: discordClient.guilds.cache.size.toString(), inline: true }
            )
            .setTimestamp()
            .setFooter({ text: `Bot: ${discordClient.user?.tag || 'Unknown'}` });

        // Add server description if available
        if (guild.description) {
            embed.addFields({ name: '📝 Description', value: guild.description.substring(0, 1024), inline: false });
        }

        await channel.send({ embeds: [embed] });
        logger.info(`✅ Server ${type} event logged to Discord`);
    } catch (err) {
        logger.error(`❌ Failed to log server ${type} event:`, err.message);
    }
}

/**
 * Send heartbeat status to Discord
 * @param {string} heartbeatMessageId - The ID of the existing heartbeat message to edit (if any)
 * @returns {string|null} The message ID of the heartbeat message
 */
async function sendDiscordHeartbeat(heartbeatMessageId = null) {
    if (!discordClient) {
        logger.debug('Discord client not initialized - skipping Discord heartbeat');
        return null;
    }

    const HEARTBEAT_CHANNEL_ID = process.env.HEARTBEAT_CHANNEL_ID;
    if (!HEARTBEAT_CHANNEL_ID) {
        logger.debug('HEARTBEAT_CHANNEL_ID not configured - skipping Discord heartbeat');
        return null;
    }
    
    try {
        const channel = await discordClient.channels.fetch(HEARTBEAT_CHANNEL_ID).catch(() => null);
        if (!channel) {
            logger.warn(`Heartbeat channel ${HEARTBEAT_CHANNEL_ID} not found or bot lacks access`);
            return null;
        }
        
        const uptime = process.uptime();
        const days = Math.floor(uptime / 86400);
        const hours = Math.floor((uptime % 86400) / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        const memUsage = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
        const memTotal = Math.round(process.memoryUsage().heapTotal / 1024 / 1024);
        const totalMembers = discordClient.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);
        
        // Determine status color based on metrics
        let statusColor = '#00ff00'; // Green by default
        let statusIndicator = '🟢';
        if (discordClient.ws.ping > 300 || memUsage > 500) {
            statusColor = '#ffaa00'; // Orange for warning
            statusIndicator = '🟡';
        }
        if (discordClient.ws.ping > 1000 || memUsage > 1000) {
            statusColor = '#ff0000'; // Red for critical
            statusIndicator = '🔴';
        }
        
        const embed = new EmbedBuilder()
            .setColor(statusColor)
            .setTitle(`${statusIndicator} Bot Heartbeat`)
            .setDescription('System status and health metrics')
            .addFields(
                { name: '⏰ Uptime', value: `${days}d ${hours}h ${minutes}m`, inline: true },
                { name: '🏓 Ping', value: `${discordClient.ws.ping}ms`, inline: true },
                { name: '💾 Memory', value: `${memUsage}MB / ${memTotal}MB`, inline: true },
                { name: '🌐 Servers', value: discordClient.guilds.cache.size.toString(), inline: true },
                { name: '👥 Total Users', value: totalMembers.toLocaleString(), inline: true },
                { name: '📊 Commands', value: discordClient.commands?.size.toString() || '0', inline: true }
            )
            .setTimestamp()
            .setFooter({ text: `Bot: ${discordClient.user?.tag || 'Unknown'}` });
        
        // Edit existing message or send new one
        if (heartbeatMessageId) {
            try {
                const message = await channel.messages.fetch(heartbeatMessageId);
                await message.edit({ embeds: [embed] });
                return heartbeatMessageId;
            } catch (error) {
                // If message not found, send a new one
                logger.debug('Heartbeat message not found, sending new one');
            }
        }
        
        // Send new message
        const message = await channel.send({ embeds: [embed] });
        return message.id;
    } catch (err) {
        logger.error('❌ Failed to send Discord heartbeat:', err.message);
        return null;
    }
}

// Export logger and Discord logging functions
module.exports = logger;
module.exports.initializeDiscordLogging = initializeDiscordLogging;
module.exports.logErrorToDiscord = logErrorToDiscord;
module.exports.logServerEvent = logServerEvent;
module.exports.sendDiscordHeartbeat = sendDiscordHeartbeat;
