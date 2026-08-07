import { headers } from "next/headers";
import { redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ slug: string; categorySlug: string }>;
  searchParams: Promise<{ q?: string }>;
};

export default async function StorefrontCategoryPage({ params, searchParams }: PageProps) {
  const { slug, categorySlug } = await params;
  const { q } = await searchParams;
  const hdrs = await headers();
  const isSubdomain = hdrs.get("x-storefront-subdomain") === "1";
  const base = isSubdomain ? "" : `/storefront/${slug}`;
  const query = new URLSearchParams({ category: categorySlug });

  if (q?.trim()) {
    query.set("q", q.trim());
  }

  redirect(`${base}/?${query.toString()}`);
}
