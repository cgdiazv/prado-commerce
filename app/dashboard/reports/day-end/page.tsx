import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { resolveServerActiveStoreId } from "@/lib/server-active-store";
import DayEndReportClient from "./day-end-report-client";
import { resolvePosSettings } from "@/lib/pos/settings";

export const dynamic = "force-dynamic";

export default async function DayEndReportPage() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <section className="min-w-0 space-y-6">
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Could not verify your session. Please sign in again.
        </div>
      </section>
    );
  }

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

  const todayStr = new Date().toISOString().split("T")[0];

  // If user has stores, pre-calculate today's initial stats for the first store
  let initialData: any = null;
  let primaryStoreId = stores[0]?.id;
  if (stores.length > 0) {
    const activeStoreId = await resolveServerActiveStoreId(undefined, stores, { allowAll: false });
    const primaryStore = stores.find((s) => s.id === activeStoreId) || stores[0];
    primaryStoreId = primaryStore.id;
    const posConfig = resolvePosSettings(primaryStore.posSettings, user);

    const startOfDay = new Date(`${todayStr}T00:00:00.000Z`);
    const endOfDay = new Date(`${todayStr}T23:59:59.999Z`);

    const orders = await prisma.order.findMany({
      where: {
        storeId: primaryStore.id,
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
      },
    });

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
    let tax1 = 0;
    let netSales = 0;
    let inventoryCost = 0;

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

    for (const order of orders) {
      const ordTotal = Number(order.total) || 0;
      const ordTax = Number(order.tax) || 0;
      const ordSubtotal = Number(order.subtotal) || 0;

      salesWithTax += ordTotal;
      tax1 += ordTax;
      netSales += ordSubtotal;

      const methodKey = normalizeMethod(order.paymentMethod);
      paymentExpectedTotals[methodKey] = (paymentExpectedTotals[methodKey] || 0) + ordTotal;

      for (const item of order.items) {
        const itemCost = Number(item.variant?.costPrice || 0);
        inventoryCost += itemCost * item.quantity;
      }
    }

    if (paymentExpectedTotals.CARD > 0 && paymentExpectedTotals.VISA === 0 && paymentExpectedTotals.MASTERCARD === 0) {
      paymentExpectedTotals.VISA = paymentExpectedTotals.CARD;
      paymentExpectedTotals.CARD = 0;
    }

    const rawPosSettings = primaryStore.posSettings as any;
    const dayEndClosings = Array.isArray(rawPosSettings?.dayEndClosings)
      ? rawPosSettings.dayEndClosings
      : [];
    const savedClosing = dayEndClosings.find(
      (c: any) => c.date === todayStr && c.storeId === primaryStore.id
    ) || null;

    initialData = {
      date: todayStr,
      store: {
        id: primaryStore.id,
        name: primaryStore.name,
        currency: primaryStore.currency || "USD",
        timezone: primaryStore.timezone || "America/New_York",
      },
      terminals: posConfig.terminals || [],
      cashiers: posConfig.cashiers || [],
      totals: {
        salesWithTax,
        tax1,
        netSales,
        totalDiscount: 0,
        inventoryCost,
        grossProfit: netSales - inventoryCost,
        ordersCount: orders.length,
      },
      paymentExpectedTotals,
      savedClosing,
    };
  }

  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400">Loading Day End Report...</div>}>
      <DayEndReportClient
        initialDate={todayStr}
        stores={stores.map((s) => ({
          id: s.id,
          name: s.name,
          currency: s.currency || "USD",
        }))}
        initialData={initialData}
        initialSelectedStoreId={primaryStoreId}
      />
    </Suspense>
  );
}
