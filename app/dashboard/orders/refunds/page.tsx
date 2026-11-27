import { prisma } from "@/lib/prisma";
import {
  backfillLegacyRefundedOrders,
  listRefundsForStores,
} from "@/lib/refunds-db";
import { getCurrentUser } from "@/lib/session";
import { resolveServerActiveStoreId } from "@/lib/server-active-store";
import { RefundsDashboard, type RefundOrderCandidate, type RefundRecord } from "./refunds-dashboard";

type Props = { searchParams?: Promise<{ storeId?: string }> };

export default async function RefundsPage({ searchParams }: Props) {
  const user = await getCurrentUser();
  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  if (!user) {
    return (
      <RefundsDashboard
        initialStores={[]}
        initialRefunds={[]}
        initialOrderCandidates={[]}
        selectedStoreId={null}
        setupError="Could not verify your session."
      />
    );
  }

  let stores: Array<{ id: string; name: string; currency: string }> = [];
  let selectedStoreId: string | null = null;
  let serializedRefunds: RefundRecord[] = [];
  let serializedOrderCandidates: RefundOrderCandidate[] = [];
  let setupError: string | null = null;

  try {
    stores = await prisma.store.findMany({
      where: {
        OR: [{ ownerUserId: user.id }, { ownerId: user.id }],
      },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, currency: true },
    });

    selectedStoreId = await resolveServerActiveStoreId(
      resolvedSearchParams?.storeId,
      stores,
    );

    const storeIds = stores.map((s) => s.id);

    if (storeIds.length > 0) {
      await backfillLegacyRefundedOrders(storeIds, user.email);
      serializedRefunds = await listRefundsForStores(storeIds);

      const recentOrders = await prisma.order.findMany({
        where: {
          storeId: { in: storeIds },
        },
        orderBy: { createdAt: "desc" },
        take: 150,
        include: {
          customer: {
            select: { firstName: true, lastName: true },
          },
          items: {
            select: {
              id: true,
              variantId: true,
              title: true,
              price: true,
              quantity: true,
            },
          },
        },
      });

      serializedOrderCandidates = recentOrders.map((o) => ({
        id: o.id,
        storeId: o.storeId,
        orderNumber: o.orderNumber,
        customerEmail: o.customerEmail,
        customerName:
          [o.customer?.firstName, o.customer?.lastName].filter(Boolean).join(" ") || null,
        total: o.total.toString(),
        currency: o.currency,
        status: o.status,
        paymentStatus: o.paymentStatus,
        createdAt: o.createdAt.toISOString(),
        items: o.items.map((item) => ({
          id: item.id,
          variantId: item.variantId ?? null,
          title: item.title,
          price: item.price.toString(),
          quantity: item.quantity,
        })),
      }));
    }
  } catch (error) {
    console.error("[REFUNDS_PAGE_ERROR]", error);
    setupError = "Could not load refunds from the database.";
  }

  return (
    <RefundsDashboard
      initialStores={stores}
      initialRefunds={serializedRefunds}
      initialOrderCandidates={serializedOrderCandidates}
      selectedStoreId={selectedStoreId}
      setupError={setupError}
    />
  );
}
