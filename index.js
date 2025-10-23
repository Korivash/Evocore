const { Client, GatewayIntentBits, Collection, Events, EmbedBuilder, PermissionFlagsBits, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');
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
const HEARTBEAT_CHANNEL_ID = process.env.HEARTBEAT_CHANNEL_ID;

// Heartbeat tracking
let lastHeartbeat = Date.now();
let heartbeatInterval = null;
let heartbeatFailures = 0;
let heartbeatMessageId = null; // Track the heartbeat message for editing
const MAX_HEARTBEAT_FAILURES = 3;

// Helper function to log errors to Discord
async function logErrorToDiscord(error, context = '') {
    if (!ERROR_LOG_CHANNEL_ID) {
        logger.warn('ERROR_LOG_CHANNEL_ID not configured - skipping Discord error log');
        return;
    }
    
    try {
        const channel = await client.channels.fetch(ERROR_LOG_CHANNEL_ID).catch(() => null);
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
                { name: 'Timestamp', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
            )
            .setTimestamp();

        await channel.send({ embeds: [embed] });
        logger.info('✅ Error logged to Discord channel');
    } catch (err) {
        logger.error('❌ Failed to log error to Discord:', err.message);
    }
}

// Helper function to send server join/leave notifications
async function logServerEvent(guild, type) {
    if (!ERROR_LOG_CHANNEL_ID) return;
    
    try {
        const channel = await client.channels.fetch(ERROR_LOG_CHANNEL_ID).catch(() => null);
        if (!channel) return;

        const embed = new EmbedBuilder()
            .setColor(type === 'join' ? '#00ff00' : '#ff0000')
            .setTitle(type === 'join' ? '🎉 Bot Joined Server' : '👋 Bot Left Server')
            .setThumbnail(guild.iconURL({ dynamic: true, size: 256 }) || null)
            .addFields(
                { name: 'Server Name', value: guild.name, inline: true },
                { name: 'Server ID', value: guild.id, inline: true },
                { name: 'Member Count', value: guild.memberCount.toString(), inline: true },
                { name: 'Owner', value: `<@${guild.ownerId}>`, inline: true },
                { name: 'Created', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`, inline: true },
                { name: 'Total Servers', value: client.guilds.cache.size.toString(), inline: true }
            )
            .setTimestamp();

        await channel.send({ embeds: [embed] });
        logger.info(`✅ Server ${type} event logged to Discord`);
    } catch (err) {
        logger.error(`❌ Failed to log server ${type} event:`, err.message);
    }
}

// Heartbeat system - monitors bot health
function startHeartbeat() {
    log('💓 Heartbeat system starting...', colors.cyan, '');
    
    // Console heartbeat every 5 minutes
    heartbeatInterval = setInterval(async () => {
        const uptime = process.uptime();
        const hours = Math.floor(uptime / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        const memUsage = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
        
        log(`💓 HEARTBEAT | Uptime: ${hours}h ${minutes}m | Memory: ${memUsage}MB | Guilds: ${client.guilds.cache.size} | Ping: ${client.ws.ping}ms`, colors.green, '');
        
        lastHeartbeat = Date.now();
        heartbeatFailures = 0;
        
        // Send heartbeat to Discord channel
        await sendDiscordHeartbeat();
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

// Send heartbeat status to Discord channel
async function sendDiscordHeartbeat() {
    if (!HEARTBEAT_CHANNEL_ID) {
        logger.debug('HEARTBEAT_CHANNEL_ID not configured - skipping Discord heartbeat');
        return;
    }
    
    try {
        const channel = await client.channels.fetch(HEARTBEAT_CHANNEL_ID).catch(() => null);
        if (!channel) {
            logger.warn(`Heartbeat channel ${HEARTBEAT_CHANNEL_ID} not found or bot lacks access`);
            return;
        }
        
        const uptime = process.uptime();
        const days = Math.floor(uptime / 86400);
        const hours = Math.floor((uptime % 86400) / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        const memUsage = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
        const totalMembers = client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);
        
        const embed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('💓 Bot Heartbeat')
            .setDescription(`System is healthy and operational`)
            .addFields(
                { 
                    name: '⏱️ Uptime', 
                    value: `${days}d ${hours}h ${minutes}m`,
                    inline: true 
                },
                { 
                    name: '📊 Memory', 
                    value: `${memUsage} MB`,
                    inline: true 
                },
                { 
                    name: '🏓 Latency', 
                    value: `${client.ws.ping}ms`,
                    inline: true 
                },
                { 
                    name: '🏠 Servers', 
                    value: `${client.guilds.cache.size}`,
                    inline: true 
                },
                { 
                    name: '👥 Total Users', 
                    value: `${totalMembers.toLocaleString()}`,
                    inline: true 
                },
                { 
                    name: '💬 Commands', 
                    value: `${client.commands.size}`,
                    inline: true 
                }
            )
            .setFooter({ text: `Last check: ${new Date().toLocaleString()}` })
            .setTimestamp();

        // Try to edit existing message, otherwise send new one
        if (heartbeatMessageId) {
            try {
                const message = await channel.messages.fetch(heartbeatMessageId);
                await message.edit({ embeds: [embed] });
            } catch (err) {
                // Message not found, send new one
                const sentMessage = await channel.send({ embeds: [embed] });
                heartbeatMessageId = sentMessage.id;
            }
        } else {
            const sentMessage = await channel.send({ embeds: [embed] });
            heartbeatMessageId = sentMessage.id;
        }
    } catch (err) {
        logger.error('❌ Failed to send Discord heartbeat:', err.message);
    }
}

// ============================================================================
// COMMAND LOADING
// ============================================================================

// Load slash commands
const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(commandsPath);

log('📂 Loading commands...', colors.cyan, '');

for (const folder of commandFolders) {
    const folderPath = path.join(commandsPath, folder);
    
    // Skip if not a directory
    if (!fs.statSync(folderPath).isDirectory()) continue;
    
    const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));
    
    for (const file of commandFiles) {
        const filePath = path.join(folderPath, file);
        const command = require(filePath);
        
        if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
            commands.push(command.data.toJSON());
            log(`  ✓ Loaded: ${command.data.name}`, colors.green, '');
        } else {
            log(`  ⚠️  Skipped: ${file} (missing data or execute)`, colors.yellow, '');
        }
    }
}

log(`✅ Loaded ${commands.length} commands`, colors.green, '');

// ============================================================================
// INTERACTION HANDLERS
// ============================================================================

client.on(Events.InteractionCreate, async interaction => {
    // Handle slash commands
    if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);

        if (!command) {
            log(`⚠️  No command matching ${interaction.commandName} was found.`, colors.yellow, '');
            return;
        }

        // Cooldown handling
        const { cooldowns } = client;

        if (!cooldowns.has(command.data.name)) {
            cooldowns.set(command.data.name, new Collection());
        }

        const now = Date.now();
        const timestamps = cooldowns.get(command.data.name);
        const cooldownAmount = (command.cooldown ?? 3) * 1000;

        if (timestamps.has(interaction.user.id)) {
            const expirationTime = timestamps.get(interaction.user.id) + cooldownAmount;

            if (now < expirationTime) {
                const timeLeft = (expirationTime - now) / 1000;
                return interaction.reply({
                    content: `⏱️ Please wait ${timeLeft.toFixed(1)} more second(s) before using \`${command.data.name}\` again.`,
                    ephemeral: true
                });
            }
        }

        timestamps.set(interaction.user.id, now);
        setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);

        // Execute command
        try {
            await command.execute(interaction);
            log(`✅ ${interaction.user.tag} used /${command.data.name} in ${interaction.guild?.name || 'DM'}`, colors.green, '');
        } catch (error) {
            logger.error(`Error executing ${interaction.commandName}:`, error);
            await logErrorToDiscord(error, `Command: /${interaction.commandName}\nUser: ${interaction.user.tag}\nGuild: ${interaction.guild?.name || 'DM'}`);
            
            const errorMessage = { 
                content: '❌ There was an error while executing this command!', 
                ephemeral: true 
            };
            
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(errorMessage).catch(() => {});
            } else {
                await interaction.reply(errorMessage).catch(() => {});
            }
        }
    }

    // Handle button interactions
    if (interaction.isButton()) {
        await handleEventButton(interaction);
    }

    // Handle select menu interactions
    if (interaction.isStringSelectMenu()) {
        await handleEventSelectMenu(interaction);
    }

    // Handle modal submissions
    if (interaction.isModalSubmit()) {
        await handleEventModal(interaction);
    }
});

// ============================================================================
// EVENT BUTTON HANDLERS
// ============================================================================

async function handleEventButton(interaction) {
    const customId = interaction.customId;
    
    if (!customId.startsWith('event_')) return;

    const [, action, eventId] = customId.split('_');
    
    try {
        const event = await db.getEvent(eventId);
        
        if (!event) {
            return interaction.reply({ content: '❌ Event not found or has been cancelled!', ephemeral: true });
        }

        // Check if event is full
        if (action === 'accept' && event.max_participants > 0) {
            const acceptedCount = await db.getParticipantCount(eventId, 'accepted');
            if (acceptedCount >= event.max_participants) {
                return interaction.reply({ content: '❌ Event is full!', ephemeral: true });
            }
        }

        switch (action) {
            case 'accept':
                await handleRSVP(interaction, eventId, 'accepted', event);
                break;
            case 'tentative':
                await handleRSVP(interaction, eventId, 'tentative', event);
                break;
            case 'late':
                await handleRSVP(interaction, eventId, 'late', event);
                break;
            case 'decline':
                await handleRSVP(interaction, eventId, 'declined', event);
                break;
            case 'setup':
                await showClassRoleSetup(interaction, eventId);
                break;
        }
    } catch (error) {
        logger.error('Error handling event button:', error);
        await logErrorToDiscord(error, `Event button error: ${customId}`);
        await interaction.reply({ content: '❌ An error occurred processing your response.', ephemeral: true }).catch(() => {});
    }
}

async function handleRSVP(interaction, eventId, status, event) {
    const userId = interaction.user.id;

    // If it's a WoW event and user is accepting, show class/role setup
    if (status === 'accepted' && event.event_type.startsWith('wow-')) {
        // First add them with basic status
        await db.addEventParticipant(eventId, userId, status);
        
        // Then show class/role setup
        await showClassRoleSetup(interaction, eventId, true);
        return;
    }

    // For non-WoW events or non-accept status
    await db.addEventParticipant(eventId, userId, status);

    const statusEmoji = {
        'accepted': '✅',
        'tentative': '❓',
        'late': '⏰',
        'declined': '❌'
    };

    const statusName = {
        'accepted': 'Accepted',
        'tentative': 'Marked as Tentative',
        'late': 'Marked as Late',
        'declined': 'Declined'
    };

    await interaction.reply({
        content: `${statusEmoji[status]} ${statusName[status]} for **${event.title}**!`,
        ephemeral: true
    });

    // Update the event message
    await updateEventMessage(interaction, eventId, event);
}

async function showClassRoleSetup(interaction, eventId, isFirstTime = false) {
    const eventCommand = require('./commands/utility/event');
    
    // Create class selection menu
    const classOptions = Object.entries(eventCommand.WOW_CLASSES).map(([key, data]) => 
        new StringSelectMenuOptionBuilder()
            .setLabel(data.name)
            .setDescription(`Play as ${data.name}`)
            .setValue(key)
            .setEmoji(data.emoji)
    );

    const classSelect = new StringSelectMenuBuilder()
        .setCustomId(`event_class_${eventId}`)
        .setPlaceholder('Select your class')
        .addOptions(classOptions);

    const row = new ActionRowBuilder().addComponents(classSelect);

    const message = isFirstTime 
        ? `✅ You've been added to the event! Now, please select your class and role:`
        : `🎮 Select your class for this event:`;

    await interaction.reply({
        content: message,
        components: [row],
        ephemeral: true
    });
}

async function handleEventSelectMenu(interaction) {
    const customId = interaction.customId;
    
    if (!customId.startsWith('event_')) return;

    const [, type, eventId] = customId.split('_');

    try {
        if (type === 'class') {
            const selectedClass = interaction.values[0];
            
            // Show role selection
            const eventCommand = require('./commands/utility/event');
            const roleOptions = Object.entries(eventCommand.WOW_ROLES).map(([key, data]) =>
                new StringSelectMenuOptionBuilder()
                    .setLabel(data.name)
                    .setDescription(`Play as ${data.name}`)
                    .setValue(key)
                    .setEmoji(data.emoji)
            );

            const roleSelect = new StringSelectMenuBuilder()
                .setCustomId(`event_role_${eventId}_${selectedClass}`)
                .setPlaceholder('Select your role')
                .addOptions(roleOptions);

            const row = new ActionRowBuilder().addComponents(roleSelect);

            await interaction.update({
                content: `Selected: ${eventCommand.WOW_CLASSES[selectedClass].emoji} **${eventCommand.WOW_CLASSES[selectedClass].name}**\n\nNow select your role:`,
                components: [row]
            });
        } else if (type === 'role') {
            const [, , eventIdPart, selectedClass] = customId.split('_');
            const selectedRole = interaction.values[0];

            // Update participant with class and role
            await db.updateParticipantClass(eventIdPart, interaction.user.id, selectedClass, selectedRole);

            const eventCommand = require('./commands/utility/event');
            const classData = eventCommand.WOW_CLASSES[selectedClass];
            const roleData = eventCommand.WOW_ROLES[selectedRole];

            await interaction.update({
                content: `✅ Setup complete!\n\n` +
                        `${classData.emoji} **Class:** ${classData.name}\n` +
                        `${roleData.emoji} **Role:** ${roleData.name}\n\n` +
                        `You're all set for the event!`,
                components: []
            });

            // Update the event message
            const event = await db.getEvent(eventIdPart);
            if (event && event.message_id && event.channel_id) {
                const channel = await interaction.guild.channels.fetch(event.channel_id);
                if (channel) {
                    const message = await channel.messages.fetch(event.message_id);
                    const participants = await db.getEventParticipants(eventIdPart);
                    const embed = eventCommand.createEventEmbed(event, participants);
                    await message.edit({ embeds: [embed] });
                }
            }
        }
    } catch (error) {
        logger.error('Error handling event select menu:', error);
        await logErrorToDiscord(error, `Event select menu error: ${customId}`);
        await interaction.reply({ content: '❌ An error occurred.', ephemeral: true }).catch(() => {});
    }
}

async function handleEventModal(interaction) {
    // Handle any event-related modals here
    // Currently not used, but ready for future features like adding notes
}

async function updateEventMessage(interaction, eventId, event) {
    try {
        if (!event.message_id || !event.channel_id) return;

        const channel = await interaction.guild.channels.fetch(event.channel_id);
        if (!channel) return;

        const message = await channel.messages.fetch(event.message_id);
        if (!message) return;

        const participants = await db.getEventParticipants(eventId);
        const eventCommand = require('./commands/utility/event');
        const embed = eventCommand.createEventEmbed(event, participants);

        await message.edit({ embeds: [embed] });
    } catch (error) {
        logger.error('Error updating event message:', error);
    }
}

// ============================================================================
// MEMBER JOIN/LEAVE EVENTS
// ============================================================================

// Member join event
client.on(Events.GuildMemberAdd, async member => {
    try {
        log(`👋 ${member.user.tag} joined ${member.guild.name}`, colors.green, '');

        const guildConfig = await db.getGuildConfig(member.guild.id);
        if (!guildConfig) return;

        // Welcome message
        if (guildConfig.welcome_channel_id && guildConfig.welcome_message) {
            const channel = member.guild.channels.cache.get(guildConfig.welcome_channel_id);
            if (channel) {
                const welcomeMessage = guildConfig.welcome_message
                    .replace('{user}', `<@${member.id}>`)
                    .replace('{username}', member.user.username)
                    .replace('{server}', member.guild.name)
                    .replace('{membercount}', member.guild.memberCount.toString());

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

// Guild create event (bot joins server)
client.on(Events.GuildCreate, async guild => {
    log(`✅ Joined new guild: ${guild.name} (${guild.id}) - ${guild.memberCount} members`, colors.green, '');
    await logServerEvent(guild, 'join');
});

// Guild delete event (bot leaves server)
client.on(Events.GuildDelete, async guild => {
    log(`❌ Left guild: ${guild.name} (${guild.id})`, colors.red, '');
    await logServerEvent(guild, 'leave');
});

// ============================================================================
// BOT READY EVENT
// ============================================================================

client.once(Events.ClientReady, async () => {
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
    
    // Verify error logging channel
    if (ERROR_LOG_CHANNEL_ID) {
        try {
            const errorChannel = await client.channels.fetch(ERROR_LOG_CHANNEL_ID);
            log(`✅ Error log channel verified: #${errorChannel.name}`, colors.green, '');
        } catch (err) {
            log(`⚠️  Error log channel ${ERROR_LOG_CHANNEL_ID} not found or inaccessible`, colors.yellow, '');
        }
    } else {
        log(`⚠️  ERROR_LOG_CHANNEL_ID not configured in .env`, colors.yellow, '');
    }
    
    // Verify heartbeat channel
    if (HEARTBEAT_CHANNEL_ID) {
        try {
            const heartbeatChannel = await client.channels.fetch(HEARTBEAT_CHANNEL_ID);
            log(`✅ Heartbeat channel verified: #${heartbeatChannel.name}`, colors.green, '');
        } catch (err) {
            log(`⚠️  Heartbeat channel ${HEARTBEAT_CHANNEL_ID} not found or inaccessible`, colors.yellow, '');
        }
    } else {
        log(`⚠️  HEARTBEAT_CHANNEL_ID not configured in .env`, colors.yellow, '');
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
});

// ============================================================================
// SCHEDULED TASKS
// ============================================================================

// Daily cleanup
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
