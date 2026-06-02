/* eslint-disable @typescript-eslint/no-require-imports */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const navbarSource = fs.readFileSync(path.join(__dirname, '..', 'app', 'components', 'Navbar.tsx'), 'utf8');

test('navbar includes support next to primary navigation links', () => {
  assert.match(navbarSource, /const SUPPORT_DISCORD_URL = "https:\/\/discord\.com\/channels\/1398984938111369256\/1493927408217100438"/);
  assert.match(navbarSource, /href=\{SUPPORT_DISCORD_URL\}/);
  assert.match(navbarSource, />\s*Support\s*</);
});
