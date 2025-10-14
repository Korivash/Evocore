const { EmbedBuilder } = require("discord.js");
const axios = require("axios");
const cheerio = require("cheerio");

module.exports = {
  type: "selectMenu",
  async execute(interaction) {
    if (interaction.customId !== "method_select_raid") return false;

    const url = interaction.values[0];

    try {
      const { data } = await axios.get(url);
      const $ = cheerio.load(data);

      const title = $("h1").first().text().trim() || "Raid Guide";
      const summaryParags = [];
      $("p").each((i, el) => {
        if (i < 3) summaryParags.push($(el).text().trim());
      });

      const embed = new EmbedBuilder()
        .setTitle(title)
        .setURL(url)
        .setDescription(summaryParags.join("\n\n") || "Read the full guide below")
        .setColor("Blue")
        .setFooter({ text: "Source: Method.gg" });

      await interaction.reply({ embeds: [embed], ephemeral: false });
      return true;
    } catch (err) {
      console.error("[RAIDHELPER] Error fetching Method.gg raid guide:", err.message);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: `❌ Could not fetch guide. Check [Method.gg](${url}).`,
          ephemeral: true,
        });
      }
      return true;
    }
  },
};


