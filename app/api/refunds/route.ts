import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  backfillLegacyRefundedOrders,
  insertRefundRecord,
  listRefundsForStores,
} from "@/lib/refunds-db";
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
          select: { id: true, name: true, currency: true },
        })
      : await prisma.store.findMany({
          where: { OR: [{ ownerUserId: user!.id }, { ownerId: user!.id }] },
          select: { id: true, name: true, currency: true },
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

    await backfillLegacyRefundedOrders(
      targetStoreIds,
      cashier?.cashierEmail ?? user?.email ?? null,
    );

    const refunds = await listRefundsForStores(targetStoreIds);
    return NextResponse.json(refunds);
  } catch (error) {
    console.error("[REFUNDS_GET_ERROR]", error);
    return NextResponse.json({ error: "Failed to load refunds" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUserFromRequest(req);
    const cashier = getCurrentCashierFromRequest(req);

    if (!user && !cashier) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as {
      orderId?: string;
      refundAmount?: number | string;
      reason?: string;
      cancelOrder?: boolean;
      restockItems?: Array<{
        itemId?: string;
        variantId?: string | null;
        quantity?: number | string;
      }>;
    };

    if (!body.orderId) {
      return NextResponse.json({ error: "orderId is required" }, { status: 400 });
    }

    const order = await prisma.order.findUnique({
      where: { id: body.orderId },
      include: {
        store: { select: { id: true, name: true, ownerUserId: true, ownerId: true, currency: true } },
        customer: { select: { firstName: true, lastName: true } },
        items: {
          select: {
            id: true,
            title: true,
            price: true,
            quantity: true,
            variantId: true,
            variant: {
              select: { id: true, stockStatus: true },
            },
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (cashier && order.storeId !== cashier.storeId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!cashier && user && order.store.ownerUserId !== user.id && order.store.ownerId !== user.id) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const orderTotalNum = Number(order.total);
    const parsedAmount =
      body.refundAmount !== undefined && Number.isFinite(Number(body.refundAmount))
        ? Math.min(Math.max(0, Number(body.refundAmount)), orderTotalNum)
        : orderTotalNum;

    const createdRefund = await prisma.$transaction(async (tx) => {
      let restockedCount = 0;
      const refundedItemsLog: Array<{
        itemId: string;
        variantId: string | null;
        title: string;
        quantity: number;
        price: number;
      }> = [];

      if (Array.isArray(body.restockItems)) {
        for (const entry of body.restockItems) {
          const rawQty = Math.trunc(Number(entry.quantity) || 0);
          if (rawQty <= 0) continue;
          const matchedItem =
            (entry.itemId ? order.items.find((i) => i.id === entry.itemId) : undefined) ??
            (entry.variantId ? order.items.find((i) => i.variantId === entry.variantId) : undefined);
          if (!matchedItem) continue;
          const qtyToRestock = Math.min(Math.max(0, rawQty), matchedItem.quantity);
          if (qtyToRestock > 0) {
            refundedItemsLog.push({
              itemId: matchedItem.id,
              variantId: matchedItem.variantId ?? null,
              title: matchedItem.title,
              quantity: qtyToRestock,
              price: Number(matchedItem.price),
            });
          }
          if (
            qtyToRestock > 0 &&
            matchedItem.variantId &&
            matchedItem.variant?.stockStatus !== "ON_BACKORDER"
          ) {
            await tx.productVariant.update({
              where: { id: matchedItem.variantId },
              data: {
                inventory: { increment: qtyToRestock },
              },
            });
            restockedCount += qtyToRestock;
          }
        }
      }

      const totalOrderedUnits = order.items.reduce((sum, i) => sum + i.quantity, 0);
      const isPartial =
        parsedAmount < orderTotalNum - 0.009 ||
        (Array.isArray(body.restockItems) &&
          restockedCount > 0 &&
          restockedCount < totalOrderedUnits);

      await tx.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: "REFUNDED",
          ...(body.cancelOrder ? { status: "CANCELLED" } : {}),
        },
      });

      const refund = await insertRefundRecord(tx, {
        storeId: order.storeId,
        orderId: order.id,
        type: isPartial ? "PARTIAL" : "FULL",
        amount: parsedAmount,
        currency: order.currency,
        restockedUnits: restockedCount,
        reason: typeof body.reason === "string" && body.reason.trim() ? body.reason.trim() : null,
        items: refundedItemsLog,
        processedBy: cashier?.cashierEmail ?? user?.email ?? null,
      });

      return refund;
    });

    return NextResponse.json({
      id: createdRefund.id,
      refundNumber: createdRefund.refundNumber,
      storeId: createdRefund.storeId,
      storeName: order.store.name,
      orderId: order.id,
      orderNumber: order.orderNumber,
      customerEmail: order.customerEmail,
      customerName:
        [order.customer?.firstName, order.customer?.lastName].filter(Boolean).join(" ") || null,
      orderTotal: order.total.toString(),
      orderStatus: body.cancelOrder ? "CANCELLED" : order.status,
      type: createdRefund.type,
      amount: createdRefund.amount,
      currency: createdRefund.currency,
      restockedUnits: createdRefund.restockedUnits,
      reason: createdRefund.reason,
      items: createdRefund.items,
      processedBy: createdRefund.processedBy,
      createdAt: createdRefund.createdAt.toISOString(),
    });
  } catch (error) {
    console.error("[REFUNDS_POST_ERROR]", error);
    return NextResponse.json({ error: "Failed to record refund" }, { status: 500 });
  }
}
