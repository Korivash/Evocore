const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const gemini = require('../../utils/gemini');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('imagine')
        .setDescription('Generate creative content with AI')
        .addStringOption(option =>
            option.setName('type')
                .setDescription('Type of content')
                .setRequired(true)
                .addChoices(
                    { name: 'Story', value: 'story' },
                    { name: 'Poem', value: 'poem' },
                    { name: 'Joke', value: 'joke' },
                    { name: 'Fact', value: 'fact' }
                ))
        .addStringOption(option =>
            option.setName('topic')
                .setDescription('Topic or subject')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('style')
                .setDescription('Style or mood (optional)')
                .setRequired(false)),
    cooldown: 5,

    async execute(interaction) {
        if (!gemini.isInitialized()) {
            return interaction.reply({ 
                content: '❌ AI features are not available. Please configure GEMINI_API_KEY.', 
                ephemeral: true 
            });
        }

        await interaction.deferReply();

        const type = interaction.options.getString('type');
        const topic = interaction.options.getString('topic');
        const style = interaction.options.getString('style') || '';

        try {
            const content = await gemini.generateCreativeContent(type, topic, style);

            const typeEmojis = {
                story: '📖',
                poem: '✍️',
                joke: '😂',
                fact: '💡'
            };

            const embed = new EmbedBuilder()
                .setColor('#e74c3c')
                .setTitle(`${typeEmojis[type]} ${type.charAt(0).toUpperCase() + type.slice(1)}: ${topic}`)
                .setDescription(content.substring(0, 4096))
                .setFooter({ text: 'Powered by Gemini AI' })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('Imagine error:', error);
            await interaction.editReply({ 
                content: '❌ Failed to generate content. Please try again.' 
            });
        }
    }
};
