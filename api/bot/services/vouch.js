const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { getVouchChannelId } = require('../config');
const { isSnowflake } = require('../utils/validation');
const { formatOrderItemsWithPrice } = require('../utils/format');
const Proof = require('../../models/Proof');

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
    const mainMsg = await channel.send({ embeds: [embed] });
    const sentMessageIds = [mainMsg.id];
    
    // Send images separately
    for (const url of imageUrls.slice(0, 10)) {
      try {
        const imgMsg = await channel.send({ content: url });
        sentMessageIds.push(imgMsg.id);
      } catch (e) {
        console.error('Failed to send vouch image:', e?.message);
      }
    }
    
    // Create DB Proof for web view
    try {
      await Proof.create({
        orderId: order.orderId,
        discordId: order.discordId,
        discordUsername: order.discordUsername,
        robloxUsername: order.robloxUsername,
        totalAmount: order.totalAmount,
        items: Array.isArray(order.items) ? order.items.map(item => ({
          name: item.name || item.productName || 'Unknown Item',
          packQuantity: item.quantity || 1,
          deliveredLabel: `x${item.quantity || 1}`,
          lineTotal: (item.price || 0) * (item.quantity || 1)
        })) : [],
        imageUrls: imageUrls.slice(0, 10),
        vouchMessageIds: sentMessageIds,
        source: 'auto_vouch'
      });
      console.log(`Saved proof for order ${order.orderId} to web database`);
    } catch (dbErr) {
      console.error('Failed to save proof to web DB:', dbErr?.message);
    }
    
    return true;
  } catch (error) {
    console.error('Failed to send vouch:', error?.message || error);
    return false;
  }
};

module.exports = { sendAutoVouchFromTicketImages };
