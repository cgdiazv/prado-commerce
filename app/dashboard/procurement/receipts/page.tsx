import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { resolveServerActiveStoreId } from "@/lib/server-active-store";
import ReceiptsClient from "./receipts-client";

export default async function ReceiptsPage() {
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
    select: { id: true, name: true, currency: true },
    orderBy: { createdAt: "asc" },
  });

  const storeIds = stores.map((s) => s.id);

  const rawReceipts = storeIds.length && (prisma as any).purchaseReceipt
    ? await (prisma as any).purchaseReceipt
        .findMany({
          where: { storeId: { in: storeIds } },
          include: {
            store: { select: { id: true, name: true, currency: true } },
            purchaseOrder: {
              select: {
                id: true,
                poNumber: true,
                status: true,
                vendor: { select: { id: true, name: true } },
              },
            },
            items: {
              include: {
                poItem: {
                  select: {
                    id: true,
                    title: true,
                    sku: true,
                    unitCost: true,
                    variantId: true,
                    product: {
                      select: {
                        id: true,
                        title: true,
                        images: true,
                        manufacturer: true,
                      },
                    },
                    variant: {
                      select: {
                        id: true,
                        title: true,
                        price: true,
                        inventory: true,
                      },
                    },
                  },
                },
              },
            },
          },
          orderBy: { receivedAt: "desc" },
          take: 200,
        })
        .catch((err: unknown) => {
          console.error("[RECEIPTS_QUERY_ERROR]", err);
          return [];
        })
    : [];

  const initialSelectedStoreId = await resolveServerActiveStoreId(undefined, stores);
  const serializedReceipts = JSON.parse(JSON.stringify(rawReceipts));
  const serializedStores = JSON.parse(JSON.stringify(stores));

  return (
    <ReceiptsClient
      initialReceipts={serializedReceipts}
      stores={serializedStores}
      initialSelectedStoreId={initialSelectedStoreId}
    />
  );
}
