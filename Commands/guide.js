// ./Commands/guide.js
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Init Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

// Raid bosses
const raidBosses = {
  "plexus-sentinel": "Plexus Sentinel",
  "soulbinder-naazindhri": "Soulbinder Naazindhri",
  "the-soul-hunters": "The Soul Hunters",
  "nexus-king-salhadaar": "Nexus-King Salhadaar",
  "loomithar": "Loomithar",
  "forgeweaver-araz": "Forgeweaver Araz",
  "fractillus": "Fractillus",
  "dimensius-the-all-devouring": "Dimensius the All-Devouring",
};

// Dungeons
const dungeons = {
  "ara-kara-city-of-echoes": "Ara-Kara, City of Echoes",
  "halls-of-atonement": "Halls of Atonement",
  "priory-of-the-sacred-flame": "Priory of the Sacred Flame",
  "tazavesh-soleahs-gambit": "Tazavesh: So'leah's Gambit",
  "the-dawnbreaker": "The Dawnbreaker",
  "eco-dome-aldani": "Eco-Dome Aldani",
  "operation-floodgate": "Operation: Floodgate",
  "tazavesh-hard-mode": "Tazavesh: Hard Mode",
  "tazavesh-streets-of-wonder": "Tazavesh: Streets of Wonder",
};

// Helper: Split text into chunks safe for embeds
function splitForEmbeds(text, maxLength = 3500) {
  const chunks = [];
  let remaining = text.trim();
  while (remaining.length > maxLength) {
    let slice = remaining.slice(0, maxLength);
    let lastBreak = slice.lastIndexOf("\n");
    if (lastBreak > 0) slice = slice.slice(0, lastBreak);
    chunks.push(slice);
    remaining = remaining.slice(slice.length);
  }
  if (remaining.length > 0) chunks.push(remaining);
  return chunks;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("guide")
    .setDescription("Get a raid or dungeon guide (AI generated)")
    .addSubcommand(sub =>
      sub
        .setName("raid")
        .setDescription("Get a raid boss guide")
        .addStringOption(opt =>
          opt
            .setName("boss")
            .setDescription("Select the raid boss")
            .setRequired(true)
            .addChoices(...Object.keys(raidBosses).map(k => ({ name: raidBosses[k], value: k })))
        )
    )
    .addSubcommand(sub =>
      sub
        .setName("dungeon")
        .setDescription("Get a dungeon guide")
        .addStringOption(opt =>
          opt
            .setName("dungeon")
            .setDescription("Select the dungeon")
            .setRequired(true)
            .addChoices(...Object.keys(dungeons).map(k => ({ name: dungeons[k], value: k })))
        )
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const sub = interaction.options.getSubcommand();
    const key =
      sub === "raid"
        ? interaction.options.getString("boss")
        : interaction.options.getString("dungeon");

    const name = sub === "raid" ? raidBosses[key] : dungeons[key];
    if (!name) {
      return interaction.editReply("❌ Guide not found.");
    }

    try {
      // Build the teaching prompt inside execute()
      let prompt = `You are a World of Warcraft teacher explaining Season 3 of The War Within.\n`;

      if (sub === "raid") {
        prompt += `Explain the **raid boss fight for ${name}** in detail.\n`;
        prompt += `
Include:
- Boss mechanics (phase by phase)
- Tank responsibilities
- Healer responsibilities
- DPS responsibilities
- Cooldown management tips
- Positioning advice
- Extra tips for heroic/early mythic progression
`;
      } else {
        prompt += `Explain the **dungeon: ${name}** in detail.\n`;
        prompt += `
Include:
- Important trash mobs and their abilities
- Each boss fight mechanics
- Tank responsibilities
- Healer responsibilities
- DPS responsibilities
- Cooldown management tips
- Positioning advice
- Extra tips for high keys
- Best suggested route if possible
`;
      }

      // Generate guide from Gemini
      const result = await model.generateContent(prompt);
      const text = result.response.text();

      // Split into safe chunks
      const chunks = splitForEmbeds(text);

      // First embed (main reply)
      const firstEmbed = new EmbedBuilder()
        .setTitle(`${sub === "raid" ? "Raid Boss" : "Dungeon"} Guide: ${name}`)
        .setColor(sub === "raid" ? 0x9b59b6 : 0x2ecc71)
        .setDescription(chunks[0])
        .setFooter({ text: "Explained by your WoW AI teacher" });

      await interaction.editReply({ embeds: [firstEmbed] });

      // Additional chunks -> followUp embeds
      for (let i = 1; i < chunks.length; i++) {
        const embed = new EmbedBuilder()
          .setTitle(`${name} (Part ${i + 1})`)
          .setColor(sub === "raid" ? 0x9b59b6 : 0x2ecc71)
          .setDescription(chunks[i])
          .setFooter({ text: "Explained by your WoW AI teacher" });

        await interaction.followUp({ embeds: [embed] });
      }
    } catch (err) {
      console.error("[GUIDE] Error:", err);
      await interaction.editReply("❌ Error generating guide.");
    }
  },
};














