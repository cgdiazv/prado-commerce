import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { Building2 } from "lucide-react";
import { ProcurementOverviewView } from "./procurement-overview-view";

async function withRetry<T>(fn: () => Promise<T>, retries = 2, delayMs = 300): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (retries <= 0) throw error;
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    return withRetry(fn, retries - 1, delayMs * 2);
  }
}

export default async function ProcurementOverviewPage() {
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

  try {
    const rawStores = await withRetry(() =>
      prisma.store.findMany({
        where: {
          OR: [{ ownerUserId: user.id }, { ownerId: user.id }],
        },
        select: { id: true, name: true, currency: true },
      })
    );

    const stores = JSON.parse(JSON.stringify(rawStores));
    const storeIds = stores.map((s: any) => s.id);
    const activeCurrency = stores[0]?.currency || "USD";

    if (storeIds.length === 0) {
      return (
        <section className="min-w-0 space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
            <Building2 className="mx-auto h-10 w-10 text-slate-400" />
            <h3 className="mt-3 text-sm font-semibold text-slate-900">No stores found</h3>
            <p className="mt-1 text-xs text-slate-500">Create a store first to begin managing vendors and purchase orders.</p>
          </div>
        </section>
      );
    }

    const vendorsCount = (prisma as any).vendor
      ? await (prisma as any).vendor
          .count({
            where: { storeId: { in: storeIds } },
          })
          .catch((err: unknown) => {
            console.error("[PROCUREMENT_VENDORS_COUNT_ERROR]", err);
            return 0;
          })
      : 0;

    const openPOsCount = (prisma as any).purchaseOrder
      ? await (prisma as any).purchaseOrder
          .count({
            where: {
              storeId: { in: storeIds },
              status: { in: ["DRAFT", "SENT", "PARTIAL"] },
            },
          })
          .catch((err: unknown) => {
            console.error("[PROCUREMENT_OPEN_POS_COUNT_ERROR]", err);
            return 0;
          })
      : 0;

    const rawRecentPOs = (prisma as any).purchaseOrder
      ? await (prisma as any).purchaseOrder
          .findMany({
            where: { storeId: { in: storeIds } },
            include: {
              store: { select: { id: true, name: true, currency: true } },
              vendor: { select: { id: true, name: true } },
              items: { select: { qtyOrdered: true, qtyReceived: true } },
            },
            orderBy: { createdAt: "desc" },
            take: 5,
          })
          .catch((err: unknown) => {
            console.error("[PROCUREMENT_RECENT_POS_ERROR]", err);
            return [];
          })
      : [];

    const rawRecentVendors = (prisma as any).vendor
      ? await (prisma as any).vendor
          .findMany({
            where: { storeId: { in: storeIds } },
            include: {
              store: { select: { id: true, name: true } },
              _count: { select: { purchaseOrders: true } },
            },
            orderBy: { createdAt: "desc" },
            take: 4,
          })
          .catch((err: unknown) => {
            console.error("[PROCUREMENT_RECENT_VENDORS_ERROR]", err);
            return [];
          })
      : [];

    const rawAllOpenPOs = (prisma as any).purchaseOrder
      ? await (prisma as any).purchaseOrder
          .findMany({
            where: {
              storeId: { in: storeIds },
              status: { in: ["SENT", "PARTIAL"] },
            },
            include: {
              items: { select: { qtyOrdered: true, qtyReceived: true } },
            },
          })
          .catch((err: unknown) => {
            console.error("[PROCUREMENT_OPEN_POS_ERROR]", err);
            return [];
          })
      : [];

    // Clean JSON serialization to strip Prisma Decimal and Date objects for Turbopack RSC streaming
    const recentPOs = JSON.parse(JSON.stringify(rawRecentPOs));
    const recentVendors = JSON.parse(JSON.stringify(rawRecentVendors));
    const allOpenPOs = JSON.parse(JSON.stringify(rawAllOpenPOs));

    let pendingUnitsToReceive = 0;
    for (const po of allOpenPOs) {
      for (const item of po.items || []) {
        pendingUnitsToReceive += Math.max(0, (item.qtyOrdered || 0) - (item.qtyReceived || 0));
      }
    }

    return (
      <ProcurementOverviewView
        vendorsCount={vendorsCount}
        openPOsCount={openPOsCount}
        pendingUnitsToReceive={pendingUnitsToReceive}
        recentPOs={recentPOs}
        recentVendors={recentVendors}
        activeCurrency={activeCurrency}
      />
    );
  } catch (error) {
    console.error("[PROCUREMENT_OVERVIEW_ERROR]", error);
    return (
      <section className="min-w-0 space-y-6">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span className="font-semibold">Failed to load procurement overview. Please refresh the page.</span>
            <Link
              href="/dashboard/procurement"
              className="inline-flex items-center justify-center rounded-full bg-red-700 px-3.5 py-1 text-xs font-semibold text-white transition hover:bg-red-800 w-fit"
            >
              Refresh Page / Actualizar
            </Link>
          </div>
          {process.env.NODE_ENV === "development" && error instanceof Error && (
            <p className="font-mono text-xs text-red-600 bg-red-100/50 p-2 rounded">{error.message}</p>
          )}
        </div>
      </section>
    );
  }
}
