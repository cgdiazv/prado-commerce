import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentCashierFromRequest, getCurrentUserFromRequest } from "@/lib/session";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const user = await getCurrentUserFromRequest(request);
    const cashier = getCurrentCashierFromRequest(request);
    if (!user && !cashier) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const quote = await prisma.quote.findFirst({
      where: cashier
        ? { id, storeId: cashier.storeId }
        : { id, store: { ownerUserId: user!.id } },
      include: { items: true },
    });
    if (!quote) return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    if (quote.status === "CONVERTED" && quote.convertedOrderId) {
      return NextResponse.json(
        { error: "Quote already converted", orderId: quote.convertedOrderId },
        { status: 409 },
      );
    }

    const order = await prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          storeId: quote.storeId,
          customerId: quote.customerId,
          customerEmail: quote.customerEmail,
          subtotal: quote.subtotal,
          tax: quote.tax,
          shipping: quote.shipping,
          total: quote.total,
          currency: quote.currency,
          status: "PENDING",
          paymentStatus: "UNPAID",
          items: {
            create: quote.items.map((item) => ({
              variantId: item.variantId,
              title: item.title,
              price: item.price,
              quantity: item.quantity,
            })),
          },
        },
        select: { id: true, orderNumber: true },
      });

      await tx.quote.update({
        where: { id },
        data: {
          status: "CONVERTED",
          convertedOrderId: created.id,
          convertedAt: new Date(),
        },
      });

      for (const item of quote.items) {
        if (item.variantId) {
          await tx.productVariant.updateMany({
            where: { id: item.variantId, stockStatus: "IN_STOCK" },
            data: { inventory: { decrement: item.quantity } },
          });
        }
      }

      return created;
    });

    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    console.error("[QUOTE_CONVERT_ERROR]", error);
    return NextResponse.json({ error: "Failed to convert quote" }, { status: 500 });
  }
}
