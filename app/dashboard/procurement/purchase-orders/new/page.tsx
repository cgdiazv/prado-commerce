import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import POFormClient from "./po-form-client";

export default async function NewPurchaseOrderPage() {
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
          select: { id: true, name: true, storeId: true, contactEmail: true },
          orderBy: { name: "asc" },
        })
      : [];

    const products = storeIds.length
      ? await prisma.product.findMany({
          where: { storeId: { in: storeIds } },
          select: {
            id: true,
            storeId: true,
            title: true,
            images: true,
            variants: {
              select: {
                id: true,
                title: true,
                sku: true,
                price: true,
                inventory: true,
              },
            },
          },
          orderBy: { title: "asc" },
        })
      : [];

    const serializedStores = JSON.parse(JSON.stringify(stores));
    const serializedVendors = JSON.parse(JSON.stringify(vendors));
    const serializedProducts = JSON.parse(JSON.stringify(products));

    return (
      <POFormClient
        initialStores={serializedStores}
        initialVendors={serializedVendors}
        initialProducts={serializedProducts}
      />
    );
  } catch (error) {
    console.error("[NEW_PO_PAGE_ERROR]", error);
    return (
      <section className="min-w-0 space-y-6">
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          Failed to load purchase order form. Please refresh the page.
        </div>
      </section>
    );
  }
}
