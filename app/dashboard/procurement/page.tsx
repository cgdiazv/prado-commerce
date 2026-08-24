import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { Building2, FileText, PackageCheck, Plus, Truck, ArrowRight } from "lucide-react";

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
    const formatter = new Intl.NumberFormat("en-US", { style: "currency", currency: activeCurrency });

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

    const statusColors: Record<string, string> = {
      DRAFT: "bg-slate-100 text-slate-700 border-slate-200",
      SENT: "bg-blue-50 text-blue-700 border-blue-200",
      PARTIAL: "bg-amber-50 text-amber-700 border-amber-200",
      RECEIVED: "bg-emerald-50 text-emerald-700 border-emerald-200",
      CANCELLED: "bg-red-50 text-red-700 border-red-200",
    };

    return (
      <section className="min-w-0 space-y-6">
        {/* Page Title & Quick Actions */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-950">Procurement & ERP Center</h1>
            <p className="mt-1 text-sm text-slate-500">
              Manage vendor relations, purchase orders, unit cost tracking, and inventory receiving.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/procurement/vendors"
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Building2 className="h-4 w-4" />
              Vendors
            </Link>
            <Link
              href="/dashboard/procurement/purchase-orders/new"
              className="inline-flex items-center gap-1.5 rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              <Plus className="h-4 w-4" />
              New Purchase Order
            </Link>
          </div>
        </div>

        {/* Metrics Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-2">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-semibold uppercase tracking-wider">Active Vendors</span>
              <Building2 className="h-5 w-5 text-blue-600" />
            </div>
            <p className="text-2xl font-black text-slate-900">{vendorsCount}</p>
            <p className="text-xs text-slate-500">Registered supplier profiles</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-2">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-semibold uppercase tracking-wider">Open POs</span>
              <FileText className="h-5 w-5 text-amber-600" />
            </div>
            <p className="text-2xl font-black text-slate-900">{openPOsCount}</p>
            <p className="text-xs text-slate-500">Draft, sent & partial orders</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-2">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-semibold uppercase tracking-wider">Incoming Units</span>
              <PackageCheck className="h-5 w-5 text-emerald-600" />
            </div>
            <p className="text-2xl font-black text-slate-900">{pendingUnitsToReceive}</p>
            <p className="text-xs text-slate-500">Outstanding units to receive</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-2">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-semibold uppercase tracking-wider">Receiving Status</span>
              <Truck className="h-5 w-5 text-purple-600" />
            </div>
            <p className="text-2xl font-black text-slate-900">{recentPOs.length}</p>
            <p className="text-xs text-slate-500">Total recorded POs</p>
          </div>
        </div>

        {/* Grid Section: Recent POs & Top Vendors */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Recent Purchase Orders Table */}
          <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900">Recent Purchase Orders</h2>
              <Link
                href="/dashboard/procurement/purchase-orders"
                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline"
              >
                View All POs
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {recentPOs.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                No purchase orders created yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-100 bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="px-3 py-2.5">PO #</th>
                      <th className="px-3 py-2.5">Vendor</th>
                      <th className="px-3 py-2.5">Status</th>
                      <th className="px-3 py-2.5 text-right">Total Cost</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {recentPOs.map((po: any) => (
                      <tr key={po.id} className="hover:bg-slate-50">
                        <td className="px-3 py-3 font-semibold text-slate-900">
                          <Link href={`/dashboard/procurement/purchase-orders/${po.id}`} className="hover:text-blue-600">
                            {po.poNumber}
                          </Link>
                        </td>
                        <td className="px-3 py-3 text-slate-700">{po.vendor?.name}</td>
                        <td className="px-3 py-3">
                          <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold ${statusColors[po.status] || "bg-slate-100 text-slate-700"}`}>
                            {po.status}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right font-bold text-slate-900">
                          {formatter.format(Number(po.total || 0))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Vendors Quick Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900">Active Suppliers</h2>
              <Link
                href="/dashboard/procurement/vendors"
                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline"
              >
                Manage
              </Link>
            </div>

            {recentVendors.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                No vendors registered.
              </div>
            ) : (
              <div className="space-y-3">
                {recentVendors.map((vendor: any) => (
                  <div key={vendor.id} className="flex items-center justify-between rounded-xl bg-slate-50 p-3 text-xs">
                    <div>
                      <p className="font-bold text-slate-900">{vendor.name}</p>
                      <p className="text-[11px] text-slate-500">{vendor.store?.name}</p>
                    </div>
                    <span className="rounded-full bg-white border border-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                      {vendor._count?.purchaseOrders || 0} POs
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
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
