import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendAbandonedCartRecoveryEmail } from "@/lib/email-notifications";
import { getCurrentUserFromRequest, getCurrentCashierFromRequest } from "@/lib/session";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(req: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const user = await getCurrentUserFromRequest(req);
    const cashier = getCurrentCashierFromRequest(req);

    if (!user && !cashier) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const cart = await prisma.cart.findUnique({
      where: { id },
      include: {
        store: {
          select: {
            id: true,
            name: true,
            slug: true,
            currency: true,
            ownerUserId: true,
            ownerId: true,
            senderName: true,
            senderEmail: true,
            replyToEmail: true,
          },
        },
        customer: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            shippingAddress: true,
            billingAddress: true,
          },
        },
        items: {
          include: {
            variant: {
              select: {
                id: true,
                title: true,
                price: true,
                costPrice: true,
                stockStatus: true,
                product: {
                  select: {
                    id: true,
                    title: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!cart) {
      return NextResponse.json({ error: "Cart not found" }, { status: 404 });
    }

    if (cashier && cart.storeId !== cashier.storeId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (
      !cashier &&
      user &&
      cart.store.ownerUserId !== user.id &&
      cart.store.ownerId !== user.id
    ) {
      return NextResponse.json({ error: "Cart not found" }, { status: 404 });
    }

    if (cart.items.length === 0) {
      return NextResponse.json({ error: "Cart has no items" }, { status: 400 });
    }

    const body = (await req.json()) as {
      action?: "send_recovery_email" | "convert_to_order";
      email?: string;
      customerName?: string;
      customMessage?: string;
    };

    const resolvedItems = cart.items.map((item) => {
      const productTitle = item.variant.product.title;
      const variantTitle = item.variant.title;
      const fullTitle =
        variantTitle &&
        variantTitle.toLowerCase() !== "default" &&
        variantTitle.toLowerCase() !== productTitle.toLowerCase()
          ? `${productTitle} (${variantTitle})`
          : productTitle;
      const price = Number(item.variant.price);
      return {
        variantId: item.variantId,
        title: fullTitle,
        quantity: item.quantity,
        price,
        costPrice: item.variant.costPrice ? Number(item.variant.costPrice) : null,
      };
    });

    const subtotal = resolvedItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );

    if (body.action === "send_recovery_email") {
      const targetEmail = (body.email?.trim() || cart.customer?.email || "").trim();
      if (!targetEmail || !targetEmail.includes("@")) {
        return NextResponse.json(
          { error: "A valid customer email is required to send a recovery email." },
          { status: 400 },
        );
      }

      const customerName =
        body.customerName?.trim() ||
        [cart.customer?.firstName, cart.customer?.lastName].filter(Boolean).join(" ") ||
        null;

      const emailResult = await sendAbandonedCartRecoveryEmail({
        to: targetEmail,
        customerName,
        customMessage: body.customMessage,
        store: {
          name: cart.store.name,
          slug: cart.store.slug,
          senderName: cart.store.senderName,
          senderEmail: cart.store.senderEmail,
          replyToEmail: cart.store.replyToEmail,
        },
        currency: cart.currency || cart.store.currency || "USD",
        subtotal,
        items: resolvedItems.map((i) => ({
          title: i.title,
          quantity: i.quantity,
          price: i.price,
        })),
      });

      return NextResponse.json({
        ok: true,
        sentTo: targetEmail,
        simulated: emailResult.simulated,
      });
    }

    if (body.action === "convert_to_order") {
      const targetEmail = (
        body.email?.trim() ||
        cart.customer?.email ||
        "guest@storefront.local"
      )
        .trim()
        .toLowerCase();

      const createdOrder = await prisma.$transaction(async (tx) => {
        let customerId = cart.customerId;
        if (!customerId && targetEmail !== "guest@storefront.local") {
          const customer = await tx.customer.upsert({
            where: {
              storeId_email: {
                storeId: cart.storeId,
                email: targetEmail,
              },
            },
            update: {},
            create: {
              storeId: cart.storeId,
              email: targetEmail,
              firstName: body.customerName?.trim() || null,
            },
            select: { id: true },
          });
          customerId = customer.id;
        }

        const order = await tx.order.create({
          data: {
            storeId: cart.storeId,
            customerId,
            customerEmail: targetEmail,
            status: "PENDING",
            paymentStatus: "UNPAID",
            fulfillmentStatus: "UNFULFILLED",
            paymentProvider: "manual",
            subtotal,
            tax: 0,
            shipping: 0,
            total: subtotal,
            currency: cart.currency || cart.store.currency || "USD",
            shippingAddress: cart.customer?.shippingAddress ?? undefined,
            billingAddress: cart.customer?.billingAddress ?? undefined,
            items: {
              create: resolvedItems.map((item) => ({
                variantId: item.variantId,
                title: item.title,
                price: item.price,
                quantity: item.quantity,
                costPrice: item.costPrice,
              })),
            },
          },
          select: {
            id: true,
            orderNumber: true,
          },
        });

        for (const item of resolvedItems) {
          if (item.variantId && item.quantity > 0) {
            await tx.productVariant.updateMany({
              where: {
                id: item.variantId,
                stockStatus: "IN_STOCK",
              },
              data: {
                inventory: {
                  decrement: item.quantity,
                },
              },
            });
          }
        }

        await tx.cart.delete({ where: { id: cart.id } });

        return order;
      });

      return NextResponse.json({
        ok: true,
        orderId: createdOrder.id,
        orderNumber: createdOrder.orderNumber,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("[ABANDONED_CART_ACTION_ERROR]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process cart action" },
      { status: 500 },
    );
  }
}

export async function DELETE(req: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const user = await getCurrentUserFromRequest(req);
    const cashier = getCurrentCashierFromRequest(req);

    if (!user && !cashier) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const existing = await prisma.cart.findUnique({
      where: { id },
      include: {
        store: { select: { id: true, ownerUserId: true, ownerId: true } },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Cart not found" }, { status: 404 });
    }

    if (cashier && existing.storeId !== cashier.storeId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (
      !cashier &&
      user &&
      existing.store.ownerUserId !== user.id &&
      existing.store.ownerId !== user.id
    ) {
      return NextResponse.json({ error: "Cart not found" }, { status: 404 });
    }

    await prisma.cart.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[ABANDONED_CART_DELETE_ERROR]", error);
    return NextResponse.json({ error: "Failed to delete cart" }, { status: 500 });
  }
}
