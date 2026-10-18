"use client";

import Link from "next/link";
import {
  getStorefrontThemeClasses,
  getStorefrontThemeHeroContentWithOverrides,
  normalizeStorefrontTheme,
} from "@/lib/storefront-theme";
import { useLanguage } from "@/lib/i18n/LanguageContext";

type ProductVariant = {
  id: string;
  title: string;
  price: unknown;
  inventory?: number;
  trackInventory?: boolean;
};

type StorefrontProduct = {
  id: string;
  title: string;
  slug: string;
  description?: string | null;
  images: string[];
  category?: {
    id: string;
    name: string;
    slug: string;
  } | null;
  variants: ProductVariant[];
};

type FeaturedProduct = {
  id: string;
  title: string;
  slug: string;
  images: string[];
  variants: Array<{
    price: unknown;
    inventory?: number;
    trackInventory?: boolean;
  }>;
};

type StorefrontCategory = {
  id: string;
  name: string;
  slug: string;
};

type StorefrontHomeClientProps = {
  store: {
    id: string;
    name: string;
    slug: string;
    logoUrl?: string | null;
    heroImageUrl?: string | null;
    heroEyebrow?: string | null;
    heroTitle?: string | null;
    heroSubtitle?: string | null;
    heroButtonText?: string | null;
    activeTheme?: "MINIMAL" | "BOLD" | "CLASSIC" | null;
    mainColor?: string;
    currency?: string;
  };
  products: StorefrontProduct[];
  featuredProducts: FeaturedProduct[];
  categories: StorefrontCategory[];
  base: string;
};

export default function StorefrontHomeClient({
  store,
  products,
  featuredProducts,
  categories,
  base,
}: StorefrontHomeClientProps) {
  const { t, language } = useLanguage();
  const theme = normalizeStorefrontTheme(store.activeTheme);
  const themeClasses = getStorefrontThemeClasses(theme);
  const hasHeroImage = Boolean(store.heroImageUrl);

  const heroContent = getStorefrontThemeHeroContentWithOverrides(
    theme,
    store.name,
    {
      eyebrow: store.heroEyebrow,
      title: store.heroTitle,
      subtitle: store.heroSubtitle,
      buttonText: store.heroButtonText,
    },
    language,
  );

  const productGroups = categories
    .map((category) => ({
      ...category,
      products: products.filter((product) => product.category?.id === category.id),
    }))
    .filter((group) => group.products.length > 0);

  const uncategorizedProducts = products.filter((product) => !product.category);

  const formatter = new Intl.NumberFormat(language === "es" ? "es-ES" : "en-US", {
    style: "currency",
    currency: store.currency || "USD",
  });

  return (
    <div className="contents">
      {theme === "minimal" ? (
        <section
          className={`w-full border-b px-6 py-14 text-center ${themeClasses.hero}`}
          style={
            hasHeroImage
              ? {
                  backgroundImage: `linear-gradient(rgba(15,23,42,0.55), rgba(15,23,42,0.55)), url(${store.heroImageUrl})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }
              : undefined
          }
        >
          <div className="mx-auto w-full max-w-6xl">
            <p
              className={`text-xs font-semibold uppercase tracking-[0.22em] ${
                hasHeroImage ? "text-white/90" : "opacity-80"
              }`}
            >
              {heroContent.eyebrow}
            </p>
            <h1
              className={`mt-3 text-3xl font-semibold tracking-tight sm:text-4xl ${
                hasHeroImage ? "text-white" : ""
              }`}
            >
              {heroContent.title}
            </h1>
            <p
              className={`mx-auto mt-3 max-w-2xl text-sm sm:text-base ${
                hasHeroImage ? "text-white/90" : ""
              }`}
            >
              {heroContent.subtitle}
            </p>
            <a
              href="#all-products"
              className={`mt-6 inline-block rounded-full px-5 py-2 text-sm font-semibold transition ${
                hasHeroImage
                  ? "bg-white text-slate-900 hover:bg-slate-100"
                  : "bg-[var(--store-main-color)] text-white hover:bg-[var(--store-main-color-hover)]"
              }`}
            >
              {heroContent.buttonText}
            </a>
          </div>
        </section>
      ) : null}

      <main
        className={`mx-auto w-full max-w-6xl flex-1 px-6 pb-12 ${
          theme === "minimal" ? "pt-8" : "py-12"
        }`}
      >
        {theme === "bold" ? (
          <section className={`mb-10 rounded-3xl border px-8 py-10 ${themeClasses.hero}`}>
            <div className="grid items-center gap-8 lg:grid-cols-[1.5fr_0.8fr]">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300">
                  {heroContent.eyebrow}
                </p>
                <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-5xl">
                  {heroContent.title}
                </h1>
                <p className="mt-4 max-w-2xl text-sm text-slate-200 sm:text-base">
                  {heroContent.subtitle}
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <a
                    href="#featured-products"
                    className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
                  >
                    {heroContent.buttonText}
                  </a>
                  <a
                    href="#all-products"
                    className="rounded-full border border-slate-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    {t.storefront.allProducts}
                  </a>
                </div>
              </div>
              {hasHeroImage ? (
                <div className="overflow-hidden rounded-2xl border border-slate-600">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={store.heroImageUrl!}
                    alt={`${store.name} hero`}
                    className="h-56 w-full object-cover"
                  />
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-600 bg-slate-900/40 p-5">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-300">
                    {t.storefront.liveStoreStats}
                  </p>
                  <p className="mt-4 text-3xl font-semibold">{featuredProducts.length}</p>
                  <p className="mt-1 text-sm text-slate-300">{t.storefront.featuredProducts}</p>
                  <p className="mt-5 text-lg font-semibold">{products.length}</p>
                  <p className="mt-1 text-sm text-slate-300">{t.storefront.productsInCatalog}</p>
                </div>
              )}
            </div>
          </section>
        ) : theme === "classic" ? (
          <section className={`mb-10 rounded-3xl border px-8 py-10 ${themeClasses.hero}`}>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-700">
              {heroContent.eyebrow}
            </p>
            <div className="mt-5 grid gap-6 lg:grid-cols-[1.4fr_0.9fr]">
              <div>
                <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                  {heroContent.title}
                </h1>
                <p className="mt-4 max-w-2xl text-sm text-slate-700 sm:text-base">
                  {heroContent.subtitle}
                </p>
              </div>
              {hasHeroImage ? (
                <div className="overflow-hidden rounded-2xl border border-amber-200 bg-white/70">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={store.heroImageUrl!}
                    alt={`${store.name} hero`}
                    className="h-52 w-full object-cover"
                  />
                </div>
              ) : (
                <div className="rounded-2xl border border-amber-200 bg-white/70 p-5">
                  <p className="text-xs uppercase tracking-[0.2em] text-amber-700">
                    {t.storefront.featuredSelection}
                  </p>
                  <p className="mt-3 text-sm text-slate-700">
                    {t.storefront.featuredSelectionDesc}
                  </p>
                  <a
                    href="#featured-products"
                    className="mt-5 inline-block text-sm font-semibold text-[var(--store-main-color)] hover:underline"
                  >
                    {heroContent.buttonText}
                  </a>
                </div>
              )}
            </div>
          </section>
        ) : null}

        {featuredProducts.length > 0 ? (
          <section
            id="featured-products"
            className={`mb-10 ${
              theme === "minimal"
                ? ""
                : `rounded-3xl border px-6 py-6 ${themeClasses.featuredWrap}`
            }`}
          >
            <div className="mb-4">
              <h2 className="text-lg font-semibold">{t.storefront.featuredProducts}</h2>
            </div>
            {theme === "bold" ? (
              <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
                <Link
                  href={`${base}/products/${featuredProducts[0].id}`}
                  className={`rounded-lg border p-4 transition ${themeClasses.productCard}`}
                >
                  {featuredProducts[0].images[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={featuredProducts[0].images[0]}
                      alt={featuredProducts[0].title}
                      className="h-48 w-full rounded-md object-cover"
                    />
                  ) : (
                    <div className="flex h-48 items-center justify-center rounded-md bg-slate-100 text-xs text-slate-400">
                      {t.storefront.noImage}
                    </div>
                  )}
                  <p className="mt-4 text-base font-semibold text-slate-900">
                    {featuredProducts[0].title}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    {featuredProducts[0].variants[0]?.price != null
                      ? formatter.format(Number(featuredProducts[0].variants[0].price))
                      : t.storefront.selectOptions}
                  </p>
                </Link>
                <div className="grid gap-4 sm:grid-cols-2">
                  {featuredProducts.slice(1).map((product) => {
                    const featuredPrice = product.variants[0]?.price;
                    return (
                      <Link
                        key={product.id}
                        href={`${base}/products/${product.id}`}
                        className={`rounded-lg border p-3 transition ${themeClasses.productCard}`}
                      >
                        {product.images[0] ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={product.images[0]}
                            alt={product.title}
                            className="h-24 w-full rounded-md object-cover"
                          />
                        ) : (
                          <div className="flex h-24 items-center justify-center rounded-md bg-slate-100 text-xs text-slate-400">
                            {t.storefront.noImage}
                          </div>
                        )}
                        <p className="mt-3 text-sm font-semibold text-slate-900">
                          {product.title}
                        </p>
                        <p className="mt-1 text-xs text-slate-600">
                          {featuredPrice != null
                            ? formatter.format(Number(featuredPrice))
                            : t.storefront.selectOptions}
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
                      href={`${base}/products/${product.id}`}
                      className={`grid items-center gap-4 rounded-lg border p-3 transition sm:grid-cols-[90px_1fr_auto] ${themeClasses.productCard}`}
                    >
                      {product.images[0] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={product.images[0]}
                          alt={product.title}
                          className="h-20 w-full rounded-md object-cover"
                        />
                      ) : (
                        <div className="flex h-20 items-center justify-center rounded-md bg-slate-100 text-xs text-slate-400">
                          {t.storefront.noImage}
                        </div>
                      )}
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-amber-700">
                          No. {index + 1}
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">
                          {product.title}
                        </p>
                      </div>
                      <p className="text-xs font-semibold text-slate-700">
                        {featuredPrice != null
                          ? formatter.format(Number(featuredPrice))
                          : t.storefront.selectOptions}
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
                      href={`${base}/products/${product.id}`}
                      className={`rounded-lg border p-3 transition ${themeClasses.productCard}`}
                    >
                      {product.images[0] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={product.images[0]}
                          alt={product.title}
                          className="h-28 w-full rounded-md object-cover"
                        />
                      ) : (
                        <div className="flex h-28 items-center justify-center rounded-md bg-slate-100 text-xs text-slate-400">
                          {t.storefront.noImage}
                        </div>
                      )}
                      <p className="mt-3 text-sm font-semibold text-slate-900">
                        {product.title}
                      </p>
                      <p className="mt-1 text-xs text-slate-600">
                        {featuredPrice != null
                          ? formatter.format(Number(featuredPrice))
                          : t.storefront.selectOptions}
                      </p>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>
        ) : null}

        <section id="all-products">
          {products.length === 0 ? (
            <p className="text-center text-slate-500">{t.storefront.noProductsAvailable}</p>
          ) : (
            <div className="space-y-12">
              {[
                ...productGroups,
                ...(uncategorizedProducts.length > 0
                  ? [
                      {
                        id: "uncategorized",
                        name: t.storefront.otherProducts,
                        slug: "uncategorized",
                        products: uncategorizedProducts,
                      },
                    ]
                  : []),
              ].map((group) => (
                <section key={group.id} aria-labelledby={`category-${group.id}`}>
                  <h2 id={`category-${group.id}`} className="mb-5 text-xl font-semibold text-slate-900">
                    {group.name}
                  </h2>
                  <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {group.products.map((product) => {
                      const primaryVariant = product.variants[0];
                      const isSoldOut = Boolean(primaryVariant?.trackInventory && (primaryVariant?.inventory ?? 0) <= 0);
                      const price = primaryVariant?.price;
                      const variantId = primaryVariant?.id;
                      return (
                        <div
                          key={product.id}
                          className={`relative overflow-hidden rounded-lg border transition ${themeClasses.productCard}`}
                        >
                          <Link
                            href={`${base}/products/${product.id}`}
                            className="absolute inset-0 z-0"
                            aria-label={product.title}
                          />
                          {isSoldOut && (
                            <span className="absolute top-2 left-2 z-10 rounded-full bg-red-600/90 backdrop-blur-sm px-2.5 py-0.5 text-xs font-semibold text-white shadow-sm">
                              {language === "es" ? "Agotado" : "Sold Out"}
                            </span>
                          )}
                          {product.images[0] ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={product.images[0]}
                              alt={product.title}
                              className="h-48 w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-48 items-center justify-center bg-slate-100 text-slate-300 text-sm">
                              {t.storefront.noImage}
                            </div>
                          )}
                          <div className="p-4">
                            <h2 className="font-semibold text-slate-900">{product.title}</h2>
                            <div className="mt-3 flex items-center justify-between">
                              {price != null ? (
                                <span className="text-sm font-semibold text-slate-700">
                                  {formatter.format(Number(price))}
                                </span>
                              ) : (
                                <span className="text-sm text-slate-400">
                                  {t.storefront.selectOptions}
                                </span>
                              )}
                              {isSoldOut ? (
                                <button
                                  type="button"
                                  disabled
                                  className="relative z-10 rounded-full bg-slate-200 px-4 py-1.5 text-xs font-semibold text-slate-500 cursor-not-allowed"
                                >
                                  {language === "es" ? "Agotado" : "Sold Out"}
                                </button>
                              ) : variantId ? (
                                <button
                                  type="button"
                                  data-prado-add={variantId}
                                  data-prado-add-to-cart={variantId}
                                  className="relative z-10 rounded-full bg-[var(--store-main-color)] px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-[var(--store-main-color-hover)]"
                                >
                                  {t.storefront.addToCart}
                                </button>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
