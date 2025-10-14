const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { execFile } = require("child_process");
const path = require("path");
const fs = require("fs");
const fetch = require("node-fetch");
const { simcPath, zones } = require("../utils/simcZones");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("sim")
    .setDescription("Run a SimulationCraft sim for your character")
    .addStringOption(opt =>
      opt.setName("name").setDescription("Character name").setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName("realm").setDescription("Realm name (use dashes instead of spaces, e.g., area-52)").setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName("region").setDescription("Region (us, eu, kr, tw, cn)").setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName("mode")
        .setDescription("Simulation mode")
        .addChoices(
          { name: "Quick Sim", value: "quick" },
          { name: "Top Gear", value: "topgear" },
          { name: "Best Drops (Mythic+)", value: "mythicplus" },
          ...Object.entries(zones.raids).map(([key, label]) => ({ name: `Raid: ${label}`, value: `raid:${key}` })),
          ...Object.entries(zones.dungeons).map(([key, label]) => ({ name: `Dungeon: ${label}`, value: `dungeon:${key}` }))
        )
        .setRequired(true)
    ),

  async execute(interaction) {
    const name = interaction.options.getString("name");
    const realm = interaction.options.getString("realm").toLowerCase();
    const region = interaction.options.getString("region").toLowerCase();
    const mode = interaction.options.getString("mode");

    if (!name || !realm || !region || !mode) {
      return interaction.reply("❌ Missing required parameters.");
    }

    await interaction.deferReply();

    // Paths
    const outputDir = path.join(process.cwd(), "simc_outputs");
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

    const timestamp = Date.now();
    const htmlFile = `sim_${timestamp}.html`;
    const jsonFile = `sim_${timestamp}.json`;

    const htmlPath = path.join(outputDir, htmlFile);
    const jsonPath = path.join(outputDir, jsonFile);

    // SimC arguments
    const args = [
      `armory=${region},${realm},${name}`,
      "iterations=5000",
      "fight_style=Patchwerk",
      `html=${htmlPath}`,
      `json2=${jsonPath}`
    ];

    if (mode === "topgear") args.push("topgear=1");
    else if (mode === "mythicplus") args.push("droptimizer=MythicPlus");
    else if (mode.startsWith("raid:")) args.push(`droptimizer=${mode.replace("raid:", "raid,")}`);
    else if (mode.startsWith("dungeon:")) args.push(`droptimizer=${mode.replace("dungeon:", "dungeon,")}`);

    console.log(`[SIM DEBUG] Running: "${simcPath}" ${args.join(" ")}`);

    execFile(simcPath, args, async (error) => {
      if (error) {
        console.error("[SIM ERROR]:", error);
        return interaction.editReply("❌ SimulationCraft failed to run.");
      }

      try {
        if (!fs.existsSync(jsonPath)) {
          return interaction.editReply("❌ Simulation output not found.");
        }

        const rawData = fs.readFileSync(jsonPath, "utf8");
        const data = JSON.parse(rawData);

        const player = data.sim?.players?.[0] || {};
        const dps = player.collected_data?.dps?.mean || "Unknown";
        const fightLength = data.sim?.options?.fight_length || data.sim?.options?.max_time || "N/A";

        // Raider.IO profile fetch
        let ilvl = "N/A";
        let rioThumbnail = null;
        try {
          const rioRes = await fetch(`https://raider.io/api/v1/characters/profile?region=${region}&realm=${realm}&name=${name}&fields=gear`);
          const rioData = await rioRes.json();
          if (rioData && rioData.gear?.item_level_equipped) {
            ilvl = rioData.gear.item_level_equipped;
          }
          rioThumbnail = rioData.thumbnail_url || null;
        } catch (err) {
          console.error("[RIO FETCH ERROR]:", err);
        }

        // Pretty Sim Type
        let simType = "Quick Sim";
        if (mode === "topgear") simType = "Top Gear";
        else if (mode === "mythicplus") simType = "Best Drops: Mythic+";
        else if (mode.startsWith("raid:")) {
          const raidKey = mode.split(":")[1];
          simType = `Best Drops: ${zones.raids[raidKey] || raidKey}`;
        } else if (mode.startsWith("dungeon:")) {
          const dungeonKey = mode.split(":")[1];
          simType = `Best Drops: ${zones.dungeons[dungeonKey] || dungeonKey}`;
        }

        // Links
        const linkField = `[WoW Armory](https://worldofwarcraft.com/en-us/character/${region}/${realm}/${name}) | [Warcraft Logs](https://www.warcraftlogs.com/character/${region}/${realm}/${name}) | [Raider.io](https://raider.io/characters/${region}/${realm}/${name})`;

        // Extra fields
        const extraFields = [];
        if (data.sim?.statistics?.scale_factors) {
          const weights = Object.entries(data.sim.statistics.scale_factors)
            .map(([stat, val]) => `${stat}: ${val.toFixed(2)}`)
            .join("\n");
          extraFields.push({ name: "Stat Weights", value: weights, inline: false });
        } else if (data.sim?.profilesets) {
          extraFields.push({ name: "Top Upgrades", value: "See report for detailed item rankings.", inline: false });
        }

        // Embed
        const attachmentName = `sim_report_${name}_${realm}.html`;

        const embed = new EmbedBuilder()
          .setTitle(`${name} (${realm.replace("-", " ")}, ${region.toUpperCase()})`)
          .setColor("#1E90FF")
          .setThumbnail(rioThumbnail)
          .addFields(
          { name: "Links", value: linkField, inline: false },
          { name: "Spec", value: player.specialization || "Unknown", inline: true },
          { name: "Item Level", value: ilvl.toString(), inline: true },
          { name: "Fight Style", value: "Patchwerk", inline: true },
          { name: "Iterations", value: "5000", inline: true },
          { name: "Fight Length", value: `${fightLength} sec`, inline: true },
          { name: "Sim Type", value: simType, inline: true },
          { name: "DPS", value: `${Math.round(dps).toLocaleString()}`, inline: true },
                                                                        ...extraFields,
          { 
           name: "Report", 
           value: "Full Simulation Report is attached above — click the HTML file to view or download.", 
            inline: false 
          }
        )
          .setFooter({ text: "Generated with SimulationCraft - Cryptic Net Bot" })
          .setTimestamp();

        await interaction.editReply({
          embeds: [embed],
          files: [{ attachment: htmlPath, name: attachmentName }]
        });

      } catch (err) {
        console.error("[SIM PARSE ERROR]:", err);
        await interaction.editReply("❌ Error parsing simulation results.");
      }
    });
  },
};
























