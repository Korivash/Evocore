// config.js
require("dotenv").config();

module.exports = {
  bot: {
    token: process.env.DISCORD_TOKEN,
    clientId: process.env.CLIENT_ID,
    owners: ["157313651001393152"]
  },

  guild: {
    id: process.env.GUILD_ID
  },

  embed: {
    color: 0x00bfff,
    footer: "Cryptic Net",
    logo: "https://i.imgur.com/cre9ooV.gif"
  },

  channels: {
    welcome: "1385992658169630841",
    roles: "1424203663613628509",
    logs: "1425858116192440372"
  },

  links: {
    support: "https://discord.gg/<YOUR_SUPPORT_INVITE>",
    invite: `https://discord.com/oauth2/authorize?client_id=${process.env.CLIENT_ID}&permissions=8&scope=bot%20applications.commands`,
    website: "https://www.korivash.com"
  },

  emojis: {
    success: "✅",
    error: "❌",
    loading: "⏳"
  },

  roles: {
    ids: {
      warrior: "1386315758254035137",
      hunter: "1386315760078422179",
      mage: "1386315763178016821",
      deathknight: "1386315761756278846",
      druid: "1386315765371900017",
      monk: "1386315765048934440",
      shaman: "1386315762985074808",
      priest: "1386315761253093376",
      warlock: "1386315764440764588",
      rogue: "1386315760766418974",
      paladin: "1386315759499743270",
      demonhunter: "1386315766265155706",
      evoker: "1386315768135815218",
      tank: "1385992597935493281",
      healer: "1385992596920467586",
      dps: "1385992595716444271"
    },
    admin: process.env.ADMIN_ROLE,
    mod: process.env.MOD_ROLE,
    member: process.env.MEMBER_ROLE
  },

  trivia: {
    channelId: "1424697825119305769",
    intervalMs: 3600000,
    answerTimeoutMs: 1800000,
    wrongCooldownMs: 600000,
    correctPauseMs: 60000,
    countdownIntervalMs: 30000,
    postDelayMs: 10000,
    xpPerCorrect: 10
  },

  raiderIO: {
    baseUrl: "https://raider.io/api/v1",
    apiKey: process.env.RAIDER_IO_API_KEY
  },

  blizzard: {
    clientId: process.env.BLIZZARD_CLIENT_ID,
    clientSecret: process.env.BLIZZARD_CLIENT_SECRET,
    region: "us"
  },

  ai: {
    geminiKey: process.env.GEMINI_API_KEY
  },

  database: {
    mongoUri: process.env.MONGO_URI
  },

  logging: {
    errorChannel: process.env.ERROR_LOG_CHANNEL
  }
};

