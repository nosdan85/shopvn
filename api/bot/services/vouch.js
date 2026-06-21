const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { isSnowflake } = require('../utils/validation');
const { formatOrderItemsWithPrice } = require('../utils/format');
const Proof = require('../../models/Proof');

// Channel vouch cố định
const VOUCH_CHANNEL_ID = '1403791430396285089';

const sendAutoVouchFromTicketImages = async ({ order, imageUrls, guild }) => {
  if (!isSnowflake(VOUCH_CHANNEL_ID)) return false;

  const channel = guild.channels.cache.get(VOUCH_CHANNEL_ID);
  if (!channel || !channel.isTextBased()) return false;

  // Lấy tên Discord user
  let discordDisplayName = order.discordTenHienThi || '';
  if (!discordDisplayName && order.discordId) {
    try {
      const member = await guild.members.fetch(order.discordId).catch(() => null);
      if (member) {
        discordDisplayName = member.displayName || member.user?.username || '';
      }
    } catch {}
  }
  if (!discordDisplayName) {
    discordDisplayName = order.discordUsername || order.tenDangNhap || 'Unknown';
  }

  // Format items với VND
  const itemsText = (order.items || []).map(item => {
    const name = item.name || item.productName || 'Unknown Item';
    const qty = item.quantity || 1;
    const priceVnd = item.priceVnd || item.lineTotalVnd || (item.price || 0) * qty;
    return `• ${name} x${qty} — ${priceVnd.toLocaleString('vi-VN')} VND`;
  }).join('\n') || 'Không có thông tin';

  const totalVnd = order.totalVnd || order.totalAmount || 0;

  const embed = new EmbedBuilder()
    .setColor(0x00FF00)
    .setTitle('✅ Giao Hàng Thành Công')
    .setDescription(`Khách hàng: **${discordDisplayName}** (<@${order.discordId}>)`)
    .addFields([
      { name: 'Mã Đơn', value: String(order.orderId || '').toUpperCase(), inline: true },
      { name: 'Tổng Tiền', value: `${totalVnd.toLocaleString('vi-VN')} VND`, inline: true },
      { name: 'Sản Phẩm', value: itemsText, inline: false }
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
        discordUsername: discordDisplayName,
        robloxUsername: order.robloxUsername,
        totalAmount: totalVnd,
        items: Array.isArray(order.items) ? order.items.map(item => ({
          name: item.name || item.productName || 'Unknown Item',
          packQuantity: item.quantity || 1,
          deliveredLabel: `x${item.quantity || 1}`,
          lineTotal: item.lineTotalVnd || item.priceVnd || (item.price || 0) * (item.quantity || 1)
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
