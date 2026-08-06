/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const { findSensitivePaymentField, isPotentialCardNumber } = require('../lib/payment-pci-guard');

function run() {
  assert.equal(isPotentialCardNumber('4242 4242 4242 4242'), true);
  assert.equal(isPotentialCardNumber('4111111111111111'), true);
  assert.equal(isPotentialCardNumber('555-123-4567'), false);

  assert.deepEqual(
    findSensitivePaymentField({ cardNumber: '4242 4242 4242 4242' }),
    { path: 'cardNumber', reason: 'sensitive_key' },
  );

  assert.deepEqual(
    findSensitivePaymentField({ payment: { number: '4242424242424242' } }),
    { path: 'payment.number', reason: 'card_number_like_value' },
  );

  assert.equal(
    findSensitivePaymentField({ email: 'merchant@example.com', shippingAddress: { postalCode: '10001' } }),
    null,
  );

  console.log('payment-pci-guard tests passed');
}

run();