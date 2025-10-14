const fetch = require("node-fetch");
const colors = require("colors/safe");
const { GuildMember } = require("../db");

const log = {
  info: (...args) => console.log(colors.cyan("[RAIDER]"), ...args),
  error: (...args) => console.error(colors.red("[RAIDER]"), ...args),
};

/**
 * Fetch guild roster from Raider.IO and upsert into DB
 */
async function fetchGuildMembers(region, realm, guildName) {
  try {
    const url = `https://raider.io/api/v1/guilds/profile?region=${region}&realm=${encodeURIComponent(
      realm
    )}&name=${encodeURIComponent(guildName)}&fields=members`;

    log.info(`Fetching guild members from: ${url}`);
    const res = await fetch(url, { timeout: 10000 }).catch(() => null);

    if (!res || !res.ok) {
      throw new Error(`Failed to fetch guild members (status ${res?.status || "no response"})`);
    }

    const data = await res.json().catch(() => ({}));
    const members = (data.members || []).map((m) => ({
      name: m.character.name,
      realm: m.character.realm,
      mythicScore: 0,
    }));

    if (!members.length) {
      log.warn("No members found from Raider.IO response");
      return [];
    }

    // Safe DB upsert
    for (const member of members) {
      try {
        await GuildMember.updateOne(
          { name: member.name, realm: member.realm },
          { $setOnInsert: member },
          { upsert: true }
        );
      } catch (dbErr) {
        log.error(`DB upsert error for ${member.name} (${member.realm}):`, dbErr.message);
      }
    }

    log.info(`Fetched ${members.length} guild members and synced to DB.`);
    return members;
  } catch (err) {
    log.error("fetchGuildMembers error:", err.message);
    return []; // Return empty so bot continues running
  }
}

/**
 * Update Mythic+ scores for guild members
 */
async function updateMythicScores(region, realm, members) {
  for (const character of members) {
    try {
      const url = `https://raider.io/api/v1/characters/profile?region=${region}&realm=${encodeURIComponent(
        character.realm
      )}&name=${encodeURIComponent(
        character.name
      )}&fields=mythic_plus_scores_by_season:current`;

      const res = await fetch(url, { timeout: 10000 }).catch(() => null);

      if (!res || !res.ok) {
        throw new Error(
          `Failed to fetch score (status ${res?.status || "no response"})`
        );
      }

      const data = await res.json().catch(() => ({}));
      const score = data?.mythic_plus_scores_by_season?.[0]?.scores?.all ?? 0;

      await GuildMember.updateOne(
        { name: character.name, realm: character.realm },
        { $set: { mythicScore: score } },
        { upsert: true }
      ).catch((dbErr) => {
        log.error(`DB update error for ${character.name}:`, dbErr.message);
      });

      log.info(
        `Updated ${character.name} (${character.realm}) -> Mythic+ ${score}`
      );
    } catch (err) {
      log.error(
        `Error updating mythic score for ${character.name} (${character.realm || "unknown"}):`,
        err.message
      );
    }
  }

  return members;
}

module.exports = { fetchGuildMembers, updateMythicScores };


