const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const fetch = require("node-fetch");
const { db } = require("../db");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("leaderboard")
    .setDescription("Shows the guild Mythic+ leaderboard"),

  async execute(interaction) {
    console.log(`[LEADERBOARD] Deferring reply at ${new Date()}`);
    await interaction.deferReply();

    const maxRetries = 2;
    let attempt = 0;

    try {
      // 🔹 Try database first
      console.log(`[LEADERBOARD] Checking database at ${new Date()}`);
      const members = await db.getGuildMembers();

      if (members && members.length > 0) {
        console.log(`[LEADERBOARD] Using database data with ${members.length} members`);

        const sorted = members.sort((a, b) => b.mythicScore - a.mythicScore);

        const top10 = sorted.slice(0, 10).map((m, i) =>
          `#${i + 1} - ${m.name} - ${m.realm}\nMythic+ Score: ${m.mythicScore}`
        );

        const embed = new EmbedBuilder()
          .setTitle("Cryptic Net Guild Mythic+ Leaderboard")
          .setDescription(top10.join("\n\n"))
          .setFooter({ text: "Cryptic Net Bot | From Database" })
          .setColor("#1f2937");

        console.log(`[LEADERBOARD] Sending database reply at ${new Date()}`);
        await interaction.editReply({ embeds: [embed] });
        return;
      }

      // 🔹 Fallback to Raider.IO
      console.log(`[LEADERBOARD] Database empty, fetching from Raider.IO`);
      while (attempt <= maxRetries) {
        try {
          console.log(`[LEADERBOARD] Fetching Raider.IO, attempt ${attempt + 1} at ${new Date()}`);
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);

          const url =
            "https://raider.io/api/v1/guilds/mythic-plus-characters?region=us&realm=area-52&name=Cryptic%20Net&season=season-tww-3";
          const response = await fetch(url, { signal: controller.signal });
          clearTimeout(timeoutId);

          if (!response.ok) throw new Error(`Raider.IO API returned ${response.status}`);

          const data = await response.json();
          console.log(`[LEADERBOARD] API response received at ${new Date()}`);

          if (!data || !data.members || !Array.isArray(data.members) || data.members.length === 0) {
            throw new Error("No leaderboard data found");
          }

          const sorted = data.members.sort((a, b) => b.mythic_score - a.mythic_score);

          const top10 = sorted.slice(0, 10).map((m, i) =>
            `#${i + 1} - ${m.name} - ${m.realm} (${m.region.toUpperCase()})\nMythic+ Score: ${m.mythic_score}`
          );

          const embed = new EmbedBuilder()
            .setTitle("Cryptic Net Guild Mythic+ Leaderboard")
            .setDescription(top10.join("\n\n"))
            .setFooter({ text: "Cryptic Net Bot | From Raider.IO" })
            .setColor("#1f2937");

          console.log(`[LEADERBOARD] Sending API reply at ${new Date()}`);
          await interaction.editReply({ embeds: [embed] });
          return;
        } catch (err) {
          console.error(`[LEADERBOARD] Error on attempt ${attempt + 1}:`, err.message);
          attempt++;
          if (attempt > maxRetries) throw err;
          await new Promise((r) => setTimeout(r, 1000));
        }
      }
    } catch (err) {
      console.error(`[LEADERBOARD] Final error:`, err);
      await interaction.editReply({
        content: "❌ Something went wrong while fetching the leaderboard.",
      });
    }
  },
};













