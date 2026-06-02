const test = require('node:test');
const assert = require('node:assert/strict');

const { ACTIVE_TICKET_MESSAGE, buildActiveTicketQuery } = require('../utils/orderGuards');

test('ACTIVE_TICKET_MESSAGE is English and explicit', () => {
    assert.equal(
        ACTIVE_TICKET_MESSAGE,
        'You still have an open ticket that has not been paid or finalized yet.'
    );
});

test('buildActiveTicketQuery includes discord id and active channel conditions', () => {
    const query = buildActiveTicketQuery('1234567890');

    assert.equal(query.discordId, '1234567890');
    assert.deepEqual(query.status, { $nin: ['Completed', 'Cancelled'] });
    assert.deepEqual(query.paymentStatus, { $ne: 'cancelled' });
    assert.equal(Array.isArray(query.$or), true);
    assert.equal(query.$or.length, 3);
});

test('buildActiveTicketQuery excludes current order when provided', () => {
    const query = buildActiveTicketQuery('1234567890', 'ORDER-42');
    assert.deepEqual(query.orderId, { $ne: 'ORDER-42' });
});
