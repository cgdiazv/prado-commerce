import { prisma } from "@/lib/prisma";
import { StoresDashboard } from "./stores-dashboard";

export default async function StoresPage() {
  try {
    const stores = await prisma.store.findMany({
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        name: true,
        slug: true,
        customDomain: true,
        currency: true,
        timezone: true,
        allowedDomains: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return <StoresDashboard initialStores={stores} />;
  } catch (error) {
    console.error("[STORES_PAGE_DB_ERROR]", error);

    return (
      <StoresDashboard
        initialStores={[]}
        setupError="Prisma could not read from the database yet. Check DATABASE_URL, run migrations, and make sure Postgres is reachable."
      />
    );
  }
}