import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import VendorsClient from "./vendors-client";

export default async function VendorsPage() {
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
          include: {
            store: { select: { id: true, name: true } },
            _count: { select: { purchaseOrders: true } },
          },
          orderBy: { name: "asc" },
        })
      : [];

    const serializedStores = JSON.parse(JSON.stringify(stores));
    const serializedVendors = JSON.parse(JSON.stringify(vendors));

    return <VendorsClient initialStores={serializedStores} initialVendors={serializedVendors} />;
  } catch (error) {
    console.error("[VENDORS_PAGE_ERROR]", error);
    return (
      <section className="min-w-0 space-y-6">
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          Failed to load vendors. Please refresh the page.
        </div>
      </section>
    );
  }
}
