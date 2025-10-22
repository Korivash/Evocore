const { Events, EmbedBuilder } = require('discord.js');
const logger = require('../utils/logger');

module.exports = {
    name: Events.GuildCreate,
    async execute(guild, client) {
        logger.info(`✅ Joined new guild: ${guild.name} (${guild.id}) - ${guild.memberCount} members`);

        // Try to send welcome message to the first available text channel
        const channel = guild.channels.cache.find(ch => 
            ch.type === 0 && // Text channel
            ch.permissionsFor(guild.members.me).has(['SendMessages', 'EmbedLinks'])
        );

        if (channel) {
            const embed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('👋 Thank you for adding me!')
                .setDescription(`Hello! I'm a multi-purpose Discord bot with moderation, Blizzard API integration, and AI capabilities.`)
                .addFields(
                    { 
                        name: '⚙️ Setup Required', 
                        value: 'An administrator needs to run `/setup` to configure the bot for this server.', 
                        inline: false 
                    },
                    { 
                        name: '📖 Commands', 
                        value: 'Use `/help` to see all available commands.', 
                        inline: false 
                    },
                    {
                        name: '🔧 Features',
                        value: '• Full moderation suite\n• Auto-moderation\n• Blizzard game lookups\n• AI chat (Gemini)\n• Leveling system\n• Custom commands\n• And much more!',
                        inline: false
                    }
                )
                .setFooter({ text: `Now serving ${client.guilds.cache.size} servers!` })
                .setTimestamp();

            try {
                await channel.send({ embeds: [embed] });
            } catch (error) {
                logger.error('Error sending welcome message:', error);
            }
        }
    }
};
