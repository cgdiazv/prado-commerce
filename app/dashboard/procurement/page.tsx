import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { Building2 } from "lucide-react";
import { ProcurementOverviewView } from "./procurement-overview-view";

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
    const rawStores = await prisma.store.findMany({
      where: {
        OR: [{ ownerUserId: user.id }, { ownerId: user.id }],
      },
      select: { id: true, name: true, currency: true },
    });

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
      ? await (prisma as any).vendor.count({
          where: { storeId: { in: storeIds } },
        })
      : 0;

    const openPOsCount = (prisma as any).purchaseOrder
      ? await (prisma as any).purchaseOrder.count({
          where: {
            storeId: { in: storeIds },
            status: { in: ["DRAFT", "SENT", "PARTIAL"] },
          },
        })
      : 0;

    const rawRecentPOs = (prisma as any).purchaseOrder
      ? await (prisma as any).purchaseOrder.findMany({
          where: { storeId: { in: storeIds } },
          include: {
            store: { select: { id: true, name: true, currency: true } },
            vendor: { select: { id: true, name: true } },
            items: { select: { qtyOrdered: true, qtyReceived: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 5,
        })
      : [];

    const rawRecentVendors = (prisma as any).vendor
      ? await (prisma as any).vendor.findMany({
          where: { storeId: { in: storeIds } },
          include: {
            store: { select: { id: true, name: true } },
            _count: { select: { purchaseOrders: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 4,
        })
      : [];

    const rawAllOpenPOs = (prisma as any).purchaseOrder
      ? await (prisma as any).purchaseOrder.findMany({
          where: {
            storeId: { in: storeIds },
            status: { in: ["SENT", "PARTIAL"] },
          },
          include: {
            items: { select: { qtyOrdered: true, qtyReceived: true } },
          },
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
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          Failed to load procurement overview. Please refresh the page.
        </div>
      </section>
    );
  }
}
