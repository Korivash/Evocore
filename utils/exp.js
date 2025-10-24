const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ChannelType } = require('discord.js');
const db = require('../../database/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('exp')
        .setDescription('Configure XP and leveling system')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(subcommand =>
            subcommand
                .setName('channel')
                .setDescription('Set the channel for level-up announcements')
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('Channel to announce level-ups')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('disable')
                .setDescription('Disable level-up announcements'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('view')
                .setDescription('View current XP system settings')),

    async execute(interaction) {
        await interaction.deferReply();

        const subcommand = interaction.options.getSubcommand();
        const config = await db.getGuildConfig(interaction.guild.id);

        if (!config) {
            return interaction.editReply({
                content: '❌ Please run `/setup` first to initialize the bot configuration.',
                ephemeral: true
            });
        }

        switch (subcommand) {
            case 'channel':
                await handleSetChannel(interaction, config);
                break;
            case 'disable':
                await handleDisable(interaction, config);
                break;
            case 'view':
                await handleView(interaction, config);
                break;
        }
    }
};

async function handleSetChannel(interaction, config) {
    const channel = interaction.options.getChannel('channel');

    // Verify bot has permission to send messages in the channel
    if (!channel.permissionsFor(interaction.guild.members.me).has(['SendMessages', 'EmbedLinks'])) {
        return interaction.editReply({
            content: '❌ I don\'t have permission to send messages in that channel!',
            ephemeral: true
        });
    }

    await db.updateGuildConfig(interaction.guild.id, { 
        level_up_channel_id: channel.id,
        level_up_enabled: true 
    });

    const embed = new EmbedBuilder()
        .setColor('#00ff00')
        .setTitle('✅ Level-Up Announcements Configured')
        .setDescription(`Level-up announcements will now be sent to ${channel}`)
        .addFields(
            { name: '📢 Announcement Channel', value: `${channel}`, inline: false },
            { name: '🎯 Status', value: '✅ Enabled', inline: true },
            { name: '💡 Test It', value: 'Members will be tagged when they level up!', inline: false }
        )
        .setTimestamp();

    await interaction.editReply({ embeds: [embed] });

    // Send test message to the channel
    try {
        const testEmbed = new EmbedBuilder()
            .setColor('#9b59b6')
            .setTitle('🎉 Level-Up Announcements Enabled!')
            .setDescription('This channel will now receive level-up notifications.')
            .setFooter({ text: 'Members will be tagged when they level up' })
            .setTimestamp();

        await channel.send({ embeds: [testEmbed] });
    } catch (error) {
        console.error('Error sending test message:', error);
    }
}

async function handleDisable(interaction, config) {
    await db.updateGuildConfig(interaction.guild.id, { 
        level_up_enabled: false 
    });

    const embed = new EmbedBuilder()
        .setColor('#ff6b6b')
        .setTitle('🔕 Level-Up Announcements Disabled')
        .setDescription('Level-up announcements have been disabled.')
        .addFields(
            { name: '🎯 Status', value: '❌ Disabled', inline: true },
            { name: '💡 Re-enable', value: 'Use `/exp channel` to re-enable announcements', inline: false }
        )
        .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
}

async function handleView(interaction, config) {
    const isEnabled = config.level_up_enabled !== false; // Default to true if not set
    const channel = config.level_up_channel_id 
        ? `<#${config.level_up_channel_id}>`
        : 'Not configured';

    const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('⚙️ XP System Settings')
        .setDescription('Current configuration for the XP and leveling system')
        .addFields(
            { name: '🎯 Status', value: isEnabled ? '✅ Enabled' : '❌ Disabled', inline: true },
            { name: '📢 Announcement Channel', value: channel, inline: true },
            { name: '📊 XP Per Message', value: '15-25 XP', inline: true },
            { name: '⏱️ XP Cooldown', value: '60 seconds', inline: true },
            { name: '📈 Level Formula', value: '100 XP per level', inline: true },
            { name: '🏆 Leaderboard', value: 'Use `/leaderboard`', inline: true }
        )
        .setFooter({ text: `Server: ${interaction.guild.name}` })
        .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
}
