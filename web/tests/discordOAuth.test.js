/* eslint-disable @typescript-eslint/no-require-imports */
const test = require('node:test');
const assert = require('node:assert/strict');

const {
  getDiscordAuthRedirectUri,
  getDiscordLinkRedirectUri,
} = require('../lib/discordOAuth');

test('getDiscordAuthRedirectUri uses explicit env value when provided', () => {
  assert.equal(
    getDiscordAuthRedirectUri({
      envRedirectUri: 'https://nosroblox.com/auth/discord/callback',
      origin: 'https://ignored.example.com',
    }),
    'https://nosroblox.com/auth/discord/callback',
  );
});

test('getDiscordAuthRedirectUri falls back to the auth/discord callback path', () => {
  assert.equal(
    getDiscordAuthRedirectUri({
      envRedirectUri: '',
      origin: 'https://nosroblox.com',
    }),
    'https://nosroblox.com/auth/discord/callback',
  );
});

test('getDiscordLinkRedirectUri uses its dedicated env override when provided', () => {
  assert.equal(
    getDiscordLinkRedirectUri({
      envRedirectUri: 'https://nosroblox.com/lien-ket-discord/callback',
      origin: 'https://ignored.example.com',
    }),
    'https://nosroblox.com/lien-ket-discord/callback',
  );
});

test('getDiscordLinkRedirectUri falls back to the link callback path', () => {
  assert.equal(
    getDiscordLinkRedirectUri({
      envRedirectUri: '',
      origin: 'https://nosroblox.com',
    }),
    'https://nosroblox.com/lien-ket-discord/callback',
  );
});
