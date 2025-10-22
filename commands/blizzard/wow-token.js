const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const blizzard = require('../../utils/blizzard');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('wow-token')
        .setDescription('Get current WoW Token price'),
    cooldown: 5,

    async execute(interaction) {
        await interaction.deferReply();

        try {
            const tokenData = await blizzard.getWoWTokenPrice();
            const price = tokenData.price;
            const priceGold = Math.floor(price / 10000);
            const lastUpdate = new Date(tokenData.last_updated_timestamp);

            const embed = new EmbedBuilder()
                .setColor('#ffd700')
                .setTitle('💰 WoW Token Price')
                .setDescription(`Current price: **${priceGold.toLocaleString()}** gold`)
                .addFields(
                    { name: 'Last Updated', value: `<t:${Math.floor(lastUpdate.getTime() / 1000)}:R>`, inline: true }
                )
                .setFooter({ text: 'Data from Blizzard API' })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('Token price error:', error);
            await interaction.editReply({ 
                content: '❌ Failed to fetch token price. Please try again later.' 
            });
        }
    }
};
