import { NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { getCurrentUserFromRequest } from "@/lib/session";

export async function POST(request: Request) {
  try {
    const sessionUser = await getCurrentUserFromRequest(request);
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      return NextResponse.json(
        { error: "Stripe is not configured." },
        { status: 500 },
      );
    }

    const merchant = await prisma.merchantUser.findUnique({
      where: { id: sessionUser.id },
      select: {
        email: true,
        stripeCustomerId: true,
        stripeSubId: true,
      },
    });

    if (!merchant) {
      return NextResponse.json({ error: "Merchant not found" }, { status: 404 });
    }

    const stripe = new Stripe(stripeSecretKey);
    let customerId = merchant.stripeCustomerId || null;

    if (!customerId && merchant.stripeSubId) {
      try {
        const sub = await stripe.subscriptions.retrieve(merchant.stripeSubId);
        if (typeof sub.customer === "string") {
          customerId = sub.customer;
        }
      } catch {
        // Ignore sub lookup error
      }
    }

    if (!customerId && merchant.email) {
      const customers = await stripe.customers.list({
        email: merchant.email,
        limit: 1,
      });
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
      }
    }

    if (!customerId) {
      return NextResponse.json(
        {
          error:
            "No active Stripe billing profile was found for this account.",
        },
        { status: 404 },
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${baseUrl}/dashboard/settings`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("[BILLING_PORTAL_POST_ERROR]", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to open billing portal.",
      },
      { status: 500 },
    );
  }
}
