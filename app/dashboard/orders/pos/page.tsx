import { prisma } from "@/lib/prisma";
import { getCurrentUser, getCurrentCashier } from "@/lib/session";
import { getPlanLimits, getPlanOrDefault } from "@/lib/subscription";
import { PosLockedView } from "@/components/pos/PosLockedView";
import { PosClientView } from "./pos-client-view";

type PosPageProps = {
  searchParams?: Promise<{
    storeId?: string;
  }>;
};

export default async function PosPage({ searchParams }: PosPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const user = await getCurrentUser();
  const cashier = await getCurrentCashier();

  if (!user && !cashier) {
    return (
      <PosClientView
        stores={[]}
        initialStoreId={null}
        userName={null}
        userEmail={null}
        isCashier={false}
        cashierData={null}
      />
    );
  }

  // Check plan permission for user or cashier's store owner
  let allowPos = false;
  if (user) {
    const limits = getPlanLimits(getPlanOrDefault(user.plan));
    allowPos = limits.allowPos;
  } else if (cashier?.storeId) {
    const store = await prisma.store.findUnique({
      where: { id: cashier.storeId },
      select: { ownerUser: { select: { plan: true } } },
    });
    const limits = getPlanLimits(getPlanOrDefault(store?.ownerUser?.plan));
    allowPos = limits.allowPos;
  }

  if (!allowPos) {
    return <PosLockedView returnHref="/dashboard/orders" />;
  }

  try {
    const stores = await prisma.store.findMany({
      where: cashier?.storeId ? { id: cashier.storeId } : (user ? { ownerUserId: user.id } : undefined),
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        currency: true,
        customDomain: true,
        logoUrl: true,
        senderEmail: true,
        replyToEmail: true,
        shippingOrigin: true,
      },
    });

    const selectedStoreId = cashier?.storeId ?? resolvedSearchParams?.storeId ?? stores[0]?.id ?? null;

    return (
      <PosClientView
        stores={stores}
        initialStoreId={selectedStoreId}
        userName={cashier?.cashierName ?? user?.name ?? null}
        userEmail={cashier?.cashierEmail ?? user?.email ?? null}
        isCashier={Boolean(cashier)}
        cashierData={cashier}
      />
    );
  } catch (error) {
    console.error("[POS_PAGE_DB_ERROR]", error);

    return (
      <PosClientView
        stores={[]}
        initialStoreId={null}
        userName={cashier?.cashierName ?? user?.name ?? null}
        userEmail={cashier?.cashierEmail ?? user?.email ?? null}
        isCashier={Boolean(cashier)}
        cashierData={cashier}
      />
    );
  }
}
