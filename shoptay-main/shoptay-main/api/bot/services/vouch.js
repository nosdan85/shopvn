const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { getVouchChannelId } = require('../config');
const { isSnowflake } = require('../utils/validation');
const { formatOrderItemsWithPrice } = require('../utils/format');

const sendAutoVouchFromTicketImages = async ({ order, imageUrls, guild }) => {
  const vouchChannelId = getVouchChannelId();
  if (!isSnowflake(vouchChannelId)) return false;

  const channel = guild.channels.cache.get(vouchChannelId);
  if (!channel || !channel.isTextBased()) return false;

  const embed = new EmbedBuilder()
    .setColor(0x00FF00)
    .setTitle('? Delivery Proof')
    .setDescription(`Order delivered to <@${order.discordId}>`)
    .addFields([
      { name: 'Order ID', value: String(order.orderId || '').toUpperCase(), inline: true },
      { name: 'Total', value: `$${(order.totalAmount || 0).toFixed(2)}`, inline: true },
      { name: 'Items', value: formatOrderItemsWithPrice(order.items), inline: false }
    ])
    .setTimestamp();

  try {
    await channel.send({ embeds: [embed] });
    
    // Send images separately
    for (const url of imageUrls.slice(0, 10)) {
      try {
        await channel.send({ content: url });
      } catch (e) {
        console.error('Failed to send vouch image:', e?.message);
      }
    }
    
    return true;
  } catch (error) {
    console.error('Failed to send vouch:', error?.message || error);
    return false;
  }
};

module.exports = { sendAutoVouchFromTicketImages };
