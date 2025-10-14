const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { db } = require('../db');
const config = require('../config');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

const log = {
  info: (...args) => console.log('\x1b[36m[TRIVIA]\x1b[0m', ...args),
  error: (...args) => console.error('\x1b[31m[TRIVIA]\x1b[0m', ...args),
};

const triviaPrompt = `
Generate a World of Warcraft trivia question focused on the game’s lore, expansions (e.g., The War Within), raids, or general gameplay. The question must:
- Be suitable for a guild Discord bot.
- Include 4 multiple-choice options labeled A, B, C, D.
- Specify the correct answer (e.g., "Correct: A").
- Assign a difficulty level (easy, medium, or hard).
- Return only valid JSON with no extra text, Markdown, code blocks, or formatting:
{
  "questionId": "short-unique-id",
  "question": "Your question here",
  "options": ["A: Option1", "B: Option2", "C: Option3", "D: Option4"],
  "answer": "A: Option1",
  "difficulty": "hard"
}
Example themes: The War Within, Nerub-ar Palace, guild history (e.g., Cryptic Net), mounts, or classic lore.
`;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('generate-trivia')
    .setDescription('Owner-only: generate and store WoW trivia questions')
    .addIntegerOption(option =>
      option.setName('count')
        .setDescription('Number of questions to generate (1-3)')
        .setMinValue(1)
        .setMaxValue(3)
        .setRequired(false)
    ),

  async execute(interaction) {
    if (!config.bot.owners.includes(interaction.user.id)) {
      return interaction.reply({ content: '❌ Only the owner can run this command.', ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });
    const count = interaction.options.getInteger('count') || 1;
    const newQuestions = [];

    try {
      for (let i = 0; i < count; i++) {
        const result = await model.generateContent(triviaPrompt);
        let responseText = result.response.text().trim();
        responseText = responseText.replace(/```json\n?|\n?```/g, '').trim();

        let generated;
        try {
          generated = JSON.parse(responseText);
        } catch (parseErr) {
          log.error('Failed to parse Gemini response:', parseErr, responseText);
          throw new Error('Invalid response format from AI.');
        }

        if (
          !generated.questionId ||
          !generated.question ||
          !generated.options ||
          generated.options.length !== 4 ||
          !generated.answer ||
          !['easy', 'medium', 'hard'].includes(generated.difficulty)
        ) {
          throw new Error('Invalid trivia question format.');
        }

        newQuestions.push(generated);
      }

      await db.addQuestions(newQuestions);
      log.info(`Added ${count} AI-generated trivia questions to MongoDB.`);

      const embed = new EmbedBuilder()
        .setTitle(`Generated ${count} New Trivia Question(s)`)
        .setDescription('Questions saved to MongoDB.')
        .setColor(0x1f8b4c)
        .addFields(
          newQuestions.map(q => ({
            name: `${q.difficulty.toUpperCase()} — ${q.questionId}`,
            value: `**Q:** ${q.question}\n**Options:** ${q.options.join(', ')}\n**Answer:** ${q.answer}`,
          }))
        )
        .setFooter({ text: 'Questions ready for hourly trivia!' });

      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      log.error('Error generating/adding questions:', err.message);
      await interaction.editReply({ content: `❌ Error generating questions: ${err.message}`, ephemeral: true });
    }
  }
};




