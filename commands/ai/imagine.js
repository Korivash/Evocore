const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const gemini = require('../../utils/gemini');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('imagine')
        .setDescription('Generate images or creative content with AI')
        .addSubcommand(subcommand =>
            subcommand
                .setName('image')
                .setDescription('Generate an image from a text description')
                .addStringOption(option =>
                    option.setName('prompt')
                        .setDescription('Describe the image you want to generate')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('style')
                        .setDescription('Art style (optional)')
                        .setRequired(false)
                        .addChoices(
                            { name: 'Photorealistic', value: 'photorealistic' },
                            { name: 'Anime', value: 'anime style' },
                            { name: 'Digital Art', value: 'digital art' },
                            { name: 'Oil Painting', value: 'oil painting' },
                            { name: 'Watercolor', value: 'watercolor' },
                            { name: 'Sketch', value: 'pencil sketch' },
                            { name: '3D Render', value: '3D render' },
                            { name: 'Cartoon', value: 'cartoon style' }
                        ))
                .addStringOption(option =>
                    option.setName('aspect-ratio')
                        .setDescription('Image aspect ratio (default: 1:1)')
                        .setRequired(false)
                        .addChoices(
                            { name: 'Square (1:1)', value: '1:1' },
                            { name: 'Landscape (16:9)', value: '16:9' },
                            { name: 'Portrait (9:16)', value: '9:16' },
                            { name: 'Wide (21:9)', value: '21:9' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('text')
                .setDescription('Generate creative text content')
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
                        .setRequired(false))),
    cooldown: 10,

    async execute(interaction) {
        if (!gemini.isInitialized()) {
            return interaction.reply({ 
                content: '❌ AI features are not available. Please configure GEMINI_API_KEY.', 
                ephemeral: true 
            });
        }

        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'image') {
            await handleImageGeneration(interaction);
        } else if (subcommand === 'text') {
            await handleTextGeneration(interaction);
        }
    }
};

async function handleImageGeneration(interaction) {
    await interaction.deferReply();

    const prompt = interaction.options.getString('prompt');
    const style = interaction.options.getString('style');
    const aspectRatio = interaction.options.getString('aspect-ratio') || '1:1';

    try {
        // Build the full prompt with style if provided
        let fullPrompt = prompt;
        if (style) {
            fullPrompt = `${prompt}, ${style}`;
        }

        const statusEmbed = new EmbedBuilder()
            .setColor('#9b59b6')
            .setTitle('🎨 Generating Image...')
            .setDescription(`**Prompt:** ${prompt}${style ? `\n**Style:** ${style}` : ''}`)
            .setFooter({ text: 'This may take 10-30 seconds...' })
            .setTimestamp();

        await interaction.editReply({ embeds: [statusEmbed] });

        // Generate the image using Imagen 3
        const imageBuffer = await gemini.generateImage(fullPrompt, aspectRatio);

        // Create attachment
        const attachment = new AttachmentBuilder(imageBuffer, { name: 'generated-image.png' });

        // Create result embed
        const resultEmbed = new EmbedBuilder()
            .setColor('#9b59b6')
            .setTitle('✨ Image Generated!')
            .setDescription(`**Prompt:** ${prompt}${style ? `\n**Style:** ${style}` : ''}`)
            .setImage('attachment://generated-image.png')
            .setFooter({ text: 'Powered by Google Imagen 3' })
            .setTimestamp();

        await interaction.editReply({ 
            embeds: [resultEmbed],
            files: [attachment]
        });

    } catch (error) {
        console.error('Image generation error:', error);
        
        let errorMessage = '❌ Failed to generate image. Please try again.';
        
        if (error.message.includes('safety')) {
            errorMessage = '❌ Image generation blocked due to safety filters. Please try a different prompt.';
        } else if (error.message.includes('quota')) {
            errorMessage = '❌ API quota exceeded. Please try again later.';
        } else if (error.message.includes('not initialized')) {
            errorMessage = '❌ Image generation is not available. Please contact the bot administrator.';
        }
        
        await interaction.editReply({ 
            content: errorMessage,
            embeds: []
        });
    }
}

async function handleTextGeneration(interaction) {
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
        console.error('Text generation error:', error);
        await interaction.editReply({ 
            content: '❌ Failed to generate content. Please try again.' 
        });
    }
}
