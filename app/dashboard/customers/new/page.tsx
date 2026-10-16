import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { NewCustomerForm } from "./new-customer-form";

type NewCustomerPageProps = {
  searchParams?: Promise<{
    storeId?: string;
  }>;
};

export default async function NewCustomerPage({ searchParams }: NewCustomerPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const user = await getCurrentUser();

  if (!user) {
    return (
      <NewCustomerForm
        stores={[]}
        selectedStoreId={null}
        setupError="Could not verify your session. Please sign in again after database connectivity is restored."
      />
    );
  }

  let stores: Array<{ id: string; name: string; currency: string }> = [];
  let groups: Array<{ id: string; storeId: string; name: string }> = [];
  let selectedStoreId: string | null = null;
  let setupError: string | null = null;

  try {
    stores = await prisma.store.findMany({
      where: { ownerUserId: user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        currency: true,
      },
    });

    selectedStoreId = resolvedSearchParams?.storeId ?? stores[0]?.id ?? null;

    groups = stores.length
      ? await prisma.customerGroup.findMany({
          where: { storeId: { in: stores.map((s) => s.id) } },
          orderBy: { name: "asc" },
          select: {
            id: true,
            storeId: true,
            name: true,
          },
        })
      : [];
  } catch (error) {
    console.error("[NEW_CUSTOMER_PAGE_DB_ERROR]", error);
    setupError = "Could not load stores. Check DATABASE_URL, run migrations, and make sure Postgres is reachable.";
  }

  return (
    <NewCustomerForm
      stores={stores}
      selectedStoreId={selectedStoreId}
      initialGroups={groups}
      setupError={setupError}
    />
  );
}
