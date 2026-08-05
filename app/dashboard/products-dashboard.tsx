"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Star } from "lucide-react";

type Store = {
  id: string;
  name: string;
  slug: string;
  currency: string;
};

type ProductVariant = {
  id: string;
  sku: string | null;
  title: string;
  price: string;
  compareAtPrice: string | null;
  inventory: number;
  trackInventory: boolean;
  options: unknown;
};

type Product = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  images: string[];
  featured: boolean;
  status: "DRAFT" | "PUBLISHED" | "ACTIVE" | "ARCHIVED";
  categoryId: string | null;
  categoryName?: string | null;
  variants: ProductVariant[];
  createdAt: string | Date;
  updatedAt: string | Date;
};

type ProductsDashboardProps = {
  initialStores: Store[];
  initialProducts: Product[];
  selectedStoreId: string | null;
  currentPlan?: "STARTER" | "PRO" | "ENTERPRISE";
  setupError?: string | null;
};

type SortKey = "name" | "sku" | "price" | "category" | "updated";
type SortDirection = "asc" | "desc";

export function ProductsDashboard({
  initialStores,
  initialProducts,
  selectedStoreId,
  currentPlan = "STARTER",
  setupError = null,
}: ProductsDashboardProps) {
  const router = useRouter();
  const [stores] = useState(initialStores);
  const [products, setProducts] = useState(initialProducts);
  const [activeStoreId, setActiveStoreId] = useState(selectedStoreId ?? initialStores[0]?.id ?? "");
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("updated");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [planNotice, setPlanNotice] = useState<string | null>(null);
  const [updatingFeaturedIds, setUpdatingFeaturedIds] = useState<string[]>([]);
  const isStarter = currentPlan === "STARTER";
  const hasReachedProductLimit = isStarter && products.length >= 50;

  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return products;
    }

    return products.filter((product) => {
      return (
        product.title.toLowerCase().includes(normalizedQuery) ||
        product.slug.toLowerCase().includes(normalizedQuery) ||
        product.status.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [products, query]);

  const sortedProducts = useMemo(() => {
    const rows = [...filteredProducts];

    rows.sort((left, right) => {
      const leftCategory = left.categoryName ?? (left.categoryId ? "Assigned" : "Uncategorized");
      const rightCategory = right.categoryName ?? (right.categoryId ? "Assigned" : "Uncategorized");
      const leftSku = left.variants[0]?.sku ?? "";
      const rightSku = right.variants[0]?.sku ?? "";
      const leftPrice = Number(left.variants[0]?.price ?? 0);
      const rightPrice = Number(right.variants[0]?.price ?? 0);
      const leftUpdated = new Date(left.updatedAt).getTime();
      const rightUpdated = new Date(right.updatedAt).getTime();

      let comparison = 0;

      switch (sortKey) {
        case "name":
          comparison = left.title.localeCompare(right.title);
          break;
        case "sku":
          comparison = leftSku.localeCompare(rightSku);
          break;
        case "price":
          comparison = leftPrice - rightPrice;
          break;
        case "category":
          comparison = leftCategory.localeCompare(rightCategory);
          break;
        case "updated":
        default:
          comparison = leftUpdated - rightUpdated;
          break;
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });

    return rows;
  }, [filteredProducts, sortDirection, sortKey]);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(key);
    setSortDirection("asc");
  }

  function SortIndicator({ active, direction }: { active: boolean; direction: SortDirection }) {
    return (
      <span className="ml-1 flex flex-col leading-none text-[9px]">
        <span className={active && direction === "asc" ? "text-slate-950" : "text-slate-400"}>▲</span>
        <span className={active && direction === "desc" ? "text-slate-950" : "text-slate-400"}>▼</span>
      </span>
    );
  }

  async function refreshProducts(storeId: string) {
    const response = await fetch(`/api/products?storeId=${encodeURIComponent(storeId)}`, {
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error("Failed to refresh products");
    }

    const data = (await response.json()) as Product[];
    setProducts(data);
  }

  async function handleStoreChange(storeId: string) {
    setActiveStoreId(storeId);
    setQuery("");

    const response = await fetch(`/api/products?storeId=${encodeURIComponent(storeId)}`, {
      cache: "no-store",
    });

    if (!response.ok) {
      return;
    }

    const data = (await response.json()) as Product[];
    setProducts(data);
  }

  async function handleToggleFeatured(productId: string, featured: boolean) {
    if (updatingFeaturedIds.includes(productId)) {
      return;
    }

    setUpdatingFeaturedIds((current) => [...current, productId]);

    try {
      const response = await fetch(`/api/products/${productId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ featured: !featured }),
      });

      if (!response.ok) {
        throw new Error("Failed to update featured status");
      }

      setProducts((current) =>
        current.map((product) =>
          product.id === productId ? { ...product, featured: !featured } : product,
        ),
      );
    } catch {
      setPlanNotice("Could not update featured status. Please try again.");
    } finally {
      setUpdatingFeaturedIds((current) => current.filter((id) => id !== productId));
    }
  }

  return (
    <>
      <section>
        {setupError ? (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {setupError}
          </div>
        ) : null}
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <p className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                Product Studio
              </p>
              <span className="inline-flex rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-cyan-700">
                {currentPlan}
              </span>
            </div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">
              Create products, variants, and storefront pricing.
            </h1>
            <p className="max-w-xl text-base leading-7 text-slate-600 sm:text-lg">
              Manage product catalogs per store and keep variant inventory organized.
            </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/dashboard/products/new"
                onClick={(event) => {
                  if (hasReachedProductLimit) {
                    event.preventDefault();
                    setPlanNotice(
                      "Starter plan includes up to 50 products per store. Upgrade to Prado Commerce Pro to add unlimited products.",
                    );
                  }
                }}
                className={`inline-flex w-full items-center justify-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 sm:w-auto ${
                  hasReachedProductLimit ? "cursor-not-allowed opacity-60" : ""
                }`}
                aria-disabled={hasReachedProductLimit}
              >
                <Plus className="h-4 w-4" />
                New product
              </Link>
            </div>
          </div>

          {isStarter ? (
            <div className="mt-4 rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm text-cyan-800">
              Starter plan includes up to 50 products per store and standard Prado Commerce subdomains.
              Upgrade to Pro for unlimited products and custom domains.
            </div>
          ) : null}

          {planNotice ? (
            <div className="rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm text-cyan-800">
              {planNotice}
            </div>
          ) : null}

          <div className="mt-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <label className="flex w-full flex-col gap-2 lg:max-w-md">
              <span className="text-sm font-medium text-slate-700">Store</span>
              <select
                value={activeStoreId}
                onChange={(event) => void handleStoreChange(event.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
              >
                {stores.map((store) => (
                  <option key={store.id} value={store.id}>
                    {store.name} / {store.currency}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex w-full flex-col gap-2 lg:max-w-md">
              <span className="text-sm font-medium text-slate-700">Search products</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by title, slug, or status"
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
              />
            </label>
          </div>

          <div className="mt-8 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            {sortedProducts.length === 0 ? (
              <div className="p-10 text-center text-slate-500">
                No products yet for this store.
              </div>
            ) : (
              <>
                <div className="hidden overflow-x-auto md:block">
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold text-slate-600">Thumbnail</th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-600">
                          <button type="button" onClick={() => handleSort("name")} className="flex items-center gap-1 transition hover:text-slate-950">
                            Name
                            <SortIndicator active={sortKey === "name"} direction={sortDirection} />
                          </button>
                        </th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-600">Featured</th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-600">
                          <button type="button" onClick={() => handleSort("sku")} className="flex items-center gap-1 transition hover:text-slate-950">
                            SKU
                            <SortIndicator active={sortKey === "sku"} direction={sortDirection} />
                          </button>
                        </th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-600">Inventory</th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-600">
                          <button type="button" onClick={() => handleSort("price")} className="flex items-center gap-1 transition hover:text-slate-950">
                            Price
                            <SortIndicator active={sortKey === "price"} direction={sortDirection} />
                          </button>
                        </th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-600">
                          <button type="button" onClick={() => handleSort("category")} className="flex items-center gap-1 transition hover:text-slate-950">
                            Category
                            <SortIndicator active={sortKey === "category"} direction={sortDirection} />
                          </button>
                        </th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-600">
                          <button type="button" onClick={() => handleSort("updated")} className="flex items-center gap-1 transition hover:text-slate-950">
                            Updated
                            <SortIndicator active={sortKey === "updated"} direction={sortDirection} />
                          </button>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {sortedProducts.map((product) => {
                        const firstVariant = product.variants[0];
                        const thumbnailUrl = product.images[0];
                        const inventoryTotal = product.variants.reduce((acc, variant) => acc + variant.inventory, 0);
                        const firstSku = firstVariant?.sku ?? "—";
                        const firstPrice = firstVariant ? `$${Number(firstVariant.price).toFixed(2)}` : "—";
                        const categoryLabel = product.categoryName ?? (product.categoryId ? "Assigned" : "Uncategorized");

                        return (
                          <tr
                            key={product.id}
                            onClick={() => router.push(`/dashboard/products/${product.id}`)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                router.push(`/dashboard/products/${product.id}`);
                              }
                            }}
                            role="link"
                            tabIndex={0}
                            className="hover:bg-cyan-50/40 cursor-pointer transition-colors"
                          >
                            <td className="px-4 py-3 align-top">
                              {thumbnailUrl ? (
                                <img src={thumbnailUrl} alt={product.title} className="h-12 w-12 rounded-lg object-cover" />
                              ) : (
                                <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-xs text-slate-400">
                                  No image
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3 align-top">
                              <p className="block font-semibold text-slate-900">{product.title}</p>
                              <p className="text-xs text-slate-500">/{product.slug}</p>
                            </td>
                            <td className="px-4 py-3 align-top">
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  void handleToggleFeatured(product.id, product.featured);
                                }}
                                onKeyDown={(event) => {
                                  event.stopPropagation();
                                }}
                                disabled={updatingFeaturedIds.includes(product.id)}
                                aria-label={product.featured ? "Unfeature product" : "Feature product"}
                                className={`inline-flex h-8 w-8 items-center justify-center rounded-full transition ${
                                  product.featured
                                    ? "bg-amber-50 text-amber-500 hover:bg-amber-100"
                                    : "text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                                } ${updatingFeaturedIds.includes(product.id) ? "cursor-not-allowed opacity-60" : ""}`}
                              >
                                <Star className={`h-4 w-4 ${product.featured ? "fill-current" : ""}`} />
                              </button>
                            </td>
                            <td className="px-4 py-3 align-top text-slate-700">{firstSku}</td>
                            <td className="px-4 py-3 align-top text-slate-700">{inventoryTotal}</td>
                            <td className="px-4 py-3 align-top text-slate-700">{firstPrice}</td>
                            <td className="px-4 py-3 align-top text-slate-700">{categoryLabel}</td>
                            <td className="px-4 py-3 align-top text-slate-600">
                              {new Date(product.updatedAt).toLocaleDateString()}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-col gap-3 p-3 md:hidden">
                  {sortedProducts.map((product) => {
                    const firstVariant = product.variants[0];
                    const thumbnailUrl = product.images[0];
                    const inventoryTotal = product.variants.reduce((acc, variant) => acc + variant.inventory, 0);
                    const firstSku = firstVariant?.sku ?? "—";
                    const firstPrice = firstVariant ? `$${Number(firstVariant.price).toFixed(2)}` : "—";
                    const categoryLabel = product.categoryName ?? (product.categoryId ? "Assigned" : "Uncategorized");

                    return (
                      <article
                        key={product.id}
                        onClick={() => router.push(`/dashboard/products/${product.id}`)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            router.push(`/dashboard/products/${product.id}`);
                          }
                        }}
                        role="link"
                        tabIndex={0}
                        className="cursor-pointer rounded-xl border border-slate-200 bg-slate-50/70 p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            {thumbnailUrl ? (
                              <img src={thumbnailUrl} alt={product.title} className="h-12 w-12 rounded-lg object-cover" />
                            ) : (
                              <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white text-xs text-slate-400">
                                No image
                              </div>
                            )}
                            <div>
                              <p className="block font-semibold text-slate-900">{product.title}</p>
                              <p className="mt-1 text-xs text-slate-500">/{product.slug}</p>
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-slate-600">
                          <div>
                            <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Featured</p>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                void handleToggleFeatured(product.id, product.featured);
                              }}
                              disabled={updatingFeaturedIds.includes(product.id)}
                              aria-label={product.featured ? "Unfeature product" : "Feature product"}
                              className={`mt-1 inline-flex h-8 w-8 items-center justify-center rounded-full transition ${
                                product.featured
                                  ? "bg-amber-50 text-amber-500"
                                  : "text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                              } ${updatingFeaturedIds.includes(product.id) ? "cursor-not-allowed opacity-60" : ""}`}
                            >
                              <Star className={`h-4 w-4 ${product.featured ? "fill-current" : ""}`} />
                            </button>
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-[0.16em] text-slate-400">SKU</p>
                            <p className="mt-1 font-medium text-slate-700">{firstSku}</p>
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Inventory</p>
                            <p className="mt-1 font-medium text-slate-700">{inventoryTotal}</p>
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Price</p>
                            <p className="mt-1 font-medium text-slate-700">{firstPrice}</p>
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Category</p>
                            <p className="mt-1 font-medium text-slate-700">{categoryLabel}</p>
                          </div>
                        </div>

                        <div className="mt-3 border-t border-slate-200 pt-3">
                          <p className="text-sm text-slate-500">
                            Updated {new Date(product.updatedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </section>
    </>
  );
}
