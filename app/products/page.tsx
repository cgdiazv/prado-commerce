import { prisma } from "@/lib/prisma";
import { ProductsDashboard } from "./products-dashboard";

type ProductsPageProps = {
  searchParams?: Promise<{
    storeId?: string;
  }>;
};

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  try {
    const stores = await prisma.store.findMany({
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

    const selectedStoreId =
      resolvedSearchParams?.storeId ?? stores[0]?.id ?? null;

    const products = selectedStoreId
      ? await prisma.product.findMany({
          where: {
            storeId: selectedStoreId,
          },
          orderBy: {
            createdAt: "desc",
          },
          include: {
            variants: true,
          },
        })
      : [];

    const serializedProducts = products.map((product) => ({
      ...product,
      createdAt: product.createdAt.toISOString(),
      updatedAt: product.updatedAt.toISOString(),
      variants: product.variants.map((variant) => ({
        ...variant,
        price: variant.price.toString(),
        compareAtPrice: variant.compareAtPrice?.toString() ?? null,
      })),
    }));

    return (
      <ProductsDashboard
        initialStores={stores}
        initialProducts={serializedProducts}
        selectedStoreId={selectedStoreId}
      />
    );
  } catch (error) {
    console.error("[PRODUCTS_PAGE_DB_ERROR]", error);

    return (
      <ProductsDashboard
        initialStores={[]}
        initialProducts={[]}
        selectedStoreId={null}
        setupError="Prisma could not read from the database yet. Check DATABASE_URL, run migrations, and make sure Postgres is reachable."
      />
    );
  }
}