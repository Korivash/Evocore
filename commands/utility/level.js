const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../database/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('level')
        .setDescription('Check your level and XP')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('User to check (defaults to you)')
                .setRequired(false)),

    async execute(interaction) {
        const target = interaction.options.getUser('user') || interaction.user;

        const levelData = await db.getUserLevel(interaction.guild.id, target.id);

        if (!levelData) {
            return interaction.reply({ 
                content: `${target.id === interaction.user.id ? 'You have' : `${target.tag} has`} not gained any XP yet!`, 
                ephemeral: true 
            });
        }

        const xpForNextLevel = (levelData.level + 1) * 100;
        const xpProgress = levelData.xp - (levelData.level * 100);
        const progressBar = createProgressBar(xpProgress, 100, 20);

        const embed = new EmbedBuilder()
            .setColor('#9b59b6')
            .setTitle(`📊 Level Statistics`)
            .setAuthor({ name: target.tag, iconURL: target.displayAvatarURL() })
            .addFields(
                { name: '🏆 Level', value: levelData.level.toString(), inline: true },
                { name: '⭐ Total XP', value: levelData.xp.toString(), inline: true },
                { name: '💬 Messages', value: levelData.messages_sent.toString(), inline: true },
                { name: '📈 Progress to Next Level', value: `${progressBar}\n${xpProgress}/100 XP`, inline: false }
            )
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};

function createProgressBar(current, max, length) {
    const percentage = current / max;
    const filled = Math.round(length * percentage);
    const empty = length - filled;
    return '█'.repeat(filled) + '░'.repeat(empty);
}
