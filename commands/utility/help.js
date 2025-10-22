const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Display all available commands and information'),

    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('📚 Bot Command List')
            .setDescription('Here are all the available commands:')
            .addFields(
                {
                    name: '⚙️ Admin Commands',
                    value: '`/setup` - Initial bot setup\n`/config` - Configure bot settings',
                    inline: false
                },
                {
                    name: '🛡️ Moderation Commands',
                    value: '`/kick` - Kick a member\n`/ban` - Ban a member\n`/unban` - Unban a user\n`/warn` - Warn a member\n`/warnings` - View warnings\n`/clear` - Clear messages\n`/mute` - Mute a member\n`/unmute` - Unmute a member\n`/slowmode` - Set slowmode\n`/lock` - Lock a channel\n`/unlock` - Unlock a channel',
                    inline: false
                },
                {
                    name: '🎮 Blizzard Commands',
                    value: '`/wow-character` - Look up WoW character\n`/wow-mythic` - View M+ profile\n`/wow-pvp` - View PvP stats\n`/wow-token` - WoW token price\n`/d4-character` - Diablo 4 character\n`/overwatch` - Overwatch profile',
                    inline: false
                },
                {
                    name: '🤖 AI Commands',
                    value: '`/ask` - Ask AI a question\n`/chat` - Chat with AI\n`/imagine` - Generate creative content\n`/translate` - Translate text',
                    inline: false
                },
                {
                    name: '📊 Utility Commands',
                    value: '`/serverinfo` - Server information\n`/userinfo` - User information\n`/avatar` - Get user avatar\n`/level` - View your level\n`/leaderboard` - Server leaderboard\n`/stats` - Bot statistics',
                    inline: false
                },
                {
                    name: '🎉 Fun Commands',
                    value: '`/8ball` - Ask the magic 8ball\n`/coinflip` - Flip a coin\n`/roll` - Roll dice\n`/meme` - Random meme',
                    inline: false
                }
            )
            .setFooter({ text: 'Use /command for more info on each command' })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};
