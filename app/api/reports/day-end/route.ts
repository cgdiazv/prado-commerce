import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserFromRequest } from "@/lib/session";
import { resolvePosSettings } from "@/lib/pos/settings";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get("date"); // YYYY-MM-DD
    const storeIdParam = searchParams.get("storeId");
    const registerParam = searchParams.get("register");
    const cashierParam = searchParams.get("cashier");

    // Get user's stores
    const stores = await prisma.store.findMany({
      where: {
        OR: [{ ownerUserId: user.id }, { ownerId: user.id }],
      },
      select: {
        id: true,
        name: true,
        currency: true,
        timezone: true,
        posSettings: true,
      },
      orderBy: { createdAt: "asc" },
    });

    if (stores.length === 0) {
      return NextResponse.json({
        stores: [],
        orders: [],
        totals: null,
      });
    }

    const selectedStore =
      (storeIdParam ? stores.find((s) => s.id === storeIdParam) : null) || stores[0];

    const posConfig = resolvePosSettings(selectedStore.posSettings, user);

    // Determine target date (default to today if missing or invalid)
    let targetDateStr = dateParam;
    if (!targetDateStr || !/^\d{4}-\d{2}-\d{2}$/.test(targetDateStr)) {
      targetDateStr = new Date().toISOString().split("T")[0];
    }

    // Construct start and end of that day in UTC/ISO
    const startOfDay = new Date(`${targetDateStr}T00:00:00.000Z`);
    const endOfDay = new Date(`${targetDateStr}T23:59:59.999Z`);

    // Fetch all non-cancelled orders for this store on this date
    const orders = await prisma.order.findMany({
      where: {
        storeId: selectedStore.id,
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
        status: { not: "CANCELLED" },
      },
      include: {
        items: {
          include: {
            variant: {
              select: {
                id: true,
                costPrice: true,
              },
            },
          },
        },
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        payments: true,
      },
      orderBy: { createdAt: "asc" },
    });

    // Helper to normalize payment method string
    const normalizeMethod = (raw?: string | null): string => {
      if (!raw) return "OTHER";
      const s = raw.toLowerCase().trim();
      if (s.includes("efectivo") || s.includes("cash")) return "CASH";
      if (s.includes("debit") || s.includes("débito")) return "DEBIT";
      if (s.includes("visa")) return "VISA";
      if (s.includes("master") || s === "m/c" || s.includes("mc")) return "MASTERCARD";
      if (s.includes("amex") || s.includes("american express")) return "AMEX";
      if (s.includes("discover")) return "DISCOVER";
      if (s.includes("card") || s.includes("tarjeta")) return "CARD";
      if (s.includes("zelle")) return "ZELLE";
      if (s.includes("cashapp") || s.includes("cash app")) return "CASHAPP";
      if (s.includes("transfer") || s.includes("transferencia")) return "TRANSFER";
      if (s.includes("crédito") || s.includes("credito") || s.includes("a/r") || s.includes("credit")) return "AR_CREDIT";
      if (s.includes("check") || s.includes("cheque")) return "CHECK";
      if (s.includes("store credit") || s.includes("credito tienda")) return "STORE_CREDIT";
      if (s.includes("gift") || s.includes("regalo")) return "GIFT_CARD";
      if (s.includes("points") || s.includes("puntos")) return "POINTS";
      return "OTHER";
    };

    // Aggregate payment totals
    const paymentExpectedTotals: Record<string, number> = {
      CASH: 0,
      DEBIT: 0,
      VISA: 0,
      MASTERCARD: 0,
      AMEX: 0,
      DISCOVER: 0,
      CARD: 0,
      AR_CREDIT: 0,
      ZELLE: 0,
      CASHAPP: 0,
      TRANSFER: 0,
      CHECK: 0,
      STORE_CREDIT: 0,
      GIFT_CARD: 0,
      POINTS: 0,
      DEPOSIT: 0,
      OTHER: 0,
    };

    let salesWithTax = 0;
    let taxTotal = 0;
    let netSales = 0;
    let totalDiscount = 0;
    let inventoryCost = 0;
    let totalItemsCount = 0;

    for (const order of orders) {
      const ordTotal = Number(order.total) || 0;
      const ordTax = Number(order.tax) || 0;
      const ordSubtotal = Number(order.subtotal) || 0;

      salesWithTax += ordTotal;
      taxTotal += ordTax;
      netSales += ordSubtotal;

      // Group by payment method
      const methodKey = normalizeMethod(order.paymentMethod);
      paymentExpectedTotals[methodKey] = (paymentExpectedTotals[methodKey] || 0) + ordTotal;

      // Calculate cost
      for (const item of order.items) {
        totalItemsCount += item.quantity;
        const itemCost = Number(item.variant?.costPrice || 0);
        inventoryCost += itemCost * item.quantity;
      }
    }

    // Merge general CARD into VISA if no distinct card entries exist, or keep distinct
    if (paymentExpectedTotals.CARD > 0 && paymentExpectedTotals.VISA === 0 && paymentExpectedTotals.MASTERCARD === 0) {
      paymentExpectedTotals.VISA = paymentExpectedTotals.CARD;
      paymentExpectedTotals.CARD = 0;
    }

    // Check for saved Day End record in posSettings
    const rawPosSettings = selectedStore.posSettings as any;
    const dayEndClosings = Array.isArray(rawPosSettings?.dayEndClosings)
      ? rawPosSettings.dayEndClosings
      : [];

    const savedClosing = dayEndClosings.find(
      (c: any) => c.date === targetDateStr && c.storeId === selectedStore.id
    ) || null;

    return NextResponse.json({
      date: targetDateStr,
      store: {
        id: selectedStore.id,
        name: selectedStore.name,
        currency: selectedStore.currency || "USD",
        timezone: selectedStore.timezone || "America/New_York",
      },
      stores: stores.map((s) => ({
        id: s.id,
        name: s.name,
        currency: s.currency || "USD",
      })),
      terminals: posConfig.terminals || [],
      cashiers: posConfig.cashiers || [],
      totals: {
        salesWithTax,
        tax1: taxTotal,
        netSales,
        totalDiscount,
        inventoryCost,
        grossProfit: netSales - inventoryCost,
        ordersCount: orders.length,
        totalItemsCount,
        averageOrderValue: orders.length > 0 ? salesWithTax / orders.length : 0,
      },
      paymentExpectedTotals,
      savedClosing,
      recentClosings: dayEndClosings.slice(-10).reverse(),
    });
  } catch (error: any) {
    console.error("Day End Report GET error:", error);
    return NextResponse.json(
      { error: "Failed to generate Day End report", details: error?.message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      storeId,
      date,
      scope,
      register,
      cashier,
      floatBreakdown,
      totalCash,
      cashDrop,
      beginningFloat,
      totalCashDeposit,
      paymentAmounts,
      memo,
      paidIn,
      paidOut,
      status,
    } = body;

    if (!storeId || !date) {
      return NextResponse.json({ error: "storeId and date are required" }, { status: 400 });
    }

    const store = await prisma.store.findFirst({
      where: {
        id: storeId,
        OR: [{ ownerUserId: user.id }, { ownerId: user.id }],
      },
      select: { id: true, posSettings: true },
    });

    if (!store) {
      return NextResponse.json({ error: "Store not found or access denied" }, { status: 404 });
    }

    const currentPos = (store.posSettings as any) || {};
    const existingClosings: any[] = Array.isArray(currentPos.dayEndClosings)
      ? [...currentPos.dayEndClosings]
      : [];

    const nowIso = new Date().toISOString();
    const closingRecord = {
      id: `closing-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      storeId,
      date,
      scope: scope || "store",
      register: register || "All",
      cashier: cashier || user.name || "Cashier",
      savedBy: user.name || user.email || "Cashier",
      savedAt: nowIso,
      floatBreakdown: floatBreakdown || {},
      totalCash: Number(totalCash) || 0,
      cashDrop: Number(cashDrop) || 0,
      beginningFloat: Number(beginningFloat) || 0,
      totalCashDeposit: Number(totalCashDeposit) || 0,
      paymentAmounts: paymentAmounts || {},
      paidIn: Number(paidIn) || 0,
      paidOut: Number(paidOut) || 0,
      memo: typeof memo === "string" ? memo : "",
      status: status || "SAVED",
    };

    // Remove any previous entry for this store & date to overwrite with latest closing
    const filteredClosings = existingClosings.filter(
      (c) => !(c.storeId === storeId && c.date === date)
    );
    filteredClosings.push(closingRecord);

    await prisma.store.update({
      where: { id: storeId },
      data: {
        posSettings: {
          ...currentPos,
          dayEndClosings: filteredClosings,
        },
      },
    });

    return NextResponse.json({
      success: true,
      closingRecord,
      message: "Day End record saved successfully",
    });
  } catch (error: any) {
    console.error("Day End Report POST error:", error);
    return NextResponse.json(
      { error: "Failed to save Day End report", details: error?.message },
      { status: 500 }
    );
  }
}
