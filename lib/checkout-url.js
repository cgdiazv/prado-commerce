function buildCheckoutUrl(origin, cartToken) {
  return `${origin.replace(/\/$/, '')}/checkout/${cartToken}`;
}

module.exports = {
  buildCheckoutUrl,
};
