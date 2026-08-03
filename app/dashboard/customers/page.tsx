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
  shippingAddress: unknown | null;
  billingAddress: unknown | null;
  createdAt: string;
};

export default async function CustomersPage({ searchParams }: CustomersPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const user = await getCurrentUser();

  if (!user) {
    return (
      <CustomersDashboard
        initialStores={[]}
        initialCustomers={[]}
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

    const customers = selectedStoreId
      ? await prisma.customer.findMany({
          where: { storeId: selectedStoreId },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            storeId: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            shippingAddress: true,
            billingAddress: true,
            createdAt: true,
          },
        })
      : [];

    const serializedCustomers = customers.map((customer) => ({
      ...customer,
      createdAt: customer.createdAt.toISOString(),
    }));

    return (
      <CustomersDashboard
        initialStores={stores}
        initialCustomers={serializedCustomers as CustomerRecord[]}
        selectedStoreId={selectedStoreId}
      />
    );
  } catch (error) {
    console.error("[CUSTOMERS_PAGE_DB_ERROR]", error);

    return (
      <CustomersDashboard
        initialStores={[]}
        initialCustomers={[]}
        selectedStoreId={null}
        setupError="Could not load customers. Check DATABASE_URL, run migrations, and make sure Postgres is reachable."
      />
    );
  }
}
