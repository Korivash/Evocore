const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require("discord.js");
const { db } = require("../db");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("delete-character")
    .setDescription("Delete one of your registered characters."),

  async execute(interaction) {
    const userId = interaction.user.id;
    const characters = await db.listCharacters(userId);

    if (!characters || characters.length === 0) {
      return interaction.reply({
        content: "❌ You have no registered characters.",
        ephemeral: true,
      });
    }

    const options = characters.map((c, idx) => ({
      label: `${c.name} (${c.realm}, ${c.region.toUpperCase()})`,
      value: `${idx}`,
    }));

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId("delete-character-menu")
      .setPlaceholder("Select a character to delete")
      .addOptions(options);

    const row = new ActionRowBuilder().addComponents(selectMenu);

    await interaction.reply({
      content: "Select a character to delete:",
      components: [row],
      ephemeral: true,
    });

    const collector = interaction.channel.createMessageComponentCollector({
      filter: (i) => i.user.id === interaction.user.id && i.customId === "delete-character-menu",
      time: 60_000,
    });

    collector.on("collect", async (i) => {
      const selectedIndex = parseInt(i.values[0], 10);
      const selectedChar = characters[selectedIndex];

      if (!selectedChar) {
        return i.reply({
          content: "❌ Character not found.",
          ephemeral: true,
        });
      }

      const result = await db.deleteCharacter(userId, selectedChar.name, selectedChar.realm);

      if (result.success) {
        await i.update({
          content: `✅ Character **${selectedChar.name} - ${selectedChar.realm}** has been deleted.`,
          components: [],
        });
      } else {
        await i.update({
          content: `❌ ${result.message}`,
          components: [],
        });
      }

      collector.stop();
    });

    collector.on("end", async (collected) => {
      if (!collected.size) {
        // ⚠️ Use followUp instead of editReply, so we don’t double-ack
        await interaction.followUp({
          content: "⌛ No character was selected in time.",
          ephemeral: true,
        });
      }
    });
  },
};




