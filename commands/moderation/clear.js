const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('clear')
        .setDescription('Delete multiple messages')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('Number of messages to delete (1-100)')
                .setMinValue(1)
                .setMaxValue(100)
                .setRequired(true))
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Only delete messages from this user')
                .setRequired(false)),

    async execute(interaction) {
        const amount = interaction.options.getInteger('amount');
        const targetUser = interaction.options.getUser('user');

        await interaction.deferReply({ ephemeral: true });

        try {
            const messages = await interaction.channel.messages.fetch({ limit: amount + 1 });
            let messagesToDelete = Array.from(messages.values()).slice(1);

            if (targetUser) {
                messagesToDelete = messagesToDelete.filter(msg => msg.author.id === targetUser.id);
            }

            const deletedMessages = await interaction.channel.bulkDelete(messagesToDelete, true);

            await interaction.editReply({ 
                content: `✅ Successfully deleted ${deletedMessages.size} message(s)${targetUser ? ` from ${targetUser.tag}` : ''}.` 
            });

            setTimeout(async () => {
                try {
                    await interaction.deleteReply();
                } catch (error) {}
            }, 3000);
        } catch (error) {
            console.error('Clear error:', error);
            await interaction.editReply({ content: '❌ Failed to delete messages.' });
        }
    }
};
