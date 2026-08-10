import { prisma } from "@/lib/prisma";
import { decryptStoredSecret } from "@/lib/credentials";

const SHIPSTATION_API_URL = "https://ssapi.shipstation.com";

type ShipStationCredentials = {
  apiKey: string;
  apiSecret: string;
};

type StoredAddress = {
  line1?: unknown;
  line2?: unknown;
  city?: unknown;
  state?: unknown;
  postalCode?: unknown;
  country?: unknown;
};

type ShipStationShipment = {
  orderId?: number;
  orderKey?: string;
  trackingNumber?: string;
  carrierCode?: string;
  shipDate?: string;
  voided?: boolean;
};

function basicAuth(credentials: ShipStationCredentials) {
  return `Basic ${Buffer.from(`${credentials.apiKey}:${credentials.apiSecret}`).toString("base64")}`;
}

async function parseShipStationResponse(response: Response) {
  const raw = await response.text();
  const payload = raw ? JSON.parse(raw) as unknown : null;

  if (!response.ok) {
    const message = payload && typeof payload === "object" && "message" in payload
      ? String(payload.message)
      : `ShipStation request failed with status ${response.status}.`;
    throw new Error(message);
  }

  return payload;
}

export async function shipStationRequest(
  credentials: ShipStationCredentials,
  pathOrUrl: string,
  init: RequestInit = {},
) {
  const url = new URL(pathOrUrl, SHIPSTATION_API_URL);
  if (url.origin !== SHIPSTATION_API_URL) {
    throw new Error("ShipStation returned an invalid resource URL.");
  }

  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: basicAuth(credentials),
      Accept: "application/json",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });

  return parseShipStationResponse(response);
}

export async function testShipStationConnection(credentials: ShipStationCredentials) {
  await shipStationRequest(credentials, "/carriers");
}

export async function subscribeShipStationWebhook(
  credentials: ShipStationCredentials,
  targetUrl: string,
) {
  const payload = await shipStationRequest(credentials, "/webhooks/subscribe", {
    method: "POST",
    body: JSON.stringify({
      target_url: targetUrl,
      event: "SHIP_NOTIFY",
      store_id: null,
      friendly_name: "Prado Commerce shipment updates",
    }),
  }) as { id?: number } | null;

  if (!payload?.id) {
    throw new Error("ShipStation did not return a webhook ID.");
  }

  return String(payload.id);
}

export async function unsubscribeShipStationWebhook(
  credentials: ShipStationCredentials,
  webhookId: string,
) {
  await shipStationRequest(credentials, `/webhooks/${encodeURIComponent(webhookId)}`, {
    method: "DELETE",
  });
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function countryCode(value: unknown) {
  const normalized = text(value).toUpperCase();
  const commonCodes: Record<string, string> = {
    "UNITED STATES": "US",
    USA: "US",
    CANADA: "CA",
    MEXICO: "MX",
    "UNITED KINGDOM": "GB",
  };
  return commonCodes[normalized] ?? normalized.slice(0, 2);
}

function mapAddress(value: unknown, name: string, phone: string | null) {
  const address = value && typeof value === "object" ? value as StoredAddress : {};
  return {
    name,
    company: null,
    street1: text(address.line1) || null,
    street2: text(address.line2) || null,
    street3: null,
    city: text(address.city) || null,
    state: text(address.state) || null,
    postalCode: text(address.postalCode) || null,
    country: countryCode(address.country) || null,
    phone,
    residential: true,
  };
}

function hasShippableAddress(address: ReturnType<typeof mapAddress>) {
  return Boolean(address.street1 && address.city && address.state && address.postalCode && address.country);
}

export async function syncPaidOrderToShipStation(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      store: {
        select: {
          shipStationApiKeyEncrypted: true,
          shipStationApiSecretEncrypted: true,
        },
      },
      customer: {
        select: { firstName: true, lastName: true, phone: true },
      },
      items: {
        include: {
          variant: {
            select: {
              sku: true,
              product: { select: { productType: true } },
            },
          },
        },
      },
    },
  });

  if (!order || order.paymentStatus !== "PAID") return;

  const encryptedKey = order.store.shipStationApiKeyEncrypted;
  const encryptedSecret = order.store.shipStationApiSecretEncrypted;
  if (!encryptedKey || !encryptedSecret) return;

  const physicalItems = order.items.filter((item) => item.variant?.product.productType !== "DIGITAL" && item.variant?.product.productType !== "SERVICE");
  if (physicalItems.length === 0) return;

  const customerName = [order.customer?.firstName, order.customer?.lastName].filter(Boolean).join(" ") || order.customerEmail;
  const shipTo = mapAddress(order.shippingAddress, customerName, order.customer?.phone ?? null);

  if (!hasShippableAddress(shipTo)) {
    await prisma.order.update({
      where: { id: order.id },
      data: { shipStationSyncError: "A complete shipping address is required for ShipStation." },
    });
    return;
  }

  const credentials = {
    apiKey: decryptStoredSecret(encryptedKey),
    apiSecret: decryptStoredSecret(encryptedSecret),
  };

  try {
    const payload = await shipStationRequest(credentials, "/orders/createorder", {
      method: "POST",
      body: JSON.stringify({
        orderNumber: String(order.orderNumber),
        orderKey: order.id,
        orderDate: order.createdAt.toISOString(),
        paymentDate: order.createdAt.toISOString(),
        orderStatus: "awaiting_shipment",
        customerUsername: order.customerEmail,
        customerEmail: order.customerEmail,
        billTo: mapAddress(order.billingAddress ?? order.shippingAddress, customerName, order.customer?.phone ?? null),
        shipTo,
        items: physicalItems.map((item) => ({
          lineItemKey: item.id,
          sku: item.variant?.sku ?? null,
          name: item.title,
          quantity: item.quantity,
          unitPrice: Number(item.price),
        })),
        amountPaid: Number(order.total),
        taxAmount: Number(order.tax),
        shippingAmount: Number(order.shipping),
        paymentMethod: order.paymentMethod ?? "card",
      }),
    }) as { orderId?: number } | null;

    if (!payload?.orderId) {
      throw new Error("ShipStation did not return an order ID.");
    }

    await prisma.order.update({
      where: { id: order.id },
      data: {
        shipStationOrderId: String(payload.orderId),
        shipStationSyncedAt: new Date(),
        shipStationSyncError: null,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to sync order to ShipStation.";
    await prisma.order.update({
      where: { id: order.id },
      data: { shipStationSyncError: message.slice(0, 500) },
    });
    throw error;
  }
}

export async function processShipStationShipmentResource(
  credentials: ShipStationCredentials,
  storeId: string,
  resourceUrl: string,
) {
  const payload = await shipStationRequest(credentials, resourceUrl) as { shipments?: ShipStationShipment[] } | null;
  const shipments = Array.isArray(payload?.shipments) ? payload.shipments : [];

  for (const shipment of shipments) {
    if (shipment.voided || (!shipment.orderId && !shipment.orderKey)) continue;

    const order = await prisma.order.findFirst({
      where: {
        storeId,
        ...(shipment.orderKey
          ? { id: shipment.orderKey }
          : { shipStationOrderId: String(shipment.orderId) }),
      },
      select: { id: true },
    });
    if (!order) continue;

    await prisma.order.update({
      where: { id: order.id },
      data: {
        fulfillmentStatus: "SHIPPED",
        status: "COMPLETED",
        trackingNumber: shipment.trackingNumber || null,
        trackingCarrier: shipment.carrierCode || null,
        shippedAt: shipment.shipDate ? new Date(shipment.shipDate) : new Date(),
      },
    });
  }
}