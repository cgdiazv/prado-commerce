import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import StorefrontHomeClient from "../storefront-home-client";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ category?: string; q?: string }>;
};

export default async function StorefrontPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { category: activeCategory, q } = await searchParams;
  const searchQuery = q?.trim() ?? "";

  const store = await prisma.store.findUnique({
    where: { slug },
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

  // root-relative when on a subdomain, prefixed when on the main domain
  const hdrs = await headers();
  const isSubdomain = hdrs.get("x-storefront-subdomain") === "1";
  const base = isSubdomain ? "" : `/storefront/${store.slug}`;

  const [products, featuredProducts, categories] = await Promise.all([
    prisma.product.findMany({
      where: {
        storeId: store.id,
        status: "ACTIVE",
        ...(activeCategory ? { category: { slug: activeCategory } } : {}),
        ...(searchQuery
          ? {
              OR: [
                { title: { contains: searchQuery, mode: "insensitive" as const } },
                { slug: { contains: searchQuery, mode: "insensitive" as const } },
                { description: { contains: searchQuery, mode: "insensitive" as const } },
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
          select: { id: true, title: true, price: true, inventory: true, trackInventory: true },
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
          select: { price: true, inventory: true, trackInventory: true },
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

  return (
    <StorefrontHomeClient
      store={store}
      products={serializedProducts}
      featuredProducts={serializedFeaturedProducts}
      categories={categories}
      base={base}
    />
  );
}
