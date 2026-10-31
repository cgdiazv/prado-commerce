import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getStorefrontContactInfo, hasStorefrontPageContent, isStorefrontPageKey, normalizeStorefrontPages } from "@/lib/storefront-pages";
import StorefrontPageContent from "../../../storefront-page-content";

type PageProps = {
  params: Promise<{ slug: string; pageKey: string }>;
};

export default async function StorefrontInfoPage({ params }: PageProps) {
  const { slug, pageKey } = await params;

  if (!isStorefrontPageKey(pageKey)) {
    notFound();
  }

  const store = await prisma.store.findUnique({
    where: { slug },
    select: { id: true, name: true, slug: true, senderEmail: true, shippingOrigin: true, storefrontPages: true },
  });

  if (!store) {
    notFound();
  }

  const page = normalizeStorefrontPages(store.storefrontPages)[pageKey];

  if (!page.enabled || !hasStorefrontPageContent(pageKey, page)) {
    notFound();
  }

  const hdrs = await headers();
  const base = hdrs.get("x-storefront-subdomain") === "1" ? "" : `/storefront/${store.slug}`;

  return <StorefrontPageContent pageKey={pageKey} page={page} homeHref={`${base}/`} contact={getStorefrontContactInfo(store)} />;
}
