const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { db } = require("../db");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("trivialeaderboard")
    .setDescription("View the top 10 trivia XP earners"),

  async execute(interaction) {
    try {
      // 🔹 Use our db helper to fetch top 10 users
      const users = await db.leaderboard(10);

      const desc = users.length
        ? users
            .map(
              (u, i) =>
                `${i + 1}. <@${u.discordId}> — **${u.xp} XP** (${u.trivia?.correct || 0} ✅ / ${u.trivia?.wrong || 0} ❌)`
            )
            .join("\n")
        : "No scores yet! Answer trivia to climb the leaderboard.";

      const embed = new EmbedBuilder()
        .setTitle("🏆 Cryptic Net Trivia Leaderboard")
        .setDescription(desc)
        .setColor(0x1f8b4c)
        .setFooter({ text: "Compete in hourly trivia to earn XP!" })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error("\x1b[31m[TRIVIA]\x1b[0m Error fetching leaderboard:", err);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: "❌ Error fetching leaderboard.",
          flags: 64, // <- replaces deprecated "ephemeral"
        });
      }
    }
  },
};


