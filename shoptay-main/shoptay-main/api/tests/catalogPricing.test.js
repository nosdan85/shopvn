const test = require('node:test');
const assert = require('node:assert/strict');

const {
    applyPriceOverridesForClient,
    getEffectiveProductPrice
} = require('../utils/catalogPricing');

test('getEffectiveProductPrice preserves sub-dollar prices', () => {
    assert.equal(getEffectiveProductPrice({ name: 'Small item', category: 'items', price: 0.99 }), 0.99);
});

test('applyPriceOverridesForClient does not round sub-dollar prices up to one dollar', () => {
    const product = { name: 'Small item', category: 'items', price: 0.99, bulkPrice: 0.75 };

    assert.deepEqual(applyPriceOverridesForClient(product), product);
});
