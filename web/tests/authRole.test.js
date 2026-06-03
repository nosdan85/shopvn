/* eslint-disable @typescript-eslint/no-require-imports */
const test = require('node:test');
const assert = require('node:assert/strict');

const { isAdminRole } = require('../lib/authRole');

test('isAdminRole accepts both legacy admin and current quan_tri roles', () => {
  assert.equal(isAdminRole('admin'), true);
  assert.equal(isAdminRole('quan_tri'), true);
  assert.equal(isAdminRole('khach_hang'), false);
  assert.equal(isAdminRole(''), false);
});
