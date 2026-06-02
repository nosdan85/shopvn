const Order = require('../../models/Order');
const { getPayPalPaymentEmail, getCashAppHandle, getLtcPayAddress } = require('../config');
const { truncateText } = require('../utils/validation');
const { formatPayPalMemoForOrder, formatOrderItemNamesForNote } = require('../utils/format');

const handleInteraction = async (interaction) => {
  if (!interaction.isButton()) return;

  const customId = String(interaction.customId || '');
  const match = customId.match(/^copy_(paypal_email|paypal_item|cashapp_tag|cashapp_item|ltc_wallet)_(.+)$/);
  if (!match) return;

  const copyType = match[1];
  const orderId = match[2];

  try {
    const order = await Order.findOne({ orderId });
    if (!order) {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: 'Order not found.', ephemeral: true });
      }
      return;
    }

    const valueMap = {
      paypal_email: getPayPalPaymentEmail(),
      paypal_item: formatPayPalMemoForOrder(order),
      cashapp_tag: getCashAppHandle(),
      cashapp_item: formatOrderItemNamesForNote(order.items),
      ltc_wallet: getLtcPayAddress()
    };
    const labelMap = {
      paypal_email: 'PayPal Email',
      paypal_item: 'PayPal Note',
      cashapp_tag: 'CashApp Tag',
      cashapp_item: 'Item Name',
      ltc_wallet: 'LTC Address'
    };
    const rawValue = String(valueMap[copyType] || '').trim();
    const safeValue = truncateText(rawValue || '-', 300);
    const label = String(labelMap[copyType] || 'Value');

    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ ephemeral: true, content: `Copy ${label}:\n\`${safeValue}\`` });
    }
  } catch (error) {
    console.error('Button interaction error:', error?.message || error);
    if (!interaction.replied && !interaction.deferred) {
      try {
        await interaction.reply({ content: 'Failed to process payment selection.', ephemeral: true });
      } catch (replyError) {
        console.error('Button reply error:', replyError?.message || replyError);
      }
    }
  }
};

module.exports = { handleInteraction };
