const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const db = require('../../database/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Kick a member from the server')
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to kick')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for kicking')
                .setRequired(false)),

    async execute(interaction) {
        const target = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || 'No reason provided';
        const member = interaction.guild.members.cache.get(target.id);

        if (!member) {
            return interaction.reply({ content: '❌ User not found in this server.', ephemeral: true });
        }

        if (!member.kickable) {
            return interaction.reply({ content: '❌ I cannot kick this user. They may have higher permissions.', ephemeral: true });
        }

        if (interaction.user.id === target.id) {
            return interaction.reply({ content: '❌ You cannot kick yourself!', ephemeral: true });
        }

        try {
            await member.kick(reason);
            await db.addModLog(interaction.guild.id, target.id, interaction.user.id, 'KICK', reason);

            const embed = new EmbedBuilder()
                .setColor('#ff6b6b')
                .setTitle('👢 User Kicked')
                .addFields(
                    { name: 'User', value: `${target.tag} (${target.id})`, inline: true },
                    { name: 'Moderator', value: `${interaction.user.tag}`, inline: true },
                    { name: 'Reason', value: reason, inline: false }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });

            const config = await db.getGuildConfig(interaction.guild.id);
            if (config.mod_log_channel_id) {
                const logChannel = interaction.guild.channels.cache.get(config.mod_log_channel_id);
                if (logChannel) {
                    await logChannel.send({ embeds: [embed] });
                }
            }
        } catch (error) {
            console.error('Kick error:', error);
            await interaction.reply({ content: '❌ Failed to kick the user.', ephemeral: true });
        }
    }
};
