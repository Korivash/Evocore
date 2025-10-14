const config = require("../config");

module.exports = {
  type: "button",
  async execute(interaction, client) {
    const roleIds = config.roles.ids;
    const key = interaction.customId; // e.g. "warrior", "healer"
    const roleId = roleIds[key];

    if (!roleId) return false; // Not a role button

    const member = await interaction.guild.members.fetch(interaction.user.id);
    const role = interaction.guild.roles.cache.get(roleId);

    if (!role) {
      await interaction.reply({
        content: "❌ Role not found on this server.",
        ephemeral: true,
      });
      return true;
    }

    if (member.roles.cache.has(roleId)) {
      await member.roles.remove(roleId).catch(() => {});
      await interaction.reply({
        content: `✅ Removed role **${role.name}**`,
        ephemeral: true,
      });
    } else {
      await member.roles.add(roleId).catch(() => {});
      await interaction.reply({
        content: `✅ Added role **${role.name}**`,
        ephemeral: true,
      });
    }

    return true; // Handled
  },
};
