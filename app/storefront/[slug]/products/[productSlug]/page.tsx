import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import StorefrontProductClient from "../../../storefront-product-client";

type PageProps = {
  params: Promise<{ slug: string; productSlug: string }>;
};

export default async function StorefrontProductPage({ params }: PageProps) {
  const { slug, productSlug } = await params;

  const store = await prisma.store.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      logoUrl: true,
      activeTheme: true,
      mainColor: true,
      currency: true,
    },
  });

  if (!store) {
    notFound();
  }

  const product = await prisma.product.findFirst({
    where: {
      storeId: store.id,
      OR: [
        { id: productSlug },
        { slug: productSlug },
      ],
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
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      variants: {
        select: {
          id: true,
          title: true,
          price: true,
        },
        orderBy: { price: "asc" },
      },
    },
  });

  if (!product) {
    notFound();
  }

  const hdrs = await headers();
  const isSubdomain = hdrs.get("x-storefront-subdomain") === "1";
  const base = isSubdomain ? "" : `/storefront/${store.slug}`;

  return (
    <StorefrontProductClient
      store={store}
      product={product}
      base={base}
    />
  );
}
