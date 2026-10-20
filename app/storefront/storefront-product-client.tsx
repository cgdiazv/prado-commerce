"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { getStorefrontThemeClasses, normalizeStorefrontTheme } from "@/lib/storefront-theme";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import AddToCartWithQuantity from "./add-to-cart-with-quantity";

type ProductVariant = {
  id: string;
  title: string;
  price: unknown;
  inventory?: number;
  trackInventory?: boolean;
};

type StorefrontProductDetails = {
  id: string;
  title: string;
  slug: string;
  description?: string | null;
  dimension?: string | null;
  weight?: string | null;
  manufacturer?: string | null;
  condition?: string | null;
  conditionNotes?: string | null;
  images: string[];
  category?: {
    id: string;
    name: string;
    slug: string;
  } | null;
  variants: ProductVariant[];
};

type StorefrontProductClientProps = {
  store: {
    id: string;
    name: string;
    slug: string;
    logoUrl?: string | null;
    activeTheme?: "MINIMAL" | "RECINTO" | "CLASSIC" | "BOLD" | null;
    mainColor?: string;
    currency?: string;
  };
  product: StorefrontProductDetails;
  base: string;
};

export default function StorefrontProductClient({
  store,
  product,
  base,
}: StorefrontProductClientProps) {
  const { t, language } = useLanguage();
  const theme = normalizeStorefrontTheme(store.activeTheme);
  const themeClasses = getStorefrontThemeClasses(theme);
  const primaryVariant = product.variants[0];
  const isSoldOut = Boolean(primaryVariant?.trackInventory && (primaryVariant?.inventory ?? 0) <= 0);

  const formatter = new Intl.NumberFormat(language === "es" ? "es-ES" : "en-US", {
    style: "currency",
    currency: store.currency || "USD",
  });

  return (
    <div className="contents">
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-12">
        <nav aria-label="Breadcrumb" className="mb-6 flex flex-wrap items-center gap-2 text-sm text-slate-500">
          <Link href={base ? `${base}/` : "/"} className="transition hover:text-slate-900">
            {t.storefront.home}
          </Link>
          <ChevronRight className="h-4 w-4 text-slate-400" />
          <Link href={base ? `${base}/` : "/"} className="transition hover:text-slate-900">
            {t.storefront.categories}
          </Link>
          {product.category ? (
            <>
              <ChevronRight className="h-4 w-4 text-slate-400" />
              <Link
                href={base ? `${base}/?category=${product.category.slug}` : `/?category=${product.category.slug}`}
                className="transition hover:text-slate-900"
              >
                {product.category.name}
              </Link>
            </>
          ) : null}
          <ChevronRight className="h-4 w-4 text-slate-400" />
          <span className="font-semibold text-slate-900" aria-current="page">
            {product.title}
          </span>
        </nav>

        <div className={`grid gap-10 rounded-lg border p-8 lg:grid-cols-[1.1fr_0.9fr] ${themeClasses.panel}`}>
          <div className="relative">
            {isSoldOut && (
              <span className="absolute top-3 left-3 z-10 rounded-full bg-red-600/90 backdrop-blur-sm px-3 py-1 text-xs font-semibold text-white shadow-sm">
                {language === "es" ? "Agotado" : "Sold Out"}
              </span>
            )}
            {product.images[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={product.images[0]} alt={product.title} className="h-80 w-full rounded-md object-cover" />
            ) : (
              <div className="flex h-80 items-center justify-center rounded-md bg-slate-100 text-sm text-slate-400">
                {t.storefront.noImageAvailable}
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center gap-3">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--store-main-color)]">
                {t.storefront.productDetails}
              </p>
              {isSoldOut && (
                <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">
                  {language === "es" ? "Agotado" : "Sold Out"}
                </span>
              )}
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">{product.title}</h1>
            <p className="mt-4 text-base leading-7 text-slate-600">{product.description}</p>

            {product.manufacturer || product.dimension || product.weight || product.condition || product.conditionNotes ? (
              <div className="mt-4 flex flex-col gap-2 text-sm text-slate-600 border-t border-b border-slate-100 py-3">
                <div className="flex flex-wrap gap-x-6 gap-y-2">
                  {product.manufacturer ? (
                    <div>
                      <span className="font-semibold text-slate-900">{t.storefront.manufacturer}: </span>
                      {product.manufacturer}
                    </div>
                  ) : null}
                  {product.dimension ? (
                    <div>
                      <span className="font-semibold text-slate-900">{t.storefront.dimensions}: </span>
                      {product.dimension}
                    </div>
                  ) : null}
                  {product.weight ? (
                    <div>
                      <span className="font-semibold text-slate-900">{t.storefront.weight}: </span>
                      {product.weight}
                    </div>
                  ) : null}
                  {product.condition ? (
                    <div>
                      <span className="font-semibold text-slate-900">{t.storefront.condition}: </span>
                      {product.condition.replace(/_/g, " ")}
                    </div>
                  ) : null}
                </div>
                {product.conditionNotes ? (
                  <div className="text-xs text-slate-500 bg-slate-50 p-2.5 rounded-md border border-slate-200/60 mt-1">
                    <span className="font-semibold text-slate-700">{t.storefront.conditionNotes}: </span>
                    {product.conditionNotes}
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className={`mt-8 rounded-lg border p-5 ${themeClasses.mutedPanel}`}>
              <div className="flex items-center justify-between">
                {primaryVariant ? (
                  <AddToCartWithQuantity
                    variantId={primaryVariant.id}
                    isSoldOut={isSoldOut}
                    maxQuantity={primaryVariant.trackInventory ? primaryVariant.inventory : undefined}
                  />
                ) : null}
                <div>
                  <p className="text-sm font-medium text-slate-500">{t.storefront.startingAt}</p>
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
