/* eslint-disable @typescript-eslint/no-require-imports */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const layoutSource = fs.readFileSync(path.join(__dirname, '..', 'app', 'layout.tsx'), 'utf8');
const bannerPath = path.join(__dirname, '..', 'public', 'pictures', 'banner.jpg');

test('social share metadata uses the saved banner image', () => {
  assert.equal(fs.existsSync(bannerPath), true);
  assert.match(layoutSource, /const SOCIAL_BANNER_IMAGE = "\/pictures\/banner\.jpg"/);
  assert.match(layoutSource, /metadataBase:\s*new URL\(SITE_URL\)/);
  assert.match(layoutSource, /url:\s*SOCIAL_BANNER_IMAGE/);
  assert.match(layoutSource, /width:\s*2048/);
  assert.match(layoutSource, /height:\s*702/);
  assert.match(layoutSource, /card:\s*"summary_large_image"/);
  assert.match(layoutSource, /images:\s*\[SOCIAL_BANNER_IMAGE\]/);
});
