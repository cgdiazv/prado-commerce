"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Pencil, Plus, Trash2 } from "lucide-react";

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
  status: "DRAFT" | "PUBLISHED" | "ACTIVE" | "ARCHIVED";
  categoryId: string | null;
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

export function ProductsDashboard({
  initialStores,
  initialProducts,
  selectedStoreId,
  currentPlan = "STARTER",
  setupError = null,
}: ProductsDashboardProps) {
  const [stores] = useState(initialStores);
  const [products, setProducts] = useState(initialProducts);
  const [activeStoreId, setActiveStoreId] = useState(selectedStoreId ?? initialStores[0]?.id ?? "");
  const [query, setQuery] = useState("");
  const [planNotice, setPlanNotice] = useState<string | null>(null);
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

  async function handleDelete(productId: string) {
    if (!confirm("Delete this product and its variants?")) {
      return;
    }

    const response = await fetch(`/api/products/${productId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      return;
    }

    await refreshProducts(activeStoreId);
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
                className={`inline-flex items-center justify-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 ${
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

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <StatCard label="Stores" value={stores.length.toString()} note="Tenant records available" />
            <StatCard
              label="Products"
              value={products.length.toString()}
              note="Loaded for the selected store"
            />
            <StatCard
              label="Variants"
              value={products.reduce((total, product) => total + product.variants.length, 0).toString()}
              note="Across all loaded products"
            />
          </div>

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
            {filteredProducts.length === 0 ? (
              <div className="p-10 text-center text-slate-500">
                No products yet for this store.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">Product</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">Status</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">Variants</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">Images</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">Updated</th>
                      <th className="px-4 py-3 text-right font-semibold text-slate-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {filteredProducts.map((product) => (
                      <tr key={product.id} className="hover:bg-slate-50/70">
                        <td className="px-4 py-3 align-top">
                          <p className="font-semibold text-slate-900">{product.title}</p>
                          <p className="text-xs text-slate-500">/{product.slug}</p>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                            {product.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 align-top text-slate-700">{product.variants.length}</td>
                        <td className="px-4 py-3 align-top text-slate-700">{product.images.length}</td>
                        <td className="px-4 py-3 align-top text-slate-600">
                          {new Date(product.updatedAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 align-top">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                window.location.href = `/dashboard/products/${product.id}`;
                              }}
                              aria-label="Edit product"
                              title="Edit"
                              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleDelete(product.id)}
                              aria-label="Delete product"
                              title="Delete"
                              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-rose-200 text-rose-700 transition hover:bg-rose-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
    </>
  );
}

function StatCard({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{value}</p>
      <p className="mt-1 text-sm text-slate-500">{note}</p>
    </div>
  );
}
