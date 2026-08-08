import Link from "next/link";
import { getStorefrontThemeClasses, type StorefrontThemeId } from "@/lib/storefront-theme";

type CategoryProduct = {
  id: string;
  title: string;
  images: string[];
  variants: Array<{
    id: string;
    price: unknown;
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
  const themeClasses = getStorefrontThemeClasses(theme);
  const resultLabel = products.length === 1 ? "1 product" : `${products.length} products`;

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
          {searchQuery ? `${resultLabel} matching "${searchQuery}"` : resultLabel}
        </p>
      </header>

      <section className="mt-8" aria-label={`${categoryName} products`}>
        {products.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => {
              const price = product.variants[0]?.price;
              const variantId = product.variants[0]?.id;

              return (
                <article
                  key={product.id}
                  className={`relative overflow-hidden rounded-2xl border transition ${themeClasses.productCard}`}
                >
                  <Link
                    href={`${basePath}/products/${product.id}`}
                    className="absolute inset-0 z-0"
                    aria-label={product.title}
                  />
                  {product.images[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={product.images[0]} alt={product.title} className="h-48 w-full object-cover" />
                  ) : (
                    <div className="flex h-48 items-center justify-center bg-slate-100 text-sm text-slate-400">
                      No image
                    </div>
                  )}
                  <div className="p-4">
                    <h2 className="font-semibold text-slate-900">{product.title}</h2>
                    <div className="mt-3 flex items-center justify-between gap-3">
                      {price != null ? (
                        <span className="text-sm font-semibold text-slate-700">
                          {currency} {Number(price).toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-sm text-slate-400">Select options</span>
                      )}
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
                </article>
              );
            })}
          </div>
        ) : (
          <div className={`rounded-2xl border p-10 text-center ${themeClasses.mutedPanel}`}>
            <h2 className="text-lg font-semibold text-slate-900">No products found</h2>
            <p className="mt-2 text-sm text-slate-600">
              {searchQuery
                ? `Try another search within ${categoryName}.`
                : `There are no active products in ${categoryName} yet.`}
            </p>
          </div>
        )}
      </section>
    </main>
  );
}