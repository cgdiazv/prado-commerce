const assert = require('node:assert/strict');
const { normalizeAddress, normalizeAddressList, getDefaultAddress } = require('../lib/address-utils');

function run() {
  const empty = normalizeAddress({});
  assert.equal(empty, null);

  const single = normalizeAddress({ line1: '123 Main St', city: 'Austin', state: 'TX' });
  assert.deepEqual(single, {
    line1: '123 Main St',
    city: 'Austin',
    state: 'TX',
    line2: null,
    postalCode: null,
    country: null,
  });

  const list = normalizeAddressList([
    { line1: '123 Main St', city: 'Austin', state: 'TX' },
    {},
  ]);
  assert.equal(list.length, 1);
  assert.equal(list[0].line1, '123 Main St');

  const preferred = getDefaultAddress({ line1: '456 Oak Ave', city: 'Dallas' }, [
    { line1: '123 Main St', city: 'Austin', state: 'TX' },
  ]);
  assert.equal(preferred.line1, '456 Oak Ave');

  const fallback = getDefaultAddress(null, [
    { line1: '123 Main St', city: 'Austin', state: 'TX' },
  ]);
  assert.equal(fallback.line1, '123 Main St');

  console.log('address-utils tests passed');
}

run();
