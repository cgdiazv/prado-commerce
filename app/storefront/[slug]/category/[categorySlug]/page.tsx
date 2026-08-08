import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { normalizeStorefrontTheme } from "@/lib/storefront-theme";
import CategoryPageContent from "../../../category-page-content";

type PageProps = {
  params: Promise<{ slug: string; categorySlug: string }>;
  searchParams: Promise<{ q?: string }>;
};

export async function generateMetadata({ params }: Pick<PageProps, "params">): Promise<Metadata> {
  const { slug, categorySlug } = await params;
  const category = await prisma.category.findFirst({
    where: { slug: categorySlug, store: { slug } },
    select: { name: true, store: { select: { name: true } } },
  });

  if (!category) {
    return {};
  }

  return {
    title: `${category.name} | ${category.store.name}`,
    description: `Shop ${category.name} products from ${category.store.name}.`,
  };
}

export default async function StorefrontCategoryPage({ params, searchParams }: PageProps) {
  const { slug, categorySlug } = await params;
  const { q } = await searchParams;
  const searchQuery = q?.trim() ?? "";

  const category = await prisma.category.findFirst({
    where: { slug: categorySlug, store: { slug } },
    select: {
      id: true,
      name: true,
      store: {
        select: {
          id: true,
          name: true,
          slug: true,
          currency: true,
          activeTheme: true,
        },
      },
    },
  });

  if (!category) {
    notFound();
  }

  const products = await prisma.product.findMany({
    where: {
      storeId: category.store.id,
      categoryId: category.id,
      status: "ACTIVE",
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
      images: true,
      variants: {
        select: { id: true, price: true },
        take: 1,
        orderBy: { price: "asc" },
      },
    },
  });

  const hdrs = await headers();
  const isSubdomain = hdrs.get("x-storefront-subdomain") === "1";
  const basePath = isSubdomain ? "" : `/storefront/${category.store.slug}`;

  return (
    <CategoryPageContent
      storeName={category.store.name}
      currency={category.store.currency}
      categoryName={category.name}
      products={products}
      basePath={basePath}
      theme={normalizeStorefrontTheme(category.store.activeTheme)}
      searchQuery={searchQuery}
    />
  );
}
