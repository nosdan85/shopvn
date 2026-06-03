const test = require('node:test');
const assert = require('node:assert/strict');

const {
    resolveDiscordRedirectUri
} = require('../utils/discordOauth');

test('resolveDiscordRedirectUri prefers the request redirect uri so token exchange matches authorize step', () => {
    assert.equal(
        resolveDiscordRedirectUri({
            requestRedirectUri: 'https://nosroblox.com/auth/discord/callback',
            configuredRedirectUri: 'https://nosroblox.com/auth/callback'
        }),
        'https://nosroblox.com/auth/discord/callback'
    );
});

test('resolveDiscordRedirectUri falls back to configured env when request redirect uri is missing', () => {
    assert.equal(
        resolveDiscordRedirectUri({
            requestRedirectUri: '',
            configuredRedirectUri: 'https://nosroblox.com/auth/discord/callback'
        }),
        'https://nosroblox.com/auth/discord/callback'
    );
});

test('resolveDiscordRedirectUri trims whitespace from both request and configured values', () => {
    assert.equal(
        resolveDiscordRedirectUri({
            requestRedirectUri: '  https://nosroblox.com/lien-ket-discord/callback  ',
            configuredRedirectUri: '  https://nosroblox.com/auth/discord/callback  '
        }),
        'https://nosroblox.com/lien-ket-discord/callback'
    );
});
