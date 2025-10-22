const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const db = require('../../database/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warn')
        .setDescription('Warn a member')
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to warn')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for the warning')
                .setRequired(true)),

    async execute(interaction) {
        const target = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason');

        try {
            await db.addWarning(interaction.guild.id, target.id, interaction.user.id, reason);
            await db.addModLog(interaction.guild.id, target.id, interaction.user.id, 'WARN', reason);

            const warnings = await db.getWarnings(interaction.guild.id, target.id);
            const config = await db.getGuildConfig(interaction.guild.id);

            const embed = new EmbedBuilder()
                .setColor('#ffcc00')
                .setTitle('⚠️ User Warned')
                .addFields(
                    { name: 'User', value: `${target.tag} (${target.id})`, inline: true },
                    { name: 'Moderator', value: `${interaction.user.tag}`, inline: true },
                    { name: 'Total Warnings', value: `${warnings.length}/${config.max_warnings}`, inline: true },
                    { name: 'Reason', value: reason, inline: false }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });

            if (warnings.length >= config.max_warnings && config.mute_role_id) {
                const member = interaction.guild.members.cache.get(target.id);
                const muteRole = interaction.guild.roles.cache.get(config.mute_role_id);
                if (member && muteRole) {
                    await member.roles.add(muteRole);
                    await interaction.followUp(`🔇 ${target} has been automatically muted for reaching ${config.max_warnings} warnings.`);
                }
            }

            if (config.mod_log_channel_id) {
                const logChannel = interaction.guild.channels.cache.get(config.mod_log_channel_id);
                if (logChannel) await logChannel.send({ embeds: [embed] });
            }
        } catch (error) {
            console.error('Warn error:', error);
            await interaction.reply({ content: '❌ Failed to warn the user.', ephemeral: true });
        }
    }
};
