const test = require('node:test');
const assert = require('node:assert/strict');

const {
    formatCompactUnits,
    formatDeliveredUnitsLabel,
    formatPurchasedUnitsLabel,
    getDeliveredUnits
} = require('../utils/itemQuantityDisplay');

test('formatCompactUnits shortens exact thousands', () => {
    assert.equal(formatCompactUnits(1000), '1k');
    assert.equal(formatCompactUnits(5000), '5k');
    assert.equal(formatCompactUnits(1500), '1500');
});

test('getDeliveredUnits multiplies mapped base units by pack quantity', () => {
    assert.equal(getDeliveredUnits('Aura Crate', 2), 100);
    assert.equal(getDeliveredUnits('Trait Reroll', 2), 1000000);
});

test('formatDeliveredUnitsLabel returns x-prefixed quantity text', () => {
    assert.equal(formatDeliveredUnitsLabel('Aura Crate', 2), 'x100');
    assert.equal(formatDeliveredUnitsLabel('Trait Reroll', 2), 'x1000k');
});

test('formatPurchasedUnitsLabel multiplies product pack quantity by order quantity', () => {
    assert.equal(formatPurchasedUnitsLabel({ name: 'Aura Crate', packQuantity: 50, quantity: 2 }), 'x100');
    assert.equal(formatPurchasedUnitsLabel({ name: 'Trait Reroll', packQuantity: 500000, quantity: 2 }), 'x1000k');
});
