const SHOPPER_SESSION_COOKIE = "prado_shop_session";
const SESSION_SEPARATOR = "::";

function buildShopperSessionCookieValue(storeId, customerId, sessionVersion = 1) {
  return `${storeId}${SESSION_SEPARATOR}${customerId}${SESSION_SEPARATOR}${sessionVersion}`;
}

function parseShopperSessionCookieValue(rawValue) {
  if (!rawValue) {
    return null;
  }

  const decoded = decodeURIComponent(rawValue).trim();

  if (!decoded) {
    return null;
  }

  const parts = decoded.split(SESSION_SEPARATOR);

  if (parts.length !== 3) {
    return null;
  }

  const [storeId, customerId, versionRaw] = parts.map((part) => part.trim());

  if (!storeId || !customerId) {
    return null;
  }

  const parsedVersion = Number.parseInt(versionRaw, 10);

  if (!Number.isFinite(parsedVersion)) {
    return null;
  }

  return {
    storeId,
    customerId,
    sessionVersion: parsedVersion,
  };
}

function getShopperSessionCookieValueFromRequest(request) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${SHOPPER_SESSION_COOKIE}=([^;]+)`));
  return parseShopperSessionCookieValue(match?.[1]);
}

module.exports = {
  SHOPPER_SESSION_COOKIE,
  SESSION_SEPARATOR,
  buildShopperSessionCookieValue,
  parseShopperSessionCookieValue,
  getShopperSessionCookieValueFromRequest,
};
