/* eslint-disable @typescript-eslint/no-require-imports */
const test = require('node:test');
const assert = require('node:assert/strict');

const { backendUrl, getApiBaseUrl, noStoreHeaders } = require('../lib/backendApi');

test('getApiBaseUrl accepts backend root urls', () => {
  const previous = process.env.NEXT_PUBLIC_API_URL;
  process.env.NEXT_PUBLIC_API_URL = 'https://api.example.com';

  assert.equal(getApiBaseUrl(), 'https://api.example.com');
  assert.equal(backendUrl('/api/shop/orders/nm_1/delivery-slot'), 'https://api.example.com/api/shop/orders/nm_1/delivery-slot');

  if (previous === undefined) delete process.env.NEXT_PUBLIC_API_URL;
  else process.env.NEXT_PUBLIC_API_URL = previous;
});

test('getApiBaseUrl normalizes urls that were configured with trailing /api', () => {
  const previous = process.env.NEXT_PUBLIC_API_URL;
  process.env.NEXT_PUBLIC_API_URL = 'https://www.nosdan.store/api/';

  assert.equal(getApiBaseUrl(), 'https://www.nosdan.store');
  assert.equal(backendUrl('/api/shop/orders/nm_1/delivery-slot'), 'https://www.nosdan.store/api/shop/orders/nm_1/delivery-slot');

  if (previous === undefined) delete process.env.NEXT_PUBLIC_API_URL;
  else process.env.NEXT_PUBLIC_API_URL = previous;
});

test('noStoreHeaders disables proxy and browser caching for dynamic shop APIs', () => {
  assert.deepEqual(noStoreHeaders({ 'X-Test': '1' }), {
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    Pragma: 'no-cache',
    Expires: '0',
    'X-Test': '1',
  });
});
