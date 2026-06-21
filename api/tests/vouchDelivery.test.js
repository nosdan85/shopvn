const test = require('node:test');
const assert = require('node:assert/strict');

const {
    getVouchCommandValidationError,
    sendVouchBatchWithFallback
} = require('../utils/vouchDelivery');

test('vouch command reports when the current ticket is not mapped to an order', () => {
    assert.equal(
        getVouchCommandValidationError({
            content: '!',
            imageCount: 1,
            authorized: true,
            hasOrder: false
        }),
        'Khong tim thay don hang gan voi ticket nay.'
    );
});

test('vouch delivery falls back to Discord image URLs when file upload is rejected', async () => {
    const payloads = [];
    let callCount = 0;
    const channel = {
        async send(payload) {
            payloads.push(payload);
            callCount += 1;
            if (callCount === 1) {
                const error = new Error('Missing Permissions');
                error.code = 50013;
                throw error;
            }
            return { id: String(100000000000000000n + BigInt(callCount)), attachments: new Map() };
        }
    };

    const result = await sendVouchBatchWithFallback({
        channel,
        headerContent: 'Buyer\nITEM (X2)',
        files: [{ name: 'proof.png' }],
        sourceUrls: ['https://cdn.discordapp.com/attachments/proof.png']
    });

    assert.equal(result.usedFallback, true);
    assert.deepEqual(result.imageUrls, ['https://cdn.discordapp.com/attachments/proof.png']);
    assert.deepEqual(payloads, [
        { content: 'Buyer\nITEM (X2)', files: [{ name: 'proof.png' }] },
        { content: 'Buyer\nITEM (X2)' },
        { content: 'https://cdn.discordapp.com/attachments/proof.png' }
    ]);
});

test('vouch delivery sends source URLs when image download produced no upload files', async () => {
    const payloads = [];
    const channel = {
        async send(payload) {
            payloads.push(payload);
            return { id: String(200000000000000000n + BigInt(payloads.length)), attachments: new Map() };
        }
    };

    const result = await sendVouchBatchWithFallback({
        channel,
        headerContent: 'Buyer\nITEM (X2)',
        files: [],
        sourceUrls: ['https://cdn.discordapp.com/attachments/original.png']
    });

    assert.equal(result.usedFallback, true);
    assert.deepEqual(payloads, [
        { content: 'Buyer\nITEM (X2)' },
        { content: 'https://cdn.discordapp.com/attachments/original.png' }
    ]);
});
