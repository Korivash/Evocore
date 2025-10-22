const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('avatar')
        .setDescription("Get a user's avatar")
        .addUserOption(option =>
            option.setName('user')
                .setDescription('User to get avatar of (defaults to you)')
                .setRequired(false)),

    async execute(interaction) {
        const target = interaction.options.getUser('user') || interaction.user;

        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle(`${target.tag}'s Avatar`)
            .setImage(target.displayAvatarURL({ dynamic: true, size: 1024 }))
            .setDescription(`[Download](${target.displayAvatarURL({ dynamic: true, size: 1024 })})`)
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};
