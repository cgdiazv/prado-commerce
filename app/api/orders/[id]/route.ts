import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserFromRequest } from "@/lib/session";
import { getStoreEmailConfig, sendInvoiceEmail } from "@/lib/email-notifications";

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
    const { status, paymentStatus } = body as {
      status?: string;
      paymentStatus?: string;
    };

    const updates: {
      status?: "PENDING" | "PROCESSING" | "COMPLETED" | "CANCELLED";
      paymentStatus?: "UNPAID" | "PAID" | "REFUNDED" | "FAILED";
    } = {};

    const validStatuses = ["PENDING", "PROCESSING", "COMPLETED", "CANCELLED"] as const;
    const validPaymentStatuses = ["UNPAID", "PAID", "REFUNDED", "FAILED"] as const;

    if (status !== undefined) {
      const upperStatus = status.toUpperCase();
      if (!validStatuses.includes(upperStatus as any)) {
        return NextResponse.json({ error: "Invalid order status" }, { status: 400 });
      }
      updates.status = upperStatus as any;
    }

    if (paymentStatus !== undefined) {
      const upperPaymentStatus = paymentStatus.toUpperCase();
      if (!validPaymentStatuses.includes(upperPaymentStatus as any)) {
        return NextResponse.json({ error: "Invalid payment status" }, { status: 400 });
      }
      updates.paymentStatus = upperPaymentStatus as any;
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

    return NextResponse.json({
      ok: true,
      order: {
        id: updatedOrder.id,
        status: updatedOrder.status,
        paymentStatus: updatedOrder.paymentStatus,
      },
    });
  } catch (error) {
    console.error("[ORDER_PATCH_ERROR]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
