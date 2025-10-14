const { SlashCommandBuilder } = require("discord.js");
const { getBlizzardAuthUrl } = require("../utils/blizzardAuth");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("link")
    .setDescription("Link your Blizzard account to track your keystone")
    .addStringOption(opt =>
      opt.setName("region")
        .setDescription("Region (us, eu, kr, tw)")
        .setRequired(true)
        .addChoices(
          { name: "US", value: "us" },
          { name: "EU", value: "eu" },
          { name: "KR", value: "kr" },
          { name: "TW", value: "tw" }
        )
    ),

  async execute(interaction) {
    const region = interaction.options.getString("region");
    const discordId = interaction.user.id;

    // Build URL with state=discordId
    const url = getBlizzardAuthUrl(region, discordId);

    await interaction.reply({
      content: `🔗 Click below to link your Blizzard account:\n${url}`,
      ephemeral: true,
    });
  },
};

