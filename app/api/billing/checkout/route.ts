import { NextResponse } from "next/server";
import Stripe from "stripe";
import { STRIPE_PRICE_MAP } from "@/lib/stripe-pricing";
import { getCurrentUserFromRequest } from "@/lib/session";

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

export async function POST(request: Request) {
  try {
    const user = await getCurrentUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { plan, interval } = body as {
      plan?: keyof typeof STRIPE_PRICE_MAP;
      interval?: "month" | "year";
    };

    if (!plan || !interval) {
      return NextResponse.json(
        { error: "plan and interval are required" },
        { status: 400 },
      );
    }

    if (!stripe) {
      return NextResponse.json(
        { error: "Stripe is not configured" },
        { status: 500 },
      );
    }

    const selectedPriceId = STRIPE_PRICE_MAP[plan]?.[interval];

    if (!selectedPriceId) {
      return NextResponse.json(
        { error: "Invalid plan or billing interval" },
        { status: 400 },
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      client_reference_id: user.id,
      customer_email: user.email,
      metadata: {
        userId: user.id,
        plan,
      },
      line_items: [
        {
          price: selectedPriceId,
          quantity: 1,
        },
      ],
      success_url: `${appUrl}/dashboard?billing=success`,
      cancel_url: `${appUrl}/dashboard?billing=cancelled`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("[BILLING_CHECKOUT_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 },
    );
  }
}

