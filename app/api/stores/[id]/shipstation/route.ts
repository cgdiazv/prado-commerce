import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { decryptStoredSecret, encryptStoredSecret, hashSecret } from "@/lib/credentials";
import { getCurrentUserFromRequest } from "@/lib/session";
import { getPlanLimits, getPlanOrDefault } from "@/lib/subscription";
import {
  subscribeShipStationWebhook,
  testShipStationConnection,
  unsubscribeShipStationWebhook,
} from "@/lib/shipstation";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function resolvePublicAppUrl(request: Request) {
  const configured =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    process.env.VERCEL_URL;
  const value = configured || new URL(request.url).origin;
  const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);

  if (url.protocol !== "https:" || url.hostname === "localhost" || url.hostname === "127.0.0.1") {
    return null;
  }

  return url.origin;
}

async function getOwnedStore(request: Request, storeId: string) {
  const user = await getCurrentUserFromRequest(request);
  if (!user) return null;

  return prisma.store.findFirst({
    where: { id: storeId, ownerUserId: user.id },
    select: {
      id: true,
      shipStationApiKeyEncrypted: true,
      shipStationApiSecretEncrypted: true,
      shipStationWebhookId: true,
      ownerUser: {
        select: {
          plan: true,
        },
      },
    },
  });
}

export async function GET(request: Request, { params }: RouteContext) {
  const { id } = await params;
  const store = await getOwnedStore(request, id);
  if (!store) return NextResponse.json({ error: "Store not found" }, { status: 404 });

  const ownerPlan = getPlanOrDefault(store.ownerUser?.plan);
  const limits = getPlanLimits(ownerPlan);

  return NextResponse.json({
    connected: Boolean(store.shipStationApiKeyEncrypted && store.shipStationApiSecretEncrypted),
    webhookConfigured: Boolean(store.shipStationWebhookId),
    allowedByPlan: limits.allowShipStation,
  });
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const store = await getOwnedStore(request, id);
    if (!store) return NextResponse.json({ error: "Store not found" }, { status: 404 });

    const ownerPlan = getPlanOrDefault(store.ownerUser?.plan);
    const limits = getPlanLimits(ownerPlan);

    if (!limits.allowShipStation) {
      return NextResponse.json(
        { error: "ShipStation integration requires a Prado Commerce Enterprise subscription." },
        { status: 403 },
      );
    }

    const body = await request.json() as { apiKey?: string; apiSecret?: string };
    const apiKey = String(body.apiKey ?? "").trim();
    const apiSecret = String(body.apiSecret ?? "").trim();
    if (!apiKey || !apiSecret) {
      return NextResponse.json({ error: "API Key and API Secret are required." }, { status: 400 });
    }

    const credentials = { apiKey, apiSecret };
    await testShipStationConnection(credentials);

    let webhookId: string | null = null;
    let webhookSecretHash: string | null = null;
    let warning: string | null = null;
    const publicAppUrl = resolvePublicAppUrl(request);

    if (publicAppUrl) {
      const webhookToken = randomBytes(32).toString("hex");
      webhookId = await subscribeShipStationWebhook(
        credentials,
        `${publicAppUrl}/api/webhooks/shipstation/${store.id}/${webhookToken}`,
      );
      webhookSecretHash = hashSecret(webhookToken);
    } else {
      warning = "Credentials saved. Configure a public HTTPS APP_URL to enable shipment webhooks.";
    }

    if (store.shipStationWebhookId && store.shipStationApiKeyEncrypted && store.shipStationApiSecretEncrypted) {
      try {
        await unsubscribeShipStationWebhook({
          apiKey: decryptStoredSecret(store.shipStationApiKeyEncrypted),
          apiSecret: decryptStoredSecret(store.shipStationApiSecretEncrypted),
        }, store.shipStationWebhookId);
      } catch (error) {
        console.error("[SHIPSTATION_OLD_WEBHOOK_DELETE_ERROR]", error);
      }
    }

    await prisma.store.update({
      where: { id: store.id },
      data: {
        shipStationApiKeyEncrypted: encryptStoredSecret(apiKey),
        shipStationApiSecretEncrypted: encryptStoredSecret(apiSecret),
        shipStationWebhookId: webhookId,
        shipStationWebhookSecretHash: webhookSecretHash,
      },
    });

    return NextResponse.json({ connected: true, webhookConfigured: Boolean(webhookId), warning });
  } catch (error) {
    console.error("[SHIPSTATION_CONNECT_ERROR]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to connect ShipStation." },
      { status: 400 },
    );
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const store = await getOwnedStore(request, id);
    if (!store) return NextResponse.json({ error: "Store not found" }, { status: 404 });

    if (store.shipStationWebhookId && store.shipStationApiKeyEncrypted && store.shipStationApiSecretEncrypted) {
      try {
        await unsubscribeShipStationWebhook({
          apiKey: decryptStoredSecret(store.shipStationApiKeyEncrypted),
          apiSecret: decryptStoredSecret(store.shipStationApiSecretEncrypted),
        }, store.shipStationWebhookId);
      } catch (error) {
        console.error("[SHIPSTATION_WEBHOOK_DELETE_ERROR]", error);
      }
    }

    await prisma.store.update({
      where: { id: store.id },
      data: {
        shipStationApiKeyEncrypted: null,
        shipStationApiSecretEncrypted: null,
        shipStationWebhookId: null,
        shipStationWebhookSecretHash: null,
      },
    });

    return NextResponse.json({ connected: false, webhookConfigured: false });
  } catch (error) {
    console.error("[SHIPSTATION_DISCONNECT_ERROR]", error);
    return NextResponse.json({ error: "Unable to disconnect ShipStation." }, { status: 500 });
  }
}