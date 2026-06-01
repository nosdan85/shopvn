const test = require('node:test');
const assert = require('node:assert/strict');

const { buildDeliveryWindowFields } = require('../utils/ticketDeliveryFields');

test('payment ticket delivery fields include admin and customer windows without Vietnam-time wording', () => {
    const fields = buildDeliveryWindowFields({
        deliveryOwnerTimezone: 'Asia/Ho_Chi_Minh',
        deliveryOwnerStartAt: '2026-05-27T08:00:00.000Z',
        deliveryOwnerEndAt: '2026-05-27T09:00:00.000Z',
        deliveryCustomerTimezone: 'America/Los_Angeles',
        deliveryCustomerStartAt: '2026-05-27T01:00:00.000Z',
        deliveryCustomerEndAt: '2026-05-27T02:00:00.000Z'
    });

    assert.deepEqual(fields.map((field) => field.name), [
        'Admin delivery time',
        'Customer delivery time'
    ]);

    const text = fields.map((field) => `${field.name}: ${field.value}`).join('\n');
    assert.match(text, /May/);
    assert.doesNotMatch(text, /Vietnam|Viet Nam|Giờ VN|giờ Việt Nam/i);
});
