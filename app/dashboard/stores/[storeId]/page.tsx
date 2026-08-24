import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { EditStoreForm } from "./edit-store-form";

type EditStorePageProps = {
  params: Promise<{
    storeId: string;
  }>;
};

export default async function EditStorePage({ params }: EditStorePageProps) {
  const { storeId } = await params;
  const user = await getCurrentUser();

  if (!user) {
    return (
      <section className="min-w-0 space-y-6">
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Could not verify your session. Please sign in again after database connectivity is restored.
        </div>
      </section>
    );
  }

  let store;
  try {
    store = await prisma.store.findFirst({
      where: {
        id: storeId,
        ownerUserId: user.id,
      },
    });
  } catch (error) {
    console.error("[EDIT_STORE_PAGE_DB_ERROR]", error);

    return (
      <section className="min-w-0 space-y-6">
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Could not load store details. Check DATABASE_URL, run migrations, and make sure Postgres is reachable.
        </div>
      </section>
    );
  }

  if (!store) {
    notFound();
  }

  const serializedStore = JSON.parse(
    JSON.stringify({
      ...store,
      createdAt: store.createdAt.toISOString(),
      updatedAt: store.updatedAt.toISOString(),
    })
  );

  return <EditStoreForm store={serializedStore} currentPlan={user.plan} />;
}
