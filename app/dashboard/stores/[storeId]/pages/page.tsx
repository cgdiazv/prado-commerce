import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { normalizeStorefrontPages } from "@/lib/storefront-pages";
import { StorePagesClient } from "./store-pages-client";

type PagesPageProps = {
  params: Promise<{
    storeId: string;
  }>;
};

export default async function StorePagesPage({ params }: PagesPageProps) {
  const { storeId } = await params;
  const user = await getCurrentUser();

  if (!user) {
    return (
      <section className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        Could not verify your session. Please sign in again.
      </section>
    );
  }

  let store;
  try {
    store = await prisma.store.findFirst({
      where: { id: storeId, ownerUserId: user.id },
      select: { id: true, name: true, slug: true, storefrontPages: true },
    });
  } catch (error) {
    console.error("[STORE_PAGES_PAGE_DB_ERROR]", error);
    return (
      <section className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        Could not load store pages. Please check database connectivity and refresh.
      </section>
    );
  }

  if (!store) {
    notFound();
  }

  const userStores = await prisma.store.findMany({
    where: { ownerUserId: user.id },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <StorePagesClient
      key={store.id}
      store={{ id: store.id, name: store.name, slug: store.slug }}
      stores={userStores}
      initialPages={normalizeStorefrontPages(store.storefrontPages)}
    />
  );
}
