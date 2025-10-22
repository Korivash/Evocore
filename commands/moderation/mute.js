const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const db = require('../../database/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mute')
        .setDescription('Mute a member')
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to mute')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('duration')
                .setDescription('Mute duration in minutes')
                .setMinValue(1)
                .setRequired(false))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for muting')
                .setRequired(false)),

    async execute(interaction) {
        const target = interaction.options.getUser('user');
        const duration = interaction.options.getInteger('duration');
        const reason = interaction.options.getString('reason') || 'No reason provided';
        const member = interaction.guild.members.cache.get(target.id);

        if (!member) {
            return interaction.reply({ content: '❌ User not found.', ephemeral: true });
        }

        const config = await db.getGuildConfig(interaction.guild.id);
        if (!config.mute_role_id) {
            return interaction.reply({ content: '❌ Mute role not configured. Please run `/setup` first.', ephemeral: true });
        }

        const muteRole = interaction.guild.roles.cache.get(config.mute_role_id);
        if (!muteRole) {
            return interaction.reply({ content: '❌ Mute role not found.', ephemeral: true });
        }

        try {
            await member.roles.add(muteRole);
            await db.addModLog(interaction.guild.id, target.id, interaction.user.id, 'MUTE', reason, duration);

            const embed = new EmbedBuilder()
                .setColor('#ffaa00')
                .setTitle('🔇 User Muted')
                .addFields(
                    { name: 'User', value: `${target.tag} (${target.id})`, inline: true },
                    { name: 'Moderator', value: `${interaction.user.tag}`, inline: true },
                    { name: 'Duration', value: duration ? `${duration} minutes` : 'Indefinite', inline: true },
                    { name: 'Reason', value: reason, inline: false }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });

            if (duration) {
                setTimeout(async () => {
                    try {
                        const stillMuted = member.roles.cache.has(muteRole.id);
                        if (stillMuted) {
                            await member.roles.remove(muteRole);
                            await db.addModLog(interaction.guild.id, target.id, interaction.client.user.id, 'UNMUTE', 'Auto-unmute after duration');
                        }
                    } catch (error) {
                        console.error('Auto-unmute error:', error);
                    }
                }, duration * 60000);
            }

            if (config.mod_log_channel_id) {
                const logChannel = interaction.guild.channels.cache.get(config.mod_log_channel_id);
                if (logChannel) await logChannel.send({ embeds: [embed] });
            }
        } catch (error) {
            console.error('Mute error:', error);
            await interaction.reply({ content: '❌ Failed to mute the user.', ephemeral: true });
        }
    }
};
