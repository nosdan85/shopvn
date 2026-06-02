const test = require('node:test');
const assert = require('node:assert/strict');

const { bitmapOffsetFromHash } = require('../cache/redis');

test('bitmapOffsetFromHash maps large hashes into a bounded Redis bitmap offset', () => {
    const offset = bitmapOffsetFromHash('ffffffffffffffffffffffffffffffff', 1024);

    assert.equal(Number.isInteger(offset), true);
    assert.equal(offset >= 0, true);
    assert.equal(offset < 1024, true);
});

test('bitmapOffsetFromHash is deterministic for the same hash and bitmap size', () => {
    const hash = '2b9f7e7a9a36c2d4f0a1';

    assert.equal(bitmapOffsetFromHash(hash, 1 << 20), bitmapOffsetFromHash(hash, 1 << 20));
});

test('bot add-all restore path uses Redis bitmap helpers for large duplicate sets', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const source = fs.readFileSync(path.join(__dirname, '..', 'bot.js'), 'utf8');

    assert.match(source, /bot:addall/);
    assert.match(source, /bitmapCheckAndSet/);
    assert.match(source, /REDIS_BOT_ADDALL_BITMAP_SIZE/);
});
