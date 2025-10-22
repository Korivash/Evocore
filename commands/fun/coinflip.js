const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('coinflip')
        .setDescription('Flip a coin'),

    async execute(interaction) {
        const result = Math.random() < 0.5 ? 'Heads' : 'Tails';
        const emoji = result === 'Heads' ? '🪙' : '🔘';

        const embed = new EmbedBuilder()
            .setColor(result === 'Heads' ? '#ffd700' : '#c0c0c0')
            .setTitle('🪙 Coin Flip')
            .setDescription(`The coin landed on: **${emoji} ${result}**`)
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};
