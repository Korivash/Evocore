const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, PermissionFlagsBits } = require('discord.js');
const db = require('../../database/database');

// WoW class data with colors and emojis
const WOW_CLASSES = {
    'death-knight': { name: 'Death Knight', emoji: '⚔️', color: 0xC41E3A },
    'demon-hunter': { name: 'Demon Hunter', emoji: '😈', color: 0xA330C9 },
    'druid': { name: 'Druid', emoji: '🐻', color: 0xFF7C0A },
    'evoker': { name: 'Evoker', emoji: '🐉', color: 0x33937F },
    'hunter': { name: 'Hunter', emoji: '🏹', color: 0xAAD372 },
    'mage': { name: 'Mage', emoji: '🔮', color: 0x3FC7EB },
    'monk': { name: 'Monk', emoji: '🥋', color: 0x00FF98 },
    'paladin': { name: 'Paladin', emoji: '🛡️', color: 0xF48CBA },
    'priest': { name: 'Priest', emoji: '✨', color: 0xFFFFFF },
    'rogue': { name: 'Rogue', emoji: '🗡️', color: 0xFFF468 },
    'shaman': { name: 'Shaman', emoji: '⚡', color: 0x0070DD },
    'warlock': { name: 'Warlock', emoji: '👹', color: 0x8788EE },
    'warrior': { name: 'Warrior', emoji: '⚔️', color: 0xC69B6D }
};

const WOW_ROLES = {
    'tank': { emoji: '🛡️', name: 'Tank' },
    'healer': { emoji: '💚', name: 'Healer' },
    'dps': { emoji: '⚔️', name: 'DPS' }
};

const RSVP_STATUS = {
    'accepted': { emoji: '✅', name: 'Accepted', color: '#00ff00' },
    'tentative': { emoji: '❓', name: 'Tentative', color: '#ffaa00' },
    'late': { emoji: '⏰', name: 'Will Be Late', color: '#ff6b00' },
    'declined': { emoji: '❌', name: 'Declined', color: '#ff0000' }
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('event')
        .setDescription('Manage guild events')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageEvents)
        .addSubcommand(subcommand =>
            subcommand
                .setName('create')
                .setDescription('Create a new event')
                .addStringOption(option =>
                    option.setName('title')
                        .setDescription('Event title')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('description')
                        .setDescription('Event description')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('date')
                        .setDescription('Event date (YYYY-MM-DD HH:MM)')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('type')
                        .setDescription('Event type')
                        .setRequired(true)
                        .addChoices(
                            { name: 'WoW Raid', value: 'wow-raid' },
                            { name: 'WoW Mythic+', value: 'wow-mythic' },
                            { name: 'WoW PvP', value: 'wow-pvp' },
                            { name: 'General Event', value: 'general' },
                            { name: 'Custom', value: 'custom' }
                        ))
                .addIntegerOption(option =>
                    option.setName('max-participants')
                        .setDescription('Maximum number of participants (0 = unlimited)')
                        .setMinValue(0)
                        .setRequired(false))
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('Channel to post event in (defaults to current)')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('edit')
                .setDescription('Edit an existing event')
                .addStringOption(option =>
                    option.setName('event-id')
                        .setDescription('Event ID (from event message)')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('cancel')
                .setDescription('Cancel an event')
                .addStringOption(option =>
                    option.setName('event-id')
                        .setDescription('Event ID')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('reason')
                        .setDescription('Cancellation reason')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('List all upcoming events'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('roster')
                .setDescription('View event roster')
                .addStringOption(option =>
                    option.setName('event-id')
                        .setDescription('Event ID')
                        .setRequired(true))),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case 'create':
                await handleCreate(interaction);
                break;
            case 'edit':
                await handleEdit(interaction);
                break;
            case 'cancel':
                await handleCancel(interaction);
                break;
            case 'list':
                await handleList(interaction);
                break;
            case 'roster':
                await handleRoster(interaction);
                break;
        }
    }
};

async function handleCreate(interaction) {
    await interaction.deferReply();

    const title = interaction.options.getString('title');
    const description = interaction.options.getString('description');
    const dateString = interaction.options.getString('date');
    const type = interaction.options.getString('type');
    const maxParticipants = interaction.options.getInteger('max-participants') || 0;
    const channel = interaction.options.getChannel('channel') || interaction.channel;

    // Parse date
    let eventDate;
    try {
        eventDate = new Date(dateString);
        if (isNaN(eventDate.getTime())) {
            throw new Error('Invalid date');
        }
        if (eventDate < new Date()) {
            return interaction.editReply({ content: '❌ Event date must be in the future!' });
        }
    } catch (error) {
        return interaction.editReply({ content: '❌ Invalid date format! Use: YYYY-MM-DD HH:MM (e.g., 2025-10-25 20:00)' });
    }

    // Create event in database
    const eventId = await db.createEvent(
        interaction.guild.id,
        interaction.user.id,
        title,
        description,
        eventDate,
        type,
        maxParticipants,
        channel.id
    );

    // Create event embed
    const embed = await createEventEmbed({
        id: eventId,
        title,
        description,
        date: eventDate,
        event_type: type,
        max_participants: maxParticipants,
        organizer_id: interaction.user.id
    }, [], interaction.client);

    // Create RSVP buttons
    const rows = createRSVPButtons(eventId, type);

    // Send event message
    const eventMessage = await channel.send({ embeds: [embed], components: rows });
    
    // Store message ID
    await db.updateEventMessageId(eventId, eventMessage.id);

    await interaction.editReply({ 
        content: `✅ Event created! View it in ${channel}`,
        embeds: [embed]
    });
}

async function handleEdit(interaction) {
    await interaction.reply({ content: '🚧 Edit functionality coming soon!', ephemeral: true });
}

async function handleCancel(interaction) {
    await interaction.deferReply();

    const eventId = interaction.options.getString('event-id');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    const event = await db.getEvent(eventId);
    
    if (!event) {
        return interaction.editReply({ content: '❌ Event not found!' });
    }

    if (event.organizer_id !== interaction.user.id && !interaction.member.permissions.has(PermissionFlagsBits.ManageEvents)) {
        return interaction.editReply({ content: '❌ You can only cancel your own events!' });
    }

    await db.cancelEvent(eventId);

    // Try to update the event message
    try {
        const channel = await interaction.client.channels.fetch(event.channel_id);
        const message = await channel.messages.fetch(event.message_id);
        
        const cancelEmbed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle(`❌ CANCELLED: ${event.title}`)
            .setDescription(`**Reason:** ${reason}\n\n~~${event.description}~~`)
            .addFields(
                { name: '📅 Was scheduled for', value: `<t:${Math.floor(new Date(event.event_date).getTime() / 1000)}:F>`, inline: false },
                { name: '👤 Organizer', value: `<@${event.organizer_id}>`, inline: false }
            )
            .setFooter({ text: `Event ID: ${event.id}` })
            .setTimestamp();

        await message.edit({ embeds: [cancelEmbed], components: [] });
    } catch (error) {
        console.error('Failed to update event message:', error);
    }

    // Notify all accepted/tentative participants
    const participants = await db.getEventParticipants(eventId);
    for (const participant of participants) {
        if (participant.status === 'accepted' || participant.status === 'tentative') {
            try {
                const user = await interaction.client.users.fetch(participant.user_id);
                await user.send(`📢 The event **${event.title}** scheduled for <t:${Math.floor(new Date(event.event_date).getTime() / 1000)}:F> has been cancelled.\n\n**Reason:** ${reason}`);
            } catch (error) {
                console.error(`Failed to notify user ${participant.user_id}:`, error);
            }
        }
    }

    await interaction.editReply({ content: `✅ Event cancelled and participants notified.` });
}

async function handleList(interaction) {
    await interaction.deferReply();

    const events = await db.getUpcomingEvents(interaction.guild.id);
    
    if (events.length === 0) {
        return interaction.editReply({ content: '📅 No upcoming events!' });
    }

    const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('📅 Upcoming Events')
        .setDescription('Here are all the upcoming events:')
        .setTimestamp();

    for (const event of events.slice(0, 10)) {
        const participants = await db.getEventParticipants(event.id);
        const acceptedCount = participants.filter(p => p.status === 'accepted').length;
        
        const dateStr = `<t:${Math.floor(new Date(event.event_date).getTime() / 1000)}:R>`;
        const maxStr = event.max_participants > 0 ? `/${event.max_participants}` : '';
        
        embed.addFields({
            name: `${event.title} (ID: ${event.id})`,
            value: `📝 ${event.description}\n` +
                   `📅 ${dateStr}\n` +
                   `👥 ${acceptedCount}${maxStr} participants\n` +
                   `🎮 Type: ${event.event_type}`,
            inline: false
        });
    }

    if (events.length > 10) {
        embed.setFooter({ text: `Showing 10 of ${events.length} events` });
    }

    await interaction.editReply({ embeds: [embed] });
}

async function handleRoster(interaction) {
    await interaction.deferReply();

    const eventId = interaction.options.getString('event-id');
    const event = await db.getEvent(eventId);
    
    if (!event) {
        return interaction.editReply({ content: '❌ Event not found!' });
    }

    const participants = await db.getEventParticipants(eventId);
    
    const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle(`📋 Roster: ${event.title}`)
        .setDescription(`Event Date: <t:${Math.floor(new Date(event.event_date).getTime() / 1000)}:F>`)
        .setTimestamp();

    // Group by status
    const byStatus = {
        accepted: [],
        tentative: [],
        late: [],
        declined: []
    };

    for (const participant of participants) {
        const user = await interaction.client.users.fetch(participant.user_id).catch(() => null);
        if (!user) continue;

        let line = `<@${participant.user_id}>`;
        
        if (participant.wow_class && participant.wow_role) {
            const classData = WOW_CLASSES[participant.wow_class];
            const roleData = WOW_ROLES[participant.wow_role];
            if (classData && roleData) {
                line += ` - ${classData.emoji} ${classData.name} (${roleData.emoji} ${roleData.name})`;
            }
        }

        if (participant.notes) {
            line += ` *${participant.notes}*`;
        }

        byStatus[participant.status].push(line);
    }

    // Add fields for each status
    if (byStatus.accepted.length > 0) {
        embed.addFields({
            name: `${RSVP_STATUS.accepted.emoji} Accepted (${byStatus.accepted.length})`,
            value: byStatus.accepted.join('\n') || 'None',
            inline: false
        });
    }

    if (byStatus.tentative.length > 0) {
        embed.addFields({
            name: `${RSVP_STATUS.tentative.emoji} Tentative (${byStatus.tentative.length})`,
            value: byStatus.tentative.join('\n') || 'None',
            inline: false
        });
    }

    if (byStatus.late.length > 0) {
        embed.addFields({
            name: `${RSVP_STATUS.late.emoji} Will Be Late (${byStatus.late.length})`,
            value: byStatus.late.join('\n') || 'None',
            inline: false
        });
    }

    if (byStatus.declined.length > 0) {
        embed.addFields({
            name: `${RSVP_STATUS.declined.emoji} Declined (${byStatus.declined.length})`,
            value: byStatus.declined.join('\n') || 'None',
            inline: false
        });
    }

    if (participants.length === 0) {
        embed.setDescription('No participants yet!');
    }

    await interaction.editReply({ embeds: [embed] });
}

async function createEventEmbed(event, participants, client) {
    const embed = new EmbedBuilder()
        .setTitle(event.title)
        .setDescription(event.description)
        .setColor('#0099ff')
        .addFields(
            { name: '📅 Date', value: `<t:${Math.floor(new Date(event.date || event.event_date).getTime() / 1000)}:F>`, inline: true },
            { name: '⏰ Starts In', value: `<t:${Math.floor(new Date(event.date || event.event_date).getTime() / 1000)}:R>`, inline: true },
            { name: '👤 Organizer', value: `<@${event.organizer_id}>`, inline: true }
        )
        .setFooter({ text: `Event ID: ${event.id} | Use /event roster ${event.id} to see full roster` })
        .setTimestamp();

    // Add max participants if set
    if (event.max_participants > 0) {
        const acceptedCount = participants.filter(p => p.status === 'accepted').length;
        embed.addFields({
            name: '👥 Participants',
            value: `${acceptedCount}/${event.max_participants}`,
            inline: true
        });
    }

    // Group participants by status
    const byStatus = {
        accepted: [],
        tentative: [],
        late: [],
        declined: []
    };

    // Fetch user data and organize by status
    for (const participant of participants) {
        let line = '';
        
        // Fetch user to get their display name
        try {
            const user = await client.users.fetch(participant.user_id);
            line = `**${user.displayName || user.username}**`;
        } catch (error) {
            line = `<@${participant.user_id}>`;
        }
        
        // Add class and role info for WoW events
        const eventType = event.event_type || event.type || '';
        if (eventType.startsWith('wow-') && participant.wow_class && participant.wow_role) {
            const classData = WOW_CLASSES[participant.wow_class];
            const roleData = WOW_ROLES[participant.wow_role];
            if (classData && roleData) {
                line += ` - ${classData.emoji} ${classData.name} (${roleData.emoji} ${roleData.name})`;
            }
        }

        byStatus[participant.status].push(line);
    }

    // Add participant lists to embed
    if (byStatus.accepted.length > 0) {
        embed.addFields({
            name: `${RSVP_STATUS.accepted.emoji} Accepted (${byStatus.accepted.length})`,
            value: byStatus.accepted.join('\n'),
            inline: false
        });
    }

    if (byStatus.tentative.length > 0) {
        embed.addFields({
            name: `${RSVP_STATUS.tentative.emoji} Tentative (${byStatus.tentative.length})`,
            value: byStatus.tentative.join('\n'),
            inline: false
        });
    }

    if (byStatus.late.length > 0) {
        embed.addFields({
            name: `${RSVP_STATUS.late.emoji} Will Be Late (${byStatus.late.length})`,
            value: byStatus.late.join('\n'),
            inline: false
        });
    }

    if (byStatus.declined.length > 0) {
        embed.addFields({
            name: `${RSVP_STATUS.declined.emoji} Declined (${byStatus.declined.length})`,
            value: byStatus.declined.join('\n'),
            inline: false
        });
    }

    // Add role breakdown for WoW events
    const eventType = event.event_type || event.type || '';
    if (eventType.startsWith('wow-')) {
        const tanks = participants.filter(p => p.wow_role === 'tank' && p.status === 'accepted').length;
        const healers = participants.filter(p => p.wow_role === 'healer' && p.status === 'accepted').length;
        const dps = participants.filter(p => p.wow_role === 'dps' && p.status === 'accepted').length;

        embed.addFields({
            name: '🎮 Composition',
            value: `🛡️ Tanks: ${tanks}\n💚 Healers: ${healers}\n⚔️ DPS: ${dps}`,
            inline: true
        });
    }

    return embed;
}

function createRSVPButtons(eventId, eventType) {
    const rows = [];

    // First row - RSVP status buttons
    const row1 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`event_accept_${eventId}`)
                .setLabel('Accept')
                .setEmoji('✅')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId(`event_tentative_${eventId}`)
                .setLabel('Tentative')
                .setEmoji('❓')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`event_late_${eventId}`)
                .setLabel('Will Be Late')
                .setEmoji('⏰')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId(`event_decline_${eventId}`)
                .setLabel('Decline')
                .setEmoji('❌')
                .setStyle(ButtonStyle.Danger)
        );

    rows.push(row1);

    // Second row - WoW specific buttons
    if (eventType.startsWith('wow-')) {
        const row2 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`event_setup_${eventId}`)
                    .setLabel('Set Class & Role')
                    .setEmoji('🎮')
                    .setStyle(ButtonStyle.Secondary)
            );
        rows.push(row2);
    }

    return rows;
}

// Export for use in button handler
module.exports.WOW_CLASSES = WOW_CLASSES;
module.exports.WOW_ROLES = WOW_ROLES;
module.exports.RSVP_STATUS = RSVP_STATUS;
module.exports.createEventEmbed = createEventEmbed;