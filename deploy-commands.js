// deploy-commands.js
const { REST, Routes } = require("discord.js");
const fs = require("fs");
const path = require("path");
require("dotenv").config();
const config = require("./config");

const commandsPath = path.join(__dirname, "Commands");
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith(".js"));

const commands = [];
for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  if (command?.data) {
    commands.push(command.data.toJSON());
  }
}

const rest = new REST({ version: "10" }).setToken(config.bot.token);

(async () => {
  try {
    console.log("Clearing all old commands...");

    // Clear globals
    await rest.put(Routes.applicationCommands(config.bot.clientId), { body: [] });

    // Clear guild-specific (if configured)
    if (config.guild?.id) {
      await rest.put(
        Routes.applicationGuildCommands(config.bot.clientId, config.guild.id),
        { body: [] }
      );
    }

    console.log("✅ Cleared old commands. Deploying new ones...");

    // 🔹 Deploy GLOBAL commands (required for the badge)
    await rest.put(
      Routes.applicationCommands(config.bot.clientId),
      { body: commands }
    );
    console.log(`✅ Registered ${commands.length} global commands`);

    // 🔹 Optionally also deploy to a dev/test guild for instant refresh
    if (config.guild?.id) {
      await rest.put(
        Routes.applicationGuildCommands(config.bot.clientId, config.guild.id),
        { body: commands }
      );
      console.log(`✅ Registered ${commands.length} guild commands to ${config.guild.id}`);
    }

  } catch (error) {
    console.error("❌ Failed to deploy commands:", error);
  }
})();



