import Link from "next/link";
import type { CSSProperties } from "react";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getStoreBrandingCssVars } from "@/lib/branding";
import AddToCartWithQuantity from "../../../add-to-cart-with-quantity";
import StorefrontNavbar from "../../../storefront-navbar";
import StorefrontFooter from "../../../storefront-footer";

type PageProps = {
  params: Promise<{ domain: string; path?: string[] }>;
  searchParams: Promise<{ category?: string }>;
};

export default async function CustomDomainStorefrontPage({ params, searchParams }: PageProps) {
  const { domain, path: pathSegments } = await params;
  const { category: activeCategory } = await searchParams;
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
      mainColor: true,
      currency: true,
    },
  });

  if (!store) {
    notFound();
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
        id: true, title: true, description: true, images: true,
        variants: {
          select: { id: true, title: true, price: true },
          orderBy: { price: "asc" as const },
        },
      },
    });

    if (!product) notFound();
    const primaryVariant = product.variants[0];

    return (
      <div
        style={getStoreBrandingCssVars(store.mainColor) as CSSProperties}
        className="flex min-h-screen flex-col bg-slate-50 text-slate-900"
      >
        <StorefrontNavbar storeName={store.name} mainColor={store.mainColor} />
        <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-12">
          <div className="grid gap-10 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              {product.images[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={product.images[0]} alt={product.title} className="h-80 w-full rounded-2xl object-cover" />
              ) : (
                <div className="flex h-80 items-center justify-center rounded-2xl bg-slate-100 text-sm text-slate-400">No image available</div>
              )}
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--store-main-color)]">Product details</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight">{product.title}</h2>
              <p className="mt-4 text-base leading-7 text-slate-600">{product.description}</p>
              <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500">Starting at</p>
                    <p className="mt-1 text-2xl font-semibold text-slate-900">
                      {store.currency} {Number(primaryVariant?.price ?? 0).toFixed(2)}
                    </p>
                  </div>
                  {primaryVariant ? (
                    <AddToCartWithQuantity variantId={primaryVariant.id} />
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </main>
        <script dangerouslySetInnerHTML={{ __html: `window.PRADO_STORE_CONFIG={storeId:${JSON.stringify(store.id)}};if(!window.__pradoCart){window.__pradoCart=1;var s=document.createElement('script');s.src='/cart.js';document.head.appendChild(s);}` }} />
        <StorefrontFooter storeName={store.name} />
      </div>
    );
  }

  const [products, categories] = await Promise.all([
    prisma.product.findMany({
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
      className="min-h-screen bg-slate-50 text-slate-900"
    >
      <StorefrontNavbar
        storeName={store.name}
        categories={categories}
        activeCategory={activeCategory}
        mainColor={store.mainColor}
      />

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-12">
        <nav aria-label="Breadcrumb" className="mb-6 flex flex-wrap items-center gap-2 text-sm text-slate-500">
          <Link href="/" className="transition hover:text-slate-900">
            Home
          </Link>
          <ChevronRight className="h-4 w-4 text-slate-400" />
          <Link href="/" className="transition hover:text-slate-900">
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
                    href={`/products/${product.id}`}
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
                    <div className="flex h-48 items-center justify-center bg-slate-100 text-sm text-slate-300">
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