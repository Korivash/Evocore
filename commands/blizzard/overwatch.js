const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('overwatch')
        .setDescription('Look up Overwatch player profile')
        .addStringOption(option =>
            option.setName('battletag')
                .setDescription('BattleTag (e.g., Player#1234)')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('platform')
                .setDescription('Gaming platform')
                .setRequired(false)
                .addChoices(
                    { name: 'PC', value: 'pc' },
                    { name: 'PlayStation', value: 'psn' },
                    { name: 'Xbox', value: 'xbl' },
                    { name: 'Nintendo Switch', value: 'nintendo-switch' }
                )),
    cooldown: 5,

    async execute(interaction) {
        await interaction.deferReply();

        const battleTag = interaction.options.getString('battletag');
        const platform = interaction.options.getString('platform') || 'pc';

        // Blizzard has deprecated public Overwatch profile API access
        const embed = new EmbedBuilder()
            .setColor('#ff9c00')
            .setTitle('🎮 Overwatch Profile Lookup')
            .setDescription('⚠️ **API Currently Unavailable**\n\nBlizzard has restricted public access to Overwatch player profile data through their API.')
            .addFields(
                { 
                    name: '🔍 Alternative Methods', 
                    value: '• Check in-game profile\n• Use official Overwatch website\n• Third-party trackers like OverwatchTracker.com', 
                    inline: false 
                },
                {
                    name: '📝 Searched Profile',
                    value: `**BattleTag:** ${battleTag}\n**Platform:** ${platform.toUpperCase()}`,
                    inline: false
                },
                {
                    name: '🔗 Resources',
                    value: '[Official Overwatch Site](https://overwatch.blizzard.com)\n[OverwatchTracker](https://overwatchtracker.com)',
                    inline: false
                }
            )
            .setFooter({ text: 'Blizzard API - Public access restricted' })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    }
};
