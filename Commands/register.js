// Commands/register.js
const { SlashCommandBuilder } = require("discord.js");
const { db } = require("../db");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("register")
    .setDescription("Register your main character or add multiple characters.")
    .addStringOption(option =>
      option.setName("name")
        .setDescription("Your character name")
        .setRequired(true))
    .addStringOption(option =>
      option.setName("realm")
        .setDescription("Your character realm")
        .setRequired(true))
    .addStringOption(option =>
      option.setName("region")
        .setDescription("Your character region (us, eu, etc.)")
        .setRequired(true)),

  async execute(interaction) {
    const userId = interaction.user.id;
    const characterName = interaction.options.getString("name");
    const realm = interaction.options.getString("realm");
    const region = interaction.options.getString("region");

    try {
      // Fetch or create user doc from DB
      const user = await db.getOrCreateUser(userId);

      // Ensure characters array exists
      if (!user.characters) user.characters = [];

      // Check duplicate
      const exists = user.characters.find(
        c => c.name.toLowerCase() === characterName.toLowerCase() &&
             c.realm.toLowerCase() === realm.toLowerCase()
      );

      if (exists) {
        return interaction.reply({
          content: `❌ Character **${characterName}** is already registered!`,
          ephemeral: true,
        });
      }

      // Add character
      user.characters.push({
        name: characterName,
        realm,
        region,
        mythicScore: 0
      });

      await user.save();

      await interaction.reply({
        content: `✅ Character **${characterName}** registered successfully!`,
        ephemeral: true,
      });
    } catch (err) {
      console.error("[REGISTER] Error:", err);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: "❌ Failed to register character.", ephemeral: true });
      }
      throw err; // Bubble up so error logger catches it
    }
  },
};







