const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const blizzard = require('../../utils/blizzard');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('wow-pvp')
        .setDescription('View World of Warcraft PvP statistics')
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
            const pvpStats = await blizzard.getWoWPvP(realm, name);

            const embed = new EmbedBuilder()
                .setColor('#ff1744')
                .setTitle(`⚔️ ${name} - ${realm}`)
                .setDescription('PvP Statistics');

            // Honor level
            if (pvpStats.honor_level !== undefined) {
                embed.addFields({
                    name: '🎖️ Honor Level',
                    value: pvpStats.honor_level.toString(),
                    inline: true
                });
            }

            // Honor
            if (pvpStats.honor !== undefined) {
                embed.addFields({
                    name: '⭐ Honor',
                    value: pvpStats.honor.toString(),
                    inline: true
                });
            }

            // Arena ratings
            const brackets = ['2v2', '3v3', 'rbg'];
            const bracketNames = {
                '2v2': '2v2 Arena',
                '3v3': '3v3 Arena',
                'rbg': 'Rated Battlegrounds'
            };

            brackets.forEach(bracket => {
                const bracketData = pvpStats[bracket] || pvpStats.brackets?.[bracket];
                if (bracketData) {
                    const rating = bracketData.rating || 0;
                    const wins = bracketData.season_match_statistics?.won || bracketData.won || 0;
                    const losses = bracketData.season_match_statistics?.lost || bracketData.lost || 0;
                    const total = wins + losses;
                    const winRate = total > 0 ? ((wins / total) * 100).toFixed(1) : '0.0';

                    embed.addFields({
                        name: `🏆 ${bracketNames[bracket]}`,
                        value: `Rating: ${rating}\nW/L: ${wins}/${losses} (${winRate}%)`,
                        inline: true
                    });
                }
            });

            // Check if player has any PvP data
            if (embed.data.fields.length === 0 || 
                (embed.data.fields.length === 1 && embed.data.fields[0].name === '🎖️ Honor Level')) {
                return interaction.editReply({ 
                    content: '❌ This character has no significant PvP activity this season.' 
                });
            }

            embed.setFooter({ text: 'Data from Blizzard API' })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('WoW PvP lookup error:', error);
            
            let errorMessage = '❌ Character not found or has no PvP data.';
            if (error.response?.status === 404) {
                errorMessage = '❌ Character not found or has no PvP activity. Make sure the character has participated in rated PvP this season.';
            }
            
            await interaction.editReply({ content: errorMessage });
        }
    }
};
