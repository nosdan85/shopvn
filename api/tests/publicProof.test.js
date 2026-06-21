const test = require('node:test');
const assert = require('node:assert/strict');

const { mergeProofItemsForUpdate, toPublicProof } = require('../utils/publicProof');
const Proof = require('../models/Proof');
const { buildDiscordVouchContent, resolveVouchChannelId } = require('../utils/vouchContent');

test('proof records persist the purchased order quantity', () => {
    const quantityPath = Proof.schema.path('items').schema.path('quantity');
    assert.ok(quantityPath);
    assert.equal(quantityPath.instance, 'Number');
});

test('public proof exposes images, product names and quantities without buyer identity or prices', () => {
    const result = toPublicProof({
        _id: 'proof-1',
        discordId: '1146730730060271736',
        discordUsername: 'private-buyer',
        robloxUsername: 'private-roblox',
        totalAmount: 250000,
        items: [{
            name: 'Dragon Fruit',
            packQuantity: 2,
            quantity: 3,
            deliveredLabel: 'x6',
            lineTotal: 250000
        }],
        imageUrls: ['https://cdn.example/proof.png']
    }, { imageUrlForIndex: (index) => `/proof-images/${index}` });

    assert.deepEqual(result, {
        id: 'proof-1',
        items: [{
            name: 'Dragon Fruit',
            packQuantity: 2,
            quantity: 3,
            deliveredLabel: 'x6'
        }],
        imageUrls: ['/proof-images/0']
    });
    assert.equal(JSON.stringify(result).includes('private-buyer'), false);
    assert.equal(JSON.stringify(result).includes('250000'), false);
});

test('Discord vouch includes buyer display name, mention, product and purchased quantity without price', () => {
    const content = buildDiscordVouchContent({
        discordId: '1146730730060271736',
        discordTenHienThi: 'Admin Name',
        items: [{ name: 'Dragon Fruit', packQuantity: 2, quantity: 3, lineTotalVnd: 250000 }]
    });

    assert.match(content, /Admin Name/);
    assert.match(content, /<@1146730730060271736>/);
    assert.match(content, /DRAGON FRUIT/);
    assert.match(content, /x6/i);
    assert.doesNotMatch(content, /250000|VND|\$/i);
});

test('vouch channel uses configured id and falls back to the website review channel', () => {
    assert.equal(resolveVouchChannelId('1555555555555555555'), '1555555555555555555');
    assert.equal(resolveVouchChannelId(''), '1403791430396285089');
});

test('editing a public proof name preserves its private stored price', () => {
    assert.deepEqual(
        mergeProofItemsForUpdate(
            [{ name: 'Renamed Item', packQuantity: 2, quantity: 3, deliveredLabel: 'x6' }],
            [{ name: 'Old Item', packQuantity: 2, quantity: 3, deliveredLabel: 'x6', lineTotal: 250000 }]
        ),
        [{ name: 'Renamed Item', packQuantity: 2, quantity: 3, deliveredLabel: 'x6', lineTotal: 250000 }]
    );
});
