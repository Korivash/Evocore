const { ActivityType } = require("discord.js");
const colors = require("colors/safe");
const { GuildMember } = require("../db");

const log = {
  info: (...args) => console.log(colors.cyan("[STATUS]"), ...args),
  error: (...args) => console.error(colors.red("[STATUS]"), ...args),
};

let guildStatusMessages = [];

async function buildStatusMessages() {
  try {
    const members = await GuildMember.find({ mythicScore: { $gt: 0 } })
      .sort({ mythicScore: -1 })
      .lean();

    if (!members || members.length === 0) {
      guildStatusMessages = [() => "No guild members with Mythic+ scores"];
      return;
    }

    guildStatusMessages = members.map(
      (m) => () => `${m.name} — Mythic+ Score: ${m.mythicScore}`
    );

    log.info(`Loaded ${guildStatusMessages.length} status messages`);
  } catch (err) {
    log.error("Failed to build status messages:", err);
    guildStatusMessages = [() => "Error fetching guild members"];
  }
}

async function rotateStatus(client, intervalMs = 15000) {
  await buildStatusMessages();
  let i = 0;

  setInterval(async () => {
    if (guildStatusMessages.length === 0) {
      await buildStatusMessages();
    }

    const message =
      guildStatusMessages.length > 0
        ? guildStatusMessages[i % guildStatusMessages.length]()
        : "No status available";

    try {
      client.user.setActivity({
        name: message,
        type: ActivityType.Custom, 
      });
    } catch (e) {
      log.error("Failed to set activity:", e);
    }

    i++;
  }, intervalMs);

  log.info("Status rotation started.");
}

module.exports = { rotateStatus, buildStatusMessages };







