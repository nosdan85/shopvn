const asNumber = (value, fallback = 0) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
};

const asPackQuantity = (value) => Math.max(1, asNumber(value, 1));

const isPublicOrderAccessible = (order) => !String(order?.discordId || '').trim();

const buildOrderPaymentInfoPayload = (order, options = {}) => {
    const {
        publicView = false,
        normalizedTicketStatus = order?.ticketStatus || 'pending',
        normalizedPayPalTicketStatus = order?.paypalTicketStatus || 'pending',
        normalizedLtcTicketStatus = order?.ltcTicketStatus || 'pending',
        ticketRetryAfterMs = 0,
        paypalTicketRetryAfterMs = 0,
        ltcTicketRetryAfterMs = 0,
        ticketMode = 'bot',
        panelUrl = '',
        formatDateInTimezone = () => ''
    } = options;

    const payload = {
        orderId: order.orderId,
        customerEmail: order.customerEmail || '',
        subtotalAmount: asNumber(order.subtotalAmount || order.totalAmount),
        discountAmount: asNumber(order.discountAmount),
        discountPercent: asNumber(order.discountPercent),
        couponCode: order.couponCode || '',
        totalAmount: order.totalAmount,
        items: Array.isArray(order.items)
            ? order.items.map((item) => ({
                name: String(item?.name || ''),
                quantity: asNumber(item?.quantity, 1),
                packQuantity: asPackQuantity(item?.packQuantity),
                price: asNumber(item?.price)
            }))
            : [],
        status: order.status,
        paymentMethod: order.paymentMethod || 'paypal_ff',
        paymentStatus: order.paymentStatus || (order.status === 'Completed' ? 'paid' : 'pending'),
        memoExpected: order.memoExpected || String(order.orderId || ''),
        isPaid: order.status === 'Completed' || order.paymentStatus === 'paid',
        robloxUsername: order.robloxUsername || '',
        robloxVerifiedAt: order.robloxVerifiedAt || null,
        deliverySlotId: order.deliverySlotId || null,
        deliveryOwnerTimezone: order.deliveryOwnerTimezone || '',
        deliveryOwnerStartAt: order.deliveryOwnerStartAt || null,
        deliveryOwnerEndAt: order.deliveryOwnerEndAt || null,
        deliveryCustomerTimezone: order.deliveryCustomerTimezone || '',
        customerTimezone: order.deliveryCustomerTimezone || '',
        deliveryCustomerStartAt: order.deliveryCustomerStartAt || null,
        deliveryCustomerEndAt: order.deliveryCustomerEndAt || null,
        deliveryOwnerStartText: formatDateInTimezone(order.deliveryOwnerStartAt, order.deliveryOwnerTimezone),
        deliveryOwnerEndText: formatDateInTimezone(order.deliveryOwnerEndAt, order.deliveryOwnerTimezone),
        deliveryCustomerStartText: formatDateInTimezone(order.deliveryCustomerStartAt, order.deliveryCustomerTimezone),
        deliveryCustomerEndText: formatDateInTimezone(order.deliveryCustomerEndAt, order.deliveryCustomerTimezone),
        deliveredAt: order.deliveredAt || null,
        confirmationRequestedAt: order.confirmationRequestedAt || null,
        confirmedAt: order.confirmedAt || null,
        confirmationDiscountCode: order.confirmationDiscountCode || '',
        channelId: order.channelId || null,
        ticketStatus: normalizedTicketStatus,
        ticketError: order.ticketError || '',
        ticketRetryAfterMs,
        ticketRetryAfterSeconds: ticketRetryAfterMs > 0 ? Math.ceil(ticketRetryAfterMs / 1000) : 0,
        paypalTicketChannelId: order.paypalTicketChannelId || null,
        paypalTicketStatus: normalizedPayPalTicketStatus,
        paypalTicketError: order.paypalTicketError || '',
        paypalTicketRetryAfterMs,
        paypalTicketRetryAfterSeconds: paypalTicketRetryAfterMs > 0 ? Math.ceil(paypalTicketRetryAfterMs / 1000) : 0,
        ltcTicketChannelId: order.ltcTicketChannelId || null,
        ltcTicketStatus: normalizedLtcTicketStatus,
        ltcTicketError: order.ltcTicketError || '',
        ltcTicketRetryAfterMs,
        ltcTicketRetryAfterSeconds: ltcTicketRetryAfterMs > 0 ? Math.ceil(ltcTicketRetryAfterMs / 1000) : 0,
        ticketMode,
        panelUrl
    };

    if (!publicView) {
        payload.discordId = order.discordId || '';
        payload.discordUsername = order.discordUsername || '';
        payload.robloxUserId = order.robloxUserId || '';
    }

    return payload;
};

module.exports = {
    buildOrderPaymentInfoPayload,
    isPublicOrderAccessible
};
