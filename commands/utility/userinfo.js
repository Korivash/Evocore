const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('userinfo')
        .setDescription('Display information about a user')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('User to get info about (defaults to you)')
                .setRequired(false)),

    async execute(interaction) {
        const target = interaction.options.getUser('user') || interaction.user;
        const member = interaction.guild.members.cache.get(target.id);

        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle(`👤 User Information: ${target.tag}`)
            .setThumbnail(target.displayAvatarURL({ dynamic: true, size: 512 }))
            .addFields(
                { name: '🆔 User ID', value: target.id, inline: true },
                { name: '📅 Account Created', value: `<t:${Math.floor(target.createdTimestamp / 1000)}:R>`, inline: true },
                { name: '📥 Joined Server', value: member ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : 'N/A', inline: true },
                { name: '🎭 Nickname', value: member?.nickname || 'None', inline: true },
                { name: '🎨 Accent Color', value: target.hexAccentColor || 'None', inline: true },
                { name: '🤖 Bot', value: target.bot ? 'Yes' : 'No', inline: true }
            )
            .setTimestamp();

        if (member) {
            const roles = member.roles.cache
                .filter(role => role.id !== interaction.guild.id)
                .sort((a, b) => b.position - a.position)
                .map(role => role.toString())
                .slice(0, 20);

            if (roles.length > 0) {
                embed.addFields({ 
                    name: `🎭 Roles [${roles.length}]`, 
                    value: roles.join(', ') || 'None', 
                    inline: false 
                });
            }

            const permissions = member.permissions.toArray().slice(0, 10).join(', ');
            if (permissions) {
                embed.addFields({ 
                    name: '🔑 Key Permissions', 
                    value: permissions.substring(0, 1024), 
                    inline: false 
                });
            }
        }

        await interaction.reply({ embeds: [embed] });
    }
};
