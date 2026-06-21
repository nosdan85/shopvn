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
    .setTitle('Giao Hàng Đơn Hàng')
    .setDescription(`Xin chào <@${order.discordId}>. Đã xác nhận thanh toán. Nhân viên sẽ giao hàng cho bạn trong thời gian sớm nhất.`)
    .addFields([
      { name: 'Mã Đơn', value: String(order.orderId || '').toUpperCase(), inline: false },
      { name: 'Người Mua', value: `<@${order.discordId}>`, inline: true },
      { name: 'Tổng Tiền', value: `${(order.totalAmount || 0).toLocaleString('vi-VN')} VND`, inline: true },
      { name: 'Sản Phẩm', value: formatOrderItemsWithPrice(order.items), inline: false }
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
    .setTitle('Giao Hàng Bằng Số Dư')
    .setDescription(`Xin chào <@${order.discordId}>. Thanh toán bằng ví NosMarket thành công. Nhân viên sẽ tiến hành giao hàng.`)
    .addFields([
      { name: 'Mã Đơn', value: String(order.orderId || '').toUpperCase(), inline: false },
      { name: 'Người Mua', value: `<@${order.discordId}>`, inline: true },
      { name: 'Tổng Tiền', value: `${(order.totalAmount || 0).toLocaleString('vi-VN')} VND`, inline: true },
      { name: 'Thanh Toán', value: 'Ví NosMarket', inline: false },
      { name: 'Sản Phẩm', value: formatOrderItemsWithPrice(order.items), inline: false }
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
    .setTitle('Thanh Toán PayPal')
    .setDescription(`Xin chào <@${order.discordId}>. Vui lòng hoàn tất thanh toán và gửi ảnh chụp màn hình bill vào ticket này.`)
    .addFields([
      { name: 'Số Tiền', value: `${(order.totalAmount || 0).toLocaleString('vi-VN')} VND`, inline: true },
      { name: 'Email PayPal', value: getPayPalPaymentEmail(), inline: true },
      { name: 'Ghi Chú', value: `Order ${order.orderId}`, inline: false }
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
    .setTitle('Thanh Toán LTC')
    .setDescription(`Xin chào <@${order.discordId}>. Vui lòng hoàn tất thanh toán và gửi ảnh chụp màn hình bill vào ticket này.`)
    .addFields([
      { name: 'Số Tiền', value: `${(order.totalAmount || 0).toLocaleString('vi-VN')} VND (chuyển đổi sang LTC)`, inline: false },
      { name: 'Địa Chỉ LTC', value: getLtcPayAddress(), inline: false }
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
