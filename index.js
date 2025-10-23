const { Client, GatewayIntentBits, Collection, Events, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v10');
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const db = require('./database/database');
const logger = require('./utils/logger');
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

// Error logging channel ID (set this in your .env or config)
const ERROR_LOG_CHANNEL_ID = process.env.ERROR_LOG_CHANNEL_ID;
const HEARTBEAT_CHANNEL_ID = process.env.HEARTBEAT_CHANNEL_ID; // Optional heartbeat channel

// Heartbeat tracking
let lastHeartbeat = Date.now();
let heartbeatInterval = null;
let heartbeatFailures = 0;
const MAX_HEARTBEAT_FAILURES = 3;

// Helper function to log errors to Discord
async function logErrorToDiscord(error, context = '') {
    if (!ERROR_LOG_CHANNEL_ID) return;
    
    try {
        const channel = await client.channels.fetch(ERROR_LOG_CHANNEL_ID);
        if (!channel) return;

        const embed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('🚨 Bot Error')
            .setDescription(`\`\`\`js\n${error.stack || error.message || error}\n\`\`\``)
            .addFields(
                { name: 'Context', value: context || 'No context provided', inline: false },
                { name: 'Timestamp', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
            )
            .setTimestamp();

        await channel.send({ embeds: [embed] });
    } catch (err) {
        logger.error('Failed to log error to Discord:', err);
    }
}

// Heartbeat system - monitors bot health
function startHeartbeat() {
    log('💓 Heartbeat system starting...', colors.cyan, '');
    
    // Console heartbeat every 5 minutes
    heartbeatInterval = setInterval(() => {
        const uptime = process.uptime();
        const hours = Math.floor(uptime / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        const memUsage = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
        
        log(`💓 HEARTBEAT | Uptime: ${hours}h ${minutes}m | Memory: ${memUsage}MB | Guilds: ${client.guilds.cache.size} | Ping: ${client.ws.ping}ms`, colors.green, '');
        
        lastHeartbeat = Date.now();
        heartbeatFailures = 0;
        
        // Optional: Send heartbeat to Discord channel
        sendDiscordHeartbeat();
    }, 5 * 60 * 1000); // Every 5 minutes
    
    // Check for missed heartbeats every minute
    setInterval(() => {
        const timeSinceLastBeat = Date.now() - lastHeartbeat;
        if (timeSinceLastBeat > 6 * 60 * 1000) { // More than 6 minutes
            heartbeatFailures++;
            log(`⚠️  HEARTBEAT WARNING | Missed heartbeat! Failures: ${heartbeatFailures}/${MAX_HEARTBEAT_FAILURES}`, colors.yellow, '');
            
            if (heartbeatFailures >= MAX_HEARTBEAT_FAILURES) {
                log(`❌ HEARTBEAT CRITICAL | Multiple failures detected! Bot may be unresponsive.`, colors.red, '');
                logErrorToDiscord(
                    new Error('Bot heartbeat failed multiple times'),
                    'Critical: Bot may be experiencing issues'
                );
            }
        }
    }, 60 * 1000); // Check every minute
}

// Optional: Send heartbeat status to Discord channel
async function sendDiscordHeartbeat() {
    if (!HEARTBEAT_CHANNEL_ID) return;
    
    try {
        const channel = await client.channels.fetch(HEARTBEAT_CHANNEL_ID);
        if (!channel) return;
        
        const uptime = process.uptime();
        const days = Math.floor(uptime / 86400);
        const hours = Math.floor((uptime % 86400) / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        const memUsage = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
        
        const embed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('💓 Bot Heartbeat')
            .addFields(
                { name: 'Status', value: '🟢 Online', inline: true },
                { name: 'Uptime', value: `${days}d ${hours}h ${minutes}m`, inline: true },
                { name: 'Memory', value: `${memUsage}MB`, inline: true },
                { name: 'Guilds', value: client.guilds.cache.size.toString(), inline: true },
                { name: 'Users', value: client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0).toString(), inline: true },
                { name: 'Ping', value: `${client.ws.ping}ms`, inline: true }
            )
            .setFooter({ text: 'Heartbeat: Every 5 minutes' })
            .setTimestamp();
        
        // Edit or send new message
        const messages = await channel.messages.fetch({ limit: 1 });
        const lastMessage = messages.first();
        
        if (lastMessage && lastMessage.author.id === client.user.id) {
            await lastMessage.edit({ embeds: [embed] });
        } else {
            await channel.send({ embeds: [embed] });
        }
    } catch (err) {
        // Silently fail - don't spam logs for heartbeat channel issues
    }
}

// Load all commands
const commandsPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(commandsPath);

log('📂 Loading commands...', colors.cyan, '');
let commandCount = 0;

for (const folder of commandFolders) {
    const folderPath = path.join(commandsPath, folder);
    if (fs.statSync(folderPath).isDirectory()) {
        const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));
        for (const file of commandFiles) {
            const filePath = path.join(folderPath, file);
            const command = require(filePath);
            if ('data' in command && 'execute' in command) {
                client.commands.set(command.data.name, command);
                log(`  ✓ /${command.data.name}`, colors.green, '');
                commandCount++;
            }
        }
    }
}

log(`✅ Loaded ${commandCount} commands`, colors.green, '');

// Load all events
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

log('📡 Loading events...', colors.cyan, '');

for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = require(filePath);
    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args, client));
    } else {
        client.on(event.name, (...args) => event.execute(...args, client));
    }
    log(`  ✓ ${event.name}`, colors.green, '');
}

log(`✅ Loaded ${eventFiles.length} events`, colors.green, '');

// Handle slash commands with enhanced colorful logging
client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    // Enhanced colorful console logging
    const serverInfo = interaction.guild 
        ? `${interaction.guild.name} (${interaction.guild.id})`
        : 'DM';
    
    log(`⚡ /${interaction.commandName} ${colors.dim}by ${interaction.user.tag} in ${serverInfo}`, colors.yellow, '');

    // Check if guild is set up (except for setup command)
    if (interaction.commandName !== 'setup' && interaction.guild) {
        try {
            const guildConfig = await db.getGuildConfig(interaction.guild.id);
            if (!guildConfig) {
                return interaction.reply({
                    content: '⚠️ This server has not been set up yet! Please ask an administrator to run `/setup` first.',
                    ephemeral: true
                });
            }
        } catch (error) {
            logger.error('Error checking guild config:', error);
            await logErrorToDiscord(error, `Guild config check failed for ${serverInfo}`);
        }
    }

    // Cooldown handling
    const { cooldowns } = client;
    if (!cooldowns.has(command.data.name)) {
        cooldowns.set(command.data.name, new Collection());
    }

    const now = Date.now();
    const timestamps = cooldowns.get(command.data.name);
    const cooldownAmount = (command.cooldown || 3) * 1000;

    if (timestamps.has(interaction.user.id)) {
        const expirationTime = timestamps.get(interaction.user.id) + cooldownAmount;
        if (now < expirationTime) {
            const timeLeft = (expirationTime - now) / 1000;
            return interaction.reply({
                content: `⏱️ Please wait ${timeLeft.toFixed(1)} more second(s) before reusing the \`${command.data.name}\` command.`,
                ephemeral: true
            });
        }
    }

    timestamps.set(interaction.user.id, now);
    setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);

    // Execute command
    try {
        await command.execute(interaction, client);
        
        // Log command usage
        await db.logCommand(
            interaction.guild?.id || 'DM',
            interaction.user.id,
            interaction.commandName
        );

        log(`  ✓ /${interaction.commandName} completed`, colors.green, '');
    } catch (error) {
        log(`  ✗ /${interaction.commandName} failed: ${error.message}`, colors.red, '');
        logger.error(`Command ${interaction.commandName} failed:`, error);
        
        const errorMessage = {
            content: '❌ There was an error executing this command!',
            ephemeral: true
        };
        
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp(errorMessage);
        } else {
            await interaction.reply(errorMessage);
        }

        // Log to Discord error channel
        await logErrorToDiscord(
            error,
            `Command: /${interaction.commandName}\nUser: ${interaction.user.tag}\nServer: ${serverInfo}`
        );
    }
});

// Auto-moderation for messages
client.on(Events.MessageCreate, async message => {
    if (message.author.bot || !message.guild) return;

    try {
        const guildConfig = await db.getGuildConfig(message.guild.id);
        if (!guildConfig || !guildConfig.auto_mod_enabled) return;

        const autoMod = require('./utils/autoMod');
        await autoMod.checkMessage(message, guildConfig);
    } catch (error) {
        logger.error('Error in auto-moderation:', error);
        await logErrorToDiscord(error, `Auto-mod error in ${message.guild.name}`);
    }
});

// Member join event
client.on(Events.GuildMemberAdd, async member => {
    try {
        const guildConfig = await db.getGuildConfig(member.guild.id);
        if (!guildConfig) return;

        log(`👋 ${member.user.tag} joined ${member.guild.name}`, colors.green, '');

        // Welcome message
        if (guildConfig.welcome_channel_id && guildConfig.welcome_message) {
            const channel = member.guild.channels.cache.get(guildConfig.welcome_channel_id);
            if (channel) {
                const welcomeMessage = guildConfig.welcome_message
                    .replace('{user}', `<@${member.id}>`)
                    .replace('{server}', member.guild.name)
                    .replace('{memberCount}', member.guild.memberCount);

                const embed = new EmbedBuilder()
                    .setColor('#00ff00')
                    .setTitle('👋 Welcome!')
                    .setDescription(welcomeMessage)
                    .setThumbnail(member.user.displayAvatarURL())
                    .setTimestamp();

                await channel.send({ embeds: [embed] });
            }
        }

        // Auto-role
        if (guildConfig.auto_role_id) {
            const role = member.guild.roles.cache.get(guildConfig.auto_role_id);
            if (role) {
                await member.roles.add(role);
                log(`  ✓ Added auto-role to ${member.user.tag}`, colors.green, '');
            }
        }
    } catch (error) {
        logger.error('Error handling member join:', error);
        await logErrorToDiscord(error, `Member join error: ${member.user.tag} in ${member.guild.name}`);
    }
});

// 🔵 Blizzard API Heartbeat - Check every 30 minutes
  const checkBlizzardAPI = async () => {
    try {
      const fetch = require("node-fetch");
      const res = await fetch("https://oauth.battle.net/token", {
        method: "POST",
        headers: {
          Authorization:
            "Basic " +
            Buffer.from(
              `${process.env.BLIZZARD_CLIENT_ID}:${process.env.BLIZZARD_CLIENT_SECRET}`
            ).toString("base64"),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: "grant_type=client_credentials",
      });

      if (res.ok) {
        log.success("💙 Blizzard API: Healthy");
      } else {
        log.error(`❌ Blizzard API: Unhealthy (${res.status})`);
        await sendErrorLog(client, new Error(`Blizzard API returned ${res.status}`), "Blizzard API Health Check");
      }
    } catch (err) {
      log.error("❌ Blizzard API: Connection failed -", err.message);
      await sendErrorLog(client, err, "Blizzard API Health Check");
    }
  };

// Member leave event
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

// Bot ready event with colorful banner
client.once(Events.ClientReady, () => {
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
    
    // Start heartbeat system
    startHeartbeat();
    
    log('✅ All systems operational!', colors.green, '');
    log('', colors.reset, '');
});

// Global error handlers
process.on('unhandledRejection', async (error) => {
    log(`❌ Unhandled Promise Rejection: ${error.message}`, colors.red, '');
    logger.error('Unhandled promise rejection:', error);
    await logErrorToDiscord(error, 'Unhandled Promise Rejection');
});

process.on('uncaughtException', async (error) => {
    log(`❌ Uncaught Exception: ${error.message}`, colors.red, '');
    logger.error('Uncaught exception:', error);
    await logErrorToDiscord(error, 'Uncaught Exception');
});

// Scheduled tasks
cron.schedule('0 0 * * *', async () => {
    // Daily cleanup of old data
    try {
        await db.cleanupOldData();
        log('🧹 Daily cleanup completed', colors.green, '');
    } catch (error) {
        log('❌ Daily cleanup failed', colors.red, '');
        logger.error('Error in daily cleanup:', error);
        await logErrorToDiscord(error, 'Daily cleanup failed');
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
        await logErrorToDiscord(error, 'Temp ban check failed');
    }
});

// Graceful shutdown
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

// Login to Discord
log('🔐 Connecting to Discord...', colors.cyan, '');
client.login(process.env.DISCORD_TOKEN).catch(error => {
    log('❌ Failed to login to Discord!', colors.red, '');
    logger.error('Failed to login:', error);
    process.exit(1);
});

module.exports = client;
