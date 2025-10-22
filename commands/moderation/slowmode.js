const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('slowmode')
        .setDescription('Set slowmode for a channel')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
        .addIntegerOption(option =>
            option.setName('seconds')
                .setDescription('Slowmode duration in seconds (0 to disable)')
                .setMinValue(0)
                .setMaxValue(21600)
                .setRequired(true))
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('Channel to set slowmode (defaults to current)')
                .setRequired(false)),

    async execute(interaction) {
        const seconds = interaction.options.getInteger('seconds');
        const channel = interaction.options.getChannel('channel') || interaction.channel;

        try {
            await channel.setRateLimitPerUser(seconds);

            const embed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('⏱️ Slowmode Updated')
                .addFields(
                    { name: 'Channel', value: `${channel}`, inline: true },
                    { name: 'Slowmode', value: seconds === 0 ? 'Disabled' : `${seconds} seconds`, inline: true },
                    { name: 'Moderator', value: `${interaction.user.tag}`, inline: true }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Slowmode error:', error);
            await interaction.reply({ content: '❌ Failed to set slowmode.', ephemeral: true });
        }
    }
};
