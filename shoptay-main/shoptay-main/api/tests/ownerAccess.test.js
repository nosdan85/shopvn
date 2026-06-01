const test = require('node:test');
const assert = require('node:assert/strict');

const {
    isOwnerDiscordId,
    isOwnerOrAdminPayload
} = require('../utils/ownerAccess');

test('isOwnerDiscordId accepts configured owner ids', () => {
    const env = { DISCORD_OWNER_ID: '111', DISCORD_OWNER_IDS: '222, 333' };

    assert.equal(isOwnerDiscordId('111', env), true);
    assert.equal(isOwnerDiscordId('222', env), true);
    assert.equal(isOwnerDiscordId('333', env), true);
    assert.equal(isOwnerDiscordId('444', env), false);
});

test('isOwnerOrAdminPayload accepts admin role or configured owner discord id', () => {
    const env = { DISCORD_OWNER_ID: '111' };

    assert.equal(isOwnerOrAdminPayload({ role: 'admin' }, env), true);
    assert.equal(isOwnerOrAdminPayload({ discordId: '111', type: 'user' }, env), true);
    assert.equal(isOwnerOrAdminPayload({ discordId: '222', type: 'user' }, env), false);
});
