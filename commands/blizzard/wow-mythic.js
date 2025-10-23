const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const blizzard = require('../../utils/blizzard');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('wow-mythic')
        .setDescription('View World of Warcraft Mythic+ profile')
        .addStringOption(option =>
            option.setName('realm')
                .setDescription('Character realm')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('name')
                .setDescription('Character name')
                .setRequired(true)),
    cooldown: 5,

    async execute(interaction) {
        await interaction.deferReply();

        const realm = interaction.options.getString('realm');
        const name = interaction.options.getString('name');

        try {
            const profile = await blizzard.getWoWMythicPlus(realm, name);

            const embed = new EmbedBuilder()
                .setColor('#a335ee')
                .setTitle(`⚔️ ${name} - ${realm}`)
                .setDescription('Mythic+ Profile');

            // Current season rating
            if (profile.current_mythic_rating) {
                embed.addFields({
                    name: '🏆 Current Rating',
                    value: profile.current_mythic_rating.rating?.toFixed(1) || 'N/A',
                    inline: true
                });
            }

            // Season best runs
            if (profile.seasons && profile.seasons.length > 0) {
                const currentSeason = profile.seasons[0];
                
                if (currentSeason.best_runs && currentSeason.best_runs.length > 0) {
                    const topRuns = currentSeason.best_runs.slice(0, 5).map(run => {
                        const dungeon = run.dungeon?.name || 'Unknown Dungeon';
                        const level = run.keystone_level || 0;
                        const time = run.is_completed_within_time ? '✅' : '❌';
                        return `${dungeon} +${level} ${time}`;
                    }).join('\n');

                    embed.addFields({
                        name: '🗝️ Top Runs This Season',
                        value: topRuns || 'No runs recorded',
                        inline: false
                    });
                }
            }

            // Recent runs
            if (profile.best_runs && profile.best_runs.length > 0) {
                const recentRuns = profile.best_runs.slice(0, 3).map(run => {
                    const dungeon = run.dungeon?.name || 'Unknown';
                    const level = run.keystone_level || 0;
                    const time = run.is_completed_within_time ? '✅ In Time' : '❌ Over Time';
                    const rating = run.mythic_rating?.rating ? `(${run.mythic_rating.rating.toFixed(1)})` : '';
                    return `**${dungeon}** +${level} ${time} ${rating}`;
                }).join('\n');

                embed.addFields({
                    name: '📋 Recent Best Runs',
                    value: recentRuns,
                    inline: false
                });
            }

            embed.setFooter({ text: 'Data from Blizzard API' })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('WoW Mythic+ lookup error:', error);
            
            let errorMessage = '❌ Character not found or has no Mythic+ data.';
            if (error.response?.status === 404) {
                errorMessage = '❌ Character not found or has no Mythic+ profile. Make sure they have run at least one Mythic+ dungeon this season.';
            }
            
            await interaction.editReply({ content: errorMessage });
        }
    }
};
