import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getShopperSessionCookieValueFromRequest } from "@/lib/shopper-auth";
import { getStoreEmailConfig, sendOrderConfirmationEmail } from "@/lib/email-notifications";

function toDecimal(value: number) {
  return Number(value.toFixed(2));
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
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

    if (!cartId) {
      return NextResponse.json({ error: "cartId is required" }, { status: 400 });
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Please provide a valid email address" }, { status: 400 });
    }

    const cart = await prisma.cart.findFirst({
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

    const customer = await prisma.customer.upsert({
      where: {
        storeId_email: {
          storeId: shopperSession.storeId,
          email,
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
        storeId: shopperSession.storeId,
        email,
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
          storeId: shopperSession.storeId,
          customerId: customer.id,
          customerEmail: email,
          status: "PENDING",
          paymentStatus: "UNPAID",
          subtotal,
          tax,
          shipping,
          total,
          currency: cart.currency || "USD",
          shippingAddress: shippingAddress ?? undefined,
          billingAddress: billingAddress ?? undefined,
          paymentMethod,
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
          createdAt: true,
        },
      });

      await tx.cartItem.deleteMany({
        where: { cartId },
      });

      await tx.cart.update({
        where: { id: cartId },
        data: {
          currency: cart.currency || "USD",
        },
      });

      return createdOrder;
    });

    const storeConfig = await getStoreEmailConfig(shopperSession.storeId);
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
