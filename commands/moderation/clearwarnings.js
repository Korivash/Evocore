const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const db = require('../../database/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('clearwarnings')
        .setDescription('Clear all warnings for a user')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to clear warnings for')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for clearing warnings')
                .setRequired(false)),

    async execute(interaction) {
        const target = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || 'No reason provided';

        const warningCount = await db.getWarningCount(interaction.guild.id, target.id);

        if (warningCount === 0) {
            return interaction.reply({ 
                content: `${target.tag} has no warnings to clear.`, 
                ephemeral: true 
            });
        }

        await db.clearWarnings(interaction.guild.id, target.id);
        await db.addModLog(interaction.guild.id, target.id, interaction.user.id, 'CLEAR_WARNINGS', reason);

        const embed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('🧹 Warnings Cleared')
            .addFields(
                { name: 'User', value: `${target.tag} (${target.id})`, inline: true },
                { name: 'Moderator', value: `${interaction.user.tag}`, inline: true },
                { name: 'Warnings Cleared', value: warningCount.toString(), inline: true },
                { name: 'Reason', value: reason, inline: false }
            )
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });

        const config = await db.getGuildConfig(interaction.guild.id);
        if (config.mod_log_channel_id) {
            const logChannel = interaction.guild.channels.cache.get(config.mod_log_channel_id);
            if (logChannel) await logChannel.send({ embeds: [embed] });
        }
    }
};
