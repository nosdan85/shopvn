/* eslint-disable @typescript-eslint/no-require-imports */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const proofsPageSource = fs.readFileSync(path.join(__dirname, '..', 'app', 'proofs', 'page.tsx'), 'utf8');
const shopRoutesSource = fs.readFileSync(path.join(__dirname, '..', '..', 'api', 'routes', 'shopRoutes.js'), 'utf8');

test('public proofs page does not render or copy buyer Roblox usernames', () => {
  assert.equal(proofsPageSource.includes('proof.robloxUsername'), false);
  assert.equal(proofsPageSource.includes('copyRobloxName'), false);
  assert.equal(proofsPageSource.includes('Copy Roblox username'), false);
});

test('public proofs endpoint omits buyer Roblox usernames', () => {
  const publicProofsHandler = shopRoutesSource.slice(
    shopRoutesSource.indexOf("router.get('/proofs'"),
    shopRoutesSource.indexOf("router.get('/proofs/:proofId")
  );

  assert.equal(publicProofsHandler.includes('robloxUsername'), false);
});
