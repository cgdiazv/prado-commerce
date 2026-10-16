import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { GroupsDashboard } from "./groups-dashboard";

type GroupsPageProps = {
  searchParams?: Promise<{
    storeId?: string;
  }>;
};

type CustomerGroupRecord = {
  id: string;
  storeId: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: {
    customers: number;
  };
};

export default async function CustomerGroupsPage({ searchParams }: GroupsPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const user = await getCurrentUser();

  if (!user) {
    return (
      <GroupsDashboard
        initialStores={[]}
        initialGroups={[]}
        selectedStoreId={null}
        setupError="Could not verify your session. Please sign in again."
      />
    );
  }

  let serializedStores: Array<{ id: string; name: string; currency: string }> = [];
  let serializedGroups: CustomerGroupRecord[] = [];
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

    const groups = stores.length
      ? await prisma.customerGroup.findMany({
          where: { storeId: { in: stores.map((s) => s.id) } },
          orderBy: { name: "asc" },
          include: {
            _count: {
              select: { customers: true },
            },
          },
        })
      : [];

    serializedGroups = JSON.parse(
      JSON.stringify(
        groups.map((group) => ({
          ...group,
          createdAt: group.createdAt.toISOString(),
          updatedAt: group.updatedAt.toISOString(),
        }))
      )
    );

    serializedStores = JSON.parse(JSON.stringify(stores));
  } catch (error) {
    console.error("[CUSTOMER_GROUPS_PAGE_DB_ERROR]", error);
    const detail = error instanceof Error ? error.message : String(error);
    setupError =
      process.env.NODE_ENV === "development"
        ? `Could not load customer groups: ${detail}`
        : "Could not load customer groups. Check database connection and migrations.";
  }

  return (
    <GroupsDashboard
      initialStores={serializedStores}
      initialGroups={serializedGroups}
      selectedStoreId={selectedStoreId}
      setupError={setupError}
    />
  );
}
