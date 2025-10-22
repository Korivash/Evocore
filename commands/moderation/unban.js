const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const db = require('../../database/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unban')
        .setDescription('Unban a user from the server')
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
        .addStringOption(option =>
            option.setName('user-id')
                .setDescription('User ID to unban')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for unbanning')
                .setRequired(false)),

    async execute(interaction) {
        const userId = interaction.options.getString('user-id');
        const reason = interaction.options.getString('reason') || 'No reason provided';

        try {
            await interaction.guild.members.unban(userId, reason);
            await db.addModLog(interaction.guild.id, userId, interaction.user.id, 'UNBAN', reason);
            await db.removeTempBan(interaction.guild.id, userId);

            const embed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('✅ User Unbanned')
                .addFields(
                    { name: 'User ID', value: userId, inline: true },
                    { name: 'Moderator', value: `${interaction.user.tag}`, inline: true },
                    { name: 'Reason', value: reason, inline: false }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });

            const config = await db.getGuildConfig(interaction.guild.id);
            if (config.mod_log_channel_id) {
                const logChannel = interaction.guild.channels.cache.get(config.mod_log_channel_id);
                if (logChannel) await logChannel.send({ embeds: [embed] });
            }
        } catch (error) {
            console.error('Unban error:', error);
            if (error.code === 10026) {
                await interaction.reply({ content: '❌ User is not banned.', ephemeral: true });
            } else {
                await interaction.reply({ content: '❌ Failed to unban the user.', ephemeral: true });
            }
        }
    }
};
