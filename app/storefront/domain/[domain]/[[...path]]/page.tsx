import Link from "next/link";
import type { CSSProperties } from "react";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getStoreBrandingCssVars } from "@/lib/branding";
import { getStorefrontThemeClasses, getStorefrontThemeHeroContent, normalizeStorefrontTheme } from "@/lib/storefront-theme";
import AddToCartWithQuantity from "../../../add-to-cart-with-quantity";
import StorefrontNavbar from "../../../storefront-navbar";
import StorefrontFooter from "../../../storefront-footer";

type PageProps = {
  params: Promise<{ domain: string; path?: string[] }>;
  searchParams: Promise<{ category?: string; q?: string }>;
};

export default async function CustomDomainStorefrontPage({ params, searchParams }: PageProps) {
  const { domain, path: pathSegments } = await params;
  const { category: activeCategory, q } = await searchParams;
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
      activeTheme: true,
      mainColor: true,
      currency: true,
    },
  });

  if (!store) {
    notFound();
  }

  const theme = normalizeStorefrontTheme(store.activeTheme);
  const themeClasses = getStorefrontThemeClasses(theme);
  const heroContent = getStorefrontThemeHeroContent(theme, store.name);

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
        className={`flex min-h-screen flex-col ${themeClasses.shell}`}
      >
        <StorefrontNavbar storeName={store.name} logoUrl={store.logoUrl} theme={theme} mainColor={store.mainColor} />
        <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-12">
          <div className={`grid gap-10 rounded-3xl border p-8 lg:grid-cols-[1.1fr_0.9fr] ${themeClasses.panel}`}>
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
              <div className={`mt-8 rounded-2xl border p-5 ${themeClasses.mutedPanel}`}>
                <div className="flex items-center justify-between">
                  {primaryVariant ? (
                    <AddToCartWithQuantity variantId={primaryVariant.id} />
                  ) : null}
                  <div>
                    <p className="text-sm font-medium text-slate-500">Starting at</p>
                    <p className="mt-1 text-2xl font-semibold text-slate-900">
                      {store.currency} {Number(primaryVariant?.price ?? 0).toFixed(2)}
                    </p>
                  </div>
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
        variants: {
          select: { id: true, title: true, price: true },
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
          select: { price: true },
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
  const hasHeroImage = Boolean(store.heroImageUrl);

  return (
    <div
      style={getStoreBrandingCssVars(store.mainColor) as CSSProperties}
      className={`min-h-screen ${themeClasses.shell}`}
    >
      <StorefrontNavbar
        storeName={store.name}
        logoUrl={store.logoUrl}
        theme={theme}
        categories={categories}
        activeCategory={activeCategory}
        searchQuery={searchQuery}
        mainColor={store.mainColor}
      />

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-12">
        {theme === "bold" ? (
          <section className={`mb-10 rounded-3xl border px-8 py-10 ${themeClasses.hero}`}>
            <div className="grid items-center gap-8 lg:grid-cols-[1.5fr_0.8fr]">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300">{heroContent.eyebrow}</p>
                <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-5xl">{heroContent.title}</h1>
                <p className="mt-4 max-w-2xl text-sm text-slate-200 sm:text-base">{heroContent.subtitle}</p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <a href="#featured-products" className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-100">
                    Shop featured
                  </a>
                  <a href="#all-products" className="rounded-full border border-slate-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-800">
                    Browse catalog
                  </a>
                </div>
              </div>
              {hasHeroImage ? (
                <div className="overflow-hidden rounded-2xl border border-slate-600">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={store.heroImageUrl!} alt={`${store.name} hero`} className="h-56 w-full object-cover" />
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-600 bg-slate-900/40 p-5">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Live store stats</p>
                  <p className="mt-4 text-3xl font-semibold">{featuredProducts.length}</p>
                  <p className="mt-1 text-sm text-slate-300">Featured products</p>
                  <p className="mt-5 text-lg font-semibold">{products.length}</p>
                  <p className="mt-1 text-sm text-slate-300">Products in catalog</p>
                </div>
              )}
            </div>
          </section>
        ) : theme === "classic" ? (
          <section className={`mb-10 rounded-3xl border px-8 py-10 ${themeClasses.hero}`}>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-700">{heroContent.eyebrow}</p>
            <div className="mt-5 grid gap-6 lg:grid-cols-[1.4fr_0.9fr]">
              <div>
                <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{heroContent.title}</h1>
                <p className="mt-4 max-w-2xl text-sm text-slate-700 sm:text-base">{heroContent.subtitle}</p>
              </div>
              {hasHeroImage ? (
                <div className="overflow-hidden rounded-2xl border border-amber-200 bg-white/70">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={store.heroImageUrl!} alt={`${store.name} hero`} className="h-52 w-full object-cover" />
                </div>
              ) : (
                <div className="rounded-2xl border border-amber-200 bg-white/70 p-5">
                  <p className="text-xs uppercase tracking-[0.2em] text-amber-700">Featured selection</p>
                  <p className="mt-3 text-sm text-slate-700">Discover the hand-picked products our team chose this week.</p>
                  <a href="#featured-products" className="mt-5 inline-block text-sm font-semibold text-[var(--store-main-color)] hover:underline">
                    View featured products
                  </a>
                </div>
              )}
            </div>
          </section>
        ) : (
          <section className={`mb-10 rounded-3xl border px-8 py-10 text-center ${themeClasses.hero}`}>
            {hasHeroImage ? (
              <div className="mx-auto mb-6 max-w-4xl overflow-hidden rounded-2xl border border-slate-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={store.heroImageUrl!} alt={`${store.name} hero`} className="h-52 w-full object-cover" />
              </div>
            ) : null}
            <p className="text-xs font-semibold uppercase tracking-[0.22em] opacity-80">{heroContent.eyebrow}</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{heroContent.title}</h1>
            <p className="mx-auto mt-3 max-w-2xl text-sm sm:text-base">{heroContent.subtitle}</p>
            <a href="#all-products" className="mt-6 inline-block rounded-full bg-[var(--store-main-color)] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[var(--store-main-color-hover)]">
              Start shopping
            </a>
          </section>
        )}

        {featuredProducts.length > 0 ? (
          <section id="featured-products" className={`mb-10 rounded-3xl border px-6 py-6 ${themeClasses.featuredWrap}`}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Featured products</h2>
              <a href="#all-products" className="text-sm font-semibold text-[var(--store-main-color)] hover:underline">
                Browse all
              </a>
            </div>
            {theme === "bold" ? (
              <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
                <Link
                  href={`/products/${featuredProducts[0].id}`}
                  className={`rounded-2xl border p-4 transition ${themeClasses.productCard}`}
                >
                  {featuredProducts[0].images[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={featuredProducts[0].images[0]} alt={featuredProducts[0].title} className="h-48 w-full rounded-xl object-cover" />
                  ) : (
                    <div className="flex h-48 items-center justify-center rounded-xl bg-slate-100 text-xs text-slate-400">No image</div>
                  )}
                  <p className="mt-4 text-base font-semibold text-slate-900">{featuredProducts[0].title}</p>
                  <p className="mt-1 text-sm text-slate-600">
                    {featuredProducts[0].variants[0]?.price != null
                      ? `${store.currency} ${Number(featuredProducts[0].variants[0].price).toFixed(2)}`
                      : "Select options"}
                  </p>
                </Link>
                <div className="grid gap-4 sm:grid-cols-2">
                  {featuredProducts.slice(1).map((product) => {
                    const featuredPrice = product.variants[0]?.price;
                    return (
                      <Link
                        key={product.id}
                        href={`/products/${product.id}`}
                        className={`rounded-2xl border p-3 transition ${themeClasses.productCard}`}
                      >
                        {product.images[0] ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={product.images[0]} alt={product.title} className="h-24 w-full rounded-xl object-cover" />
                        ) : (
                          <div className="flex h-24 items-center justify-center rounded-xl bg-slate-100 text-xs text-slate-400">No image</div>
                        )}
                        <p className="mt-3 text-sm font-semibold text-slate-900">{product.title}</p>
                        <p className="mt-1 text-xs text-slate-600">
                          {featuredPrice != null ? `${store.currency} ${Number(featuredPrice).toFixed(2)}` : "Select options"}
                        </p>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ) : theme === "classic" ? (
              <div className="grid gap-3">
                {featuredProducts.map((product, index) => {
                  const featuredPrice = product.variants[0]?.price;
                  return (
                    <Link
                      key={product.id}
                      href={`/products/${product.id}`}
                      className={`grid items-center gap-4 rounded-2xl border p-3 transition sm:grid-cols-[90px_1fr_auto] ${themeClasses.productCard}`}
                    >
                      {product.images[0] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={product.images[0]} alt={product.title} className="h-20 w-full rounded-xl object-cover" />
                      ) : (
                        <div className="flex h-20 items-center justify-center rounded-xl bg-slate-100 text-xs text-slate-400">No image</div>
                      )}
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-amber-700">No. {index + 1}</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">{product.title}</p>
                      </div>
                      <p className="text-xs font-semibold text-slate-700">
                        {featuredPrice != null ? `${store.currency} ${Number(featuredPrice).toFixed(2)}` : "Select options"}
                      </p>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {featuredProducts.map((product) => {
                  const featuredPrice = product.variants[0]?.price;
                  return (
                    <Link
                      key={product.id}
                      href={`/products/${product.id}`}
                      className={`rounded-2xl border p-3 transition ${themeClasses.productCard}`}
                    >
                      {product.images[0] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={product.images[0]} alt={product.title} className="h-28 w-full rounded-xl object-cover" />
                      ) : (
                        <div className="flex h-28 items-center justify-center rounded-xl bg-slate-100 text-xs text-slate-400">No image</div>
                      )}
                      <p className="mt-3 text-sm font-semibold text-slate-900">{product.title}</p>
                      <p className="mt-1 text-xs text-slate-600">
                        {featuredPrice != null ? `${store.currency} ${Number(featuredPrice).toFixed(2)}` : "Select options"}
                      </p>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>
        ) : null}

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
        <section id="all-products">
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
                  className={`relative overflow-hidden rounded-2xl border transition ${themeClasses.productCard}`}
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
        </section>
      </main>

      <script dangerouslySetInnerHTML={{ __html: `window.PRADO_STORE_CONFIG={storeId:${JSON.stringify(store.id)}};if(!window.__pradoCart){window.__pradoCart=1;var s=document.createElement('script');s.src='/cart.js';document.head.appendChild(s);}` }} />
      <StorefrontFooter storeName={store.name} />
    </div>
  );
}