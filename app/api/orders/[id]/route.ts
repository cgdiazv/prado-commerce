import { after, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserFromRequest, getCurrentCashierFromRequest } from "@/lib/session";
import { getStoreEmailConfig, sendInvoiceEmail } from "@/lib/email-notifications";
import { syncPaidOrderToShipStation } from "@/lib/shipstation";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(req: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const user = await getCurrentUserFromRequest(req);
    const cashier = getCurrentCashierFromRequest(req);

    if (!user && !cashier) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        store: {
          select: { id: true, ownerUserId: true },
        },
        items: {
          select: {
            variantId: true,
            quantity: true,
            variant: {
              select: {
                id: true,
                trackInventory: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (cashier && order.storeId !== cashier.storeId) {
      return NextResponse.json(
        { error: "Forbidden: You are not authorized to modify orders from another store." },
        { status: 403 },
      );
    }

    if (!cashier && user && order.store.ownerUserId !== user.id) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const body = await req.json();
    const { status, paymentStatus, fulfillmentStatus, restock } = body as {
      status?: string;
      paymentStatus?: string;
      fulfillmentStatus?: string;
      restock?: boolean;
    };

    const updates: {
      status?: "PENDING" | "PROCESSING" | "COMPLETED" | "CANCELLED";
      paymentStatus?: "UNPAID" | "PARTIAL" | "PAID" | "REFUNDED" | "FAILED";
      fulfillmentStatus?: "UNFULFILLED" | "SHIPPED";
      shippedAt?: Date | null;
    } = {};

    const validStatuses = ["PENDING", "PROCESSING", "COMPLETED", "CANCELLED"] as const;
    const validPaymentStatuses = ["UNPAID", "PARTIAL", "PAID", "REFUNDED", "FAILED"] as const;
    const validFulfillmentStatuses = ["UNFULFILLED", "SHIPPED"] as const;

    const isOrderStatus = (value: string): value is (typeof validStatuses)[number] =>
      validStatuses.some((statusValue) => statusValue === value);
    const isPaymentStatus = (value: string): value is (typeof validPaymentStatuses)[number] =>
      validPaymentStatuses.some((statusValue) => statusValue === value);
    const isFulfillmentStatus = (value: string): value is (typeof validFulfillmentStatuses)[number] =>
      validFulfillmentStatuses.some((statusValue) => statusValue === value);

    if (status !== undefined) {
      const upperStatus = status.toUpperCase();
      if (!isOrderStatus(upperStatus)) {
        return NextResponse.json({ error: "Invalid order status" }, { status: 400 });
      }
      updates.status = upperStatus;
      if (upperStatus === "COMPLETED" && order.fulfillmentStatus === "UNFULFILLED" && !fulfillmentStatus) {
        updates.fulfillmentStatus = "SHIPPED";
        if (!order.shippedAt) {
          updates.shippedAt = new Date();
        }
      }
    }

    if (paymentStatus !== undefined) {
      const upperPaymentStatus = paymentStatus.toUpperCase();
      if (!isPaymentStatus(upperPaymentStatus)) {
        return NextResponse.json({ error: "Invalid payment status" }, { status: 400 });
      }
      updates.paymentStatus = upperPaymentStatus;
    }

    if (fulfillmentStatus !== undefined) {
      const upperFulfillment = fulfillmentStatus.toUpperCase();
      if (!isFulfillmentStatus(upperFulfillment)) {
        return NextResponse.json({ error: "Invalid fulfillment status" }, { status: 400 });
      }
      updates.fulfillmentStatus = upperFulfillment;
      if (upperFulfillment === "SHIPPED" && !order.shippedAt) {
        updates.shippedAt = new Date();
      }
    }

    if (Object.keys(updates).length === 0 && !restock) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    let restockedCount = 0;
    const updatedOrder = await prisma.$transaction(async (tx) => {
      const saved = Object.keys(updates).length > 0
        ? await tx.order.update({
            where: { id },
            data: updates,
          })
        : order;

      if (restock) {
        for (const item of order.items) {
          if (item.variantId && item.variant?.trackInventory) {
            await tx.productVariant.update({
              where: { id: item.variantId },
              data: {
                inventory: {
                  increment: item.quantity,
                },
              },
            });
            restockedCount += item.quantity;
          }
        }
      }

      return saved;
    });

    const becamePaid = updates.paymentStatus === "PAID" && order.paymentStatus !== "PAID";
    const becameCompleted = updates.status === "COMPLETED" && order.status !== "COMPLETED";

    if (becamePaid || becameCompleted) {
      const storeConfig = await getStoreEmailConfig(order.storeId);

      if (storeConfig?.invoiceEmailEnabled) {
        try {
          await sendInvoiceEmail({
            store: storeConfig,
            to: order.customerEmail,
            orderNumber: updatedOrder.orderNumber,
            total: Number(updatedOrder.total),
            currency: updatedOrder.currency,
          });
        } catch (emailError) {
          console.error("[INVOICE_EMAIL_ERROR]", emailError);
        }
      }
    }

    if (becamePaid) {
      after(() => syncPaidOrderToShipStation(updatedOrder.id).catch((error) => {
        console.error("[SHIPSTATION_ORDER_SYNC_ERROR]", error);
      }));
    }

    return NextResponse.json({
      ok: true,
      order: {
        id: updatedOrder.id,
        status: updatedOrder.status,
        paymentStatus: updatedOrder.paymentStatus,
        fulfillmentStatus: updatedOrder.fulfillmentStatus,
      },
      restocked: Boolean(restock),
      restockedCount,
    });
  } catch (error) {
    console.error("[ORDER_PATCH_ERROR]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
