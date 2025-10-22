const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../database/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('View the server XP leaderboard')
        .addIntegerOption(option =>
            option.setName('page')
                .setDescription('Page number')
                .setMinValue(1)
                .setRequired(false)),

    async execute(interaction) {
        const page = interaction.options.getInteger('page') || 1;
        const pageSize = 10;
        const offset = (page - 1) * pageSize;

        const leaderboard = await db.getLeaderboard(interaction.guild.id, 100);
        const totalPages = Math.ceil(leaderboard.length / pageSize);

        if (page > totalPages && totalPages > 0) {
            return interaction.reply({ content: `❌ Page ${page} doesn't exist. There are only ${totalPages} page(s).`, ephemeral: true });
        }

        const pageData = leaderboard.slice(offset, offset + pageSize);

        if (pageData.length === 0) {
            return interaction.reply({ content: '📊 No one has gained XP yet!', ephemeral: true });
        }

        const embed = new EmbedBuilder()
            .setColor('#ffd700')
            .setTitle(`🏆 ${interaction.guild.name} Leaderboard`)
            .setDescription(
                pageData.map((user, index) => {
                    const rank = offset + index + 1;
                    const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `**${rank}.**`;
                    return `${medal} <@${user.user_id}> - Level ${user.level} (${user.xp} XP)`;
                }).join('\n')
            )
            .setFooter({ text: `Page ${page}/${totalPages} • Total members: ${leaderboard.length}` })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};
