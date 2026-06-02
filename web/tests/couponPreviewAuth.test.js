/* eslint-disable @typescript-eslint/no-require-imports */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const readWebFile = (...parts) => fs.readFileSync(path.join(__dirname, '..', ...parts), 'utf8');

test('coupon preview proxy forwards Authorization so user-specific discounts are previewed', () => {
  const source = readWebFile('app', 'api', 'shop', 'coupon', 'preview', 'route.ts');

  assert.match(source, /request\.headers\.get\(["']authorization["']\)/);
  assert.match(source, /\.\.\.\(token \? \{ Authorization: token \} : \{\}\)/);
});

test('shop coupon preview sends the bearer token when a user is logged in', () => {
  const source = readWebFile('app', 'shop', 'page.tsx');
  const previewStart = source.indexOf('const previewCouponFor = async');
  const previewEnd = source.indexOf('const previewReferralCode = async');
  const previewSource = source.slice(previewStart, previewEnd);

  assert.notEqual(previewStart, -1);
  assert.notEqual(previewEnd, -1);
  assert.match(previewSource, /fetch\(["']\/api\/shop\/coupon\/preview["']/);
  assert.match(previewSource, /Authorization: `Bearer \$\{token\}`/);
});

test('shop cart no longer renders saved coupon inventory in the code panel', () => {
  const source = readWebFile('app', 'shop', 'page.tsx');

  assert.doesNotMatch(source, /Your coupons/i);
  assert.doesNotMatch(source, /myCoupons/);
  assert.doesNotMatch(source, /\/api\/shop\/my-coupons/);
  assert.doesNotMatch(source, /\/api\/shop\/referral\/status/);
});

test('checkout submits referralCode only after the invite has been applied', () => {
  const source = readWebFile('app', 'shop', 'page.tsx');
  const checkoutStart = source.indexOf('const doCheckout = async');
  const checkoutEnd = source.indexOf('const lookupRobloxUsername = async');
  const checkoutSource = source.slice(checkoutStart, checkoutEnd);

  assert.notEqual(checkoutStart, -1);
  assert.notEqual(checkoutEnd, -1);
  assert.match(checkoutSource, /referralCode:\s*referralApplied\s*\?\s*referralCode\.trim\(\)\s*:\s*""/);
});

test('shop cart renders the signed-in user invite code as its own compact row', () => {
  const source = readWebFile('app', 'shop', 'page.tsx');

  assert.match(source, /token && myReferralCode/);
  assert.match(source, /Your invite/);
  assert.match(source, /navigator\.clipboard\.writeText\(myReferralCode\)/);
  assert.doesNotMatch(source, /referralPreviewOwner \? `Owner: \$\{referralPreviewOwner\}` : `Your code: \$\{myReferralCode\}`/);
});
