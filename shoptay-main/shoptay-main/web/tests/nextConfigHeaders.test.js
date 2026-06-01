/* eslint-disable @typescript-eslint/no-require-imports */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const configSource = fs.readFileSync(path.join(__dirname, '..', 'next.config.ts'), 'utf8');

test('next config does not apply public cache headers to every route', () => {
  assert.equal(
    /source:\s*"\/:path\*"\s*,[\s\S]*?public,\s*max-age=3600/.test(configSource),
    false,
  );
});

test('next config explicitly disables caching for API routes', () => {
  assert.match(configSource, /source:\s*"\/api\/:path\*"/);
  assert.match(configSource, /no-store,\s*no-cache,\s*must-revalidate,\s*proxy-revalidate/);
});
