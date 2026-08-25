"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Search, Star } from "lucide-react";

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
  dimension?: string | null;
  weight?: string | null;
  manufacturer?: string | null;
  condition?: string | null;
  conditionNotes?: string | null;
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
  const [pageSize, setPageSize] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState<"" | "clear" | "delete">("");
  const [isApplyingBulkAction, setIsApplyingBulkAction] = useState(false);
  const [planNotice, setPlanNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [updatingFeaturedIds, setUpdatingFeaturedIds] = useState<string[]>([]);
  const selectAllRef = useRef<HTMLInputElement | null>(null);
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

  const totalProducts = sortedProducts.length;
  const totalPages = Math.max(1, Math.ceil(totalProducts / pageSize));
  const pageStart = totalProducts === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const pageEnd = Math.min(currentPage * pageSize, totalProducts);

  useEffect(() => {
    setCurrentPage((prev) => Math.min(prev, totalPages));
  }, [totalPages]);

  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedProducts.slice(start, start + pageSize);
  }, [sortedProducts, currentPage, pageSize]);

  const paginatedProductIds = useMemo(
    () => paginatedProducts.map((product) => product.id),
    [paginatedProducts],
  );

  const selectedOnPageCount = useMemo(
    () => paginatedProductIds.filter((id) => selectedProductIds.includes(id)).length,
    [paginatedProductIds, selectedProductIds],
  );

  const allOnPageSelected = paginatedProductIds.length > 0 && selectedOnPageCount === paginatedProductIds.length;
  const someOnPageSelected = selectedOnPageCount > 0 && !allOnPageSelected;

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      setCurrentPage(1);
      return;
    }

    setSortKey(key);
    setSortDirection("asc");
    setCurrentPage(1);
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
    setCurrentPage(1);
    setSelectedProductIds([]);
    setBulkAction("");
    setError(null);

    try {
      await refreshProducts(storeId);
    } catch {
      setError("Failed to load products for this store.");
    }
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

  useEffect(() => {
    const activeProductIdSet = new Set(sortedProducts.map((product) => product.id));
    setSelectedProductIds((current) => current.filter((id) => activeProductIdSet.has(id)));
  }, [sortedProducts]);

  useEffect(() => {
    if (!selectAllRef.current) {
      return;
    }

    selectAllRef.current.indeterminate = someOnPageSelected;
  }, [someOnPageSelected]);

  function toggleProductSelection(productId: string) {
    setSelectedProductIds((current) => {
      if (current.includes(productId)) {
        return current.filter((id) => id !== productId);
      }

      return [...current, productId];
    });
  }

  function toggleSelectAllOnPage(checked: boolean) {
    if (!checked) {
      setSelectedProductIds((current) => current.filter((id) => !paginatedProductIds.includes(id)));
      return;
    }

    setSelectedProductIds((current) => Array.from(new Set([...current, ...paginatedProductIds])));
  }

  async function handleApplyBulkAction() {
    if (!bulkAction) {
      return;
    }

    if (bulkAction === "clear") {
      setSelectedProductIds([]);
      setBulkAction("");
      return;
    }

    if (selectedProductIds.length === 0) {
      return;
    }

    setError(null);
    setIsApplyingBulkAction(true);

    try {
      const responses = await Promise.all(
        selectedProductIds.map((productId) =>
          fetch(`/api/products/${productId}`, {
            method: "DELETE",
          }),
        ),
      );

      if (responses.some((response) => !response.ok)) {
        throw new Error("Failed to delete selected products");
      }

      const selectedIdSet = new Set(selectedProductIds);
      setProducts((current) => current.filter((product) => !selectedIdSet.has(product.id)));
      setSelectedProductIds([]);
      setBulkAction("");
    } catch {
      setError("Failed to apply action to selected products.");
    } finally {
      setIsApplyingBulkAction(false);
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

          <div className="mt-8 flex flex-col gap-4 lg:flex-row lg:items-end">
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
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Search by title, slug, or status"
                  className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
                />
              </div>
            </label>

            <div className="w-full max-w-md flex-col gap-2 lg:ml-auto lg:w-auto">
              <div className="flex justify-end">
                <span className="whitespace-nowrap text-sm font-medium text-slate-700">Actions</span>
              </div>
              <div className="mt-2 flex items-center gap-3 lg:justify-end">
                <button
                  type="button"
                  onClick={() => void handleApplyBulkAction()}
                  disabled={
                    isApplyingBulkAction ||
                    !bulkAction ||
                    (bulkAction === "delete" && selectedProductIds.length === 0)
                  }
                  className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Apply
                </button>
                <select
                  value={bulkAction}
                  onChange={(event) => setBulkAction(event.target.value as "" | "clear" | "delete")}
                  className="w-44 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                >
                  <option value="">Select action</option>
                  <option value="delete">Delete selected</option>
                  <option value="clear">Clear selection</option>
                </select>
              </div>
            </div>
          </div>

          {error ? (
            <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          <div className="mt-8 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            {totalProducts === 0 ? (
              <div className="p-10 text-center text-slate-500">
                No products yet for this store.
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs font-medium text-slate-600">
                    Showing {pageStart}-{pageEnd} of {totalProducts} products
                  </p>
                  <div className="flex items-center gap-4">
                    <p className="whitespace-nowrap text-xs font-medium text-slate-600">{selectedProductIds.length} selected</p>
                    <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
                      Rows per page
                      <select
                        value={pageSize}
                        onChange={(event) => {
                          setPageSize(Number(event.target.value));
                          setCurrentPage(1);
                        }}
                        className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 outline-none transition focus:border-slate-400"
                      >
                        {[25, 50, 100, 500].map((size) => (
                          <option key={size} value={size}>
                            {size}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </div>

                <div className="hidden overflow-x-auto md:block">
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="w-12 px-4 py-3 text-left font-semibold text-slate-600">
                          <input
                            ref={selectAllRef}
                            type="checkbox"
                            checked={allOnPageSelected}
                            onChange={(event) => toggleSelectAllOnPage(event.target.checked)}
                            aria-label="Select all products on this page"
                            className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                          />
                        </th>
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
                      {paginatedProducts.map((product) => {
                        const firstVariant = product.variants[0];
                        const thumbnailUrl = product.images[0];
                        const inventoryTotal = product.variants.reduce((acc, variant) => acc + variant.inventory, 0);
                        const firstSku = firstVariant?.sku ?? "—";
                        
                        const activeStore = stores.find((s) => s.id === activeStoreId) ?? stores[0];
                        const currencyCode = activeStore?.currency || "USD";
                        const formatter = new Intl.NumberFormat("en-US", {
                          style: "currency",
                          currency: currencyCode,
                        });
                        
                        const firstPrice = firstVariant ? formatter.format(Number(firstVariant.price)) : "—";
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
                            className={`cursor-pointer transition-colors ${selectedProductIds.includes(product.id) ? "bg-cyan-50/60" : "hover:bg-cyan-50/40"}`}
                          >
                            <td className="px-4 py-3 align-top">
                              <input
                                type="checkbox"
                                checked={selectedProductIds.includes(product.id)}
                                onChange={() => toggleProductSelection(product.id)}
                                onClick={(event) => event.stopPropagation()}
                                aria-label={`Select ${product.title}`}
                                className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                              />
                            </td>
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
                  {paginatedProducts.map((product) => {
                    const firstVariant = product.variants[0];
                    const thumbnailUrl = product.images[0];
                    const inventoryTotal = product.variants.reduce((acc, variant) => acc + variant.inventory, 0);
                    const firstSku = firstVariant?.sku ?? "—";
                    
                    const activeStore = stores.find((s) => s.id === activeStoreId) ?? stores[0];
                    const currencyCode = activeStore?.currency || "USD";
                    const formatter = new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: currencyCode,
                    });
                    
                    const firstPrice = firstVariant ? formatter.format(Number(firstVariant.price)) : "—";
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

                <div className="flex items-center justify-between border-t border-slate-200 bg-white px-4 py-3">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={currentPage <= 1}
                    className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <p className="text-xs font-medium text-slate-600">
                    Page {currentPage} of {totalPages}
                  </p>
                  <button
                    type="button"
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                    disabled={currentPage >= totalPages}
                    className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </>
            )}
          </div>
        </section>
    </>
  );
}
