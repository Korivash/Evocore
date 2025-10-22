const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const db = require('../../database/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('modlogs')
        .setDescription('View moderation logs')
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addUserOption(option =>
            option.setName('user')
                .setDescription('View logs for specific user')
                .setRequired(false))
        .addIntegerOption(option =>
            option.setName('limit')
                .setDescription('Number of logs to show (default: 10)')
                .setMinValue(1)
                .setMaxValue(25)
                .setRequired(false)),

    async execute(interaction) {
        await interaction.deferReply();

        const target = interaction.options.getUser('user');
        const limit = interaction.options.getInteger('limit') || 10;

        try {
            const logs = target 
                ? await db.getModLogs(interaction.guild.id, target.id, limit)
                : await db.getAllModLogs(interaction.guild.id, limit);

            if (logs.length === 0) {
                return interaction.editReply({ content: '📋 No moderation logs found.' });
            }

            const embed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle(`📋 Moderation Logs${target ? ` for ${target.tag}` : ''}`)
                .setDescription(`Showing last ${logs.length} log(s)`)
                .setTimestamp();

            const logsList = logs.map(log => {
                const date = new Date(log.created_at).toLocaleString();
                const duration = log.duration ? ` (${log.duration}h)` : '';
                return `**${log.action}** - <@${log.user_id}>\n` +
                       `By: <@${log.moderator_id}> | ${date}${duration}\n` +
                       `Reason: ${log.reason || 'No reason'}`;
            }).join('\n\n');

            embed.addFields({ name: 'Logs', value: logsList.substring(0, 4096), inline: false });

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('Modlogs error:', error);
            await interaction.editReply({ content: '❌ Failed to fetch moderation logs.' });
        }
    }
};
