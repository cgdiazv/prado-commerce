const test = require('node:test');
const assert = require('node:assert/strict');

const { buildCheckoutUrl } = require('../lib/checkout-url');

test('builds a checkout URL from the current origin and cart token', () => {
  assert.equal(buildCheckoutUrl('https://store.example.com', 'cart_123'), 'https://store.example.com/checkout/cart_123');
});
