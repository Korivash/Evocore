const { Client, GatewayIntentBits, Collection, Events, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v10');
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const db = require('./database/database');
const logger = require('./utils/logger');
const cron = require('node-cron');

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

// Load all commands
const commandsPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(commandsPath);

for (const folder of commandFolders) {
    const folderPath = path.join(commandsPath, folder);
    if (fs.statSync(folderPath).isDirectory()) {
        const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));
        for (const file of commandFiles) {
            const filePath = path.join(folderPath, file);
            const command = require(filePath);
            if ('data' in command && 'execute' in command) {
                client.commands.set(command.data.name, command);
                logger.info(`Loaded command: ${command.data.name}`);
            }
        }
    }
}

// Load all events
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = require(filePath);
    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args, client));
    } else {
        client.on(event.name, (...args) => event.execute(...args, client));
    }
    logger.info(`Loaded event: ${event.name}`);
}

// Handle slash commands
client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

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
    } catch (error) {
        logger.error(`Error executing command ${interaction.commandName}:`, error);
        const errorMessage = {
            content: '❌ There was an error executing this command!',
            ephemeral: true
        };
        
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp(errorMessage);
        } else {
            await interaction.reply(errorMessage);
        }
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
    }
});

// Member join event
client.on(Events.GuildMemberAdd, async member => {
    try {
        const guildConfig = await db.getGuildConfig(member.guild.id);
        if (!guildConfig) return;

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
                logger.info(`Added auto-role to ${member.user.tag} in ${member.guild.name}`);
            }
        }
    } catch (error) {
        logger.error('Error handling member join:', error);
    }
});

// Member leave event
client.on(Events.GuildMemberRemove, async member => {
    try {
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
    }
});

// Scheduled tasks
cron.schedule('0 0 * * *', async () => {
    // Daily cleanup of old data
    try {
        await db.cleanupOldData();
        logger.info('Daily cleanup completed');
    } catch (error) {
        logger.error('Error in daily cleanup:', error);
    }
});

// Unban scheduler (check every hour)
cron.schedule('0 * * * *', async () => {
    try {
        const tempBans = await db.getExpiredTempBans();
        for (const ban of tempBans) {
            try {
                const guild = client.guilds.cache.get(ban.guild_id);
                if (guild) {
                    await guild.members.unban(ban.user_id, 'Temporary ban expired');
                    await db.removeTempBan(ban.guild_id, ban.user_id);
                    logger.info(`Unbanned user ${ban.user_id} from ${guild.name} (temp ban expired)`);
                }
            } catch (error) {
                logger.error(`Error unbanning user ${ban.user_id}:`, error);
            }
        }
    } catch (error) {
        logger.error('Error checking temp bans:', error);
    }
});

// Graceful shutdown
process.on('SIGINT', async () => {
    logger.info('Shutting down bot...');
    await db.close();
    client.destroy();
    process.exit(0);
});

// Login to Discord
client.login(process.env.DISCORD_TOKEN).catch(error => {
    logger.error('Failed to login:', error);
    process.exit(1);
});

module.exports = client;
