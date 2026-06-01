import { SlashCommandBuilder, ChatInputCommandInteraction, ChannelType, PermissionFlagsBits } from 'discord.js';
import { createPaymentTicketEmbed, OrderData } from '../services/embedService';

export const data = new SlashCommandBuilder()
  .setName('ticket')
  .setDescription('Create a payment ticket for an order')
  .addStringOption(option =>
    option.setName('order_id').setDescription('Order ID').setRequired(true)
  )
  .addStringOption(option =>
    option.setName('buyer_name').setDescription('Buyer name').setRequired(true)
  )
  .addStringOption(option =>
    option.setName('total').setDescription('Order total').setRequired(true)
  )
  .addStringOption(option =>
    option.setName('items').setDescription('Items (comma-separated)').setRequired(true)
  )
  .addStringOption(option =>
    option.setName('method').setDescription('Payment method').setRequired(true)
    .addChoices(
      { name: 'PayPal', value: 'paypal' },
      { name: 'Litecoin', value: 'ltc' },
      { name: 'CashApp', value: 'cashapp' }
    )
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  try {
    const orderId = interaction.options.getString('order_id', true);
    const buyerName = interaction.options.getString('buyer_name', true);
    const total = interaction.options.getString('total', true);
    const itemsStr = interaction.options.getString('items', true);
    const method = interaction.options.getString('method', true) as 'paypal' | 'ltc' | 'cashapp';

    const items: string[] = itemsStr.split(',').map((item: string) => item.trim());
    const ownerRoleId = process.env.OWNER_ROLE_ID;
    const ticketCategoryId = process.env.TICKET_CATEGORY_ID;

    if (!ownerRoleId || !ticketCategoryId) {
      await interaction.reply({ content: 'Bot configuration incomplete.', ephemeral: true });
      return;
    }

    const guild = interaction.guild;
    if (!guild) return;

    const channelName = `ticket-${orderId.toLowerCase()}`;
    const channel = await guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      parent: ticketCategoryId,
      permissionOverwrites: [
        {
          id: guild.id,
          deny: [PermissionFlagsBits.ViewChannel]
        },
        {
          id: interaction.user.id,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
        },
        {
          id: ownerRoleId,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageChannels]
        }
      ]
    });

    const orderData: OrderData = {
      buyerName,
      buyerId: interaction.user.id,
      orderTotal: total,
      items,
      orderId
    };

    const embed = createPaymentTicketEmbed(orderData, method);
    await channel.send({ embeds: [embed] });

    await interaction.reply({
      content: `Ticket created: <#${channel.id}>`,
      ephemeral: true
    });
  } catch (error) {
    console.error('Ticket command error:', error);
    await interaction.reply({
      content: 'Failed to create ticket.',
      ephemeral: true
    });
  }
}
