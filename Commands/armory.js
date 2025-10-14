const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const fetch = require("node-fetch");

// Optional: WoW class color mapping
const classColors = {
  "Death Knight": 0xC41E3A,
  "Demon Hunter": 0xA330C9,
  "Druid": 0xFF7C0A,
  "Evoker": 0x33937F,
  "Hunter": 0xAAD372,
  "Mage": 0x3FC7EB,
  "Monk": 0x00FF98,
  "Paladin": 0xF48CBA,
  "Priest": 0xFFFFFF,
  "Rogue": 0xFFF468,
  "Shaman": 0x0070DD,
  "Warlock": 0x8788EE,
  "Warrior": 0xC69B6D,
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName("armory")
    .setDescription("Lookup a WoW character on Raider.IO")
    .addStringOption(option =>
      option.setName("name").setDescription("Character Name").setRequired(true)
    )
    .addStringOption(option =>
      option.setName("realm").setDescription("Character Realm").setRequired(true)
    )
    .addStringOption(option =>
      option.setName("region").setDescription("Region (us, eu, kr, tw)").setRequired(true)
    ),

  async execute(interaction) {
    const name = interaction.options.getString("name");
    const realm = interaction.options.getString("realm")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // remove accents
      .toLowerCase()
      .replace(/\s+/g, "-");
    const region = interaction.options.getString("region").toLowerCase();

    const url = `https://raider.io/api/v1/characters/profile?region=${region}&realm=${realm}&name=${name}&fields=mythic_plus_scores_by_season:season-tww-3,raid_progression,gear,mythic_plus_best_runs,mythic_plus_recent_runs`;

    try {
      const res = await fetch(url);
      if (!res.ok) {
        return interaction.reply({ content: "❌ Raider.IO API error. Try again later.", ephemeral: true });
      }

      const data = await res.json();
      if (!data.name) {
        return interaction.reply({ content: "❌ Character not found on Raider.IO.", ephemeral: true });
      }

      // Best key run this season
      const bestKey = data.mythic_plus_best_runs?.[0];
      const recentKey = data.mythic_plus_recent_runs?.[0];

      const embed = new EmbedBuilder()
        .setTitle(`${data.name} - ${data.realm}`)
        .setURL(data.profile_url)
        .setThumbnail(data.thumbnail_url)
        .setColor(classColors[data.class] || 0x0099ff)
        .addFields(
          { name: "Class", value: data.class || "N/A", inline: true },
          { name: "Item Level", value: `${data.gear?.item_level_total || "N/A"}`, inline: true },
          { name: "Mythic+ Score (S3)", value: `${data.mythic_plus_scores_by_season?.[0]?.scores?.all || "N/A"}`, inline: true },
          {
            name: "Best Key (S3)",
            value: bestKey
              ? `+${bestKey.mythic_level} ${bestKey.dungeon} in ${bestKey.num_keystone_upgrades > 0 ? "✅" : "❌"}`
              : "N/A",
            inline: false,
          },
          {
            name: "Recent Key",
            value: recentKey
              ? `+${recentKey.mythic_level} ${recentKey.dungeon} (${recentKey.num_keystone_upgrades > 0 ? "In Time" : "Out of Time"})`
              : "N/A",
            inline: false,
          },
          {
            name: "Raid Progression",
            value:
              Object.entries(data.raid_progression || {})
                .map(
                  ([raid, info]) =>
                    `${raid.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase())}: ${info.summary}`
                )
                .join("\n") || "N/A",
            inline: false,
          }
        )
        .setFooter({ text: "Data provided by Raider.IO" })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });

    } catch (err) {
      console.error("[ARMORY] Error:", err);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: "❌ Error fetching character data.", ephemeral: true });
      }
    }
  },
};










