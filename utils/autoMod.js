const db = require('../database/database');
const logger = require('./logger');

// Bad words list (you can expand this)
const badWords = [
    'badword1', 'badword2', 'badword3'
    // Add more as needed
];

// Spam detection cache
const spamCache = new Map();
const SPAM_THRESHOLD = 5; // messages
const SPAM_TIMEFRAME = 5000; // 5 seconds

async function checkMessage(message, guildConfig) {
    try {
        // Anti-spam
        if (guildConfig.anti_spam_enabled) {
            const isSpam = await checkSpam(message);
            if (isSpam) {
                await handleViolation(message, 'SPAM', 'Spamming messages');
                return;
            }
        }

        // Anti-link
        if (guildConfig.anti_link_enabled) {
            const hasLink = /https?:\/\/[^\s]+/.test(message.content);
            if (hasLink && !message.member.permissions.has('ManageMessages')) {
                await handleViolation(message, 'LINK', 'Posted unauthorized link');
                return;
            }
        }

        // Anti-invite
        if (guildConfig.anti_invite_enabled) {
            const hasInvite = /(discord\.gg|discordapp\.com\/invite)\/[^\s]+/.test(message.content);
            if (hasInvite && !message.member.permissions.has('ManageGuild')) {
                await handleViolation(message, 'INVITE', 'Posted Discord invite');
                return;
            }
        }

        // Bad words filter
        const lowerContent = message.content.toLowerCase();
        for (const word of badWords) {
            if (lowerContent.includes(word)) {
                await handleViolation(message, 'BAD_WORD', `Used prohibited word: ${word}`);
                return;
            }
        }

        // Excessive caps
        if (message.content.length > 10) {
            const capsPercentage = (message.content.match(/[A-Z]/g) || []).length / message.content.length;
            if (capsPercentage > 0.7) {
                await handleViolation(message, 'EXCESSIVE_CAPS', 'Excessive use of capital letters');
                return;
            }
        }

        // Excessive mentions
        if (message.mentions.users.size > 5) {
            await handleViolation(message, 'MASS_MENTION', 'Mass mentioning users');
            return;
        }

    } catch (error) {
        logger.error('Error in auto-mod check:', error);
    }
}

async function checkSpam(message) {
    const userId = message.author.id;
    const now = Date.now();

    if (!spamCache.has(userId)) {
        spamCache.set(userId, []);
    }

    const userMessages = spamCache.get(userId);
    
    // Remove old messages
    const recentMessages = userMessages.filter(timestamp => now - timestamp < SPAM_TIMEFRAME);
    recentMessages.push(now);
    
    spamCache.set(userId, recentMessages);

    // Clear cache after timeframe
    setTimeout(() => {
        const cached = spamCache.get(userId);
        if (cached) {
            const filtered = cached.filter(timestamp => Date.now() - timestamp < SPAM_TIMEFRAME);
            if (filtered.length === 0) {
                spamCache.delete(userId);
            } else {
                spamCache.set(userId, filtered);
            }
        }
    }, SPAM_TIMEFRAME);

    return recentMessages.length >= SPAM_THRESHOLD;
}

async function handleViolation(message, violationType, reason) {
    try {
        // Delete the message
        await message.delete();

        // Log violation
        await db.addAutoModViolation(
            message.guild.id,
            message.author.id,
            violationType,
            message.content
        );

        // Send warning to user
        const warningMessage = await message.channel.send(
            `⚠️ ${message.author}, your message was deleted for: **${reason}**`
        );

        // Delete warning after 5 seconds
        setTimeout(() => warningMessage.delete().catch(() => {}), 5000);

        // Check if user should be warned/muted
        const violations = await db.getAutoModViolations(message.guild.id, message.author.id);
        const recentViolations = violations.filter(v => {
            const timeDiff = Date.now() - new Date(v.created_at).getTime();
            return timeDiff < 300000; // 5 minutes
        });

        if (recentViolations.length >= 3) {
            // Auto-warn
            await db.addWarning(message.guild.id, message.author.id, message.client.user.id, `Auto-mod: Multiple violations (${violationType})`);
            
            const warningCount = await db.getWarningCount(message.guild.id, message.author.id);
            const guildConfig = await db.getGuildConfig(message.guild.id);

            if (warningCount >= guildConfig.max_warnings && guildConfig.mute_role_id) {
                // Auto-mute
                const muteRole = message.guild.roles.cache.get(guildConfig.mute_role_id);
                if (muteRole) {
                    await message.member.roles.add(muteRole);
                    await message.channel.send(
                        `🔇 ${message.author} has been automatically muted for repeated auto-mod violations.`
                    );
                }
            }
        }

        // Log to mod log channel
        const guildConfig = await db.getGuildConfig(message.guild.id);
        if (guildConfig.mod_log_channel_id) {
            const logChannel = message.guild.channels.cache.get(guildConfig.mod_log_channel_id);
            if (logChannel) {
                const { EmbedBuilder } = require('discord.js');
                const embed = new EmbedBuilder()
                    .setColor('#ff6b6b')
                    .setTitle('🤖 Auto-Moderation Action')
                    .addFields(
                        { name: 'User', value: `${message.author.tag} (${message.author.id})`, inline: true },
                        { name: 'Violation', value: violationType, inline: true },
                        { name: 'Reason', value: reason, inline: true },
                        { name: 'Channel', value: `${message.channel}`, inline: true },
                        { name: 'Content', value: message.content.substring(0, 1024) || 'No content', inline: false }
                    )
                    .setTimestamp();

                await logChannel.send({ embeds: [embed] });
            }
        }

    } catch (error) {
        logger.error('Error handling auto-mod violation:', error);
    }
}

module.exports = {
    checkMessage
};
