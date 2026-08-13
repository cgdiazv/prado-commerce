import { after, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserFromRequest } from "@/lib/session";
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

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        store: {
          select: { ownerUserId: true },
        },
      },
    });

    if (!order || order.store.ownerUserId !== user.id) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const body = await req.json();
    const { status, paymentStatus, fulfillmentStatus } = body as {
      status?: string;
      paymentStatus?: string;
      fulfillmentStatus?: string;
    };

    const updates: {
      status?: "PENDING" | "PROCESSING" | "COMPLETED" | "CANCELLED";
      paymentStatus?: "UNPAID" | "PAID" | "REFUNDED" | "FAILED";
      fulfillmentStatus?: "UNFULFILLED" | "SHIPPED";
      shippedAt?: Date | null;
    } = {};

    const validStatuses = ["PENDING", "PROCESSING", "COMPLETED", "CANCELLED"] as const;
    const validPaymentStatuses = ["UNPAID", "PAID", "REFUNDED", "FAILED"] as const;
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

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: updates,
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
    });
  } catch (error) {
    console.error("[ORDER_PATCH_ERROR]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
