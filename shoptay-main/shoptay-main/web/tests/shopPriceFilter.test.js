/* eslint-disable @typescript-eslint/no-require-imports */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const shopPageSource = fs.readFileSync(path.join(__dirname, '..', 'app', 'shop', 'page.tsx'), 'utf8');

test('shop page renders a single price sort control group', () => {
  const priceSortButtonHandlers = shopPageSource.match(/onClick=\{\(\) => setPriceSort\(value\)\}/g) || [];
  assert.equal(priceSortButtonHandlers.length, 1);
});

test('shop page always renders the full filtered catalog without View Full state', () => {
  assert.equal(shopPageSource.includes('View Full'), false);
  assert.equal(shopPageSource.includes('showAll'), false);
  assert.match(shopPageSource, /\{filtered\.map\(\(p, idx\) => \(/);
  assert.equal(shopPageSource.includes('filtered.slice'), false);
});

test('shop game filter does not include support navigation', () => {
  assert.equal(shopPageSource.includes('SUPPORT_SECTION_ID'), false);
  assert.equal(shopPageSource.includes('Contact Support'), false);
  assert.equal(shopPageSource.includes('If you do not see the item you need'), false);
});
