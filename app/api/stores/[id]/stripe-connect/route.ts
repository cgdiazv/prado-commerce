import { NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { getCurrentUserFromRequest } from "@/lib/session";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type StripeConnectAction = "onboard" | "dashboard" | "disconnect";

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

function resolveAppUrl(request: Request) {
  const envBase = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (envBase) {
    return envBase.replace(/\/$/, "");
  }

  const requestUrl = new URL(request.url);
  return `${requestUrl.protocol}//${requestUrl.host}`;
}

async function syncStoreStripeStatus(storeId: string, accountId: string) {
  if (!stripe) {
    throw new Error("Stripe is not configured");
  }

  const account = await stripe.accounts.retrieve(accountId);

  const stripeChargesEnabled = Boolean(account.charges_enabled);
  const stripePayoutsEnabled = Boolean(account.payouts_enabled);
  const stripeDetailsSubmitted = Boolean(account.details_submitted);

  await prisma.store.update({
    where: { id: storeId },
    data: {
      stripeChargesEnabled,
      stripePayoutsEnabled,
      stripeDetailsSubmitted,
    },
  });

  return {
    accountId,
    stripeChargesEnabled,
    stripePayoutsEnabled,
    stripeDetailsSubmitted,
  };
}

export async function GET(req: Request, { params }: RouteContext) {
  try {
    const user = await getCurrentUserFromRequest(req);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const store = await prisma.store.findFirst({
      where: {
        id,
        ownerUserId: user.id,
      },
      select: {
        id: true,
        name: true,
        stripeConnectAccountId: true,
        stripeChargesEnabled: true,
        stripePayoutsEnabled: true,
        stripeDetailsSubmitted: true,
      },
    });

    if (!store) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }

    if (!store.stripeConnectAccountId || !stripe) {
      return NextResponse.json({
        storeId: store.id,
        storeName: store.name,
        stripeConnected: false,
        stripeConnectAccountId: store.stripeConnectAccountId,
        stripeChargesEnabled: false,
        stripePayoutsEnabled: false,
        stripeDetailsSubmitted: false,
      });
    }

    const synced = await syncStoreStripeStatus(store.id, store.stripeConnectAccountId);

    return NextResponse.json({
      storeId: store.id,
      storeName: store.name,
      stripeConnected: true,
      stripeConnectAccountId: synced.accountId,
      stripeChargesEnabled: synced.stripeChargesEnabled,
      stripePayoutsEnabled: synced.stripePayoutsEnabled,
      stripeDetailsSubmitted: synced.stripeDetailsSubmitted,
    });
  } catch (error) {
    console.error("[STORE_STRIPE_CONNECT_GET_ERROR]", error);
    return NextResponse.json({ error: "Failed to load Stripe Connect status" }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: RouteContext) {
  try {
    const user = await getCurrentUserFromRequest(req);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!stripe) {
      return NextResponse.json({ error: "Stripe is not configured" }, { status: 500 });
    }

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const action = String(body?.action ?? "").trim().toLowerCase() as StripeConnectAction;

    if (!action || !["onboard", "dashboard", "disconnect"].includes(action)) {
      return NextResponse.json({ error: "A valid action is required" }, { status: 400 });
    }

    const store = await prisma.store.findFirst({
      where: {
        id,
        ownerUserId: user.id,
      },
      select: {
        id: true,
        name: true,
        stripeConnectAccountId: true,
      },
    });

    if (!store) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }

    if (action === "disconnect") {
      await prisma.store.update({
        where: { id: store.id },
        data: {
          stripeConnectAccountId: null,
          stripeChargesEnabled: false,
          stripePayoutsEnabled: false,
          stripeDetailsSubmitted: false,
        },
      });

      return NextResponse.json({ ok: true });
    }

    if (action === "dashboard") {
      if (!store.stripeConnectAccountId) {
        return NextResponse.json({ error: "Stripe is not connected for this store yet." }, { status: 400 });
      }

      const link = await stripe.accounts.createLoginLink(store.stripeConnectAccountId);
      return NextResponse.json({ url: link.url });
    }

    let accountId = store.stripeConnectAccountId;

    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "express",
        email: user.email,
        business_profile: {
          name: store.name,
          product_description: "Prado Commerce storefront payments",
        },
        metadata: {
          storeId: store.id,
          merchantUserId: user.id,
        },
      });

      accountId = account.id;

      await prisma.store.update({
        where: { id: store.id },
        data: {
          stripeConnectAccountId: account.id,
          stripeChargesEnabled: Boolean(account.charges_enabled),
          stripePayoutsEnabled: Boolean(account.payouts_enabled),
          stripeDetailsSubmitted: Boolean(account.details_submitted),
        },
      });
    }

    const appUrl = resolveAppUrl(req);
    const returnTo = `${appUrl}/dashboard/settings/payments?storeId=${store.id}&stripe=connected`;
    const refreshTo = `${appUrl}/dashboard/settings/payments?storeId=${store.id}&stripe=refresh`;

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      type: "account_onboarding",
      return_url: returnTo,
      refresh_url: refreshTo,
    });

    return NextResponse.json({ url: accountLink.url });
  } catch (error) {
    console.error("[STORE_STRIPE_CONNECT_POST_ERROR]", error);
    return NextResponse.json({ error: "Failed to process Stripe Connect action" }, { status: 500 });
  }
}
