const { Events, ActivityType } = require('discord.js');
const logger = require('../utils/logger');

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        logger.info(`✅ Bot is ready! Logged in as ${client.user.tag}`);
        logger.info(`📊 Serving ${client.guilds.cache.size} guilds`);

        // Activity status rotation
        const activities = [
            { name: `${client.guilds.cache.size} servers`, type: ActivityType.Watching },
            { name: 'Run /setup to get started', type: ActivityType.Listening },
            { name: '/help for commands', type: ActivityType.Listening },
            { name: 'for rule breakers', type: ActivityType.Watching },
        ];

        let currentActivity = 0;
        
        const updateActivity = () => {
            const activity = activities[currentActivity];
            if (activity.name.includes('servers')) {
                activity.name = `${client.guilds.cache.size} servers`;
            }
            client.user.setActivity(activity.name, { type: activity.type });
            currentActivity = (currentActivity + 1) % activities.length;
        };

        updateActivity();
        setInterval(updateActivity, 60000);

        logger.info('✅ Bot ready event completed - commands should be registered via deploy-commands.js');
    }
};
