const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const { db } = require('../db');

const CHANNEL_ID = process.env.TRIVIA_CHANNEL_ID || '1424697825119305769';
const TRIVIA_INTERVAL = 60 * 60 * 1000; // 1 hour
const ANSWER_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const WRONG_ANSWER_COOLDOWN = 10 * 60 * 1000; // 10 minutes
const CORRECT_ANSWER_PAUSE = 60 * 1000; // 1 minute pause after correct answer
const XP_PER_CORRECT = 10;
const COUNTDOWN_UPDATE_INTERVAL = 30 * 1000; // Update every 30 seconds
const POST_DELAY = 10 * 1000; // 10 seconds delay after clearing

let countdownMessage = null;
let currentQuestionMessage = null;
let isQuestionActive = true;
let lastPostTime = 0;
let currentQuestion = null;

const log = {
  info: (...args) => console.log('\x1b[36m[TRIVIA]\x1b[0m', ...args),
  error: (...args) => console.error('\x1b[31m[TRIVIA]\x1b[0m', ...args),
};

async function clearChannel(channel) {
  try {
    const msgs = await channel.messages.fetch({ limit: 50 });
    if (msgs.size > 0) await channel.bulkDelete(msgs, true);
  } catch (e) {
    // ignore
  }
}

async function startCountdown(channel, endTime) {
  try {
    const embed = new EmbedBuilder()
      .setTitle('⏳ Next Trivia Question')
      .setDescription('Get ready! A new question will be posted soon.')
      .setColor('#1f2937');

    if (!countdownMessage) {
      countdownMessage = await channel.send({ embeds: [embed] });
    }

    const interval = setInterval(async () => {
      const remaining = Math.max(0, endTime - Date.now());
      const minutes = Math.floor(remaining / 60000);
      const seconds = Math.floor((remaining % 60000) / 1000);

      const update = EmbedBuilder.from(embed).setDescription(`Next question in **${minutes}m ${seconds}s**`);
      try {
        await countdownMessage.edit({ embeds: [update] });
      } catch {}

      if (remaining <= 0) {
        clearInterval(interval);
      }
    }, COUNTDOWN_UPDATE_INTERVAL);
  } catch (err) {
    log.error('Error starting countdown:', err);
  }
}

async function postTrivia(client) {
  isQuestionActive = true;
  try {
    const channel = await client.channels.fetch(CHANNEL_ID);
    if (!channel) {
      log.error('Trivia channel not found:', CHANNEL_ID);
      return;
    }

    await clearChannel(channel);
    await new Promise(resolve => setTimeout(resolve, POST_DELAY));

    currentQuestion = await db.getRandomQuestion();
    if (!currentQuestion) {
      await channel.send('No trivia questions found. Use /generate-trivia first.');
      isQuestionActive = false;
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle('🧠 Cryptic Net Trivia')
      .setDescription(currentQuestion.question)
      .addFields(currentQuestion.options.map((opt, i) => ({ name: String.fromCharCode(65 + i), value: opt, inline: true })))
      .setFooter({ text: `Difficulty: ${currentQuestion.difficulty || 'easy'} | ID: ${currentQuestion.questionId}` })
      .setColor('#1f2937');

    const buttons = new ActionRowBuilder().addComponents(
      currentQuestion.options.map((_, i) =>
        new ButtonBuilder()
          .setCustomId(`trivia:${currentQuestion.questionId}:${i}`)
          .setLabel(String.fromCharCode(65 + i))
          .setStyle(ButtonStyle.Primary)
      )
    );

    currentQuestionMessage = await channel.send({ embeds: [embed], components: [buttons] });

    // Start countdown to next
    lastPostTime = Date.now();
    startCountdown(channel, lastPostTime + TRIVIA_INTERVAL);
  } catch (err) {
    log.error('Error posting trivia:', err);
  }
}

async function cycleTrivia(client) {
  // Fire immediately, then every hour
  await postTrivia(client);
  setInterval(() => postTrivia(client), TRIVIA_INTERVAL);
}

async function handleTriviaInteraction(interaction) {
  try {
    if (!interaction.customId?.startsWith('trivia:')) return false;
    const [, questionId, optionIndexStr] = interaction.customId.split(':');
    const optionIndex = parseInt(optionIndexStr, 10);

    const question = await db.findQuestionById(questionId);
    if (!question) {
      await interaction.reply({ content: '❌ That question no longer exists.', ephemeral: true });
      return true;
    }

    // Cooldown for wrong answers (10 min)
    const user = await db.getOrCreateUser(interaction.user.id);
    if (user.trivia.lastWrongAt) {
      const diff = Date.now() - new Date(user.trivia.lastWrongAt).getTime();
      if (diff < WRONG_ANSWER_COOLDOWN) {
        const min = Math.ceil((WRONG_ANSWER_COOLDOWN - diff) / 60000);
        await interaction.reply({ content: `⏳ Wrong-answer cooldown. Try again in ~${min} min.`, ephemeral: true });
        return true;
      }
    }

    // One correct per question per user
    if (await db.hasAnswered(interaction.user.id, questionId)) {
      await interaction.reply({ content: 'You already answered this question.', ephemeral: true });
      return true;
    }

    const isCorrect = question.options[optionIndex] === question.answer;
    if (isCorrect) {
      await db.addTriviaXP(interaction.user.id, XP_PER_CORRECT);
      await db.markAnswered(interaction.user.id, questionId);
      await interaction.reply({ content: `✅ Correct! You earned **${XP_PER_CORRECT} XP**.`, ephemeral: true });
    } else {
      await db.recordWrong(interaction.user.id);
      await interaction.reply({ content: `❌ Wrong! You must wait 10 minutes before trying again.`, ephemeral: true });
    }

    log.info(`User ${interaction.user.tag} answered ${questionId}: ${isCorrect ? 'Correct' : 'Incorrect'}`);
    return true;
  } catch (err) {
    log.error('Error handling trivia interaction:', err);
    try { await interaction.reply({ content: '❌ Error processing your answer.', ephemeral: true }); } catch {}
    return true;
  }
}

module.exports = { cycleTrivia, handleTriviaInteraction };
