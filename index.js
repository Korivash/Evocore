const { Client, GatewayIntentBits, Partials, Collection } = require("discord.js");
require("dotenv").config();
const colors = require("colors/safe");
const express = require("express");
const { connectDB, User } = require("./db");
const { fetchGuildMembers, updateMythicScores } = require("./services/raider");
const { cycleTrivia, handleTriviaInteraction } = require("./misc/trivia");
const { postRoles } = require("./misc/postRoles");
const { rotateStatus } = require("./services/status");
const { sendErrorLog } = require("./utils/errorlog");
const { checkKeystones } = require("./services/keystoneTracker");
const { exchangeCodeForToken } = require("./utils/blizzardAuth");
const config = require("./config");
const fs = require("fs");
const path = require("path");

const log = {
  info: (...args) => console.log(colors.cyan("[INFO]"), ...args),
  success: (...args) => console.log(colors.green("[SUCCESS]"), ...args),
  warn: (...args) => console.log(colors.yellow("[WARN]"), ...args),
  error: (...args) => console.error(colors.red("[ERROR]"), ...args),
};

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

client.commands = new Collection();
client.interactions = new Collection();

// Error handling
process.on("unhandledRejection", (err) => sendErrorLog(client, err, "Unhandled Rejection"));
process.on("uncaughtException", (err) => sendErrorLog(client, err, "Uncaught Exception"));

// Load commands
const commandsPath = path.join(__dirname, "Commands");
const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith(".js"));
for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  if (command?.data?.name) {
    client.commands.set(command.data.name, command);
    log.info("Loaded command:", command.data.name);
  }
}

// Load interactions
const interactionsPath = path.join(__dirname, "interactions");
if (fs.existsSync(interactionsPath)) {
  const handlerFiles = fs.readdirSync(interactionsPath).filter((f) => f.endsWith(".js"));
  for (const file of handlerFiles) {
    const handler = require(path.join(interactionsPath, file));
    if (handler?.type && typeof handler.execute === "function") {
      client.interactions.set(file, handler);
      log.info("Loaded interaction handler:", file, handler.type);
    }
  }
}

// Interaction handling
client.on("interactionCreate", async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;
      await command.execute(interaction, client);
      return;
    }

    if (interaction.isButton() || interaction.isAnySelectMenu?.()) {
      if (await handleTriviaInteraction(interaction)) return;
      for (const handler of client.interactions.values()) {
        try {
          const handled = await handler.execute(interaction, client);
          if (handled) return;
        } catch (e) {
          log.error("Interaction handler error:", e);
          await sendErrorLog(client, e, "Interaction Handler");
        }
      }
    }
  } catch (err) {
    log.error("Interaction error:", err);
    await sendErrorLog(client, err, "Interaction Error");
    if (!interaction.deferred && !interaction.replied) {
      await interaction.reply({ content: "❌ Something went wrong.", ephemeral: true });
    } else {
      await interaction.editReply({ content: "❌ Something went wrong.", components: [] });
    }
  }
});

// Ready event
client.once("ready", async () => {
  log.success(`Logged in as ${client.user.tag}`);

  await postRoles(client);
  cycleTrivia(client);
  rotateStatus(client);

  try {
    log.info("Fetching initial guild members...");
    const members = await fetchGuildMembers("us", "area-52", "Cryptic Net");
    await updateMythicScores("us", "area-52", members);
  } catch (e) {
    log.error("Initial fetch error:", e);
    await sendErrorLog(client, e, "Initial Fetch");
  }

  // Refresh guild members every 5 mins
  setInterval(async () => {
    try {
      log.info("Periodic refresh: fetching guild members...");
      const members = await fetchGuildMembers("us", "area-52", "Cryptic Net");
      await updateMythicScores("us", "area-52", members);
      log.info("Periodic refresh complete.");
    } catch (e) {
      log.error("Periodic refresh error:", e);
      await sendErrorLog(client, e, "Periodic Refresh");
    }
  }, 5 * 60 * 1000);

  // Keystone tracker
  setInterval(() => checkKeystones(client), 10 * 60 * 1000);

  // Heartbeat
  setInterval(() => {
    log.info(`💓 Heartbeat: Bot is alive as ${client.user.tag}`);
  }, 60 * 1000);
});

// Cleanup old sim reports
function cleanupSimReports() {
  const reportsDir = path.join(process.cwd(), "simc_outputs");
  const maxAge = 5 * 60 * 60 * 1000;
  const now = Date.now();

  try {
    if (!fs.existsSync(reportsDir)) return;

    const files = fs.readdirSync(reportsDir);
    for (const file of files) {
      const filePath = path.join(reportsDir, file);
      const stats = fs.statSync(filePath);
      if (now - stats.mtimeMs > maxAge) {
        fs.unlinkSync(filePath);
        log.info("🗑️ Deleted old simc report:", file);
      }
    }
  } catch (err) {
    log.error("Error cleaning up simc reports:", err);
  }
}
setInterval(cleanupSimReports, 30 * 60 * 1000);

// --- Express OAuth server for Blizzard linking ---
const app = express();
app.get("/callback", async (req, res) => {
  const { code, region = "us", state } = req.query;

  try {
    const tokenData = await exchangeCodeForToken(code, region);
    const discordId = state; // you pass Discord ID in "state" when generating link

    if (!discordId) return res.status(400).send("Missing Discord ID in state");
    const user = await User.findOne({ discordId });
    if (!user) return res.status(404).send("Discord user not found");

    user.blizzardAuth = {
      region,
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_at: Date.now() + tokenData.expires_in * 1000,
    };

    await user.save();
    res.send("✅ Your Blizzard account has been linked! You can close this window.");
  } catch (err) {
    log.error("OAuth callback error:", err);
    res.status(500).send("Failed to link Blizzard account.");
  }
});

app.listen(3000, () => log.success("[OAUTH] Listening on port 3000"));

// Startup
(async () => {
  await connectDB();
  await client.login(config.bot.token);
})();








