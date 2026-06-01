const { getTicketCategoryId, getGuildId } = require('../config');
const { isSnowflake, truncateText } = require('./validation');
const { sanitizeChannelName } = require('./format');

const createTicketChannel = async ({ channelName, customerId, guild }) => {
  if (!guild) throw new Error('Guild not provided');
  if (!isSnowflake(customerId)) throw new Error('Invalid customer ID');

  const safeName = sanitizeChannelName(channelName);
  const ticketCategoryId = getTicketCategoryId();

  const channel = await guild.channels.create({
    name: safeName,
    type: 0, // GuildText
    parent: ticketCategoryId,
    permissionOverwrites: [
      {
        id: guild.id,
        deny: ['ViewChannel']
      },
      {
        id: customerId,
        allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory']
      },
      {
        id: getOwnerRoleId(),
        allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory', 'ManageChannels']
      }
    ]
  });

  return channel.id;
};

const closeTicketChannel = async ({ channel, guild }) => {
  if (!channel) return;
  try {
    await channel.delete();
  } catch (e) {
    console.error('Error closing channel:', e?.message || e);
  }
};

module.exports = { createTicketChannel, closeTicketChannel };
