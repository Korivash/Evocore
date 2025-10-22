const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const db = require('../../database/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Ban a member from the server')
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to ban')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for banning')
                .setRequired(false))
        .addIntegerOption(option =>
            option.setName('duration')
                .setDescription('Ban duration in hours (0 for permanent)')
                .setMinValue(0)
                .setRequired(false)),

    async execute(interaction) {
        const target = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || 'No reason provided';
        const duration = interaction.options.getInteger('duration') || 0;
        const member = interaction.guild.members.cache.get(target.id);

        if (member && !member.bannable) {
            return interaction.reply({ content: '❌ I cannot ban this user. They may have higher permissions.', ephemeral: true });
        }

        if (interaction.user.id === target.id) {
            return interaction.reply({ content: '❌ You cannot ban yourself!', ephemeral: true });
        }

        try {
            await interaction.guild.members.ban(target, { reason });
            await db.addModLog(interaction.guild.id, target.id, interaction.user.id, 'BAN', reason, duration);

            if (duration > 0) {
                const expiresAt = new Date(Date.now() + duration * 3600000);
                await db.addTempBan(interaction.guild.id, target.id, expiresAt, reason);
            }

            const embed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('🔨 User Banned')
                .addFields(
                    { name: 'User', value: `${target.tag} (${target.id})`, inline: true },
                    { name: 'Moderator', value: `${interaction.user.tag}`, inline: true },
                    { name: 'Duration', value: duration > 0 ? `${duration} hours` : 'Permanent', inline: true },
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
            console.error('Ban error:', error);
            await interaction.reply({ content: '❌ Failed to ban the user.', ephemeral: true });
        }
    }
};
