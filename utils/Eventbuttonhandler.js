const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');
const db = require('../database/database');
const { WOW_CLASSES, WOW_ROLES, RSVP_STATUS, createEventEmbed } = require('../commands/utility/event');
const logger = require('./logging');

/**
 * Handle all event-related button interactions
 * @param {ButtonInteraction} interaction - The button interaction
 */
async function handleEventButton(interaction) {
    const customId = interaction.customId;
    
    // Extract event ID from custom ID (format: event_action_eventId)
    const parts = customId.split('_');
    if (parts.length < 3) {
        return await interaction.reply({ content: '❌ Invalid button format!', ephemeral: true });
    }
    
    const action = parts[1]; // accept, tentative, late, decline, setup
    const eventId = parts.slice(2).join('_'); // In case event ID has underscores
    
    // Get event from database
    const event = await db.getEvent(eventId);
    if (!event) {
        return await interaction.reply({ content: '❌ Event not found!', ephemeral: true });
    }
    
    // Check if event is cancelled
    if (event.status === 'cancelled') {
        return await interaction.reply({ content: '❌ This event has been cancelled!', ephemeral: true });
    }
    
    try {
        switch (action) {
            case 'accept':
            case 'tentative':
            case 'late':
            case 'decline':
                await handleRSVP(interaction, event, action);
                break;
            case 'setup':
                await handleClassRoleSetup(interaction, event);
                break;
            default:
                await interaction.reply({ content: '❌ Unknown action!', ephemeral: true });
        }
    } catch (error) {
        logger.error('Error handling event button:', error);
        
        const errorMessage = {
            content: '❌ An error occurred while processing your response. Please try again.',
            ephemeral: true
        };
        
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp(errorMessage);
        } else {
            await interaction.reply(errorMessage);
        }
    }
}

/**
 * Handle RSVP button clicks
 */
async function handleRSVP(interaction, event, status) {
    // Map button action to database status value
    const statusMap = {
        'accept': 'accepted',
        'decline': 'declined',
        'tentative': 'tentative',
        'late': 'late'
    };
    
    const dbStatus = statusMap[status] || status;
    
    // Check if event is full (for accepted status)
    if (dbStatus === 'accepted' && event.max_participants > 0) {
        const participants = await db.getEventParticipants(event.id);
        const acceptedCount = participants.filter(p => p.status === 'accepted').length;
        
        // Check if user already has accepted status
        const existingParticipant = participants.find(p => p.user_id === interaction.user.id);
        const userAlreadyAccepted = existingParticipant && existingParticipant.status === 'accepted';
        
        if (acceptedCount >= event.max_participants && !userAlreadyAccepted) {
            return await interaction.reply({ 
                content: '❌ This event is full! You can still sign up as Tentative.',
                ephemeral: true 
            });
        }
    }
    
    // Update or create participant record with the correct database status
    await db.updateEventParticipant(event.id, interaction.user.id, dbStatus);
    
    // Update the event embed message
    await updateEventMessage(interaction, event);
    
    // Send confirmation (use dbStatus for the emoji/name lookup)
    const statusEmoji = RSVP_STATUS[dbStatus].emoji;
    const statusName = RSVP_STATUS[dbStatus].name;
    
    await interaction.reply({ 
        content: `${statusEmoji} You are now marked as **${statusName}** for **${event.title}**!`,
        ephemeral: true 
    });
}

/**
 * Show modal for setting up class and role
 */
async function handleClassRoleSetup(interaction, event) {
    // Check if event is a WoW event
    const eventType = event.event_type || event.type || '';
    if (!eventType.startsWith('wow-')) {
        return await interaction.reply({ 
            content: '❌ Class and role setup is only available for WoW events!',
            ephemeral: true 
        });
    }
    
    // Create select menus for class and role
    const classSelect = new StringSelectMenuBuilder()
        .setCustomId(`event_class_${event.id}`)
        .setPlaceholder('Select your class')
        .addOptions(
            Object.entries(WOW_CLASSES).map(([key, data]) => 
                new StringSelectMenuOptionBuilder()
                    .setLabel(data.name)
                    .setValue(key)
                    .setEmoji(data.emoji)
            )
        );
    
    const roleSelect = new StringSelectMenuBuilder()
        .setCustomId(`event_role_${event.id}`)
        .setPlaceholder('Select your role')
        .addOptions(
            Object.entries(WOW_ROLES).map(([key, data]) => 
                new StringSelectMenuOptionBuilder()
                    .setLabel(data.name)
                    .setValue(key)
                    .setEmoji(data.emoji)
            )
        );
    
    const row1 = new ActionRowBuilder().addComponents(classSelect);
    const row2 = new ActionRowBuilder().addComponents(roleSelect);
    
    // Get current selection if exists
    const participant = await db.getEventParticipant(event.id, interaction.user.id);
    let currentInfo = '';
    if (participant && participant.wow_class && participant.wow_role) {
        const classData = WOW_CLASSES[participant.wow_class];
        const roleData = WOW_ROLES[participant.wow_role];
        currentInfo = `\n\n**Current:** ${classData.emoji} ${classData.name} (${roleData.emoji} ${roleData.name})`;
    }
    
    await interaction.reply({
        content: `🎮 **Set up your character for ${event.title}**\n\nPlease select your class and role below.${currentInfo}`,
        components: [row1, row2],
        ephemeral: true
    });
}

/**
 * Handle class/role select menu interactions
 */
async function handleEventSelectMenu(interaction) {
    const customId = interaction.customId;
    const parts = customId.split('_');
    
    if (parts.length < 3) {
        return await interaction.reply({ content: '❌ Invalid select menu format!', ephemeral: true });
    }
    
    const type = parts[1]; // 'class' or 'role'
    const eventId = parts.slice(2).join('_');
    const value = interaction.values[0];
    
    // Get event
    const event = await db.getEvent(eventId);
    if (!event) {
        return await interaction.reply({ content: '❌ Event not found!', ephemeral: true });
    }
    
    try {
        if (type === 'class') {
            await db.updateEventParticipantClass(event.id, interaction.user.id, value);
            const classData = WOW_CLASSES[value];
            await interaction.update({
                content: `✅ Class set to ${classData.emoji} **${classData.name}**!\n\nNow select your role using the menu below.`,
                components: interaction.message.components
            });
        } else if (type === 'role') {
            await db.updateEventParticipantRole(event.id, interaction.user.id, value);
            const roleData = WOW_ROLES[value];
            
            // Get updated participant info
            const participant = await db.getEventParticipant(event.id, interaction.user.id);
            let message = `✅ Role set to ${roleData.emoji} **${roleData.name}**!`;
            
            if (participant && participant.wow_class) {
                const classData = WOW_CLASSES[participant.wow_class];
                message = `✅ Your setup is complete!\n\n${classData.emoji} **${classData.name}** (${roleData.emoji} **${roleData.name}**)`;
            }
            
            await interaction.update({
                content: message,
                components: interaction.message.components
            });
            
            // Update the event message
            await updateEventMessage(interaction, event);
        }
    } catch (error) {
        logger.error('Error handling event select menu:', error);
        await interaction.reply({ 
            content: '❌ An error occurred while updating your selection.',
            ephemeral: true 
        });
    }
}

/**
 * Update the event embed message with current participants
 */
async function updateEventMessage(interaction, event) {
    try {
        // Get the event message
        const channel = await interaction.client.channels.fetch(event.channel_id);
        const message = await channel.messages.fetch(event.message_id);
        
        // Get updated participants
        const participants = await db.getEventParticipants(event.id);
        
        // Create updated embed
        const updatedEmbed = await createEventEmbed(event, participants, interaction.client);
        
        // Update the message
        await message.edit({ embeds: [updatedEmbed] });
        
        logger.info(`Updated event message for event ${event.id}`);
    } catch (error) {
        logger.error('Error updating event message:', error);
        // Don't throw - we don't want to fail the interaction if we can't update the message
    }
}

module.exports = {
    handleEventButton,
    handleEventSelectMenu
};
