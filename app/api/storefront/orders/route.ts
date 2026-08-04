import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getShopperSessionCookieValueFromRequest } from "@/lib/shopper-auth";

export async function GET(request: Request) {
  try {
    const shopperSession = getShopperSessionCookieValueFromRequest(request);

    if (!shopperSession?.storeId || !shopperSession.customerId) {
      return NextResponse.json({ error: "Please sign in to view your orders" }, { status: 401 });
    }

    const orders = await prisma.order.findMany({
      where: {
        storeId: shopperSession.storeId,
        customerId: shopperSession.customerId,
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        paymentStatus: true,
        subtotal: true,
        tax: true,
        shipping: true,
        total: true,
        currency: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      orders: orders.map((order) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        paymentStatus: order.paymentStatus,
        subtotal: Number(order.subtotal),
        tax: Number(order.tax),
        shipping: Number(order.shipping),
        total: Number(order.total),
        currency: order.currency,
        createdAt: order.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("[SHOPPER_ORDERS_GET_ERROR]", error);
    return NextResponse.json({ error: "Failed to fetch your orders" }, { status: 500 });
  }
}
