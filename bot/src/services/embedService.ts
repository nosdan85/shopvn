import { EmbedBuilder, ColorResolvable } from 'discord.js';

export interface OrderData {
  buyerName: string;
  buyerId: string;
  orderTotal: string;
  items: string[];
  orderId: string;
}

export interface TopupData {
  userId: string;
  amount: string;
  currency: string;
  topupId: string;
}

export function createPaymentTicketEmbed(order: OrderData, method: 'paypal' | 'ltc' | 'cashapp'): EmbedBuilder {
  const colors: Record<string, ColorResolvable> = {
    paypal: 0x8ED3FF,
    ltc: 0xF5F7FA,
    cashapp: 0x00D632
  };

  return new EmbedBuilder()
    .setColor(colors[method] ?? 0x5865F2)
    .setTitle(`Payment Required - Order #${order.orderId}`)
    .setDescription(`Please complete your payment using ${method.toUpperCase()} details below.`)
    .addFields(
      { name: 'Customer', value: `<@${order.buyerId}> (${order.buyerName})`, inline: true },
      { name: 'Total', value: order.orderTotal, inline: true },
      { name: 'Items', value: order.items.join('\n'), inline: false }
    )
    .setTimestamp()
    .setFooter({ text: 'NosMarket - Complete payment to proceed' });
}

export function createDeliveryEmbed(order: OrderData): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(0xA7EFC0 as ColorResolvable)
    .setTitle(`Ready for Delivery - Order #${order.orderId}`)
    .setDescription('Your order has been confirmed and is ready for delivery.')
    .addFields(
      { name: 'Customer', value: `<@${order.buyerId}>`, inline: true },
      { name: 'Total', value: order.orderTotal, inline: true },
      { name: 'Items', value: order.items.join('\n'), inline: false }
    )
    .setTimestamp()
    .setFooter({ text: 'NosMarket - Delivery in progress' });
}

export function createWalletTopupEmbed(topup: TopupData): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(0xF7C948 as ColorResolvable)
    .setTitle(`Wallet Topup - #${topup.topupId}`)
    .setDescription(`Wallet top-up request for ${topup.amount} ${topup.currency}`)
    .addFields(
      { name: 'User', value: `<@${topup.userId}>`, inline: true },
      { name: 'Amount', value: `${topup.amount} ${topup.currency}`, inline: true }
    )
    .setTimestamp()
    .setFooter({ text: 'NosMarket - Pending payment' });
}

export function createVouchEmbed(order: OrderData): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(0x57F287 as ColorResolvable)
    .setTitle(`Vouch - Order #${order.orderId}`)
    .setDescription('Thank you for your purchase! Please consider leaving a vouch.')
    .addFields(
      { name: 'Customer', value: `<@${order.buyerId}>`, inline: true },
      { name: 'Total', value: order.orderTotal, inline: true },
      { name: 'Items', value: order.items.join(', '), inline: false }
    )
    .setTimestamp()
    .setFooter({ text: 'NosMarket - Thank you for your business!' });
}

export function createErrorEmbed(message: string): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(0xED4245 as ColorResolvable)
    .setTitle('Error')
    .setDescription(message)
    .setTimestamp()
    .setFooter({ text: 'NosMarket Bot' });
}

export function createSuccessEmbed(message: string): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(0x57F287 as ColorResolvable)
    .setTitle('Success')
    .setDescription(message)
    .setTimestamp()
    .setFooter({ text: 'NosMarket Bot' });
}

export function createInfoEmbed(title: string, message: string): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(0x5865F2 as ColorResolvable)
    .setTitle(title)
    .setDescription(message)
    .setTimestamp()
    .setFooter({ text: 'NosMarket Bot' });
}
