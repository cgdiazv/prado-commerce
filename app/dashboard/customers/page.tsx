import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { CustomersDashboard } from "./customers-dashboard";

type CustomersPageProps = {
  searchParams?: Promise<{
    storeId?: string;
  }>;
};

type CustomerRecord = {
  id: string;
  storeId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  groupId: string | null;
  group: { id: string; name: string } | null;
  shippingAddress: unknown | null;
  billingAddress: unknown | null;
  createdAt: string;
};

type CustomerGroupRecord = {
  id: string;
  name: string;
};

export default async function CustomersPage({ searchParams }: CustomersPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const user = await getCurrentUser();

  if (!user) {
    return (
      <CustomersDashboard
        initialStores={[]}
        initialCustomers={[]}
        initialGroups={[]}
        selectedStoreId={null}
        setupError="Could not verify your session. Please sign in again after database connectivity is restored."
      />
    );
  }

  let serializedStores: Array<{ id: string; name: string; currency: string }> = [];
  let serializedCustomers: CustomerRecord[] = [];
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

    const [customers, customerGroups] = await Promise.all([
      selectedStoreId
        ? prisma.customer.findMany({
            where: { storeId: selectedStoreId },
            orderBy: { createdAt: "desc" },
            select: {
              id: true,
              storeId: true,
              email: true,
              firstName: true,
              lastName: true,
              phone: true,
              groupId: true,
              group: {
                select: {
                  id: true,
                  name: true,
                },
              },
              shippingAddress: true,
              billingAddress: true,
              createdAt: true,
            },
          })
        : Promise.resolve([]),
      selectedStoreId
        ? prisma.customerGroup.findMany({
            where: { storeId: selectedStoreId },
            orderBy: { name: "asc" },
            select: {
              id: true,
              name: true,
            },
          })
        : Promise.resolve([]),
    ]);

    serializedCustomers = JSON.parse(
      JSON.stringify(
        customers.map((customer) => ({
          ...customer,
          createdAt: customer.createdAt.toISOString(),
        }))
      )
    );

    serializedStores = JSON.parse(JSON.stringify(stores));
    serializedGroups = JSON.parse(JSON.stringify(customerGroups));
  } catch (error) {
    console.error("[CUSTOMERS_PAGE_DB_ERROR]", error);
    const detail = error instanceof Error ? error.message : String(error);
    setupError =
      process.env.NODE_ENV === "development"
        ? `Could not load customers: ${detail}`
        : "Could not load customers. Check DATABASE_URL, run migrations, and make sure Postgres is reachable.";
  }

  return (
    <CustomersDashboard
      initialStores={serializedStores}
      initialCustomers={serializedCustomers}
      initialGroups={serializedGroups}
      selectedStoreId={selectedStoreId}
      setupError={setupError}
    />
  );
}
