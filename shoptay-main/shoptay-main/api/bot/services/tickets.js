const { EmbedBuilder } = require('discord.js');
const { createTicketChannel } = require('../utils/channels');
const { getOrderSequence, formatOrderItemsWithPrice } = require('../utils/format');
const { getPayPalPaymentEmail, getCashAppHandle, getLtcPayAddress } = require('../config');

const createOrderTicket = async (order, guild) => {
  const seq = getOrderSequence(order);
  const channelId = await createTicketChannel({
    channelName: `order_${seq}`,
    customerId: order.discordId,
    guild
  });

  const embed = new EmbedBuilder()
    .setColor(0xA7EFC0)
    .setTitle('Order Delivery')
    .setDescription(`Hello <@${order.discordId}>. Payment confirmed. Staff will deliver during selected time.`)
    .addFields([
      { name: 'Order ID', value: String(order.orderId || '').toUpperCase(), inline: false },
      { name: 'Buyer', value: `<@${order.discordId}>`, inline: true },
      { name: 'Total', value: `$${(order.totalAmount || 0).toFixed(2)}`, inline: true },
      { name: 'Items', value: formatOrderItemsWithPrice(order.items), inline: false }
    ]);

  const channel = guild.channels.cache.get(channelId);
  if (channel) {
    await channel.send({ content: `<@${order.discordId}>`, embeds: [embed] });
  }

  return channelId;
};

const createWalletDeliveryTicket = async (order, guild) => {
  const seq = getOrderSequence(order);
  const channelId = await createTicketChannel({
    channelName: `wallet_${seq}`,
    customerId: order.discordId,
    guild
  });

  const embed = new EmbedBuilder()
    .setColor(0xA7EFC0)
    .setTitle('Wallet Order Delivery')
    .setDescription(`Hello <@${order.discordId}>. Wallet payment complete. Staff will deliver your items.`)
    .addFields([
      { name: 'Order ID', value: String(order.orderId || '').toUpperCase(), inline: false },
      { name: 'Buyer', value: `<@${order.discordId}>`, inline: true },
      { name: 'Total', value: `$${(order.totalAmount || 0).toFixed(2)}`, inline: true },
      { name: 'Payment', value: 'NosMarket Wallet', inline: false },
      { name: 'Items', value: formatOrderItemsWithPrice(order.items), inline: false }
    ]);

  const channel = guild.channels.cache.get(channelId);
  if (channel) {
    await channel.send({ content: `<@${order.discordId}>`, embeds: [embed] });
  }

  return channelId;
};

const createPayPalFFTicket = async (order, paypalSeq, guild) => {
  const safeSeq = Number.isInteger(Number(paypalSeq)) ? Number(paypalSeq) : Date.now();
  const channelId = await createTicketChannel({
    channelName: `paypal_${safeSeq}`,
    customerId: order.discordId,
    guild
  });

  const embed = new EmbedBuilder()
    .setColor(0x8ED3FF)
    .setTitle('PayPal Payment')
    .setDescription(`Hello <@${order.discordId}>. Complete payment and send proof screenshot in this ticket.`)
    .addFields([
      { name: 'Amount', value: `$${(order.totalAmount || 0).toFixed(2)}`, inline: true },
      { name: 'PayPal Email', value: getPayPalPaymentEmail(), inline: true },
      { name: 'Note', value: `Order ${order.orderId}`, inline: false }
    ]);

  const channel = guild.channels.cache.get(channelId);
  if (channel) {
    await channel.send({ content: `<@${order.discordId}>`, embeds: [embed] });
  }

  return channelId;
};

const createLTCTicket = async (order, ltcSeq, guild) => {
  const safeSeq = Number.isInteger(Number(ltcSeq)) ? Number(ltcSeq) : Date.now();
  const channelId = await createTicketChannel({
    channelName: `ltc_${safeSeq}`,
    customerId: order.discordId,
    guild
  });

  const embed = new EmbedBuilder()
    .setColor(0xF5F7FA)
    .setTitle('LTC Payment')
    .setDescription(`Hello <@${order.discordId}>. Complete payment and send proof screenshot in this ticket.`)
    .addFields([
      { name: 'Amount', value: `$${(order.totalAmount || 0).toFixed(2)} equivalent LTC`, inline: false },
      { name: 'LTC Address', value: getLtcPayAddress(), inline: false }
    ]);

  const channel = guild.channels.cache.get(channelId);
  if (channel) {
    await channel.send({ content: `<@${order.discordId}>`, embeds: [embed] });
  }

  return channelId;
};

module.exports = {
  createOrderTicket,
  createWalletDeliveryTicket,
  createPayPalFFTicket,
  createLTCTicket
};
