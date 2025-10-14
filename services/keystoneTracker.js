const fetch = require("node-fetch");
const { User } = require("../db");
const colors = require("colors/safe");

const log = {
  info: (...a) => console.log(colors.cyan("[KEYSTONE]"), ...a),
  error: (...a) => console.error(colors.red("[KEYSTONE]"), ...a),
};

async function checkKeystones(client) {
  try {
    const users = await User.find({ "characters.0": { $exists: true } }).lean();
    if (!users.length) return;

    for (const user of users) {
      for (const char of user.characters) {
        const url = `https://raider.io/api/v1/characters/profile?region=${char.region}&realm=${char.realm}&name=${char.name}&fields=mythic_plus_weekly_highest_level_runs`;

        try {
          const res = await fetch(url);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data = await res.json();

          const latestRun = data.mythic_plus_weekly_highest_level_runs?.[0];
          if (!latestRun) continue;

          const completedAt = new Date(latestRun.completed_at);
          const newKey = {
            dungeon: latestRun.dungeon,
            level: latestRun.mythic_level,
            completed_at: completedAt,
          };

          const prevChar = char.current_keystone || {};

          if (!prevChar.completed_at || completedAt > new Date(prevChar.completed_at)) {
            await User.updateOne(
              { discordId: user.discordId, "characters.name": char.name, "characters.realm": char.realm },
              { $set: { "characters.$.current_keystone": newKey } }
            );

            log.info(`${char.name} completed ${latestRun.dungeon} +${latestRun.mythic_level}`);

            const channelId = process.env.KEYSTONE_CHANNEL_ID;
            if (channelId) {
              const channel = await client.channels.fetch(channelId).catch(() => null);
              if (channel) {
                channel.send(
                  `🗝️ **${char.name}** completed **${latestRun.dungeon} +${latestRun.mythic_level}**!`
                );
              }
            }
          }
        } catch (err) {
          log.error(`Error checking ${char.name}-${char.realm}:`, err.message);
        }
      }
    }
  } catch (err) {
    log.error("Keystone tracker error:", err);
  }
}

module.exports = { checkKeystones };
