import { NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { chargeAuthorizeNetOpaquePayment } from "@/lib/authorizenet";
import { decryptStoredSecret } from "@/lib/credentials";
import { getShopperSessionCookieValueFromRequest } from "@/lib/shopper-auth";
import { getStoreEmailConfig, sendOrderConfirmationEmail } from "@/lib/email-notifications";
import { findSensitivePaymentField } from "@/lib/payment-pci-guard";

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

function toDecimal(value: number) {
  return Number(value.toFixed(2));
}

type FinalizeOrderInput = {
  cartId: string;
  storeId: string;
  customerEmail: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  shippingAddress: unknown;
  billingAddress: unknown;
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  currency: string;
  paymentMethod: string;
  paymentProvider: string;
  gatewayTransactionId: string | null;
  items: Array<{
    quantity: number;
    variant: {
      id: string;
      title: string;
      price: unknown;
    };
  }>;
};

async function finalizeOrder({
  cartId,
  storeId,
  customerEmail,
  firstName,
  lastName,
  phone,
  shippingAddress,
  billingAddress,
  subtotal,
  shipping,
  tax,
  total,
  currency,
  paymentMethod,
  paymentProvider,
  gatewayTransactionId,
  items,
}: FinalizeOrderInput) {
  const customer = await prisma.customer.upsert({
    where: {
      storeId_email: {
        storeId,
        email: customerEmail,
      },
    },
    update: {
      firstName,
      lastName,
      phone,
      shippingAddress: shippingAddress ?? undefined,
      billingAddress: billingAddress ?? undefined,
    },
    create: {
      storeId,
      email: customerEmail,
      firstName,
      lastName,
      phone,
      shippingAddress: shippingAddress ?? undefined,
      billingAddress: billingAddress ?? undefined,
    },
    select: { id: true },
  });

  const order = await prisma.$transaction(async (tx) => {
    const createdOrder = await tx.order.create({
      data: {
        storeId,
        customerId: customer.id,
        customerEmail,
        status: "PENDING",
        paymentStatus: paymentProvider === "manual" ? "UNPAID" : "PAID",
        subtotal,
        tax,
        shipping,
        total,
        currency,
        shippingAddress: shippingAddress ?? undefined,
        billingAddress: billingAddress ?? undefined,
        paymentMethod,
        paymentProvider,
        gatewayTransactionId: gatewayTransactionId ?? null,
        items: {
          create: items.map((item) => ({
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
        createdAt: true,
      },
    });

    await tx.cartItem.deleteMany({
      where: { cartId },
    });

    await tx.cart.update({
      where: { id: cartId },
      data: {
        currency,
      },
    });

    return createdOrder;
  });

  const storeConfig = await getStoreEmailConfig(storeId);
  if (storeConfig?.orderConfirmationEmailEnabled) {
    try {
      await sendOrderConfirmationEmail({
        store: storeConfig,
        to: customerEmail,
        firstName,
        orderNumber: order.orderNumber,
        total: Number(order.total),
        currency: order.currency,
      });
    } catch (emailError) {
      console.error("[ORDER_CONFIRMATION_EMAIL_ERROR]", emailError);
    }
  }

  return order;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const sensitivePaymentField = findSensitivePaymentField(body);

    if (sensitivePaymentField) {
      return NextResponse.json(
        {
          error: `Do not send raw card data to Prado Commerce. Use Stripe-hosted checkout only. Rejected field: ${sensitivePaymentField.path}`,
        },
        { status: 400 },
      );
    }

    const shopperSession = getShopperSessionCookieValueFromRequest(request);

    if (!shopperSession?.storeId || !shopperSession.customerId) {
      return NextResponse.json({ error: "Please sign in to checkout" }, { status: 401 });
    }

    const cartId = String(body?.cartId || "").trim();
    const email = String(body?.email || "").trim().toLowerCase();
    const firstName = String(body?.firstName || "").trim() || null;
    const lastName = String(body?.lastName || "").trim() || null;
    const phone = String(body?.phone || "").trim() || null;
    const shippingAddress = body?.shippingAddress ?? null;
    const billingAddress = body?.billingAddress ?? null;
    const shippingAmount = Number(body?.shippingAmount ?? 0);
    const taxAmount = Number(body?.taxAmount ?? 0);
    const paymentMethod = String(body?.paymentMethod || "card").trim().toLowerCase();
    const paymentProvider = String(body?.paymentProvider || "").trim().toLowerCase();
    const authorizeNetOpaqueData = body?.authorizeNetOpaqueData ?? null;

    if (!cartId) {
      return NextResponse.json({ error: "cartId is required" }, { status: 400 });
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Please provide a valid email address" }, { status: 400 });
    }

    let cart: {
      id: string;
      storeId: string;
      currency: string | null;
      store: {
        stripeConnectAccountId: string | null;
        stripeChargesEnabled: boolean;
        stripePayoutsEnabled: boolean;
        authNetLoginId: string | null;
        authNetClientKey: string | null;
        authNetTransKeyEncrypted: string | null;
        authNetEnv: string;
      } | null;
      items: {
        quantity: number;
        variant: {
          id: string;
          title: string;
          price: unknown;
        };
      }[];
    } | null = null;

    try {
      cart = await prisma.cart.findFirst({
        where: {
          id: cartId,
          storeId: shopperSession.storeId,
          // accept both shopper-owned carts and anonymous carts created by the embeddable cart
          OR: [
            { customerId: shopperSession.customerId },
            { customerId: null },
          ],
        },
        select: {
          id: true,
          storeId: true,
          currency: true,
          store: {
            select: {
              stripeConnectAccountId: true,
              stripeChargesEnabled: true,
              stripePayoutsEnabled: true,
              authNetLoginId: true,
              authNetClientKey: true,
              authNetTransKeyEncrypted: true,
              authNetEnv: true,
            },
          },
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
    } catch (error: unknown) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "P2022"
      ) {
        const legacyCart = await prisma.cart.findFirst({
          where: {
            id: cartId,
            storeId: shopperSession.storeId,
            OR: [
              { customerId: shopperSession.customerId },
              { customerId: null },
            ],
          },
          select: {
            id: true,
            storeId: true,
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

        cart = legacyCart
          ? {
              ...legacyCart,
              store: {
                stripeConnectAccountId: null,
                stripeChargesEnabled: false,
                stripePayoutsEnabled: false,
                authNetLoginId: null,
                authNetClientKey: null,
                authNetTransKeyEncrypted: null,
                authNetEnv: "sandbox",
              },
            }
          : null;
      } else {
        throw error;
      }
    }

    if (!cart) {
      return NextResponse.json({ error: "Cart not found" }, { status: 404 });
    }

    if (cart.items.length === 0) {
      return NextResponse.json({ error: "Your cart is empty" }, { status: 400 });
    }

    const subtotal = toDecimal(
      cart.items.reduce((sum, item) => sum + Number(item.variant.price) * item.quantity, 0),
    );
    const shipping = toDecimal(Math.max(0, shippingAmount));
    const tax = toDecimal(Math.max(0, taxAmount));
    const total = toDecimal(subtotal + shipping + tax);

    const stripeReady = Boolean(
      cart.store?.stripeConnectAccountId && cart.store?.stripeChargesEnabled && cart.store?.stripePayoutsEnabled,
    );
    const authNetReady = Boolean(
      cart.store?.authNetLoginId &&
      cart.store?.authNetClientKey &&
      cart.store?.authNetTransKeyEncrypted,
    );

    if (paymentMethod === "card") {
      const resolvedProvider = paymentProvider === "authorize_net"
        ? "authorize_net"
        : stripeReady
          ? "stripe"
          : authNetReady
            ? "authorize_net"
            : null;

      if (resolvedProvider === "stripe") {
        if (!stripe) {
          return NextResponse.json({ error: "Card payments are not configured yet." }, { status: 500 });
        }

        const stripeDestinationAccountId = cart.store?.stripeConnectAccountId;
        if (!stripeDestinationAccountId) {
          return NextResponse.json(
            { error: "This store is not ready to accept online card payments yet." },
            { status: 400 },
          );
        }

        const currencyCode = (cart.currency || "USD").toLowerCase();
        const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = cart.items.map((item) => ({
          quantity: item.quantity,
          price_data: {
            currency: currencyCode,
            unit_amount: Math.round(Number(item.variant.price) * 100),
            product_data: {
              name: item.variant.title,
            },
          },
        }));

        if (shipping > 0) {
          lineItems.push({
            quantity: 1,
            price_data: {
              currency: currencyCode,
              unit_amount: Math.round(shipping * 100),
              product_data: {
                name: "Shipping",
              },
            },
          });
        }

        if (tax > 0) {
          lineItems.push({
            quantity: 1,
            price_data: {
              currency: currencyCode,
              unit_amount: Math.round(tax * 100),
              product_data: {
                name: "Tax",
              },
            },
          });
        }

        const appUrl = resolveAppUrl(request);
        const session = await stripe.checkout.sessions.create({
          mode: "payment",
          payment_method_types: ["card"],
          customer_email: email,
          line_items: lineItems,
          success_url: `${appUrl}/checkout/${cart.id}/success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${appUrl}/checkout/${cart.id}?payment=cancelled`,
          metadata: {
            storeId: cart.storeId,
            cartId: cart.id,
            email,
            firstName: firstName ?? "",
            lastName: lastName ?? "",
            phone: phone ?? "",
            subtotal: subtotal.toFixed(2),
            shipping: shipping.toFixed(2),
            tax: tax.toFixed(2),
            total: total.toFixed(2),
          },
          payment_intent_data: {
            transfer_data: {
              destination: stripeDestinationAccountId,
            },
          },
        });

        return NextResponse.json({
          ok: true,
          checkoutUrl: session.url,
          sessionId: session.id,
        });
      }

      if (resolvedProvider === "authorize_net") {
        const opaqueDataValue = String(authorizeNetOpaqueData?.dataValue || "").trim();
        const opaqueDataDescriptor = String(authorizeNetOpaqueData?.dataDescriptor || "").trim();

        if (!opaqueDataValue || !opaqueDataDescriptor) {
          return NextResponse.json(
            { error: "Authorize.net tokenization is required for card payments." },
            { status: 400 },
          );
        }

        const transactionKey = decryptStoredSecret(cart.store?.authNetTransKeyEncrypted || "");
        const charge = await chargeAuthorizeNetOpaquePayment({
          loginId: cart.store?.authNetLoginId,
          transactionKey,
          environment: cart.store?.authNetEnv || "sandbox",
          amount: total,
          opaqueData: {
            dataDescriptor: opaqueDataDescriptor,
            dataValue: opaqueDataValue,
          },
          orderNumber: `${cart.storeId.slice(0, 8)}-${Date.now().toString().slice(-8)}`,
        });

        const order = await finalizeOrder({
          cartId: cart.id,
          storeId: shopperSession.storeId,
          customerEmail: email,
          firstName,
          lastName,
          phone,
          shippingAddress,
          billingAddress,
          subtotal,
          shipping,
          tax,
          total,
          currency: cart.currency || "USD",
          paymentMethod: "card",
          paymentProvider: "authorize_net",
          gatewayTransactionId: charge.transactionId,
          items: cart.items,
        });

        return NextResponse.json({
          ok: true,
          order: {
            id: order.id,
            orderNumber: order.orderNumber,
            total: Number(order.total),
            currency: order.currency,
            createdAt: order.createdAt.toISOString(),
          },
        }, { status: 201 });
      }

      return NextResponse.json(
        { error: "This store is not ready to accept online card payments yet." },
        { status: 400 },
      );
    }

    const order = await finalizeOrder({
      cartId: cart.id,
      storeId: shopperSession.storeId,
      customerEmail: email,
      firstName,
      lastName,
      phone,
      shippingAddress,
      billingAddress,
      subtotal,
      shipping,
      tax,
      total,
      currency: cart.currency || "USD",
      paymentMethod,
      paymentProvider: "manual",
      gatewayTransactionId: null,
      items: cart.items,
    });

    return NextResponse.json({
      ok: true,
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        total: Number(order.total),
        currency: order.currency,
        createdAt: order.createdAt.toISOString(),
      },
    }, { status: 201 });
  } catch (error) {
    console.error("[SHOPPER_CHECKOUT_POST_ERROR]", error);
    return NextResponse.json({ error: "Failed to create your order" }, { status: 500 });
  }
}
