const Order = require('../../models/Order');
const User = require('../../models/User');
const { 
  CLOSE_COMMANDS, DONE_COMMANDS, CONFIRM_COMMANDS, READD_ALL_COMMANDS,
  IMAGE_EXTENSIONS, getClientBaseUrl
} = require('../config');
const { isSnowflake, truncateText, sleep } = require('../utils/validation');
const { sendAutoVouchFromTicketImages } = require('../services/vouch');
const { formatOrderItemsWithPrice } = require('../utils/format');
const { isStaffUser } = require('../utils/permissions');

const isImageAttachment = (attachment) => {
  if (!attachment) return false;
  const contentType = String(attachment.contentType || '').toLowerCase();
  if (contentType.startsWith('image/')) return true;
  const fileName = String(attachment.name || attachment.filename || '').toLowerCase();
  return IMAGE_EXTENSIONS.some((ext) => fileName.endsWith(ext));
};

const getImageAttachments = (message) => {
  if (!message?.attachments || typeof message.attachments.values !== 'function') return [];
  const imageAttachments = [];
  for (const attachment of message.attachments.values()) {
    if (isImageAttachment(attachment)) imageAttachments.push(attachment);
  }
  return imageAttachments;
};

const findOrderByTicketChannel = async (message) => {
  const channelId = String(message?.channelId || '').trim();
  if (!isSnowflake(channelId)) return null;
  return Order.findOne({ $or: [{ channelId }, { paypalTicketChannelId: channelId }, { ltcTicketChannelId: channelId }] })
    .sort({ createdAt: -1 });
};

const handleMessage = async (message, client) => {
  if (!message || message.author?.bot) return;
  if (!message.guildId) return;

  const channelId = String(message.channelId || '').trim();
  if (!isSnowflake(channelId)) return;

  const normalizedContent = String(message.content || '').trim().toLowerCase();
  const isCloseCommand = CLOSE_COMMANDS.has(normalizedContent);
  const isDoneCommand = DONE_COMMANDS.has(normalizedContent);
  const isConfirmCommand = CONFIRM_COMMANDS.has(normalizedContent);
  const isReAddAllCommand = READD_ALL_COMMANDS.has(normalizedContent);
  const imageAttachments = getImageAttachments(message);

  if (!isCloseCommand && !isDoneCommand && !isConfirmCommand && !isReAddAllCommand && imageAttachments.length === 0) return;

  const guild = message.guild;
  const canStaff = await isStaffUser(message.author.id, guild);

  if (isReAddAllCommand) {
    if (!canStaff) {
      await message.reply('You do not have permission to run this command.');
      return;
    }
    await message.reply('Add-all command processing... (Full restore logic in api/bot.js)');
    return;
  }

  let order = null;
  try {
    order = await findOrderByTicketChannel(message);
  } catch (error) {
    console.error('Ticket channel order lookup failed:', error?.message || error);
    return;
  }

  if (isCloseCommand) {
    try {
      if (order) {
        await Order.updateOne({ _id: order._id }, { $set: { status: 'Completed', paymentStatus: 'paid', paymentMethod: order.paymentMethod || 'manual', paidAt: new Date() } });
      }
      await message.reply('Closing ticket in 3 seconds...');
      await sleep(3000);
      await message.channel.delete().catch(() => {});
      return;
    } catch (error) {
      console.error('Close ticket command error:', error?.message || error);
      await message.reply('Failed to close ticket. Please try again.').catch(() => {});
      return;
    }
  }

  if (isDoneCommand) {
    try {
      if (!order) {
        await message.reply('Could not find order for this ticket channel.');
        return;
      }
      await Order.updateOne({ _id: order._id }, { $set: { status: 'Completed', paymentStatus: 'paid', paymentMethod: order.paymentMethod || 'manual', paidAt: new Date() } });
      await message.reply('Order marked as completed. Closing ticket in 3 seconds...');
      await sleep(3000);
      await message.channel.delete().catch(() => {});
      return;
    } catch (error) {
      console.error('Done ticket command error:', error?.message || error);
      await message.reply('Failed to complete this order ticket. Please try again.').catch(() => {});
      return;
    }
  }

  if (isConfirmCommand) {
    try {
      if (!order) {
        await message.reply('Could not find order for this ticket channel.');
        return;
      }
      if (!canStaff) {
        await message.reply('You do not have permission to request customer confirmation.');
        return;
      }
      order.deliveredAt = order.deliveredAt || new Date();
      order.confirmationRequestedAt = new Date();
      order.confirmationRequestedBy = String(message.author.id || '');
      await order.save();
      const confirmUrl = `${getClientBaseUrl().replace(/\/+$/, '')}/pay?orderId=${encodeURIComponent(order.orderId)}&confirm=1`;
      await message.reply(`<@${order.discordId}> Your order has been marked as delivered. Please return to the website and press the confirm button only if you have received your items:\n${confirmUrl}`);
      return;
    } catch (error) {
      console.error('Confirm ticket command error:', error?.message || error);
      await message.reply('Failed to request customer confirmation. Please try again.').catch(() => {});
      return;
    }
  }

  if (!order) return;
  if (imageAttachments.length === 0) return;

  try {
    if (!canStaff) return;

    const imageUrls = imageAttachments
      .map((attachment) => String(attachment?.url || attachment?.proxyURL || '').trim())
      .filter(Boolean);

    if (imageUrls.length === 0) return;

    const sent = await sendAutoVouchFromTicketImages({ order, imageUrls, guild });
    if (sent) {
      const imageCountText = imageUrls.length > 1 ? ` (${imageUrls.length} images)` : '';
      await message.reply(`Vouch posted successfully${imageCountText}.`);
    }
  } catch (error) {
    console.error('Auto vouch send error:', error?.message || error);
    try {
      await message.reply('Could not post vouch. Check DISCORD_VOUCH_CHANNEL_ID and bot permissions.');
    } catch {}
  }
};

module.exports = { handleMessage };
