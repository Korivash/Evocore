const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require("discord.js");
const fetch = require("node-fetch");

// WoW class color mapping
const classColors = {
  "Death Knight": 0xC41E3A,
  "Demon Hunter": 0xA330C9,
  "Druid": 0xFF7C0A,
  "Evoker": 0x33937F,
  "Hunter": 0xAAD372,
  "Mage": 0x3FC7EB,
  "Monk": 0x00FF98,
  "Paladin": 0xF48CBA,
  "Priest": 0xFFFFFF,
  "Rogue": 0xFFF468,
  "Shaman": 0x0070DD,
  "Warlock": 0x8788EE,
  "Warrior": 0xC69B6D,
};


async function getBlizzardToken() {
  const res = await fetch("https://oauth.battle.net/token", {
    method: "POST",
    headers: {
      Authorization:
        "Basic " +
        Buffer.from(
          `${process.env.BLIZZARD_CLIENT_ID}:${process.env.BLIZZARD_CLIENT_SECRET}`
        ).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) throw new Error(`Token fetch failed → ${res.status}`);
  const data = await res.json();
  return data.access_token;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("portrait")
    .setDescription("Display a character's portrait and render")
    .addStringOption(option =>
      option.setName("name").setDescription("Character Name").setRequired(true)
    )
    .addStringOption(option =>
      option.setName("realm").setDescription("Character Realm").setRequired(true)
    )
    .addStringOption(option =>
      option.setName("region")
        .setDescription("Region")
        .setRequired(false)
        .addChoices(
          { name: "US", value: "us" },
          { name: "EU", value: "eu" },
          { name: "KR", value: "kr" },
          { name: "TW", value: "tw" }
        )
    )
    .addStringOption(option =>
      option.setName("type")
        .setDescription("Portrait type")
        .setRequired(false)
        .addChoices(
          { name: "Avatar (Small)", value: "avatar" },
          { name: "Inset (Medium)", value: "inset" },
          { name: "Main (Large)", value: "main" },
          { name: "Main Raw (Largest)", value: "main-raw" }
        )
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const name = interaction.options.getString("name");
    const realm = interaction.options.getString("realm")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/'/g, "");
    const region = interaction.options.getString("region") || "us";
    const portraitType = interaction.options.getString("type") || "main";

    try {
      const token = await getBlizzardToken();
      
      
      const profileUrl = `https://${region}.api.blizzard.com/profile/wow/character/${realm}/${encodeURIComponent(name.toLowerCase())}?namespace=profile-${region}&locale=en_US`;
      
      const profileRes = await fetch(profileUrl, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!profileRes.ok) {
        return interaction.editReply({ 
          content: `❌ Character not found. Make sure the name and realm are correct.` 
        });
      }

      const profileData = await profileRes.json();

      const characterName = profileData.name;
      const characterClass = profileData.character_class?.name || "Unknown";
      const characterRealm = profileData.realm?.name || realm;
      const characterLevel = profileData.level || "?";
      const characterRace = profileData.race?.name || "Unknown";
      const characterGender = profileData.gender?.name || "Unknown";
      const characterSpec = profileData.active_spec?.name || "Unknown";
      const characterFaction = profileData.faction?.name || "Unknown";

      
      const mediaUrl = `https://${region}.api.blizzard.com/profile/wow/character/${realm}/${encodeURIComponent(name.toLowerCase())}/character-media?namespace=profile-${region}&locale=en_US`;
      
      const mediaRes = await fetch(mediaUrl, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!mediaRes.ok) {
        return interaction.editReply({ content: "❌ Could not fetch character portrait." });
      }

      const mediaData = await mediaRes.json();
      const assets = mediaData.assets || [];

      
      let portraitUrl = null;
      let renderUrl = null;

      
      const portraitAsset = assets.find(a => a.key === portraitType);
      if (portraitAsset) {
        portraitUrl = portraitAsset.value;
      }

      
      const renderAsset = assets.find(a => a.key === "main-raw");
      if (renderAsset) {
        renderUrl = renderAsset.value;
      }

      
      if (!portraitUrl && assets.length > 0) {
        portraitUrl = assets[0].value;
      }

      if (!portraitUrl) {
        return interaction.editReply({ content: "❌ No portrait available for this character." });
      }

      
      let rioScore = "N/A";
      try {
        const rioUrl = `https://raider.io/api/v1/characters/profile?region=${region}&realm=${realm}&name=${name}&fields=mythic_plus_scores_by_season:current`;
        const rioRes = await fetch(rioUrl);
        if (rioRes.ok) {
          const rioData = await rioRes.json();
          rioScore = rioData.mythic_plus_scores_by_season?.[0]?.scores?.all || "N/A";
        }
      } catch (err) {
        
      }

      
      const embed = new EmbedBuilder()
        .setTitle(`${characterName} - ${characterRealm}`)
        .setURL(`https://worldofwarcraft.blizzard.com/en-us/character/${region}/${realm}/${name}`)
        .setColor(classColors[characterClass] || 0x0099ff)
        .setDescription(
          `⚔️ **${characterRace} ${characterClass}** (${characterSpec})\n` +
          `🏰 **Faction:** ${characterFaction}\n` +
          `📊 **Level ${characterLevel}** | **M+ Score:** ${rioScore}`
        )
        .setImage(portraitUrl)
        .setFooter({ text: "Data from Blizzard API" })
        .setTimestamp();

      
      if (renderUrl && renderUrl !== portraitUrl) {
        embed.setThumbnail(renderUrl);
      }

      
      const availableTypes = assets
        .filter(a => a.key.includes("avatar") || a.key.includes("inset") || a.key.includes("main"))
        .map(a => `\`${a.key}\``)
        .join(", ");

      if (availableTypes) {
        embed.addFields({
          name: "📸 Available Portraits",
          value: `Use \`/portrait type:\` with: ${availableTypes}`,
          inline: false
        });
      }

      await interaction.editReply({ embeds: [embed] });

    } catch (err) {
      console.error("[PORTRAIT] Error:", err);
      
      if (err.message.includes("not found") || err.message.includes("404")) {
        return interaction.editReply({ 
          content: "❌ Character not found. Check the name and realm spelling.\nExample: `/portrait name:Korivash realm:Area-52 region:US`" 
        });
      }
      
      return interaction.editReply({ 
        content: `❌ Error fetching character data: ${err.message}` 
      });
    }
  },
};