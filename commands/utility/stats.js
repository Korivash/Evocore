const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../database/database');
const os = require('os');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stats')
        .setDescription('View bot statistics'),

    async execute(interaction) {
        const totalGuilds = interaction.client.guilds.cache.size;
        const totalMembers = interaction.client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);
        const commandStats = await db.getCommandStats(interaction.guild.id);
        const totalCommands = commandStats.reduce((acc, stat) => acc + stat.count, 0);

        const uptime = process.uptime();
        const days = Math.floor(uptime / 86400);
        const hours = Math.floor((uptime % 86400) / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        const seconds = Math.floor(uptime % 60);

        const memUsage = process.memoryUsage();
        const memUsageMB = Math.round(memUsage.heapUsed / 1024 / 1024);

        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('📊 Bot Statistics')
            .addFields(
                { name: '🌐 Servers', value: totalGuilds.toString(), inline: true },
                { name: '👥 Total Users', value: totalMembers.toString(), inline: true },
                { name: '⚡ Commands Used', value: totalCommands.toString(), inline: true },
                { name: '⏰ Uptime', value: `${days}d ${hours}h ${minutes}m ${seconds}s`, inline: true },
                { name: '💾 Memory Usage', value: `${memUsageMB} MB`, inline: true },
                { name: '🖥️ Platform', value: os.platform(), inline: true },
                { name: '📡 Ping', value: `${interaction.client.ws.ping}ms`, inline: true },
                { name: '📚 Discord.js', value: require('discord.js').version, inline: true },
                { name: '🟢 Node.js', value: process.version, inline: true }
            )
            .setFooter({ text: `Shard ID: ${interaction.guild.shardId || 0}` })
            .setTimestamp();

        if (commandStats.length > 0) {
            const topCommands = commandStats.slice(0, 5).map((cmd, i) => `${i + 1}. \`${cmd.command_name}\` (${cmd.count})`).join('\n');
            embed.addFields({ name: '🔝 Top Commands (This Server)', value: topCommands, inline: false });
        }

        await interaction.reply({ embeds: [embed] });
    }
};
