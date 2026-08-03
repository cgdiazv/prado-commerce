"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";

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
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  categoryId: string | null;
  variants: ProductVariant[];
  createdAt: string | Date;
  updatedAt: string | Date;
};

type ProductsDashboardProps = {
  initialStores: Store[];
  initialProducts: Product[];
  selectedStoreId: string | null;
  setupError?: string | null;
};

type VariantFormState = {
  sku: string;
  title: string;
  price: string;
  compareAtPrice: string;
  inventory: string;
  trackInventory: boolean;
  options: string;
};

type ProductFormState = {
  title: string;
  slug: string;
  description: string;
  images: string;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  categoryId: string;
};

const emptyVariant: VariantFormState = {
  sku: "",
  title: "",
  price: "",
  compareAtPrice: "",
  inventory: "0",
  trackInventory: true,
  options: "",
};

const emptyProduct: ProductFormState = {
  title: "",
  slug: "",
  description: "",
  images: "",
  status: "DRAFT",
  categoryId: "",
};

export function ProductsDashboard({
  initialStores,
  initialProducts,
  selectedStoreId,
  setupError = null,
}: ProductsDashboardProps) {
  const [stores, setStores] = useState(initialStores);
  const [products, setProducts] = useState(initialProducts);
  const [activeStoreId, setActiveStoreId] = useState(selectedStoreId ?? initialStores[0]?.id ?? "");
  const [query, setQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState<ProductFormState>(emptyProduct);
  const [variants, setVariants] = useState<VariantFormState[]>([{ ...emptyVariant }]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeStore = stores.find((store) => store.id === activeStoreId) ?? null;

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

  function resetForm() {
    setEditingProduct(null);
    setProductForm(emptyProduct);
    setVariants([{ ...emptyVariant }]);
    setError(null);
  }

  function openCreateModal() {
    resetForm();
    setIsModalOpen(true);
  }

  function openEditModal(product: Product) {
    setEditingProduct(product);
    setProductForm({
      title: product.title,
      slug: product.slug,
      description: product.description ?? "",
      images: product.images.join(", "),
      status: product.status,
      categoryId: product.categoryId ?? "",
    });
    setVariants(
      product.variants.length > 0
        ? product.variants.map((variant) => ({
            sku: variant.sku ?? "",
            title: variant.title,
            price: variant.price,
            compareAtPrice: variant.compareAtPrice ?? "",
            inventory: String(variant.inventory),
            trackInventory: variant.trackInventory,
            options: typeof variant.options === "string" ? variant.options : JSON.stringify(variant.options ?? {}, null, 2),
          }))
        : [{ ...emptyVariant }],
    );
    setError(null);
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    resetForm();
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

  function addVariantRow() {
    setVariants((current) => [...current, { ...emptyVariant }]);
  }

  function updateVariant(index: number, patch: Partial<VariantFormState>) {
    setVariants((current) =>
      current.map((variant, currentIndex) => (currentIndex === index ? { ...variant, ...patch } : variant)),
    );
  }

  function removeVariant(index: number) {
    setVariants((current) => current.filter((_, currentIndex) => currentIndex !== index));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      const payload = {
        storeId: activeStoreId,
        title: productForm.title,
        slug: productForm.slug,
        description: productForm.description || null,
        images: productForm.images
          .split(",")
          .map((image) => image.trim())
          .filter(Boolean),
        status: productForm.status,
        categoryId: productForm.categoryId || null,
        variants: variants
          .filter((variant) => variant.title.trim() && variant.price.trim())
          .map((variant) => ({
            sku: variant.sku.trim() || null,
            title: variant.title.trim(),
            price: variant.price,
            compareAtPrice: variant.compareAtPrice.trim() || null,
            inventory: Number.parseInt(variant.inventory, 10) || 0,
            trackInventory: variant.trackInventory,
            options: variant.options.trim() ? JSON.parse(variant.options) : null,
          })),
      };

      const response = editingProduct
        ? await fetch(`/api/products/${editingProduct.id}`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/products", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error ?? "Failed to save product");
      }

      await refreshProducts(activeStoreId);
      closeModal();
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Failed to save product",
      );
    } finally {
      setIsSaving(false);
    }
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
      <section className="overflow-hidden rounded-xl border border-white/70 bg-white/80 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.12)] backdrop-blur">
        {setupError ? (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {setupError}
          </div>
        ) : null}
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl space-y-4">
            <p className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
              Product Studio
            </p>
            <h1 className="text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
              Create products, variants, and storefront pricing.
            </h1>
              <p className="max-w-xl text-base leading-7 text-slate-600 sm:text-lg">
                Manage product catalogs per store, keep variant inventory organized, and exercise the `/api/products` endpoints directly.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={openCreateModal}
                disabled={!activeStoreId}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Plus className="h-4 w-4" />
                New product
              </button>
              <a
                href={activeStoreId ? `/api/products?storeId=${encodeURIComponent(activeStoreId)}` : "/api/products"}
                className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
              >
                View API
              </a>
            </div>
          </div>

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

          <div className="mt-8 grid gap-5 xl:grid-cols-2">
            {filteredProducts.length === 0 ? (
              <div className="col-span-full rounded-xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-slate-500">
                No products yet for this store.
              </div>
            ) : (
              filteredProducts.map((product) => (
                <article
                  key={product.id}
                  className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="text-xl font-semibold text-slate-950">{product.title}</h2>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                          {product.status}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-slate-500">/{product.slug}</p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => openEditModal(product)}
                        className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDelete(product.id)}
                        className="rounded-full border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  <p className="mt-4 line-clamp-3 text-sm leading-6 text-slate-600">
                    {product.description ?? "No product description set."}
                  </p>

                  <dl className="mt-6 grid gap-4 text-sm text-slate-600 sm:grid-cols-2">
                    <DetailRow label="Images" value={product.images.length.toString()} />
                    <DetailRow label="Variants" value={product.variants.length.toString()} />
                    <DetailRow
                      label="Updated"
                      value={new Date(product.updatedAt).toLocaleDateString()}
                    />
                    <DetailRow
                      label="Store"
                      value={activeStore?.name ?? "Unknown store"}
                    />
                  </dl>
                </article>
              ))
            )}
          </div>
        </section>

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 py-8 backdrop-blur-sm">
          <div className="w-full max-w-4xl overflow-hidden rounded-xl border border-white/60 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  {editingProduct ? "Edit product" : "New product"}
                </p>
                <h2 className="mt-1 text-2xl font-semibold text-slate-950">
                  {editingProduct ? "Update product details" : "Create a new product"}
                </h2>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-full border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 px-6 py-6">
              {error ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {error}
                </div>
              ) : null}

              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Title"
                  value={productForm.title}
                  onChange={(value) => setProductForm((current) => ({ ...current, title: value }))}
                  placeholder="Classic Hoodie"
                />
                <Field
                  label="Slug"
                  value={productForm.slug}
                  onChange={(value) => setProductForm((current) => ({ ...current, slug: value }))}
                  placeholder="classic-hoodie"
                />
                <Field
                  label="Status"
                  value={productForm.status}
                  onChange={(value) =>
                    setProductForm((current) => ({
                      ...current,
                      status: value as ProductFormState["status"],
                    }))
                  }
                  placeholder="DRAFT"
                />
                <Field
                  label="Category ID"
                  value={productForm.categoryId}
                  onChange={(value) => setProductForm((current) => ({ ...current, categoryId: value }))}
                  placeholder="Optional category ID"
                />
                <Field
                  label="Description"
                  value={productForm.description}
                  onChange={(value) => setProductForm((current) => ({ ...current, description: value }))}
                  placeholder="Product summary"
                  className="sm:col-span-2"
                />
                <Field
                  label="Image URLs"
                  value={productForm.images}
                  onChange={(value) => setProductForm((current) => ({ ...current, images: value }))}
                  placeholder="https://cdn.example.com/image-1.jpg, https://cdn.example.com/image-2.jpg"
                  className="sm:col-span-2"
                />
              </div>

              <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-950">Variants</h3>
                    <p className="text-sm text-slate-500">Add one or more size/color price points.</p>
                  </div>
                  <button
                    type="button"
                    onClick={addVariantRow}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    <Plus className="h-4 w-4" />
                    Add variant
                  </button>
                </div>

                <div className="space-y-4">
                  {variants.map((variant, index) => (
                    <div
                      key={`${index}-${variant.title}`}
                      className="rounded-xl border border-slate-200 bg-white p-4"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <p className="text-sm font-semibold text-slate-700">Variant {index + 1}</p>
                        {variants.length > 1 ? (
                          <button
                            type="button"
                            onClick={() => removeVariant(index)}
                            className="text-sm font-semibold text-rose-600"
                          >
                            Remove
                          </button>
                        ) : null}
                      </div>

                      <div className="mt-4 grid gap-4 sm:grid-cols-2">
                        <Field
                          label="Title"
                          value={variant.title}
                          onChange={(value) => updateVariant(index, { title: value })}
                          placeholder="Large / Blue"
                        />
                        <Field
                          label="SKU"
                          value={variant.sku}
                          onChange={(value) => updateVariant(index, { sku: value })}
                          placeholder="SKU-123"
                        />
                        <Field
                          label="Price"
                          value={variant.price}
                          onChange={(value) => updateVariant(index, { price: value })}
                          placeholder="79.00"
                        />
                        <Field
                          label="Compare at price"
                          value={variant.compareAtPrice}
                          onChange={(value) => updateVariant(index, { compareAtPrice: value })}
                          placeholder="99.00"
                        />
                        <Field
                          label="Inventory"
                          value={variant.inventory}
                          onChange={(value) => updateVariant(index, { inventory: value })}
                          placeholder="0"
                        />
                        <label className="flex flex-col gap-2">
                          <span className="text-sm font-medium text-slate-700">Track inventory</span>
                          <select
                            value={variant.trackInventory ? "true" : "false"}
                            onChange={(event) =>
                              updateVariant(index, { trackInventory: event.target.value === "true" })
                            }
                            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                          >
                            <option value="true">Yes</option>
                            <option value="false">No</option>
                          </select>
                        </label>
                        <Field
                          label="Options JSON"
                          value={variant.options}
                          onChange={(value) => updateVariant(index, { options: value })}
                          placeholder='{"size":"L","color":"Blue"}'
                          className="sm:col-span-2"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving || !activeStoreId}
                  className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving ? "Saving..." : editingProduct ? "Save changes" : "Create product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
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

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
        {label}
      </dt>
      <dd className="mt-1 break-words text-slate-700">{value}</dd>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <label className={`flex flex-col gap-2 ${className}`.trim()}>
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
      />
    </label>
  );
}