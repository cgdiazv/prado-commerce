const APIContracts = require('authorizenet/lib/apicontracts');
const APIControllers = require('authorizenet/lib/apicontrollers');
const SDKConstants = require('authorizenet/lib/constants').constants;

function chargeAuthorizeNetOpaquePayment({
  loginId,
  transactionKey,
  environment,
  amount,
  opaqueData,
  orderNumber,
}) {
  return new Promise((resolve, reject) => {
    const merchantAuthenticationType = new APIContracts.MerchantAuthenticationType();
    merchantAuthenticationType.setName(loginId);
    merchantAuthenticationType.setTransactionKey(transactionKey);

    const opaqueDataType = new APIContracts.OpaqueDataType();
    opaqueDataType.setDataDescriptor(opaqueData.dataDescriptor);
    opaqueDataType.setDataValue(opaqueData.dataValue);

    const paymentType = new APIContracts.PaymentType();
    paymentType.setOpaqueData(opaqueDataType);

    const orderType = new APIContracts.OrderType();
    orderType.setInvoiceNumber(String(orderNumber));

    const transactionRequestType = new APIContracts.TransactionRequestType();
    transactionRequestType.setTransactionType(APIContracts.TransactionTypeEnum.AUTHCAPTURETRANSACTION);
    transactionRequestType.setPayment(paymentType);
    transactionRequestType.setAmount(amount.toFixed(2));
    transactionRequestType.setOrder(orderType);

    const createRequest = new APIContracts.CreateTransactionRequest();
    createRequest.setMerchantAuthentication(merchantAuthenticationType);
    createRequest.setTransactionRequest(transactionRequestType);

    const controller = new APIControllers.CreateTransactionController(createRequest.getJSON());

    if (environment === 'production') {
      controller.setEnvironment(SDKConstants.endpoint.production);
    } else {
      controller.setEnvironment(SDKConstants.endpoint.sandbox);
    }

    controller.execute(() => {
      try {
        const apiResponse = controller.getResponse();
        const response = new APIContracts.CreateTransactionResponse(apiResponse);
        const resultCode = response?.getMessages?.()?.getResultCode?.();
        const transactionResponse = response?.getTransactionResponse?.();
        const transactionId = transactionResponse?.getTransId?.();
        const transactionErrors = transactionResponse?.getErrors?.()?.getError?.() ?? [];
        const responseMessages = response?.getMessages?.()?.getMessage?.() ?? [];

        if (resultCode === APIContracts.MessageTypeEnum.OK && transactionId) {
          resolve({ transactionId });
          return;
        }

        const firstTransactionError = Array.isArray(transactionErrors) ? transactionErrors[0] : transactionErrors;
        const firstMessage = Array.isArray(responseMessages) ? responseMessages[0] : responseMessages;
        const errorText =
          firstTransactionError?.getErrorText?.() ||
          firstMessage?.getText?.() ||
          'Authorize.net payment failed';

        reject(new Error(errorText));
      } catch (error) {
        reject(error);
      }
    });
  });
}

module.exports = {
  chargeAuthorizeNetOpaquePayment,
};