const SENSITIVE_KEY_PATTERN = /(card(number)?|pan|cvc|cvv|securitycode|exp(month|year)?|expiry|expiration)/i;

function normalizeDigits(value) {
  return String(value ?? "").replace(/\D/g, "");
}

function passesLuhn(number) {
  let sum = 0;
  let shouldDouble = false;

  for (let index = number.length - 1; index >= 0; index -= 1) {
    let digit = Number(number[index]);

    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    shouldDouble = !shouldDouble;
  }

  return sum % 10 === 0;
}

function isPotentialCardNumber(value) {
  const digits = normalizeDigits(value);
  return digits.length >= 12 && digits.length <= 19 && passesLuhn(digits);
}

function findSensitivePaymentField(value, path = []) {
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      const match = findSensitivePaymentField(value[index], [...path, String(index)]);
      if (match) {
        return match;
      }
    }
    return null;
  }

  if (!value || typeof value !== "object") {
    return null;
  }

  for (const [key, nestedValue] of Object.entries(value)) {
    const nextPath = [...path, key];

    if (SENSITIVE_KEY_PATTERN.test(key)) {
      return {
        path: nextPath.join("."),
        reason: "sensitive_key",
      };
    }

    if (typeof nestedValue === "string" && isPotentialCardNumber(nestedValue)) {
      return {
        path: nextPath.join("."),
        reason: "card_number_like_value",
      };
    }

    const nestedMatch = findSensitivePaymentField(nestedValue, nextPath);
    if (nestedMatch) {
      return nestedMatch;
    }
  }

  return null;
}

module.exports = {
  findSensitivePaymentField,
  isPotentialCardNumber,
};