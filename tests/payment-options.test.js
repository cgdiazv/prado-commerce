/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const { getAvailablePaymentMethods } = require('../lib/payment-options');

function run() {
  const methods = getAvailablePaymentMethods(true);
  assert.deepEqual(methods, ['card', 'offline']);

  const fallback = getAvailablePaymentMethods(false);
  assert.deepEqual(fallback, ['card']);

  const offlineOnly = getAvailablePaymentMethods(true, false);
  assert.deepEqual(offlineOnly, ['offline']);

  const noneEnabled = getAvailablePaymentMethods(false, false);
  assert.deepEqual(noneEnabled, []);

  console.log('payment-options tests passed');
}

run();
