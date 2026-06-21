const SNOWFLAKE_PATTERN = /^\d{16,22}$/;

const buildTicketOrderLookupQuery = ({ channelId, channelName } = {}) => {
    const cleanChannelId = String(channelId || '').trim();
    if (SNOWFLAKE_PATTERN.test(cleanChannelId)) {
        return { channelId: cleanChannelId };
    }

    const cleanName = String(channelName || '').trim().toLowerCase();
    const orderPart = cleanName.replace(/^order[_-]/, '');
    if (!orderPart) return null;

    if (/^[a-z]+[_-]\d+$/i.test(orderPart)) {
        return { orderId: orderPart };
    }

    const sequenceMatch = orderPart.match(/(\d+)$/);
    if (!sequenceMatch) return { orderId: orderPart };
    const sequence = String(Number(sequenceMatch[1]));
    if (!sequence || sequence === 'NaN') return { orderId: orderPart };

    return {
        orderId: {
            $regex: `(?:^|\\D)0*${sequence}$`,
            $options: 'i'
        }
    };
};

module.exports = { buildTicketOrderLookupQuery };
