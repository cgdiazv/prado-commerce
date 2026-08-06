function getAvailablePaymentMethods(offlinePaymentsEnabled, stripeOnlinePaymentsEnabled = true) {
  const methods = [];

  if (stripeOnlinePaymentsEnabled) {
    methods.push("card");
  }

  if (offlinePaymentsEnabled) {
    methods.push("offline");
  }

  return methods;
}

module.exports = {
  getAvailablePaymentMethods,
};
