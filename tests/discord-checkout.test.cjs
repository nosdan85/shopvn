const assert = require('node:assert/strict');
const test = require('node:test');
const { shouldRequireDiscordLink, buildDiscordTicketPayload } = require('../server/discord.cjs');

test('checkout requires discord link when user has no linked discord id', () => {
  assert.equal(shouldRequireDiscordLink({ discord_id: '', discord_username: '' }), true);
  assert.equal(shouldRequireDiscordLink({ discord_id: '1234567890', discord_username: 'Nos User' }), false);
});

test('ticket payload includes order and user identifiers', () => {
  const payload = buildDiscordTicketPayload({
    orderCode: 'SPABC123',
    orderId: 42,
    username: 'demo',
    discordId: '111222333',
    totalAmount: 250000,
  });
  assert.equal(payload.channelName.startsWith('ticket-spabc123-'), true);
  assert.equal(payload.topic.includes('SPABC123'), true);
  assert.equal(payload.meta.orderId, 42);
});
