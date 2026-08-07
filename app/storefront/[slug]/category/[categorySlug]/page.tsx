import StorefrontPage from "../../page";

type PageProps = {
  params: Promise<{ slug: string; categorySlug: string }>;
  searchParams: Promise<{ q?: string }>;
};

export default async function StorefrontCategoryPage({ params, searchParams }: PageProps) {
  const { slug, categorySlug } = await params;
  const { q } = await searchParams;

  return (
    <StorefrontPage
      params={Promise.resolve({ slug })}
      searchParams={Promise.resolve({ category: categorySlug, q })}
    />
  );
}
