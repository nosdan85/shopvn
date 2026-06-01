const ACTIVE_TICKET_MESSAGE = 'You still have an open ticket that has not been paid or finalized yet.';

const hasValue = (field) => ({
    [field]: { $exists: true, $nin: [null, ''] }
});

const buildActiveTicketQuery = (discordId, excludeOrderId = '') => {
    const query = {
        discordId: String(discordId || '').trim(),
        status: { $nin: ['Completed', 'Cancelled'] },
        paymentStatus: { $ne: 'cancelled' },
        $or: [
            hasValue('channelId'),
            hasValue('paypalTicketChannelId'),
            hasValue('ltcTicketChannelId')
        ]
    };

    const cleanExclude = String(excludeOrderId || '').trim();
    if (cleanExclude) query.orderId = { $ne: cleanExclude };
    return query;
};

module.exports = {
    ACTIVE_TICKET_MESSAGE,
    buildActiveTicketQuery
};
