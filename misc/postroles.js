const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
} = require("discord.js");
const config = require("../config");

module.exports = {
  async postRoles(client) {
    const channelId = config.channels.roles;
    if (!channelId) return;

    const channel = await client.channels.fetch(channelId).catch(() => null);
    if (!channel || channel.type !== ChannelType.GuildText) return;

    // Clean up old role messages to avoid duplicates
    const messages = await channel.messages.fetch({ limit: 10 });
    const botMessages = messages.filter(m => m.author.id === client.user.id);
    if (botMessages.size > 0) {
      await channel.bulkDelete(botMessages, true).catch(() => {});
    }

    const roleIds = config.roles.ids;

    const roleMap = {
      warrior: { label: "Warrior", roleId: roleIds.warrior, style: ButtonStyle.Primary },
      hunter: { label: "Hunter", roleId: roleIds.hunter, style: ButtonStyle.Danger },
      mage: { label: "Mage", roleId: roleIds.mage, style: ButtonStyle.Success },
      deathknight: { label: "Death Knight", roleId: roleIds.deathknight, style: ButtonStyle.Danger },
      druid: { label: "Druid", roleId: roleIds.druid, style: ButtonStyle.Primary },
      monk: { label: "Monk", roleId: roleIds.monk, style: ButtonStyle.Success },
      shaman: { label: "Shaman", roleId: roleIds.shaman, style: ButtonStyle.Primary },
      priest: { label: "Priest", roleId: roleIds.priest, style: ButtonStyle.Primary },
      warlock: { label: "Warlock", roleId: roleIds.warlock, style: ButtonStyle.Danger },
      rogue: { label: "Rogue", roleId: roleIds.rogue, style: ButtonStyle.Primary },
      paladin: { label: "Paladin", roleId: roleIds.paladin, style: ButtonStyle.Success },
      demonhunter: { label: "Demon Hunter", roleId: roleIds.demonhunter, style: ButtonStyle.Primary },
      evoker: { label: "Evoker", roleId: roleIds.evoker, style: ButtonStyle.Danger },
      tank: { label: "Tank", roleId: roleIds.tank, style: ButtonStyle.Primary },
      healer: { label: "Healer", roleId: roleIds.healer, style: ButtonStyle.Success },
      dps: { label: "DPS", roleId: roleIds.dps, style: ButtonStyle.Danger },
    };

    const embed = new EmbedBuilder()
      .setTitle("⚔️ Cryptic Net Self Roles")
      .setDescription("Click a button below to assign or remove a **Class** or **Role** instantly!")
      .addFields(
        { name: "Classes", value: "Pick your WoW class.", inline: true },
        { name: "Roles", value: "Pick your group role.", inline: true }
      )
      .setColor(config.embed.color)
      .setThumbnail(config.embed.logo)
      .setFooter({ text: config.embed.footer });

    const buildRows = keys => {
      const rows = [];
      let row = new ActionRowBuilder();
      keys.forEach((key, i) => {
        const { label, style } = roleMap[key];
        row.addComponents(
          new ButtonBuilder().setCustomId(key).setLabel(label).setStyle(style)
        );
        if ((i + 1) % 5 === 0) {
          rows.push(row);
          row = new ActionRowBuilder();
        }
      });
      if (row.components.length > 0) rows.push(row);
      return rows;
    };

    const classKeys = Object.keys(roleMap).slice(0, 13);
    const roleKeys = Object.keys(roleMap).slice(13);
    const classRows = buildRows(classKeys);
    const roleRows = buildRows(roleKeys);

    await channel.send({
      embeds: [embed],
      components: [...classRows, ...roleRows],
    });
  },
};
