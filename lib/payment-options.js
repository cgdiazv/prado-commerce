function getAvailablePaymentMethods(offlinePaymentsEnabled) {
  const methods = ["card"];

  if (offlinePaymentsEnabled) {
    methods.push("offline");
  }

  return methods;
}

module.exports = {
  getAvailablePaymentMethods,
};
