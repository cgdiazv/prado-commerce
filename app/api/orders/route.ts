import { after, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserFromRequest, getCurrentCashierFromRequest } from "@/lib/session";
import { syncPaidOrderToShipStation } from "@/lib/shipstation";

function parseAmount(value: unknown): number {
  const numericValue =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseFloat(value)
        : Number.NaN;

  if (!Number.isFinite(numericValue) || numericValue < 0) {
    throw new Error("Invalid amount");
  }

  return Math.round(numericValue * 100) / 100;
}

type OrderItemInput = {
  title: string;
  price: number;
  quantity: number;
  variantId?: string | null;
};

function parseItems(value: unknown): OrderItemInput[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const parsed: OrderItemInput[] = [];

  for (const item of value) {
    if (!item || typeof item !== "object") {
      continue;
    }

    const candidate = item as {
      title?: unknown;
      price?: unknown;
      quantity?: unknown;
      variantId?: unknown;
    };

    const title = String(candidate.title ?? "").trim();
    const price = parseAmount(candidate.price ?? Number.NaN);
    const quantity =
      typeof candidate.quantity === "number"
        ? Math.trunc(candidate.quantity)
        : Number.parseInt(String(candidate.quantity ?? ""), 10);

    if (!title || !Number.isFinite(quantity) || quantity < 1) {
      continue;
    }

    parsed.push({
      title,
      price,
      quantity,
      variantId: typeof candidate.variantId === "string" ? candidate.variantId : null,
    });
  }

  return parsed;
}

function serializeOrder(order: {
  id: string;
  storeId: string;
  orderNumber: number;
  customerEmail: string;
  customer?: { firstName: string | null; lastName: string | null } | null;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "CANCELLED";
  paymentStatus: "UNPAID" | "PAID" | "REFUNDED" | "FAILED";
  subtotal: { toString(): string };
  tax: { toString(): string };
  shipping: { toString(): string };
  total: { toString(): string };
  currency: string;
  createdAt: Date;
}) {
  return {
    id: order.id,
    storeId: order.storeId,
    orderNumber: order.orderNumber,
    customerEmail: order.customerEmail,
    customerName: [order.customer?.firstName, order.customer?.lastName].filter(Boolean).join(" ") || null,
    status: order.status,
    paymentStatus: order.paymentStatus,
    subtotal: order.subtotal.toString(),
    tax: order.tax.toString(),
    shipping: order.shipping.toString(),
    total: order.total.toString(),
    currency: order.currency,
    createdAt: order.createdAt.toISOString(),
  };
}

export async function GET(request: Request) {
  try {
    const user = await getCurrentUserFromRequest(request);
    const cashier = getCurrentCashierFromRequest(request);

    if (!user && !cashier) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get("storeId");

    if (cashier && storeId && storeId !== cashier.storeId) {
      return NextResponse.json(
        { error: "Forbidden: You are only authorized to view orders for your assigned store." },
        { status: 403 },
      );
    }

    const targetStoreId = cashier?.storeId || storeId;

    if (!targetStoreId) {
      return NextResponse.json({ error: "storeId is required" }, { status: 400 });
    }

    const ownedStore = await prisma.store.findFirst({
      where: cashier
        ? { id: cashier.storeId }
        : { id: targetStoreId, ownerUserId: user!.id },
      select: { id: true },
    });

    if (!ownedStore) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }

    const orders = await prisma.order.findMany({
      where: { storeId: targetStoreId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        storeId: true,
        orderNumber: true,
        customerEmail: true,
        customer: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
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

    return NextResponse.json(orders.map((order) => serializeOrder(order)));
  } catch (error) {
    console.error("[ORDERS_GET_ERROR]", error);
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUserFromRequest(request);
    const cashier = getCurrentCashierFromRequest(request);

    if (!user && !cashier) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    const storeId = String(body?.storeId || "").trim();
    if (cashier && storeId && storeId !== cashier.storeId) {
      return NextResponse.json(
        { error: "Forbidden: Cashiers can only create orders in their assigned store." },
        { status: 403 },
      );
    }

    const customerEmail = String(body?.customerEmail || "").trim().toLowerCase();
    const currency = String(body?.currency || "USD").trim().toUpperCase();
    const status = String(body?.status || "PENDING").trim().toUpperCase();
    const paymentStatus = String(body?.paymentStatus || "UNPAID").trim().toUpperCase();

    if (!storeId || !customerEmail) {
      return NextResponse.json({ error: "storeId and customerEmail are required" }, { status: 400 });
    }

    const validStatus = ["PENDING", "PROCESSING", "COMPLETED", "CANCELLED"] as const;
    const validPaymentStatus = ["UNPAID", "PAID", "REFUNDED", "FAILED"] as const;

    if (!validStatus.includes(status as (typeof validStatus)[number])) {
      return NextResponse.json({ error: "Invalid order status" }, { status: 400 });
    }

    if (!validPaymentStatus.includes(paymentStatus as (typeof validPaymentStatus)[number])) {
      return NextResponse.json({ error: "Invalid payment status" }, { status: 400 });
    }

    const parsedItems = parseItems(body?.items);
    const subtotal = parsedItems.length
      ? Math.round(
          parsedItems.reduce((sum, item) => sum + item.price * item.quantity, 0) * 100,
        ) / 100
      : parseAmount(body?.subtotal ?? 0);
    const tax = parseAmount(body?.tax ?? 0);
    const shipping = parseAmount(body?.shipping ?? 0);
    const total = Math.round((subtotal + tax + shipping) * 100) / 100;

    if (parsedItems.length === 0 && (body?.items !== undefined || subtotal === 0)) {
      return NextResponse.json(
        { error: "Add at least one line item or provide a valid subtotal" },
        { status: 400 },
      );
    }

    const ownedStore = await prisma.store.findFirst({
      where: cashier
        ? { id: cashier.storeId }
        : { id: storeId, ownerUserId: user!.id },
      select: { id: true },
    });

    if (!ownedStore) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }

    const customer = await prisma.customer.upsert({
      where: {
        storeId_email: {
          storeId,
          email: customerEmail,
        },
      },
      update: {},
      create: {
        storeId,
        email: customerEmail,
      },
      select: { id: true },
    });

    const variantIds = parsedItems
      .map((item) => item.variantId)
      .filter((id): id is string => typeof id === "string" && id.length > 0);

    const variants = variantIds.length > 0
      ? await prisma.productVariant.findMany({
          where: { id: { in: variantIds } },
          select: { id: true, costPrice: true },
        })
      : [];

    const variantCostMap = new Map(variants.map((v) => [v.id, v.costPrice]));

    const createdOrder = await prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          storeId,
          customerId: customer.id,
          customerEmail,
          status: status as "PENDING" | "PROCESSING" | "COMPLETED" | "CANCELLED",
          paymentStatus: paymentStatus as "UNPAID" | "PAID" | "REFUNDED" | "FAILED",
          subtotal,
          tax,
          shipping,
          total,
          currency: currency.length === 3 ? currency : "USD",
          ...(parsedItems.length
            ? {
                items: {
                  create: parsedItems.map((item) => ({
                    title: item.title,
                    price: item.price,
                    quantity: item.quantity,
                    variantId: item.variantId,
                    costPrice: item.variantId ? (variantCostMap.get(item.variantId) ?? null) : null,
                  })),
                },
              }
            : {}),
        },
        select: {
          id: true,
          storeId: true,
          orderNumber: true,
          customerEmail: true,
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

      // Decrement inventory for items with variantId where stock tracking is enabled
      for (const item of parsedItems) {
        if (item.variantId && item.quantity > 0) {
          await tx.productVariant.updateMany({
            where: {
              id: item.variantId,
              trackInventory: true,
            },
            data: {
              inventory: {
                decrement: item.quantity,
              },
            },
          });
        }
      }

      return order;
    });

    if (createdOrder.paymentStatus === "PAID") {
      after(() => syncPaidOrderToShipStation(createdOrder.id).catch((error) => {
        console.error("[SHIPSTATION_ORDER_SYNC_ERROR]", error);
      }));
    }

    return NextResponse.json(serializeOrder(createdOrder), { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "Invalid amount") {
      return NextResponse.json(
        { error: "subtotal, tax, and shipping must be valid non-negative numbers" },
        { status: 400 },
      );
    }

    console.error("[ORDERS_POST_ERROR]", error);
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  }
}
