const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('serverinfo')
        .setDescription('Display information about the server'),

    async execute(interaction) {
        const { guild } = interaction;

        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle(`📊 ${guild.name} Server Information`)
            .setThumbnail(guild.iconURL({ dynamic: true, size: 1024 }))
            .addFields(
                { name: '🆔 Server ID', value: guild.id, inline: true },
                { name: '👑 Owner', value: `<@${guild.ownerId}>`, inline: true },
                { name: '📅 Created', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`, inline: true },
                { name: '👥 Members', value: guild.memberCount.toString(), inline: true },
                { name: '📝 Channels', value: guild.channels.cache.size.toString(), inline: true },
                { name: '🎭 Roles', value: guild.roles.cache.size.toString(), inline: true },
                { name: '😊 Emojis', value: guild.emojis.cache.size.toString(), inline: true },
                { name: '🔒 Verification Level', value: guild.verificationLevel.toString(), inline: true },
                { name: '🌟 Boosts', value: guild.premiumSubscriptionCount?.toString() || '0', inline: true }
            )
            .setTimestamp();

        if (guild.description) {
            embed.setDescription(guild.description);
        }

        await interaction.reply({ embeds: [embed] });
    }
};
