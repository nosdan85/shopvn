const test = require('node:test');
const assert = require('node:assert/strict');

const { buildTicketOrderLookupQuery } = require('../utils/ticketOrderLookup');

test('ticket lookup prefers the stored Discord channel id', () => {
    assert.deepEqual(
        buildTicketOrderLookupQuery({ channelId: '123456789012345678', channelName: 'order_12' }),
        { channelId: '123456789012345678' }
    );
});

test('ticket lookup resolves generated order channel names when the channel id was not persisted', () => {
    const query = buildTicketOrderLookupQuery({ channelName: 'order_00123' });
    assert.equal(query.orderId.$regex, '(?:^|\\D)0*123$');
    assert.equal(query.orderId.$options, 'i');
});

test('ticket lookup preserves an explicit order id in the channel name', () => {
    assert.deepEqual(
        buildTicketOrderLookupQuery({ channelName: 'order_nm_123' }),
        { orderId: 'nm_123' }
    );
});
