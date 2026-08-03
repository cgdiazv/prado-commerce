import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { NewOrderForm } from "./new-order-form";

type NewOrderPageProps = {
  searchParams?: Promise<{
    storeId?: string;
  }>;
};

export default async function NewOrderPage({ searchParams }: NewOrderPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const user = await getCurrentUser();

  if (!user) {
    return (
      <NewOrderForm
        stores={[]}
        selectedStoreId={null}
        setupError="Could not verify your session. Please sign in again after database connectivity is restored."
      />
    );
  }

  try {
    const stores = await prisma.store.findMany({
      where: { ownerUserId: user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        currency: true,
      },
    });

    const selectedStoreId = resolvedSearchParams?.storeId ?? stores[0]?.id ?? null;

    return <NewOrderForm stores={stores} selectedStoreId={selectedStoreId} />;
  } catch (error) {
    console.error("[NEW_ORDER_PAGE_DB_ERROR]", error);

    return (
      <NewOrderForm
        stores={[]}
        selectedStoreId={null}
        setupError="Could not load stores. Check DATABASE_URL, run migrations, and make sure Postgres is reachable."
      />
    );
  }
}
