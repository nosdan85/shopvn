const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const dbPath = path.join(__dirname, '.tmp-discord-module.sqlite');
if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
process.env.DATABASE_PATH = dbPath;

const { db } = require('../server/db.cjs');
const { buildDiscordAuthUrl, buildDiscordTicketChannelName } = require('../server/discord.cjs');

test('users and orders expose discord link/ticket columns', () => {
  const userCols = db.prepare('PRAGMA table_info(users)').all().map((c) => c.name);
  const orderCols = db.prepare('PRAGMA table_info(orders)').all().map((c) => c.name);
  assert.equal(userCols.includes('discord_id'), true);
  assert.equal(userCols.includes('discord_username'), true);
  assert.equal(userCols.includes('discord_linked_at'), true);
  assert.equal(orderCols.includes('discord_ticket_status'), true);
  assert.equal(orderCols.includes('discord_ticket_channel_id'), true);
  assert.equal(orderCols.includes('discord_ticket_url'), true);
});

test('discord helpers build stable auth and ticket values', () => {
  const authUrl = buildDiscordAuthUrl({
    clientId: '123',
    redirectUri: 'https://example.com/api/discord/link/callback',
    state: 'order-9001',
  });
  assert.match(authUrl, /discord\.com\/oauth2\/authorize/);
  assert.match(authUrl, /client_id=123/);
  assert.match(authUrl, /state=order-9001/);
  assert.equal(buildDiscordTicketChannelName('SP1234', 'Nguyen Van A'), 'ticket-sp1234-nguyen-van-a');
});
