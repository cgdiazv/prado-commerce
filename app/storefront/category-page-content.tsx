"use client";

import Link from "next/link";
import { getStorefrontThemeClasses, type StorefrontThemeId } from "@/lib/storefront-theme";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { isStockUnavailable } from "@/lib/product-stock";

type CategoryProduct = {
  id: string;
  title: string;
  images: string[];
  variants: Array<{
    id: string;
    price: unknown;
    inventory?: number;
    stockStatus: "IN_STOCK" | "OUT_OF_STOCK" | "ON_BACKORDER";
  }>;
};

type CategoryPageContentProps = {
  storeName: string;
  currency: string;
  categoryName: string;
  products: CategoryProduct[];
  basePath: string;
  theme: StorefrontThemeId;
  searchQuery?: string;
};

export default function CategoryPageContent({
  storeName,
  currency,
  categoryName,
  products,
  basePath,
  theme,
  searchQuery = "",
}: CategoryPageContentProps) {
  const { t, language } = useLanguage();
  const themeClasses = getStorefrontThemeClasses(theme);
  const resultLabel =
    products.length === 1
      ? `1 ${t.storefront.oneProduct}`
      : `${products.length} ${t.storefront.countProducts}`;

  const formatter = new Intl.NumberFormat(language === "es" ? "es-ES" : "en-US", {
    style: "currency",
    currency: currency || "USD",
  });

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10 sm:py-12">
      <header className="max-w-3xl">
        <Link
          href={basePath ? `${basePath}/` : "/"}
          className="text-sm font-semibold text-[var(--store-main-color)] hover:underline"
        >
          {storeName}
        </Link>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{categoryName}</h1>
        <p className="mt-2 text-sm opacity-75">
          {searchQuery ? `${resultLabel} ${t.storefront.matching} "${searchQuery}"` : resultLabel}
        </p>
      </header>

      <section className="mt-8" aria-label={`${categoryName} products`}>
        {products.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => {
              const primaryVariant = product.variants[0];
              const isSoldOut = primaryVariant
                ? isStockUnavailable(primaryVariant.stockStatus, primaryVariant.inventory)
                : false;
              const price = primaryVariant?.price;
              const variantId = primaryVariant?.id;

              return (
                <article
                  key={product.id}
                  className={`relative overflow-hidden rounded-lg border transition ${themeClasses.productCard}`}
                >
                  <Link
                    href={`${basePath}/products/${product.id}`}
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
                    <img src={product.images[0]} alt={product.title} className="h-48 w-full object-cover" />
                  ) : (
                    <div className="flex h-48 items-center justify-center bg-slate-100 text-sm text-slate-400">
                      {t.storefront.noImage}
                    </div>
                  )}
                  <div className="p-4">
                    <h2 className="font-semibold text-slate-900">{product.title}</h2>
                    <div className="mt-3 flex items-center justify-between gap-3">
                      {price != null ? (
                        <span className="text-sm font-semibold text-slate-700">
                          {formatter.format(Number(price))}
                        </span>
                      ) : (
                        <span className="text-sm text-slate-400">{t.storefront.selectOptions}</span>
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
                          className={`relative z-10 px-4 py-1.5 text-xs font-medium transition ${
                            theme === "recinto"
                              ? "rounded-[4px] border border-[#344e41] text-[#344e41] hover:bg-[#344e41] hover:text-white"
                              : "rounded-full bg-[var(--store-main-color)] text-white hover:bg-[var(--store-main-color-hover)]"
                          }`}
                        >
                          {t.storefront.addToCart}
                        </button>
                      ) : null}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className={`rounded-2xl border p-10 text-center ${themeClasses.mutedPanel}`}>
            <h2 className="text-lg font-semibold text-slate-900">{t.storefront.noProductsAvailable}</h2>
            <p className="mt-2 text-sm text-slate-600">
              {searchQuery
                ? `${t.storefront.tryDifferentSearch} (${categoryName})`
                : t.storefront.noProductsInCategory}
            </p>
          </div>
        )}
      </section>
    </main>
  );
}