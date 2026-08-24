import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import POListClient from "./po-list-client";

export default async function PurchaseOrdersPage() {
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
    const stores = await prisma.store.findMany({
      where: {
        OR: [{ ownerUserId: user.id }, { ownerId: user.id }],
      },
      select: { id: true, name: true, currency: true },
      orderBy: { createdAt: "asc" },
    });

    const storeIds = stores.map((s) => s.id);

    const vendors = storeIds.length && (prisma as any).vendor
      ? await (prisma as any).vendor.findMany({
          where: { storeId: { in: storeIds } },
          select: { id: true, name: true, storeId: true },
          orderBy: { name: "asc" },
        })
      : [];

    const purchaseOrders = storeIds.length && (prisma as any).purchaseOrder
      ? await (prisma as any).purchaseOrder.findMany({
          where: { storeId: { in: storeIds } },
          include: {
            store: { select: { id: true, name: true, currency: true } },
            vendor: { select: { id: true, name: true, contactEmail: true } },
            items: {
              select: {
                id: true,
                qtyOrdered: true,
                qtyReceived: true,
                unitCost: true,
                totalCost: true,
              },
            },
            _count: { select: { receipts: true } },
          },
          orderBy: { createdAt: "desc" },
        })
      : [];

    const serializedStores = JSON.parse(JSON.stringify(stores));
    const serializedVendors = JSON.parse(JSON.stringify(vendors));
    const serializedPOs = JSON.parse(JSON.stringify(purchaseOrders));

    return (
      <POListClient
        initialStores={serializedStores}
        initialVendors={serializedVendors}
        initialPurchaseOrders={serializedPOs}
      />
    );
  } catch (error) {
    console.error("[PURCHASE_ORDERS_PAGE_ERROR]", error);
    return (
      <section className="min-w-0 space-y-6">
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          Failed to load purchase orders. Please refresh the page.
        </div>
      </section>
    );
  }
}
