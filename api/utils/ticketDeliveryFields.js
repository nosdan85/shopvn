const formatDateInTimezone = (value, timezone = 'UTC') => {
    if (!value) return '-';
    try {
        return new Intl.DateTimeFormat('en-US', {
            timeZone: String(timezone || 'UTC'),
            dateStyle: 'medium',
            timeStyle: 'short'
        }).format(new Date(value));
    } catch {
        return new Date(value).toISOString();
    }
};

const hasDeliveryWindow = (startAt, endAt) => Boolean(startAt && endAt);

const formatDeliveryWindow = (startAt, endAt, timezone) => {
    if (!hasDeliveryWindow(startAt, endAt)) return '';
    return `${formatDateInTimezone(startAt, timezone)} - ${formatDateInTimezone(endAt, timezone)}`;
};

const buildDeliveryWindowFields = (order = {}) => {
    const fields = [];

    const ownerWindow = formatDeliveryWindow(
        order.deliveryOwnerStartAt,
        order.deliveryOwnerEndAt,
        order.deliveryOwnerTimezone
    );
    const customerWindow = formatDeliveryWindow(
        order.deliveryCustomerStartAt,
        order.deliveryCustomerEndAt,
        order.deliveryCustomerTimezone
    );

    if (ownerWindow) {
        fields.push({
            name: 'Admin delivery time',
            value: ownerWindow,
            inline: false
        });
    }

    if (customerWindow) {
        fields.push({
            name: 'Customer delivery time',
            value: customerWindow,
            inline: false
        });
    }

    return fields;
};

module.exports = {
    buildDeliveryWindowFields,
    formatDateInTimezone,
    formatDeliveryWindow
};
