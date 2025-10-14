const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { db } = require("../db");
const colors = require("colors/safe");

const normalize = (str) =>
  str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "")
    .replace(/-/g, "")
    .toLowerCase();

module.exports = {
  data: new SlashCommandBuilder()
    .setName("mymythic")
    .setDescription("View all your registered characters with Mythic+ scores"),

  async execute(interaction) {
    try {
      const userId = interaction.user.id;

      // 🔹 Pull characters from Mongo
      const userCharacters = await db.listCharacters(userId);

      if (!userCharacters.length) {
        return interaction.reply({
          content: "❌ You have no registered characters. Use `/register` to add one.",
          ephemeral: true,
        });
      }

      // 🔹 Pull guild members (with Mythic+ scores) from Mongo
      const guildMembers = await db.getGuildMembers();

      const embed = new EmbedBuilder()
        .setTitle(`${interaction.user.username}'s Registered Characters`)
        .setColor("#1E90FF")
        .setTimestamp();

      userCharacters.forEach((char) => {
        // Match guild members by normalized name + realm
        const matches = guildMembers.filter(
          (m) =>
            normalize(m.name) === normalize(char.name) &&
            normalize(m.realm) === normalize(char.realm)
        );

        // Highest score across duplicates
        const score = matches.reduce((max, m) => Math.max(max, m.mythicScore ?? 0), 0);

        embed.addFields({
          name: `${char.name} - ${char.realm} (${char.region.toUpperCase()})`,
          value: `Mythic+ Score: **${score}**`,
          inline: false,
        });
      });

      await interaction.reply({ embeds: [embed], ephemeral: false });
    } catch (err) {
      console.error(colors.red("[ERROR]"), "Failed to fetch /mymythic data:", err);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: "❌ Error displaying your characters.",
          ephemeral: true,
        });
      }
    }
  },
};









