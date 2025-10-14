const { EmbedBuilder } = require('discord.js');

const WELCOME_CHANNEL = '1385992658169630841';
const ROLES_CHANNEL = '1424203663613628509';
const LOGO_URL = 'https://imgur.com/adNsO53.png';

const log = {
  info: (...args) => console.log('\x1b[36m[WELCOME]\x1b[0m', ...args),
  error: (...args) => console.error('\x1b[31m[WELCOME]\x1b[0m', ...args),
};

function createWelcomeEmbed(member) {
  return new EmbedBuilder()
    .setColor(0x0099ff)
    .setTitle(`Welcome to the server! 🎉`)
    .setDescription(
      `Hey <@${member.id}>, we're glad you joined **${member.guild.name}**.\n\n` +
      `Make sure to grab your roles in <#${ROLES_CHANNEL}> to get started!\n\n` +
      `If you have any questions, feel free to ask the community.`
    )
    .setThumbnail(LOGO_URL)
    .setFooter({ text: 'Enjoy your stay!' });
}

function createGoodbyeEmbed(member) {
  return new EmbedBuilder()
    .setColor(0xff0000)
    .setTitle('Goodbye! 👋')
    .setDescription(`<@${member.id}> (${member.user.tag}) has left the server. We’ll miss you!`)
    .setThumbnail(LOGO_URL);
}

module.exports = (client) => {
  client.on('guildMemberAdd', async (member) => {
    try {
      const channel = member.guild.channels.cache.get(WELCOME_CHANNEL) || (await member.guild.channels.fetch(WELCOME_CHANNEL));
      if (!channel) {
        log.error(`Welcome channel not found: ${WELCOME_CHANNEL}`);
        return;
      }
      if (!channel.permissionsFor(client.user).has(['SendMessages', 'EmbedLinks'])) {
        log.error(`Missing SendMessages or EmbedLinks permissions in welcome channel ${WELCOME_CHANNEL}`);
        return;
      }
      await channel.send({ embeds: [createWelcomeEmbed(member)] });
      log.info(`Sent welcome message for ${member.user.tag} in channel ${WELCOME_CHANNEL}`);
    } catch (err) {
      log.error(`Error sending welcome message for ${member.user.tag}:`, err.message);
    }
  });

  client.on('guildMemberRemove', async (member) => {
    try {
      const channel = member.guild.channels.cache.get(WELCOME_CHANNEL) || (await member.guild.channels.fetch(WELCOME_CHANNEL));
      if (!channel) {
        log.error(`Welcome channel not found: ${WELCOME_CHANNEL}`);
        return;
      }
      if (!channel.permissionsFor(client.user).has(['SendMessages', 'EmbedLinks'])) {
        log.error(`Missing SendMessages or EmbedLinks permissions in welcome channel ${WELCOME_CHANNEL}`);
        return;
      }
      await channel.send({ embeds: [createGoodbyeEmbed(member)] });
      log.info(`Sent goodbye message for ${member.user.tag} in channel ${WELCOME_CHANNEL}`);
    } catch (err) {
      log.error(`Error sending goodbye message for ${member.user.tag}:`, err.message);
    }
  });
};


