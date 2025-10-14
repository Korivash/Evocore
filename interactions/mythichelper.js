// ./interactions/mythichelper.js
const { EmbedBuilder } = require("discord.js");
const axios = require("axios");
const cheerio = require("cheerio");

const baseUrl = "https://www.method.gg/guides/dungeons/the-war-within/";

module.exports = {
  type: "selectMenu",
  async execute(interaction) {
    if (interaction.customId !== "method_select_dungeon") return false;

    const slug = interaction.values[0];
    const url = `${baseUrl}${slug}`;

    try {
      const { data } = await axios.get(url);
      const $ = cheerio.load(data);

      const title = $("h1").first().text().trim();
      const summary = $("p").first().text().trim();

      const sections = [];
      $(".content-section").each((i, el) => {
        const heading = $(el).find("h2, h3").first().text().trim();
        const text = $(el).find("p").first().text().trim();
        if (heading && text) {
          sections.push({ heading, text });
        }
      });

      const embed = new EmbedBuilder()
        .setTitle(`📘 ${title}`)
        .setURL(url)
        .setDescription(summary.substring(0, 400) + "...")
        .setColor("Green");

      sections.slice(0, 3).forEach((sec) => {
        embed.addFields({
          name: sec.heading,
          value: sec.text.substring(0, 500),
        });
      });

      if (sections.length > 3) {
        embed.setFooter({ text: "More sections available on Method.gg" });
      }

      await interaction.reply({ embeds: [embed], ephemeral: false });
      return true;
    } catch (err) {
      console.error("[MYTHICHELPER] Error scraping Method.gg:", err.message);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: `❌ Could not fetch guide for ${slug}. Check [Method.gg](${url}).`,
          ephemeral: true,
        });
      }
      return true;
    }
  },
};
