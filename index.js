const { Client, GatewayIntentBits, Collection, Events, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v10');
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const db = require('./database/database');
const logger = require('./utils/logging');
const { initializeDiscordLogging, logErrorToDiscord, logServerEvent, sendDiscordHeartbeat } = require('./utils/logging');
const { handleEventButton, handleEventSelectMenu } = require('./utils/eventButtonHandler');
const cron = require('node-cron');

// ANSI Color Codes for beautiful console output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    
    // Text colors
    black: '\x1b[30m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    
    // Background colors
    bgRed: '\x1b[41m',
    bgGreen: '\x1b[42m',
    bgYellow: '\x1b[43m',
    bgBlue: '\x1b[44m',
    bgMagenta: '\x1b[45m',
    bgCyan: '\x1b[46m',
};

// Helper function for colored console output
function log(message, color = 'white', prefix = '') {
    const timestamp = new Date().toISOString().replace('T', ' ').substr(0, 19);
    console.log(`${colors.dim}[${timestamp}]${colors.reset} ${color}${prefix}${message}${colors.reset}`);
}

// Initialize Discord client with intents
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildModeration,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.DirectMessages
    ]
});

// Collections for commands and cooldowns
client.commands = new Collection();
client.cooldowns = new Collection();

// Logging channel IDs from .env
const ERROR_LOG_CHANNEL_ID = process.env.ERROR_LOG_CHANNEL_ID;
const HEARTBEAT_CHANNEL_ID = process.env.HEARTBEAT_CHANNEL_ID;
const SERVER_LOG_CHANNEL_ID = process.env.SERVER_LOG_CHANNEL_ID;

// Heartbeat tracking
let lastHeartbeat = Date.now();
let heartbeatInterval = null;
let heartbeatFailures = 0;
let heartbeatMessageId = null; // Track the heartbeat message for editing
const MAX_HEARTBEAT_FAILURES = 3;

// ============================================================================
// HEARTBEAT SYSTEM
// ============================================================================

function startHeartbeat() {
    log('💓 Starting heartbeat system...', colors.cyan, '');
    
    // Console and Discord heartbeat every 5 minutes
    heartbeatInterval = setInterval(async () => {
        const uptime = process.uptime();
        const hours = Math.floor(uptime / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        const memUsage = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
        
        log(`💓 HEARTBEAT | Uptime: ${hours}h ${minutes}m | Memory: ${memUsage}MB | Guilds: ${client.guilds.cache.size} | Ping: ${client.ws.ping}ms`, colors.green, '');
        
        lastHeartbeat = Date.now();
        heartbeatFailures = 0;
        
        // Send heartbeat to Discord channel
        heartbeatMessageId = await sendDiscordHeartbeat(heartbeatMessageId);
    }, 5 * 60 * 1000); // Every 5 minutes
    
    // Check for missed heartbeats every minute
    setInterval(async () => {
        const timeSinceLastBeat = Date.now() - lastHeartbeat;
        if (timeSinceLastBeat > 6 * 60 * 1000) { // More than 6 minutes
            heartbeatFailures++;
            log(`⚠️  HEARTBEAT WARNING | Missed heartbeat! Failures: ${heartbeatFailures}/${MAX_HEARTBEAT_FAILURES}`, colors.yellow, '');
            
            if (heartbeatFailures >= MAX_HEARTBEAT_FAILURES) {
                log(`❌ HEARTBEAT CRITICAL | Multiple failures detected! Bot may be unresponsive.`, colors.red, '');
                await logErrorToDiscord(
                    new Error('Bot heartbeat failed multiple times'),
                    `Critical: Bot may be experiencing issues\nFailures: ${heartbeatFailures}\nLast successful heartbeat: <t:${Math.floor(lastHeartbeat / 1000)}:R>`
                );
            }
        }
    }, 60 * 1000); // Check every minute
}

// ============================================================================
// COMMAND LOADING
// ============================================================================

const commandsPath = path.join(__dirname, 'commands');
if (fs.existsSync(commandsPath)) {
    const commandFolders = fs.readdirSync(commandsPath);

    for (const folder of commandFolders) {
        const folderPath = path.join(commandsPath, folder);
        if (!fs.statSync(folderPath).isDirectory()) continue;

        const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));

        for (const file of commandFiles) {
            const filePath = path.join(folderPath, file);
            try {
                const command = require(filePath);
                
                if ('data' in command && 'execute' in command) {
                    client.commands.set(command.data.name, command);
                    log(`✓ Loaded command: ${command.data.name}`, colors.green, '');
                } else {
                    log(`⚠  Command at ${filePath} is missing required "data" or "execute" property`, colors.yellow, '');
                }
            } catch (error) {
                log(`✗ Failed to load command: ${file}`, colors.red, '');
                logger.error(`Error loading command ${file}:`, error);
            }
        }
    }
}

// ============================================================================
// INTERACTION HANDLER
// ============================================================================

client.on(Events.InteractionCreate, async interaction => {
    try {
        if (interaction.isChatInputCommand()) {
            const command = client.commands.get(interaction.commandName);
            if (!command) {
                logger.warn(`Command not found: ${interaction.commandName}`);
                return;
            }

            // Cooldown check
            const { cooldowns } = client;
            if (!cooldowns.has(command.data.name)) {
                cooldowns.set(command.data.name, new Collection());
            }

            const now = Date.now();
            const timestamps = cooldowns.get(command.data.name);
            const defaultCooldownDuration = 3;
            const cooldownAmount = (command.cooldown ?? defaultCooldownDuration) * 1000;

            if (timestamps.has(interaction.user.id)) {
                const expirationTime = timestamps.get(interaction.user.id) + cooldownAmount;

                if (now < expirationTime) {
                    const expiredTimestamp = Math.round(expirationTime / 1000);
                    return interaction.reply({
                        content: `⏰ Please wait, you are on cooldown. You can use this command again <t:${expiredTimestamp}:R>.`,
                        ephemeral: true
                    });
                }
            }

            timestamps.set(interaction.user.id, now);
            setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);

            // Execute command
            log(`⚡ ${interaction.user.tag} used /${interaction.commandName} in ${interaction.guild?.name || 'DM'}`, colors.cyan, '');
            await command.execute(interaction);
            
        } else if (interaction.isButton()) {
            log(`🔘 ${interaction.user.tag} clicked button: ${interaction.customId}`, colors.magenta, '');
            
            // Handle event buttons
            if (interaction.customId.startsWith('event_')) {
                await handleEventButton(interaction);
            }
            // Add other button handlers here
            
        } else if (interaction.isModalSubmit()) {
            log(`📝 ${interaction.user.tag} submitted modal: ${interaction.customId}`, colors.blue, '');
            // Handle modals here or in command files
            
        } else if (interaction.isStringSelectMenu()) {
            log(`📋 ${interaction.user.tag} used select menu: ${interaction.customId}`, colors.yellow, '');
            
            // Handle event select menus
            if (interaction.customId.startsWith('event_')) {
                await handleEventSelectMenu(interaction);
            }
            // Add other select menu handlers here
        }
    } catch (error) {
        logger.error('Error handling interaction:', error);
        await logErrorToDiscord(error, `Interaction error: ${interaction.commandName || interaction.customId} by ${interaction.user.tag}`);
        
        const errorMessage = {
            content: '❌ An error occurred while executing this command. The developers have been notified.',
            ephemeral: true
        };

        if (interaction.replied || interaction.deferred) {
            await interaction.followUp(errorMessage);
        } else {
            await interaction.reply(errorMessage);
        }
    }
});

// ============================================================================
// MESSAGE EVENTS
// ============================================================================

client.on(Events.MessageCreate, async message => {
    if (message.author.bot) return;
    
    try {
        // Your message handling logic here
        
    } catch (error) {
        logger.error('Error handling message:', error);
        await logErrorToDiscord(error, `Message error from ${message.author.tag} in ${message.guild?.name || 'DM'}`);
    }
});

// ============================================================================
// MEMBER EVENTS
// ============================================================================

client.on(Events.GuildMemberAdd, async member => {
    try {
        log(`👋 ${member.user.tag} joined ${member.guild.name}`, colors.green, '');

        const guildConfig = await db.getGuildConfig(member.guild.id);
        if (!guildConfig || !guildConfig.welcome_channel_id || !guildConfig.welcome_message) return;

        const channel = member.guild.channels.cache.get(guildConfig.welcome_channel_id);
        if (channel) {
            const welcomeMessage = guildConfig.welcome_message
                .replace('{user}', `<@${member.id}>`)
                .replace('{server}', member.guild.name);

            const embed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('👋 Welcome!')
                .setDescription(welcomeMessage)
                .setThumbnail(member.user.displayAvatarURL())
                .setTimestamp();

            await channel.send({ embeds: [embed] });
        }
    } catch (error) {
        logger.error('Error handling member join:', error);
        await logErrorToDiscord(error, `Member join error: ${member.user.tag} in ${member.guild.name}`);
    }
});

client.on(Events.GuildMemberRemove, async member => {
    try {
        log(`👋 ${member.user.tag} left ${member.guild.name}`, colors.yellow, '');

        const guildConfig = await db.getGuildConfig(member.guild.id);
        if (!guildConfig || !guildConfig.goodbye_channel_id || !guildConfig.goodbye_message) return;

        const channel = member.guild.channels.cache.get(guildConfig.goodbye_channel_id);
        if (channel) {
            const goodbyeMessage = guildConfig.goodbye_message
                .replace('{user}', member.user.tag)
                .replace('{server}', member.guild.name);

            const embed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('👋 Goodbye!')
                .setDescription(goodbyeMessage)
                .setThumbnail(member.user.displayAvatarURL())
                .setTimestamp();

            await channel.send({ embeds: [embed] });
        }
    } catch (error) {
        logger.error('Error handling member leave:', error);
        await logErrorToDiscord(error, `Member leave error: ${member.user.tag} in ${member.guild.name}`);
    }
});

// ============================================================================
// GUILD EVENTS (JOIN/LEAVE SERVER)
// ============================================================================

client.on(Events.GuildCreate, async guild => {
    log(`✅ Joined new guild: ${guild.name} (${guild.id}) - ${guild.memberCount} members`, colors.green, '');
    await logServerEvent(guild, 'join');
});

client.on(Events.GuildDelete, async guild => {
    log(`❌ Left guild: ${guild.name} (${guild.id})`, colors.red, '');
    await logServerEvent(guild, 'leave');
});

// ============================================================================
// BOT READY EVENT
// ============================================================================

client.once(Events.ClientReady, async () => {
    // Initialize Discord logging with client
    initializeDiscordLogging(client);
    
    log('', colors.cyan, '');
    log('╔════════════════════════════════════════════════════════════╗', colors.cyan, '');
    log('║                                                            ║', colors.cyan, '');
    log('║              🤖 DISCORD BOT ONLINE 🤖                     ║', colors.bright + colors.green, '');
    log('║                                                            ║', colors.cyan, '');
    log('╠════════════════════════════════════════════════════════════╣', colors.cyan, '');
    log(`║  Bot User:    ${client.user.tag.padEnd(42)} ║`, colors.white, '');
    log(`║  Bot ID:      ${client.user.id.padEnd(42)} ║`, colors.white, '');
    log(`║  Servers:     ${client.guilds.cache.size.toString().padEnd(42)} ║`, colors.white, '');
    log(`║  Commands:    ${client.commands.size.toString().padEnd(42)} ║`, colors.white, '');
    log('╠════════════════════════════════════════════════════════════╣', colors.cyan, '');
    log('║  Status:      🟢 ONLINE                                    ║', colors.green, '');
    log('║  Heartbeat:   💓 ACTIVE (5 min intervals)                 ║', colors.green, '');
    log('║  Monitoring:  📊 ENABLED                                   ║', colors.green, '');
    log('╚════════════════════════════════════════════════════════════╝', colors.cyan, '');
    log('', colors.cyan, '');
    
    // Verify logging channels
    const channels = [
        { id: ERROR_LOG_CHANNEL_ID, name: 'Error Log', env: 'ERROR_LOG_CHANNEL_ID' },
        { id: HEARTBEAT_CHANNEL_ID, name: 'Heartbeat', env: 'HEARTBEAT_CHANNEL_ID' },
        { id: SERVER_LOG_CHANNEL_ID, name: 'Server Log', env: 'SERVER_LOG_CHANNEL_ID' }
    ];

    for (const channelInfo of channels) {
        if (channelInfo.id) {
            try {
                const channel = await client.channels.fetch(channelInfo.id);
                log(`✅ ${channelInfo.name} channel verified: #${channel.name}`, colors.green, '');
            } catch (err) {
                log(`⚠️  ${channelInfo.name} channel ${channelInfo.id} not found or inaccessible`, colors.yellow, '');
            }
        } else {
            log(`⚠️  ${channelInfo.env} not configured in .env`, colors.yellow, '');
        }
    }
    
    // Start heartbeat system
    startHeartbeat();
    
    log('✅ All systems operational!', colors.green, '');
    log('', colors.reset, '');
});

// ============================================================================
// ERROR HANDLERS
// ============================================================================

process.on('unhandledRejection', async (error) => {
    log(`❌ Unhandled Promise Rejection: ${error.message}`, colors.red, '');
    logger.error('Unhandled promise rejection:', error);
    await logErrorToDiscord(error, 'Unhandled Promise Rejection - This may indicate a bug in the code');
});

process.on('uncaughtException', async (error) => {
    log(`❌ Uncaught Exception: ${error.message}`, colors.red, '');
    logger.error('Uncaught exception:', error);
    await logErrorToDiscord(error, 'Uncaught Exception - Critical error that may cause instability');
    
    // Give time for Discord message to send before crashing
    setTimeout(() => {
        process.exit(1);
    }, 1000);
});

// Discord.js error events
client.on('error', async (error) => {
    log(`❌ Discord Client Error: ${error.message}`, colors.red, '');
    logger.error('Discord client error:', error);
    await logErrorToDiscord(error, 'Discord.js Client Error');
});

client.on('warn', (warning) => {
    log(`⚠️  Discord Client Warning: ${warning}`, colors.yellow, '');
    logger.warn('Discord client warning:', warning);
});

// ============================================================================
// SCHEDULED TASKS
// ============================================================================

// Daily cleanup at midnight
cron.schedule('0 0 * * *', async () => {
    try {
        await db.cleanupOldData();
        log('🧹 Daily cleanup completed', colors.green, '');
    } catch (error) {
        log('❌ Daily cleanup failed', colors.red, '');
        logger.error('Error in daily cleanup:', error);
        await logErrorToDiscord(error, 'Daily cleanup failed - Old data may accumulate');
    }
});

// Unban scheduler (check every hour)
cron.schedule('0 * * * *', async () => {
    try {
        const tempBans = await db.getExpiredTempBans();
        if (tempBans.length > 0) {
            log(`🔓 Checking ${tempBans.length} expired temp ban(s)`, colors.yellow, '');
        }
        
        for (const ban of tempBans) {
            try {
                const guild = client.guilds.cache.get(ban.guild_id);
                if (guild) {
                    await guild.members.unban(ban.user_id, 'Temporary ban expired');
                    await db.removeTempBan(ban.guild_id, ban.user_id);
                    log(`  ✓ Unbanned user ${ban.user_id} from ${guild.name}`, colors.green, '');
                }
            } catch (error) {
                logger.error(`Error unbanning user ${ban.user_id}:`, error);
            }
        }
    } catch (error) {
        logger.error('Error checking temp bans:', error);
        await logErrorToDiscord(error, 'Temp ban check failed - Some users may not be unbanned automatically');
    }
});

// ============================================================================
// GRACEFUL SHUTDOWN
// ============================================================================

process.on('SIGINT', async () => {
    log('', colors.yellow, '');
    log('⚠️  Shutdown signal received...', colors.yellow, '');
    log('🛑 Stopping heartbeat...', colors.yellow, '');
    
    if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
    }
    
    log('💾 Closing database connection...', colors.yellow, '');
    await db.close();
    
    log('👋 Disconnecting from Discord...', colors.yellow, '');
    client.destroy();
    
    log('✅ Shutdown complete!', colors.green, '');
    log('', colors.reset, '');
    process.exit(0);
});

process.on('SIGTERM', async () => {
    log('⚠️  SIGTERM received, shutting down gracefully...', colors.yellow, '');
    process.kill(process.pid, 'SIGINT');
});

// ============================================================================
// LOGIN
// ============================================================================

log('🔐 Connecting to Discord...', colors.cyan, '');
client.login(process.env.DISCORD_TOKEN).catch(error => {
    log('❌ Failed to login to Discord!', colors.red, '');
    logger.error('Failed to login:', error);
    process.exit(1);
});

module.exports = client;
