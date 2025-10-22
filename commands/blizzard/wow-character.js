const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const blizzard = require('../../utils/blizzard');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('wow-character')
        .setDescription('Look up a World of Warcraft character')
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
            const character = await blizzard.getWoWCharacter(realm, name);

            const embed = new EmbedBuilder()
                .setColor('#00d4ff')
                .setTitle(`${character.name} - ${character.realm.name}`)
                .setThumbnail(`https://render.worldofwarcraft.com/us/character/${character.thumbnail}`)
                .addFields(
                    { name: 'Level', value: character.level?.toString() || 'N/A', inline: true },
                    { name: 'Race', value: character.race?.name || 'N/A', inline: true },
                    { name: 'Class', value: character.character_class?.name || 'N/A', inline: true },
                    { name: 'Faction', value: character.faction?.name || 'N/A', inline: true },
                    { name: 'Guild', value: character.guild?.name || 'No Guild', inline: true },
                    { name: 'Achievement Points', value: character.achievement_points?.toString() || '0', inline: true }
                )
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('WoW character lookup error:', error);
            await interaction.editReply({ 
                content: '❌ Character not found or API error. Please check the realm and name spelling.' 
            });
        }
    }
};
