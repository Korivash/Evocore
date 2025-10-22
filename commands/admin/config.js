const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const db = require('../../database/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('config')
        .setDescription('Configure bot settings for your server')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(subcommand =>
            subcommand
                .setName('view')
                .setDescription('View current configuration'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('automod')
                .setDescription('Configure auto-moderation settings')
                .addBooleanOption(option =>
                    option.setName('enabled')
                        .setDescription('Enable or disable auto-moderation')
                        .setRequired(true))
                .addBooleanOption(option =>
                    option.setName('anti-spam')
                        .setDescription('Enable anti-spam')
                        .setRequired(false))
                .addBooleanOption(option =>
                    option.setName('anti-link')
                        .setDescription('Enable anti-link')
                        .setRequired(false))
                .addBooleanOption(option =>
                    option.setName('anti-invite')
                        .setDescription('Enable anti-Discord invite')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('warnings')
                .setDescription('Configure warning system')
                .addIntegerOption(option =>
                    option.setName('max-warnings')
                        .setDescription('Maximum warnings before automatic action')
                        .setMinValue(1)
                        .setMaxValue(10)
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('welcome')
                .setDescription('Configure welcome message')
                .addStringOption(option =>
                    option.setName('message')
                        .setDescription('Welcome message (use {user}, {server}, {memberCount})')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('goodbye')
                .setDescription('Configure goodbye message')
                .addStringOption(option =>
                    option.setName('message')
                        .setDescription('Goodbye message (use {user}, {server})')
                        .setRequired(true))),

    async execute(interaction) {
        await interaction.deferReply();

        const subcommand = interaction.options.getSubcommand();
        const config = await db.getGuildConfig(interaction.guild.id);

        if (!config) {
            return interaction.editReply({
                content: '❌ Please run `/setup` first to initialize the bot configuration.',
                ephemeral: true
            });
        }

        switch (subcommand) {
            case 'view':
                await handleView(interaction, config);
                break;
            case 'automod':
                await handleAutoMod(interaction, config);
                break;
            case 'warnings':
                await handleWarnings(interaction, config);
                break;
            case 'welcome':
                await handleWelcome(interaction, config);
                break;
            case 'goodbye':
                await handleGoodbye(interaction, config);
                break;
        }
    }
};

async function handleView(interaction, config) {
    const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('⚙️ Server Configuration')
        .addFields(
            {
                name: '📋 Basic Settings',
                value: `**Prefix:** ${config.prefix}\n` +
                       `**Mod Log:** ${config.mod_log_channel_id ? `<#${config.mod_log_channel_id}>` : 'Not set'}\n` +
                       `**Mute Role:** ${config.mute_role_id ? `<@&${config.mute_role_id}>` : 'Not set'}\n` +
                       `**Auto Role:** ${config.auto_role_id ? `<@&${config.auto_role_id}>` : 'Not set'}`,
                inline: false
            },
            {
                name: '🤖 Auto-Moderation',
                value: `**Enabled:** ${config.auto_mod_enabled ? '✅' : '❌'}\n` +
                       `**Anti-Spam:** ${config.anti_spam_enabled ? '✅' : '❌'}\n` +
                       `**Anti-Link:** ${config.anti_link_enabled ? '✅' : '❌'}\n` +
                       `**Anti-Invite:** ${config.anti_invite_enabled ? '✅' : '❌'}`,
                inline: true
            },
            {
                name: '⚠️ Warning System',
                value: `**Max Warnings:** ${config.max_warnings}`,
                inline: true
            },
            {
                name: '👋 Welcome Settings',
                value: `**Channel:** ${config.welcome_channel_id ? `<#${config.welcome_channel_id}>` : 'Not set'}\n` +
                       `**Message:** ${config.welcome_message || 'Not set'}`,
                inline: false
            },
            {
                name: '👋 Goodbye Settings',
                value: `**Channel:** ${config.goodbye_channel_id ? `<#${config.goodbye_channel_id}>` : 'Not set'}\n` +
                       `**Message:** ${config.goodbye_message || 'Not set'}`,
                inline: false
            },
            {
                name: '🎮 Blizzard API',
                value: `**Enabled:** ${config.blizzard_api_enabled ? '✅' : '❌'}`,
                inline: true
            }
        )
        .setFooter({ text: `Server ID: ${interaction.guild.id}` })
        .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
}

async function handleAutoMod(interaction, config) {
    const enabled = interaction.options.getBoolean('enabled');
    const antiSpam = interaction.options.getBoolean('anti-spam');
    const antiLink = interaction.options.getBoolean('anti-link');
    const antiInvite = interaction.options.getBoolean('anti-invite');

    const updates = { auto_mod_enabled: enabled };
    if (antiSpam !== null) updates.anti_spam_enabled = antiSpam;
    if (antiLink !== null) updates.anti_link_enabled = antiLink;
    if (antiInvite !== null) updates.anti_invite_enabled = antiInvite;

    await db.updateGuildConfig(interaction.guild.id, updates);

    const embed = new EmbedBuilder()
        .setColor('#00ff00')
        .setTitle('✅ Auto-Moderation Updated')
        .setDescription('Auto-moderation settings have been updated successfully!')
        .addFields(
            {
                name: 'Current Settings',
                value: `**Enabled:** ${enabled ? '✅' : '❌'}\n` +
                       `**Anti-Spam:** ${antiSpam !== null ? (antiSpam ? '✅' : '❌') : 'Unchanged'}\n` +
                       `**Anti-Link:** ${antiLink !== null ? (antiLink ? '✅' : '❌') : 'Unchanged'}\n` +
                       `**Anti-Invite:** ${antiInvite !== null ? (antiInvite ? '✅' : '❌') : 'Unchanged'}`
            }
        )
        .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
}

async function handleWarnings(interaction, config) {
    const maxWarnings = interaction.options.getInteger('max-warnings');

    await db.updateGuildConfig(interaction.guild.id, { max_warnings: maxWarnings });

    const embed = new EmbedBuilder()
        .setColor('#00ff00')
        .setTitle('✅ Warning System Updated')
        .setDescription(`Maximum warnings before automatic action has been set to **${maxWarnings}**.`)
        .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
}

async function handleWelcome(interaction, config) {
    const message = interaction.options.getString('message');

    await db.updateGuildConfig(interaction.guild.id, { welcome_message: message });

    const embed = new EmbedBuilder()
        .setColor('#00ff00')
        .setTitle('✅ Welcome Message Updated')
        .setDescription('Welcome message has been updated successfully!')
        .addFields(
            {
                name: 'New Message',
                value: message
            },
            {
                name: 'Preview',
                value: message
                    .replace('{user}', `<@${interaction.user.id}>`)
                    .replace('{server}', interaction.guild.name)
                    .replace('{memberCount}', interaction.guild.memberCount.toString())
            }
        )
        .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
}

async function handleGoodbye(interaction, config) {
    const message = interaction.options.getString('message');

    await db.updateGuildConfig(interaction.guild.id, { goodbye_message: message });

    const embed = new EmbedBuilder()
        .setColor('#00ff00')
        .setTitle('✅ Goodbye Message Updated')
        .setDescription('Goodbye message has been updated successfully!')
        .addFields(
            {
                name: 'New Message',
                value: message
            },
            {
                name: 'Preview',
                value: message
                    .replace('{user}', interaction.user.tag)
                    .replace('{server}', interaction.guild.name)
            }
        )
        .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
}
