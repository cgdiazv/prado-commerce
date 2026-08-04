import Link from "next/link";
import type { CSSProperties } from "react";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getStoreBrandingCssVars } from "@/lib/branding";
import StorefrontNavbar from "../storefront-navbar";
import StorefrontFooter from "../storefront-footer";

type PageProps = { params: Promise<{ slug: string }>; searchParams: Promise<{ category?: string }> };

export default async function StorefrontPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { category: activeCategory } = await searchParams;

  const store = await prisma.store.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
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

  const [products, categories] = await Promise.all([    prisma.product.findMany({
      where: {
        storeId: store.id,
        status: "ACTIVE",
        ...(activeCategory ? { category: { slug: activeCategory } } : {}),
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        slug: true,
        description: true,
        images: true,
        variants: {
          select: { id: true, title: true, price: true },
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

  const activeCategoryObj = activeCategory ? categories.find((c) => c.slug === activeCategory) : null;
  const activeCategoryName = activeCategoryObj ? activeCategoryObj.name : activeCategory ? activeCategory : null;

  return (
    <div
      style={getStoreBrandingCssVars(store.mainColor) as CSSProperties}
      className="flex min-h-screen flex-col bg-slate-50 text-slate-900"
    >
      <StorefrontNavbar
        storeName={store.name}
        basePath={base}
        categories={categories}
        activeCategory={activeCategory}
        mainColor={store.mainColor}
      />

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-12">
        <nav aria-label="Breadcrumb" className="mb-6 flex flex-wrap items-center gap-2 text-sm text-slate-500">
          <Link href={base ? `${base}/` : "/"} className="transition hover:text-slate-900">
            Home
          </Link>
          <ChevronRight className="h-4 w-4 text-slate-400" />
          <Link href={base ? `${base}/` : "/"} className="transition hover:text-slate-900">
            Categories
          </Link>
          {activeCategoryName ? (
            <>
              <ChevronRight className="h-4 w-4 text-slate-400" />
              <span className="font-semibold text-slate-900" aria-current="page">
                {activeCategoryName}
              </span>
            </>
          ) : (
            <>
              <ChevronRight className="h-4 w-4 text-slate-400" />
              <span className="font-semibold text-slate-900" aria-current="page">
                All Products
              </span>
            </>
          )}
        </nav>
        {products.length === 0 ? (
          <p className="text-center text-slate-500">No products available yet.</p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => {
              const price = product.variants[0]?.price;
              const variantId = product.variants[0]?.id;
              return (
                <div
                  key={product.id}
                  className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md"
                >
                  {/* stretched link covers the whole card; button sits above it */}
                  <Link
                    href={`${base}/products/${product.id}`}
                    className="absolute inset-0 z-0"
                    aria-label={product.title}
                  />
                  {product.images[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={product.images[0]}
                      alt={product.title}
                      className="h-48 w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-48 items-center justify-center bg-slate-100 text-slate-300 text-sm">
                      No image
                    </div>
                  )}
                  <div className="p-4">
                    <h2 className="font-semibold text-slate-900">{product.title}</h2>
                    <div className="mt-3 flex items-center justify-between">
                      {price != null ? (
                        <span className="text-sm font-semibold text-slate-700">
                          {store.currency} {Number(price).toFixed(2)}
                        </span>
                      ) : <span className="text-sm text-slate-400">Select options</span>}
                      {variantId ? (
                        <button
                          type="button"
                          data-prado-add={variantId}
                          data-prado-add-to-cart={variantId}
                          className="relative z-10 rounded-full bg-[var(--store-main-color)] px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-[var(--store-main-color-hover)]"
                        >
                          Add to cart
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <script dangerouslySetInnerHTML={{ __html: `window.PRADO_STORE_CONFIG={storeId:${JSON.stringify(store.id)}};if(!window.__pradoCart){window.__pradoCart=1;var s=document.createElement('script');s.src='/cart.js';document.head.appendChild(s);}` }} />
      <StorefrontFooter storeName={store.name} />
    </div>
  );
}
