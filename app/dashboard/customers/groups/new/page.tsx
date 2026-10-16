import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { NewCustomerGroupForm } from "./new-group-form";

type NewGroupPageProps = {
  searchParams?: Promise<{
    storeId?: string;
  }>;
};

export default async function NewCustomerGroupPage({ searchParams }: NewGroupPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const user = await getCurrentUser();

  if (!user) {
    return (
      <NewCustomerGroupForm
        stores={[]}
        selectedStoreId={null}
        setupError="Could not verify your session. Please sign in again."
      />
    );
  }

  let serializedStores: Array<{ id: string; name: string; currency: string }> = [];
  let selectedStoreId: string | null = null;
  let setupError: string | null = null;

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

    selectedStoreId = resolvedSearchParams?.storeId ?? stores[0]?.id ?? null;
    serializedStores = JSON.parse(JSON.stringify(stores));
  } catch (error) {
    console.error("[NEW_CUSTOMER_GROUP_PAGE_DB_ERROR]", error);
    setupError = "Could not load stores. Please check database connection.";
  }

  return (
    <NewCustomerGroupForm
      stores={serializedStores}
      selectedStoreId={selectedStoreId}
      setupError={setupError}
    />
  );
}
