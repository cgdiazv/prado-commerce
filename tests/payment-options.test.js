const assert = require('node:assert/strict');
const { getAvailablePaymentMethods } = require('../lib/payment-options');

function run() {
  const methods = getAvailablePaymentMethods(true);
  assert.deepEqual(methods, ['card', 'offline']);

  const fallback = getAvailablePaymentMethods(false);
  assert.deepEqual(fallback, ['card']);

  console.log('payment-options tests passed');
}

run();
