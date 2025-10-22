const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const db = require('../../database/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warnings')
        .setDescription('View warnings for a user')
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to check')
                .setRequired(true)),

    async execute(interaction) {
        const target = interaction.options.getUser('user');
        const warnings = await db.getWarnings(interaction.guild.id, target.id);

        if (warnings.length === 0) {
            return interaction.reply({ 
                content: `✅ ${target.tag} has no warnings.`, 
                ephemeral: true 
            });
        }

        const config = await db.getGuildConfig(interaction.guild.id);

        const embed = new EmbedBuilder()
            .setColor('#ffcc00')
            .setTitle(`⚠️ Warnings for ${target.tag}`)
            .setDescription(`Total Warnings: **${warnings.length}/${config.max_warnings}**`)
            .setThumbnail(target.displayAvatarURL())
            .setTimestamp();

        const warningsList = warnings.slice(0, 10).map((w, i) => {
            const date = new Date(w.created_at).toLocaleDateString();
            return `**${i + 1}.** ${w.reason}\n   *${date} - <@${w.moderator_id}>*`;
        }).join('\n\n');

        embed.addFields({ name: 'Warning History', value: warningsList || 'None', inline: false });

        if (warnings.length > 10) {
            embed.setFooter({ text: `Showing 10 of ${warnings.length} warnings` });
        }

        await interaction.reply({ embeds: [embed] });
    }
};
