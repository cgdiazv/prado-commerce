import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { decryptStoredSecret, verifySecret } from "@/lib/credentials";
import { processShipStationShipmentResource } from "@/lib/shipstation";

type RouteContext = {
  params: Promise<{ storeId: string; token: string }>;
};

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { storeId, token } = await params;
    const store = await prisma.store.findUnique({
      where: { id: storeId },
      select: {
        shipStationApiKeyEncrypted: true,
        shipStationApiSecretEncrypted: true,
        shipStationWebhookSecretHash: true,
      },
    });

    if (
      !store?.shipStationApiKeyEncrypted ||
      !store.shipStationApiSecretEncrypted ||
      !store.shipStationWebhookSecretHash ||
      !verifySecret(token, store.shipStationWebhookSecretHash)
    ) {
      return NextResponse.json({ error: "Invalid webhook" }, { status: 401 });
    }

    const body = await request.json() as { resource_type?: string; resource_url?: string };
    if (body.resource_type !== "SHIP_NOTIFY" || !body.resource_url) {
      return NextResponse.json({ ok: true });
    }

    await processShipStationShipmentResource({
      apiKey: decryptStoredSecret(store.shipStationApiKeyEncrypted),
      apiSecret: decryptStoredSecret(store.shipStationApiSecretEncrypted),
    }, storeId, body.resource_url);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[SHIPSTATION_WEBHOOK_ERROR]", error);
    return NextResponse.json({ error: "Webhook handling failed" }, { status: 500 });
  }
}