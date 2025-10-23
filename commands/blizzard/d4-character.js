const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const blizzard = require('../../utils/blizzard');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('d4-character')
        .setDescription('Look up a Diablo 4 character')
        .addStringOption(option =>
            option.setName('battletag')
                .setDescription('BattleTag (e.g., Player#1234)')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('character-id')
                .setDescription('Character ID (numeric)')
                .setRequired(true)),
    cooldown: 5,

    async execute(interaction) {
        await interaction.deferReply();

        const battleTag = interaction.options.getString('battletag');
        const characterId = interaction.options.getString('character-id');

        try {
            const character = await blizzard.getD4Character(battleTag, characterId);

            const embed = new EmbedBuilder()
                .setColor('#8b0000')
                .setTitle(`⚔️ ${character.name || 'Diablo 4 Character'}`)
                .setDescription(`BattleTag: ${battleTag}`)
                .addFields(
                    { 
                        name: '🏆 Class', 
                        value: character.class || 'Unknown', 
                        inline: true 
                    },
                    { 
                        name: '📊 Level', 
                        value: character.level?.toString() || 'N/A', 
                        inline: true 
                    },
                    { 
                        name: '🌟 Paragon', 
                        value: character.paragon_level?.toString() || '0', 
                        inline: true 
                    }
                );

            // Add stats if available
            if (character.stats) {
                const stats = character.stats;
                if (stats.life) {
                    embed.addFields({
                        name: '❤️ Life',
                        value: stats.life.toString(),
                        inline: true
                    });
                }
                if (stats.armor) {
                    embed.addFields({
                        name: '🛡️ Armor',
                        value: stats.armor.toString(),
                        inline: true
                    });
                }
                if (stats.attack_speed) {
                    embed.addFields({
                        name: '⚔️ Attack Speed',
                        value: stats.attack_speed.toString(),
                        inline: true
                    });
                }
            }

            // Add skills if available
            if (character.skills && character.skills.length > 0) {
                const skills = character.skills.slice(0, 5).map(s => s.name || s.id).join(', ');
                embed.addFields({
                    name: '🎯 Skills',
                    value: skills,
                    inline: false
                });
            }

            // Add season info if available
            if (character.seasonal) {
                embed.addFields({
                    name: '📅 Seasonal',
                    value: character.seasonal ? 'Yes' : 'No',
                    inline: true
                });
            }

            // Add hardcore status
            if (character.hardcore !== undefined) {
                embed.addFields({
                    name: '💀 Hardcore',
                    value: character.hardcore ? 'Yes' : 'No',
                    inline: true
                });
            }

            embed.setFooter({ text: 'Data from Blizzard API' })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('D4 character lookup error:', error);
            
            let errorMessage = '❌ Character not found or API error.';
            if (error.response?.status === 404) {
                errorMessage = '❌ Character not found. Make sure the BattleTag and Character ID are correct.';
            } else if (error.response?.status === 403) {
                errorMessage = '❌ This profile is private or API access is restricted.';
            }
            
            await interaction.editReply({ content: errorMessage });
        }
    }
};
