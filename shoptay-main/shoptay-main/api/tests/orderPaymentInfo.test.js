const test = require('node:test');
const assert = require('node:assert/strict');

const { buildOrderPaymentInfoPayload, isPublicOrderAccessible } = require('../utils/orderPaymentInfo');

test('buildOrderPaymentInfoPayload returns order roblox username without proof dependency', () => {
    const payload = buildOrderPaymentInfoPayload({
        orderId: 'nm_1',
        totalAmount: 12.5,
        status: 'Waiting Payment',
        paymentStatus: 'pending',
        robloxUsername: 'BuilderMan',
        items: [{ name: 'Item', quantity: 2, packQuantity: 5, price: 1.25 }]
    });

    assert.equal(payload.robloxUsername, 'BuilderMan');
    assert.equal(payload.totalAmount, 12.5);
    assert.deepEqual(payload.items, [{ name: 'Item', quantity: 2, packQuantity: 5, price: 1.25 }]);
});

test('buildOrderPaymentInfoPayload can hide private fields for public callers', () => {
    const payload = buildOrderPaymentInfoPayload({
        orderId: 'nm_1',
        discordId: 'secret-discord-id',
        discordUsername: 'secret-discord-name',
        robloxUserId: 'secret-roblox-id',
        totalAmount: 12.5,
        status: 'Waiting Payment',
        paymentStatus: 'pending'
    }, { publicView: true });

    assert.equal(payload.discordId, undefined);
    assert.equal(payload.discordUsername, undefined);
    assert.equal(payload.robloxUserId, undefined);
});

test('isPublicOrderAccessible rejects orders tied to a Discord account', () => {
    assert.equal(isPublicOrderAccessible({ orderId: 'nm_1', discordId: '123' }), false);
    assert.equal(isPublicOrderAccessible({ orderId: 'nm_2', discordId: '' }), true);
});
