const { Events, ActivityType } = require('discord.js');
const logger = require('../utils/logger');

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        logger.info(`✅ Bot is ready! Logged in as ${client.user.tag}`);
        logger.info(`📊 Serving ${client.guilds.cache.size} guilds`);

        // Set bot status
        const activities = [
            { name: 'your server | /help', type: ActivityType.Watching },
            { name: 'for rule breakers | /setup', type: ActivityType.Watching },
            { name: `${client.guilds.cache.size} servers`, type: ActivityType.Watching },
            { name: 'Blizzard games', type: ActivityType.Playing },
        ];

        let currentActivity = 0;
        
        const updateActivity = () => {
            client.user.setActivity(activities[currentActivity]);
            currentActivity = (currentActivity + 1) % activities.length;
        };

        updateActivity();
        setInterval(updateActivity, 60000); // Change every minute

        // Register slash commands globally
        await registerCommands(client);
    }
};

async function registerCommands(client) {
    const { REST } = require('@discordjs/rest');
    const { Routes } = require('discord-api-types/v10');
    const fs = require('fs');
    const path = require('path');

    const commands = [];
    const commandsPath = path.join(__dirname, '../commands');
    const commandFolders = fs.readdirSync(commandsPath);

    for (const folder of commandFolders) {
        const folderPath = path.join(commandsPath, folder);
        if (fs.statSync(folderPath).isDirectory()) {
            const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));
            for (const file of commandFiles) {
                const filePath = path.join(folderPath, file);
                const command = require(filePath);
                if ('data' in command) {
                    commands.push(command.data.toJSON());
                }
            }
        }
    }

    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

    try {
        logger.info(`🔄 Started refreshing ${commands.length} application (/) commands.`);

        const data = await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: commands }
        );

        logger.info(`✅ Successfully reloaded ${data.length} application (/) commands.`);
    } catch (error) {
        logger.error('Error registering commands:', error);
    }
}
