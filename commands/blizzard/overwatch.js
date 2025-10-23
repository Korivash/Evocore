const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const blizzard = require('../../utils/blizzard');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('overwatch')
        .setDescription('Look up Overwatch player profile')
        .addStringOption(option =>
            option.setName('battletag')
                .setDescription('BattleTag (e.g., Player#1234)')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('platform')
                .setDescription('Gaming platform')
                .setRequired(false)
                .addChoices(
                    { name: 'PC', value: 'pc' },
                    { name: 'PlayStation', value: 'psn' },
                    { name: 'Xbox', value: 'xbl' },
                    { name: 'Nintendo Switch', value: 'nintendo-switch' }
                )),
    cooldown: 5,

    async execute(interaction) {
        await interaction.deferReply();

        const battleTag = interaction.options.getString('battletag');
        const platform = interaction.options.getString('platform') || 'pc';

        try {
            const profile = await blizzard.getOverwatchProfile(battleTag, platform);

            const embed = new EmbedBuilder()
                .setColor('#ff9c00')
                .setTitle(`🎮 ${profile.username || battleTag} - Overwatch Profile`)
                .setThumbnail(profile.avatar || 'https://blz-contentstack-images.akamaized.net/v3/assets/blt9c12f249ac15c7ec/bltfb9ffbf8c5d8d6be/62ea89040a70d35da68375e0/OW_CircleLogo.png')
                .addFields(
                    { 
                        name: '🏆 Competitive Rank', 
                        value: profile.competitive?.rank_name || profile.ratings?.[0]?.level || 'Unranked', 
                        inline: true 
                    },
                    { 
                        name: '⭐ Level', 
                        value: profile.level?.toString() || profile.endorsement?.level?.toString() || 'N/A', 
                        inline: true 
                    },
                    { 
                        name: '🎯 Platform', 
                        value: platform.toUpperCase(), 
                        inline: true 
                    }
                );

            // Add competitive stats if available
            if (profile.competitive) {
                const comp = profile.competitive;
                if (comp.tank) {
                    embed.addFields({
                        name: '🛡️ Tank',
                        value: `Rank: ${comp.tank.rank_name || 'N/A'}\nSR: ${comp.tank.sr || 'N/A'}`,
                        inline: true
                    });
                }
                if (comp.damage) {
                    embed.addFields({
                        name: '⚔️ Damage',
                        value: `Rank: ${comp.damage.rank_name || 'N/A'}\nSR: ${comp.damage.sr || 'N/A'}`,
                        inline: true
                    });
                }
                if (comp.support) {
                    embed.addFields({
                        name: '💚 Support',
                        value: `Rank: ${comp.support.rank_name || 'N/A'}\nSR: ${comp.support.sr || 'N/A'}`,
                        inline: true
                    });
                }
            }

            // Add games played if available
            if (profile.games) {
                embed.addFields({
                    name: '🎮 Games Played',
                    value: `Quick Play: ${profile.games.quickplay || 'N/A'}\nCompetitive: ${profile.games.competitive || 'N/A'}`,
                    inline: false
                });
            }

            // Add playtime if available
            if (profile.playtime) {
                embed.addFields({
                    name: '⏱️ Playtime',
                    value: `${profile.playtime.quickplay || 'N/A'} hours`,
                    inline: false
                });
            }

            embed.setFooter({ text: 'Data from Blizzard API' })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('Overwatch lookup error:', error);
            
            let errorMessage = '❌ Player not found or API error.';
            if (error.response?.status === 404) {
                errorMessage = '❌ Player not found. Make sure the BattleTag is correct (e.g., Player#1234).';
            } else if (error.response?.status === 403) {
                errorMessage = '❌ This profile is private or API access is restricted.';
            }
            
            await interaction.editReply({ content: errorMessage });
        }
    }
};
