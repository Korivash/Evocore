const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ChannelType } = require('discord.js');
const db = require('../../database/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup')
        .setDescription('Initial setup for the bot in this server')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addChannelOption(option =>
            option.setName('mod-log')
                .setDescription('Channel for moderation logs')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(false))
        .addChannelOption(option =>
            option.setName('welcome')
                .setDescription('Channel for welcome messages')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(false))
        .addChannelOption(option =>
            option.setName('goodbye')
                .setDescription('Channel for goodbye messages')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(false))
        .addRoleOption(option =>
            option.setName('mute-role')
                .setDescription('Role to use for muting members')
                .setRequired(false))
        .addRoleOption(option =>
            option.setName('auto-role')
                .setDescription('Role to automatically assign to new members')
                .setRequired(false)),

    async execute(interaction) {
        await interaction.deferReply();

        try {
            // Create or update guild config
            let config = await db.getGuildConfig(interaction.guild.id);
            
            if (!config) {
                await db.createGuildConfig(interaction.guild.id);
                config = await db.getGuildConfig(interaction.guild.id);
            }

            const updates = {};

            const modLog = interaction.options.getChannel('mod-log');
            if (modLog) {
                updates.mod_log_channel_id = modLog.id;
            }

            const welcome = interaction.options.getChannel('welcome');
            if (welcome) {
                updates.welcome_channel_id = welcome.id;
                updates.welcome_message = 'Welcome {user} to {server}! You are member #{memberCount}!';
            }

            const goodbye = interaction.options.getChannel('goodbye');
            if (goodbye) {
                updates.goodbye_channel_id = goodbye.id;
                updates.goodbye_message = 'Goodbye {user}! Thanks for being part of {server}!';
            }

            const muteRole = interaction.options.getRole('mute-role');
            if (muteRole) {
                updates.mute_role_id = muteRole.id;
            }

            const autoRole = interaction.options.getRole('auto-role');
            if (autoRole) {
                updates.auto_role_id = autoRole.id;
            }

            // Update if there are changes
            if (Object.keys(updates).length > 0) {
                await db.updateGuildConfig(interaction.guild.id, updates);
            }

            // Refresh config
            config = await db.getGuildConfig(interaction.guild.id);

            const embed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('✅ Server Setup Complete!')
                .setDescription('Your server has been configured successfully!')
                .addFields(
                    { 
                        name: '📋 Current Configuration', 
                        value: `**Mod Log:** ${config.mod_log_channel_id ? `<#${config.mod_log_channel_id}>` : 'Not set'}\n` +
                               `**Welcome Channel:** ${config.welcome_channel_id ? `<#${config.welcome_channel_id}>` : 'Not set'}\n` +
                               `**Goodbye Channel:** ${config.goodbye_channel_id ? `<#${config.goodbye_channel_id}>` : 'Not set'}\n` +
                               `**Mute Role:** ${config.mute_role_id ? `<@&${config.mute_role_id}>` : 'Not set'}\n` +
                               `**Auto Role:** ${config.auto_role_id ? `<@&${config.auto_role_id}>` : 'Not set'}`,
                        inline: false 
                    },
                    {
                        name: '🔧 Additional Configuration',
                        value: 'Use `/config` to customize:\n' +
                               '• Auto-moderation settings\n' +
                               '• Welcome/goodbye messages\n' +
                               '• Warning thresholds\n' +
                               '• And more!',
                        inline: false
                    },
                    {
                        name: '📖 Getting Started',
                        value: 'Use `/help` to see all available commands!',
                        inline: false
                    }
                )
                .setFooter({ text: `Server ID: ${interaction.guild.id}` })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Setup error:', error);
            await interaction.editReply({ 
                content: '❌ An error occurred during setup. Please try again.',
                ephemeral: true 
            });
        }
    }
};
