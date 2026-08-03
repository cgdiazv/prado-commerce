import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { StoresDashboard } from "../stores-dashboard";

export default async function StoresPage() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <StoresDashboard
        initialStores={[]}
        currentPlan="STARTER"
        setupError="Could not verify your session. Please sign in again after database connectivity is restored."
      />
    );
  }

  try {
    const stores = await prisma.store.findMany({
      where: { ownerUserId: user.id },
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

    return <StoresDashboard initialStores={stores} currentPlan={user.plan} />;
  } catch (error) {
    console.error("[STORES_PAGE_DB_ERROR]", error);

    return (
      <StoresDashboard
        initialStores={[]}
        currentPlan={user.plan}
        setupError="Could not load your stores. Check DATABASE_URL, run migrations, and make sure Postgres is reachable."
      />
    );
  }
}

