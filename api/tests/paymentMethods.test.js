const test = require('node:test');
const assert = require('node:assert/strict');

const { buildCashAppPaymentInstructions } = require('../utils/paymentMethods');

test('buildCashAppPaymentInstructions returns Cash App tag and memo', () => {
    const instructions = buildCashAppPaymentInstructions(
        { orderId: 'nm_1', memoExpected: 'NOS-nm_1', paymentStatus: 'pending' },
        { cashAppHandle: '$shop' }
    );

    assert.deepEqual(instructions, {
        type: 'cashapp',
        cashAppTag: '$shop',
        cashtag: '$shop',
        memoExpected: 'NOS-nm_1',
        paymentStatus: 'pending'
    });
});
