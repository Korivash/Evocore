const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const gemini = require('../../utils/gemini');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ask')
        .setDescription('Ask the AI a question')
        .addStringOption(option =>
            option.setName('question')
                .setDescription('Your question')
                .setRequired(true)),
    cooldown: 3,

    async execute(interaction) {
        if (!gemini.isInitialized()) {
            return interaction.reply({ 
                content: '❌ AI features are not available. Please configure GEMINI_API_KEY.', 
                ephemeral: true 
            });
        }

        await interaction.deferReply();

        const question = interaction.options.getString('question');

        try {
            const response = await gemini.generateResponse(question);

            const embed = new EmbedBuilder()
                .setColor('#9b59b6')
                .setAuthor({ 
                    name: interaction.user.tag, 
                    iconURL: interaction.user.displayAvatarURL() 
                })
                .addFields(
                    { name: '❓ Question', value: question, inline: false },
                    { name: '🤖 Answer', value: response.substring(0, 1024), inline: false }
                )
                .setFooter({ text: 'Powered by Gemini AI' })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('AI error:', error);
            await interaction.editReply({ 
                content: '❌ Failed to generate response. Please try again.' 
            });
        }
    }
};
