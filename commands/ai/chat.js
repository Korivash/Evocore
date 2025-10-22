const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const gemini = require('../../utils/gemini');

const conversations = new Map();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('chat')
        .setDescription('Chat with the AI (maintains conversation context)')
        .addStringOption(option =>
            option.setName('message')
                .setDescription('Your message')
                .setRequired(true))
        .addBooleanOption(option =>
            option.setName('reset')
                .setDescription('Reset conversation history')
                .setRequired(false)),
    cooldown: 3,

    async execute(interaction) {
        if (!gemini.isInitialized()) {
            return interaction.reply({ 
                content: '❌ AI features are not available. Please configure GEMINI_API_KEY.', 
                ephemeral: true 
            });
        }

        const message = interaction.options.getString('message');
        const reset = interaction.options.getBoolean('reset');
        const userId = interaction.user.id;

        if (reset) {
            conversations.delete(userId);
            return interaction.reply({ content: '🔄 Conversation history reset!', ephemeral: true });
        }

        await interaction.deferReply();

        try {
            if (!conversations.has(userId)) {
                conversations.set(userId, []);
            }

            const history = conversations.get(userId);
            history.push({ role: 'user', content: message });

            const response = await gemini.chatWithContext(history);
            history.push({ role: 'assistant', content: response });

            if (history.length > 20) {
                history.splice(0, 2);
            }

            const embed = new EmbedBuilder()
                .setColor('#9b59b6')
                .setAuthor({ 
                    name: interaction.user.tag, 
                    iconURL: interaction.user.displayAvatarURL() 
                })
                .addFields(
                    { name: '💬 You', value: message.substring(0, 1024), inline: false },
                    { name: '🤖 AI', value: response.substring(0, 1024), inline: false }
                )
                .setFooter({ text: `Context: ${history.length / 2} messages • Use reset:true to clear` })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('Chat error:', error);
            await interaction.editReply({ 
                content: '❌ Failed to generate response. Please try again.' 
            });
        }
    }
};
