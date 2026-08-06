import { NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { getStoreEmailConfig, sendOrderConfirmationEmail } from "@/lib/email-notifications";

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

function toDecimalFromCents(value: number | null | undefined) {
  const cents = Number(value ?? 0);
  return Number((cents / 100).toFixed(2));
}

function parseMetadataAmount(value: string | undefined, fallback: number) {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }

  return Number(parsed.toFixed(2));
}

export async function POST(request: Request) {
  try {
    if (!stripe || !webhookSecret) {
      return NextResponse.json({ error: "Stripe webhook is not configured" }, { status: 500 });
    }

    const signature = request.headers.get("stripe-signature");
    if (!signature) {
      return NextResponse.json({ error: "Missing Stripe signature" }, { status: 400 });
    }

    const payload = await request.text();

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (error) {
      console.error("[STRIPE_WEBHOOK_SIGNATURE_ERROR]", error);
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const metadata = session.metadata ?? {};

      const storeId = String(metadata.storeId || "").trim();
      const cartId = String(metadata.cartId || "").trim();
      const email = String(metadata.email || session.customer_details?.email || "").trim().toLowerCase();
      const firstName = String(metadata.firstName || "").trim() || null;
      const lastName = String(metadata.lastName || "").trim() || null;
      const phone = String(metadata.phone || session.customer_details?.phone || "").trim() || null;

      if (!storeId || !cartId || !email) {
        return NextResponse.json({ ok: true });
      }

      const existingOrder = await prisma.order.findUnique({
        where: { stripeSessionId: session.id },
        select: { id: true },
      });

      if (existingOrder) {
        return NextResponse.json({ ok: true });
      }

      const cart = await prisma.cart.findFirst({
        where: {
          id: cartId,
          storeId,
        },
        select: {
          id: true,
          currency: true,
          items: {
            select: {
              quantity: true,
              variant: {
                select: {
                  id: true,
                  title: true,
                  price: true,
                },
              },
            },
          },
        },
      });

      if (!cart || cart.items.length === 0) {
        return NextResponse.json({ ok: true });
      }

      const subtotalFallback = toDecimalFromCents(session.amount_subtotal);
      const total = toDecimalFromCents(session.amount_total);
      const subtotal = parseMetadataAmount(metadata.subtotal, subtotalFallback);
      const shipping = parseMetadataAmount(metadata.shipping, 0);
      const tax = parseMetadataAmount(metadata.tax, 0);
      const currency = (session.currency || cart.currency || "usd").toUpperCase();

      const customer = await prisma.customer.upsert({
        where: {
          storeId_email: {
            storeId,
            email,
          },
        },
        update: {
          firstName,
          lastName,
          phone,
        },
        create: {
          storeId,
          email,
          firstName,
          lastName,
          phone,
        },
        select: { id: true },
      });

      const paymentIntentId = typeof session.payment_intent === "string"
        ? session.payment_intent
        : null;

      const order = await prisma.$transaction(async (tx) => {
        const createdOrder = await tx.order.create({
          data: {
            storeId,
            customerId: customer.id,
            customerEmail: email,
            status: "PENDING",
            paymentStatus: "PAID",
            subtotal,
            tax,
            shipping,
            total,
            currency,
            stripeSessionId: session.id,
            stripePaymentId: paymentIntentId,
            paymentMethod: "card",
            paymentProvider: "stripe",
            gatewayTransactionId: paymentIntentId,
            items: {
              create: cart.items.map((item) => ({
                title: item.variant.title,
                price: Number(item.variant.price),
                quantity: item.quantity,
                variantId: item.variant.id,
              })),
            },
          },
          select: {
            id: true,
            orderNumber: true,
            total: true,
            currency: true,
          },
        });

        await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

        return createdOrder;
      });

      const storeConfig = await getStoreEmailConfig(storeId);
      if (storeConfig?.orderConfirmationEmailEnabled) {
        try {
          await sendOrderConfirmationEmail({
            store: storeConfig,
            to: email,
            firstName,
            orderNumber: order.orderNumber,
            total: Number(order.total),
            currency: order.currency,
          });
        } catch (emailError) {
          console.error("[ORDER_CONFIRMATION_EMAIL_ERROR]", emailError);
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[STRIPE_WEBHOOK_ERROR]", error);
    return NextResponse.json({ error: "Webhook handling failed" }, { status: 500 });
  }
}
