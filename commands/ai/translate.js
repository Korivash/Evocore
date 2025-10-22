const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const gemini = require('../../utils/gemini');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('translate')
        .setDescription('Translate text to another language')
        .addStringOption(option =>
            option.setName('text')
                .setDescription('Text to translate')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('language')
                .setDescription('Target language (e.g., Spanish, French, Japanese)')
                .setRequired(true)),
    cooldown: 5,

    async execute(interaction) {
        if (!gemini.isInitialized()) {
            return interaction.reply({ 
                content: '❌ AI features are not available. Please configure GEMINI_API_KEY.', 
                ephemeral: true 
            });
        }

        await interaction.deferReply();

        const text = interaction.options.getString('text');
        const language = interaction.options.getString('language');

        try {
            const translation = await gemini.translateText(text, language);

            const embed = new EmbedBuilder()
                .setColor('#3498db')
                .setTitle('🌐 Translation')
                .addFields(
                    { name: 'Original', value: text.substring(0, 1024), inline: false },
                    { name: `Translated (${language})`, value: translation.substring(0, 1024), inline: false }
                )
                .setFooter({ text: 'Powered by Gemini AI' })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('Translation error:', error);
            await interaction.editReply({ 
                content: '❌ Failed to translate text. Please try again.' 
            });
        }
    }
};
