// utils/errorlog.js
const { EmbedBuilder } = require("discord.js");
const config = require("../config");

async function sendErrorLog(client, error, source = "Unknown") {
  try {
    const channelId = config.logging.errorChannel;
    if (!channelId || !client.isReady()) {
      console.error(`[ERROR LOG] ${source}:`, error);
      return;
    }

    const channel = await client.channels.fetch(channelId).catch(() => null);
    if (!channel) return;

    const embed = new EmbedBuilder()
      .setTitle(`⚠️ Error: ${source}`)
      .setDescription("```" + (error.stack || error.message || String(error)).slice(0, 3900) + "```")
      .setColor("Red")
      .setTimestamp();

    await channel.send({ embeds: [embed] });
  } catch (e) {
    console.error("[ERROR LOG FAILED]", e);
  }
}

module.exports = { sendErrorLog };


