const test = require('node:test');
const assert = require('node:assert/strict');

const { buildShopperSessionCookieValue, parseShopperSessionCookieValue } = require('../lib/shopper-auth');

test('builds and parses storefront session cookies', () => {
  const value = buildShopperSessionCookieValue('store_123', 'customer_456', 2);
  assert.equal(value, 'store_123::customer_456::2');

  const parsed = parseShopperSessionCookieValue(value);
  assert.deepEqual(parsed, {
    storeId: 'store_123',
    customerId: 'customer_456',
    sessionVersion: 2,
  });
});

test('returns null for malformed storefront session cookies', () => {
  assert.equal(parseShopperSessionCookieValue('just-a-cookie'), null);
  assert.equal(parseShopperSessionCookieValue(''), null);
});
