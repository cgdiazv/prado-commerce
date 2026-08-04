function normalizeAddress(value) {
  if (!value || typeof value !== "object") {
    return null;
  }

  const line1 = String(value.line1 ?? "").trim();
  const line2 = String(value.line2 ?? "").trim();
  const city = String(value.city ?? "").trim();
  const state = String(value.state ?? "").trim();
  const postalCode = String(value.postalCode ?? "").trim();
  const country = String(value.country ?? "").trim();

  if (!line1 && !line2 && !city && !state && !postalCode && !country) {
    return null;
  }

  return {
    line1: line1 || null,
    line2: line2 || null,
    city: city || null,
    state: state || null,
    postalCode: postalCode || null,
    country: country || null,
  };
}

function normalizeAddressList(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => normalizeAddress(entry))
    .filter(Boolean);
}

function getDefaultAddress(shippingAddress, savedAddresses) {
  const primaryAddress = normalizeAddress(shippingAddress);
  if (primaryAddress) {
    return primaryAddress;
  }

  const addresses = normalizeAddressList(savedAddresses);
  return addresses[0] || null;
}

module.exports = {
  normalizeAddress,
  normalizeAddressList,
  getDefaultAddress,
};
