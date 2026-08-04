import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { NewStoreForm } from "./new-store-form";

export default async function NewStorePage() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <NewStoreForm
        currentPlan="STARTER"
        initialStoreCount={0}
        setupError="Could not verify your session. Please sign in again after database connectivity is restored."
      />
    );
  }

  try {
    const storeCount = await prisma.store.count({ where: { ownerUserId: user.id } });

    return (
      <NewStoreForm
        currentPlan={user.plan}
        initialStoreCount={storeCount}
      />
    );
  } catch (error) {
    console.error("[NEW_STORE_PAGE_DB_ERROR]", error);

    return (
      <NewStoreForm
        currentPlan={user.plan}
        initialStoreCount={0}
        setupError="Could not prepare store creation. Check DATABASE_URL, run migrations, and make sure Postgres is reachable."
      />
    );
  }
}
