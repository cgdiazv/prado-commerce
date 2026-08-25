import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getStorefrontThemeClasses, normalizeStorefrontTheme } from "@/lib/storefront-theme";
import AddToCartWithQuantity from "../../../add-to-cart-with-quantity";

type PageProps = {
  params: Promise<{ slug: string; productSlug: string }>;
};

export default async function StorefrontProductPage({ params }: PageProps) {
  const { slug, productSlug } = await params;

  const store = await prisma.store.findUnique({
    where: { slug },
    select: { id: true, name: true, slug: true, logoUrl: true, activeTheme: true, mainColor: true, currency: true },
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
  const theme = normalizeStorefrontTheme(store.activeTheme);
  const themeClasses = getStorefrontThemeClasses(theme);

  const primaryVariant = product.variants[0];

  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: store.currency || "USD",
  });

  return (
    <div className="contents">
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-12">
        <nav aria-label="Breadcrumb" className="mb-6 flex flex-wrap items-center gap-2 text-sm text-slate-500">
          <Link href={base ? `${base}/` : "/"} className="transition hover:text-slate-900">
            Home
          </Link>
          <ChevronRight className="h-4 w-4 text-slate-400" />
          <Link href={base ? `${base}/` : "/"} className="transition hover:text-slate-900">
            Categories
          </Link>
          {product.category ? (
            <>
              <ChevronRight className="h-4 w-4 text-slate-400" />
              <Link href={base ? `${base}/?category=${product.category.slug}` : `/?category=${product.category.slug}`} className="transition hover:text-slate-900">
                {product.category.name}
              </Link>
            </>
          ) : null}
          <ChevronRight className="h-4 w-4 text-slate-400" />
          <span className="font-semibold text-slate-900" aria-current="page">
            {product.title}
          </span>
        </nav>
        <div className={`grid gap-10 rounded-3xl border p-8 lg:grid-cols-[1.1fr_0.9fr] ${themeClasses.panel}`}>
          <div>
            {product.images[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={product.images[0]} alt={product.title} className="h-80 w-full rounded-2xl object-cover" />
            ) : (
              <div className="flex h-80 items-center justify-center rounded-2xl bg-slate-100 text-sm text-slate-400">
                No image available
              </div>
            )}
          </div>

          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--store-main-color)]">Product details</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight">{product.title}</h2>
            <p className="mt-4 text-base leading-7 text-slate-600">{product.description}</p>

            {product.manufacturer || product.dimension || product.weight || product.condition || product.conditionNotes ? (
              <div className="mt-4 flex flex-col gap-2 text-sm text-slate-600 border-t border-b border-slate-100 py-3">
                <div className="flex flex-wrap gap-x-6 gap-y-2">
                  {product.manufacturer ? (
                    <div>
                      <span className="font-semibold text-slate-900">Manufacturer: </span>
                      {product.manufacturer}
                    </div>
                  ) : null}
                  {product.dimension ? (
                    <div>
                      <span className="font-semibold text-slate-900">Dimensions: </span>
                      {product.dimension}
                    </div>
                  ) : null}
                  {product.weight ? (
                    <div>
                      <span className="font-semibold text-slate-900">Weight: </span>
                      {product.weight}
                    </div>
                  ) : null}
                  {product.condition ? (
                    <div>
                      <span className="font-semibold text-slate-900">Condition: </span>
                      {product.condition.replace(/_/g, " ")}
                    </div>
                  ) : null}
                </div>
                {product.conditionNotes ? (
                  <div className="text-xs text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-200/60 mt-1">
                    <span className="font-semibold text-slate-700">Condition Notes: </span>
                    {product.conditionNotes}
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className={`mt-8 rounded-2xl border p-5 ${themeClasses.mutedPanel}`}>
              <div className="flex items-center justify-between">
                {primaryVariant ? (
                  <AddToCartWithQuantity variantId={primaryVariant.id} />
                ) : null}
                <div>
                  <p className="text-sm font-medium text-slate-500">Starting at</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-900">
                    {formatter.format(Number(primaryVariant?.price ?? 0))}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

    </div>
  );
}
