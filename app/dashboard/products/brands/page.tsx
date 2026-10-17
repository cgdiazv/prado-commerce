import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { BrandsDashboard } from "./brands-dashboard";

type BrandsPageProps = {
  searchParams?: Promise<{
    storeId?: string;
  }>;
};

export default async function ProductBrandsPage({ searchParams }: BrandsPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const user = await getCurrentUser();

  if (!user) {
    return (
      <BrandsDashboard
        initialStores={[]}
        initialBrands={[]}
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

    const brands = stores.length
      ? await prisma.brand.findMany({
          where: { storeId: { in: stores.map((store) => store.id) } },
          orderBy: { name: "asc" },
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            storeId: true,
            updatedAt: true,
            _count: {
              select: {
                products: true,
              },
            },
          },
        })
      : [];

    return (
      <BrandsDashboard
        initialStores={stores}
        initialBrands={JSON.parse(JSON.stringify(brands))}
        selectedStoreId={selectedStoreId}
      />
    );
  } catch (error) {
    console.error("[BRANDS_PAGE_DB_ERROR]", error);
    return (
      <BrandsDashboard
        initialStores={[]}
        initialBrands={[]}
        selectedStoreId={null}
        setupError="Could not load brands. Please check database connectivity and refresh."
      />
    );
  }
}
