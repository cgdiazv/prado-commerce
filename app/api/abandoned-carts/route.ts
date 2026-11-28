import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserFromRequest, getCurrentCashierFromRequest } from "@/lib/session";

export async function GET(req: Request) {
  try {
    const user = await getCurrentUserFromRequest(req);
    const cashier = getCurrentCashierFromRequest(req);

    if (!user && !cashier) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const requestedStoreId = searchParams.get("storeId");

    const stores = cashier
      ? await prisma.store.findMany({
          where: { id: cashier.storeId },
          select: { id: true, name: true, slug: true, currency: true },
        })
      : await prisma.store.findMany({
          where: { OR: [{ ownerUserId: user!.id }, { ownerId: user!.id }] },
          select: { id: true, name: true, slug: true, currency: true },
        });

    const allowedStoreIds = stores.map((s) => s.id);
    if (allowedStoreIds.length === 0) {
      return NextResponse.json([]);
    }

    const targetStoreIds =
      requestedStoreId && requestedStoreId !== "ALL"
        ? allowedStoreIds.filter((id) => id === requestedStoreId)
        : allowedStoreIds;

    if (targetStoreIds.length === 0) {
      return NextResponse.json([]);
    }

    const carts = await prisma.cart.findMany({
      where: {
        storeId: { in: targetStoreIds },
        items: { some: {} },
      },
      include: {
        store: {
          select: { id: true, name: true, slug: true, currency: true },
        },
        customer: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
        items: {
          include: {
            variant: {
              select: {
                id: true,
                title: true,
                sku: true,
                price: true,
                product: {
                  select: {
                    id: true,
                    title: true,
                  },
                },
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    const nowMs = Date.now();
    const serialized = carts.map((cart) => {
      const items = cart.items.map((item) => {
        const productTitle = item.variant.product.title;
        const variantTitle = item.variant.title;
        const fullTitle =
          variantTitle &&
          variantTitle.toLowerCase() !== "default" &&
          variantTitle.toLowerCase() !== productTitle.toLowerCase()
            ? `${productTitle} (${variantTitle})`
            : productTitle;
        const unitPrice = Number(item.variant.price);
        return {
          id: item.id,
          variantId: item.variantId,
          title: fullTitle,
          sku: item.variant.sku,
          quantity: item.quantity,
          price: unitPrice.toFixed(2),
          lineTotal: (unitPrice * item.quantity).toFixed(2),
        };
      });

      const itemsCount = items.reduce((sum, i) => sum + i.quantity, 0);
      const subtotal = items.reduce((sum, i) => sum + Number(i.lineTotal), 0);
      const idleMinutes = Math.max(
        0,
        Math.floor((nowMs - cart.updatedAt.getTime()) / 60000),
      );

      return {
        id: cart.id,
        token: cart.token,
        storeId: cart.storeId,
        storeName: cart.store.name,
        storeSlug: cart.store.slug,
        customerId: cart.customerId,
        customerEmail: cart.customer?.email ?? null,
        customerName:
          [cart.customer?.firstName, cart.customer?.lastName]
            .filter(Boolean)
            .join(" ") || null,
        customerPhone: cart.customer?.phone ?? null,
        currency: cart.currency || cart.store.currency || "USD",
        itemsCount,
        subtotal: subtotal.toFixed(2),
        status: idleMinutes >= 30 ? ("ABANDONED" as const) : ("ACTIVE" as const),
        idleMinutes,
        items,
        createdAt: cart.createdAt.toISOString(),
        updatedAt: cart.updatedAt.toISOString(),
      };
    });

    return NextResponse.json(serialized);
  } catch (error) {
    console.error("[ABANDONED_CARTS_GET_ERROR]", error);
    return NextResponse.json({ error: "Failed to load abandoned carts" }, { status: 500 });
  }
}
