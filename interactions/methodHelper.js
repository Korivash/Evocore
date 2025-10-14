// interactions/methodHelper.js
const { EmbedBuilder } = require("discord.js");
const { fetchMethodGuide } = require("../utils/methodScraper");

// Raid bosses → Method.gg
const raidLinks = {
  "plexus-sentinel": "https://www.method.gg/guides/manaforge-omega/plexus-sentinel-heroic",
  "soulbinder-naazindhri": "https://www.method.gg/guides/manaforge-omega/soulbinder-naazindhri-heroic",
  "the-soul-hunters": "https://www.method.gg/guides/manaforge-omega/the-soul-hunters-heroic",
  "nexus-king-salhadaar": "https://www.method.gg/guides/manaforge-omega/nexus-king-salhadaar-heroic",
  "loomithar": "https://www.method.gg/guides/manaforge-omega/loomithar-heroic",
  "forgeweaver-araz": "https://www.method.gg/guides/manaforge-omega/forgeweaver-araz-heroic",
  "fractillus": "https://www.method.gg/guides/manaforge-omega/fractillus-heroic",
  "dimensius-the-all-devouring": "https://www.method.gg/guides/manaforge-omega/dimensius-the-all-devouring-heroic",
};

// Mythic+ dungeons → Method.gg
const dungeonLinks = {
  "ara-kara-city-of-echoes": "https://www.method.gg/guides/dungeons/ara-kara-city-of-echoes",
  "halls-of-atonement": "https://www.method.gg/guides/dungeons/halls-of-atonement",
  "priory-of-the-sacred-flame": "https://www.method.gg/guides/dungeons/priory-of-the-sacred-flame",
  "tazavesh-soleahs-gambit": "https://www.method.gg/guides/dungeons/tazavesh-soleahs-gambit",
  "the-dawnbreaker": "https://www.method.gg/guides/dungeons/the-dawnbreaker",
  "eco-dome-aldani": "https://www.method.gg/guides/dungeons/eco-dome-aldani",
  "operation-floodgate": "https://www.method.gg/guides/dungeons/operation-floodgate",
  "tazavesh-hard-mode": "https://www.method.gg/guides/dungeons/tazavesh-hard-mode",
  "tazavesh-streets-of-wonder": "https://www.method.gg/guides/dungeons/tazavesh-streets-of-wonder",
};

const links = { ...raidLinks, ...dungeonLinks };

module.exports = {
  type: "selectMenu",
  async execute(interaction) {
    // Only handle these two select menus
    if (!["select_raid", "select_dungeon"].includes(interaction.customId)) {
      return false;
    }

    const slug = interaction.values?.[0];
    const url = links[slug];

    console.log(`[METHOD-INT] customId=${interaction.customId} slug=${slug} url=${url || "N/A"}`);

    if (!url) {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: "❌ Guide not found for that selection.", ephemeral: true });
      }
      return true;
    }

    try {
      // Defer early to avoid 3s timeout
      await interaction.deferReply({ ephemeral: false });

      const guide = await fetchMethodGuide(url);

      const embed = new EmbedBuilder()
        .setTitle(guide.title || "Guide")
        .setURL(url)
        .setColor(interaction.customId === "select_raid" ? 0x7c3aed : 0x16a34a); // purple for raid, green for dungeon

      // Add first 2–3 sections (Discord field limit: 1024 chars)
      guide.sections.slice(0, 3).forEach((sec) => {
        const name = sec.title?.substring(0, 256) || "Section";
        const val = (sec.text || "No content").substring(0, 1024);
        embed.addFields({ name, value: val });
      });

      if (guide.sections.length > 3) {
        embed.setFooter({ text: "More sections available — view full guide on Method.gg" });
      }

      await interaction.editReply({ embeds: [embed] });
      return true;
    } catch (err) {
      console.error("[METHOD-INT] Error scraping guide:", err);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: "❌ Error fetching guide.", ephemeral: true });
      } else {
        try { await interaction.editReply({ content: "❌ Error fetching guide." }); } catch {}
      }
      return true;
    }
  },
};
