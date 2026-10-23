import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { normalizeStorefrontTheme } from "@/lib/storefront-theme";
import PasswordResetForm from "../../../password-reset-form";
import CategoryPageContent from "../../../category-page-content";
import StorefrontProductClient from "../../../storefront-product-client";
import StorefrontHomeClient from "../../../storefront-home-client";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ domain: string; path?: string[] }>;
  searchParams: Promise<{ category?: string; q?: string }>;
};

export default async function CustomDomainStorefrontPage({ params, searchParams }: PageProps) {
  const { domain, path: pathSegments } = await params;
  const { category: activeCategoryFromQuery, q } = await searchParams;
  const activeCategoryFromPath = pathSegments?.[0] === "category" && pathSegments[1]
    ? decodeURIComponent(pathSegments[1])
    : undefined;
  const activeCategory = activeCategoryFromPath ?? activeCategoryFromQuery;
  const searchQuery = q?.trim() ?? "";
  const normalizedDomain = decodeURIComponent(domain).toLowerCase();

  const candidateDomains = normalizedDomain.startsWith("www.")
    ? [normalizedDomain, normalizedDomain.slice(4)]
    : [normalizedDomain, `www.${normalizedDomain}`];

  const store = await prisma.store.findFirst({
    where: {
      customDomain: {
        in: candidateDomains,
      },
    },
    select: {
      id: true,
      name: true,
      slug: true,
      logoUrl: true,
      heroImageUrl: true,
      heroEyebrow: true,
      heroTitle: true,
      heroSubtitle: true,
      heroButtonText: true,
      activeTheme: true,
      mainColor: true,
      currency: true,
    },
  });

  if (!store) {
    notFound();
  }

  const theme = normalizeStorefrontTheme(store.activeTheme);

  // Handle /reset/[token] path for custom domain storefronts
  if (pathSegments?.[0] === "reset" && pathSegments[1]) {
    return <PasswordResetForm token={pathSegments[1]} successPath="/account" storeName={store.name} />;
  }

  // Handle /products/[id] path for custom domain storefronts
  if (pathSegments?.[0] === "products" && pathSegments[1]) {
    const productId = pathSegments[1];
    const product = await prisma.product.findFirst({
      where: {
        storeId: store.id,
        OR: [{ id: productId }, { slug: productId }],
        status: "ACTIVE",
      },
      select: {
        id: true,
        title: true,
        slug: true,
        description: true,
        dimension: true,
        weight: true,
        manufacturer: true,
        condition: true,
        conditionNotes: true,
        images: true,
        category: {
          select: { id: true, name: true, slug: true },
        },
        variants: {
          select: { id: true, title: true, price: true, inventory: true, stockStatus: true },
          orderBy: { price: "asc" as const },
        },
      },
    });

    if (!product) notFound();

    const serializedProduct = {
      ...product,
      variants: product.variants.map((v) => ({
        ...v,
        price: v.price != null ? Number(v.price) : null,
      })),
    };

    return (
      <StorefrontProductClient
        store={store}
        product={serializedProduct}
        base=""
      />
    );
  }

  const [products, featuredProducts, categories] = await Promise.all([
    prisma.product.findMany({
      where: {
        storeId: store.id,
        status: "ACTIVE",
        ...((activeCategory || searchQuery)
          ? {
              AND: [
                ...(activeCategory
                  ? [{
                      OR: [
                        { category: { slug: activeCategory } },
                        { categories: { some: { slug: activeCategory } } },
                      ],
                    }]
                  : []),
                ...(searchQuery
                  ? [{
                      OR: [
                        { title: { contains: searchQuery, mode: "insensitive" as const } },
                        { slug: { contains: searchQuery, mode: "insensitive" as const } },
                        { description: { contains: searchQuery, mode: "insensitive" as const } },
                      ],
                    }]
                  : []),
              ],
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        slug: true,
        description: true,
        images: true,
        category: {
          select: { id: true, name: true, slug: true },
        },
        variants: {
          select: { id: true, title: true, price: true, inventory: true, stockStatus: true },
          take: 1,
          orderBy: { price: "asc" },
        },
      },
    }),
    prisma.product.findMany({
      where: {
        storeId: store.id,
        status: "ACTIVE",
        featured: true,
      },
      orderBy: { updatedAt: "desc" },
      take: 4,
      select: {
        id: true,
        title: true,
        slug: true,
        images: true,
        variants: {
          select: { id: true, price: true, inventory: true, stockStatus: true },
          take: 1,
          orderBy: { price: "asc" },
        },
      },
    }),
    prisma.category.findMany({
      where: { storeId: store.id },
      orderBy: { name: "asc" },
      select: { id: true, name: true, slug: true },
    }),
  ]);

  const serializedProducts = products.map((product) => ({
    ...product,
    variants: product.variants.map((v) => ({
      ...v,
      price: v.price != null ? Number(v.price) : null,
    })),
  }));

  const serializedFeaturedProducts = featuredProducts.map((product) => ({
    ...product,
    variants: product.variants.map((v) => ({
      ...v,
      price: v.price != null ? Number(v.price) : null,
    })),
  }));

  if (activeCategoryFromPath) {
    const category = categories.find((candidate) => candidate.slug === activeCategoryFromPath);

    if (!category) {
      notFound();
    }

    return (
      <CategoryPageContent
        storeName={store.name}
        currency={store.currency}
        categoryName={category.name}
        products={serializedProducts}
        basePath=""
        theme={theme}
        searchQuery={searchQuery}
      />
    );
  }

  return (
    <StorefrontHomeClient
      store={store}
      products={serializedProducts}
      featuredProducts={serializedFeaturedProducts}
      categories={categories}
      base=""
    />
  );
}