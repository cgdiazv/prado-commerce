import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { CategoriesDashboard } from "./categories-dashboard";

type CategoriesPageProps = {
  searchParams?: Promise<{
    storeId?: string;
  }>;
};

type CategoryRecord = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  storeId: string;
  updatedAt: Date;
};

export default async function ProductCategoriesPage({ searchParams }: CategoriesPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const user = await getCurrentUser();

  if (!user) {
    return (
      <CategoriesDashboard
        initialStores={[]}
        initialCategories={[]}
        selectedStoreId={null}
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
        currency: true,
      },
    });

    const selectedStoreId = resolvedSearchParams?.storeId ?? stores[0]?.id ?? null;

    const categories = stores.length
      ? await prisma.category.findMany({
          where: { storeId: { in: stores.map((store) => store.id) } },
          orderBy: { name: "asc" },
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            storeId: true,
            updatedAt: true,
          },
        })
      : [];

    return (
      <CategoriesDashboard
        initialStores={stores}
        initialCategories={categories as CategoryRecord[]}
        selectedStoreId={selectedStoreId}
      />
    );
  } catch (error) {
    console.error("[PRODUCT_CATEGORIES_PAGE_DB_ERROR]", error);

    return (
      <CategoriesDashboard
        initialStores={[]}
        initialCategories={[]}
        selectedStoreId={null}
        setupError="Could not load categories. Check DATABASE_URL, run migrations, and make sure Postgres is reachable."
      />
    );
  }
}
