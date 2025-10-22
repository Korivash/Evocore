const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const db = require('../../database/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unmute')
        .setDescription('Unmute a member')
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to unmute')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for unmuting')
                .setRequired(false)),

    async execute(interaction) {
        const target = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || 'No reason provided';
        const member = interaction.guild.members.cache.get(target.id);

        if (!member) {
            return interaction.reply({ content: '❌ User not found.', ephemeral: true });
        }

        const config = await db.getGuildConfig(interaction.guild.id);
        if (!config.mute_role_id) {
            return interaction.reply({ content: '❌ Mute role not configured.', ephemeral: true });
        }

        const muteRole = interaction.guild.roles.cache.get(config.mute_role_id);
        if (!muteRole) {
            return interaction.reply({ content: '❌ Mute role not found.', ephemeral: true });
        }

        if (!member.roles.cache.has(muteRole.id)) {
            return interaction.reply({ content: '❌ User is not muted.', ephemeral: true });
        }

        try {
            await member.roles.remove(muteRole);
            await db.addModLog(interaction.guild.id, target.id, interaction.user.id, 'UNMUTE', reason);

            const embed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('🔊 User Unmuted')
                .addFields(
                    { name: 'User', value: `${target.tag} (${target.id})`, inline: true },
                    { name: 'Moderator', value: `${interaction.user.tag}`, inline: true },
                    { name: 'Reason', value: reason, inline: false }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });

            if (config.mod_log_channel_id) {
                const logChannel = interaction.guild.channels.cache.get(config.mod_log_channel_id);
                if (logChannel) await logChannel.send({ embeds: [embed] });
            }
        } catch (error) {
            console.error('Unmute error:', error);
            await interaction.reply({ content: '❌ Failed to unmute the user.', ephemeral: true });
        }
    }
};
