"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
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
  productType: "PHYSICAL" | "DIGITAL" | "SERVICE";
  categoryId: string | null;
  variants: ProductVariant[];
  createdAt: string | Date;
  updatedAt: string | Date;
};

type ProductFormState = {
  title: string;
  slug: string;
  description: string;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  productType: "PHYSICAL" | "DIGITAL" | "SERVICE";
  categoryId: string;
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

function toSlug(value: string): string {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

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
  status: "DRAFT",
  productType: "PHYSICAL",
  categoryId: "",
};

async function parseUploadResponse(response: Response): Promise<{ url?: string; error?: string }> {
  const raw = await response.text();

  if (!raw) {
    return { error: "Upload failed. Empty response from server." };
  }

  try {
    return JSON.parse(raw) as { url?: string; error?: string };
  } catch {
    return { error: "Upload failed. Unexpected server response." };
  }
}
type Category = {
  id: string;
  name: string;
  storeId: string;
};

type ProductFormProps = {
  stores: Store[];
  categories?: Category[];
  initialProduct?: Product | null;
  selectedStoreId?: string | null;
};

export function ProductForm({ stores, categories = [], initialProduct = null, selectedStoreId = null }: ProductFormProps) {
  const router = useRouter();
  const [activeStoreId, setActiveStoreId] = useState(selectedStoreId ?? stores[0]?.id ?? "");
  const [editingProduct] = useState(initialProduct);
  const [productForm, setProductForm] = useState<ProductFormState>(
    initialProduct
      ? {
          title: initialProduct.title,
          slug: initialProduct.slug,
          description: initialProduct.description ?? "",
          status: initialProduct.status,
          productType: initialProduct.productType ?? "PHYSICAL",
          categoryId: initialProduct.categoryId ?? "",
        }
      : emptyProduct,
  );
  const [variants, setVariants] = useState<VariantFormState[]>(
    initialProduct && initialProduct.variants.length > 0
      ? initialProduct.variants.map((variant) => ({
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
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedImages, setUploadedImages] = useState<string[]>(
    initialProduct ? initialProduct.images.slice(0, 1) : [],
  );
  const [galleryImages, setGalleryImages] = useState<string[]>(
    initialProduct ? initialProduct.images.slice(1) : [],
  );
  const [isUploading, setIsUploading] = useState(false);
  const [isGalleryUploading, setIsGalleryUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const activeStore = stores.find((store) => store.id === activeStoreId) ?? null;
  const isNonPhysicalProduct = productForm.productType !== "PHYSICAL";

  const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

  async function handleImagePick(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;

    if (uploadedImages.length >= 1) {
      setError("Only one featured image is allowed. Remove the current one first.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const invalid = files.find((f) => !ALLOWED_TYPES.includes(f.type));
    if (invalid) {
      setError(`"${invalid.name}" is not allowed. Use JPEG, PNG, WebP, or GIF.`);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const oversized = files.find((f) => f.size > MAX_BYTES);
    if (oversized) {
      setError(`"${oversized.name}" exceeds the 5 MB limit.`);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const urls: string[] = [];
      for (const file of files) {
        const form = new FormData();
        form.append("file", file);
        const response = await fetch("/api/uploads/products", { method: "POST", body: form });
        const data = await parseUploadResponse(response);
        if (!response.ok) throw new Error(data.error ?? "Upload failed");
        if (!data.url) throw new Error("Upload failed");
        urls.push(data.url);
      }
      setUploadedImages((current) => [...current, ...urls]);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Upload failed");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function removeImage(url: string) {
    setUploadedImages((current) => current.filter((img) => img !== url));
  }

  async function handleGalleryImagePick(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;

    if (galleryImages.length + files.length > 6) {
      setError(`You can only add ${6 - galleryImages.length} more gallery image(s).`);
      if (galleryInputRef.current) galleryInputRef.current.value = "";
      return;
    }

    const invalid = files.find((f) => !ALLOWED_TYPES.includes(f.type));
    if (invalid) {
      setError(`"${invalid.name}" is not allowed. Use JPEG, PNG, WebP, or GIF.`);
      if (galleryInputRef.current) galleryInputRef.current.value = "";
      return;
    }

    const oversized = files.find((f) => f.size > MAX_BYTES);
    if (oversized) {
      setError(`"${oversized.name}" exceeds the 5 MB limit.`);
      if (galleryInputRef.current) galleryInputRef.current.value = "";
      return;
    }

    setIsGalleryUploading(true);
    setError(null);

    try {
      const urls: string[] = [];
      for (const file of files) {
        const form = new FormData();
        form.append("file", file);
        const response = await fetch("/api/uploads/products", { method: "POST", body: form });
        const data = await parseUploadResponse(response);
        if (!response.ok) throw new Error(data.error ?? "Upload failed");
        if (!data.url) throw new Error("Upload failed");
        urls.push(data.url);
      }
      setGalleryImages((current) => [...current, ...urls]);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Upload failed");
    } finally {
      setIsGalleryUploading(false);
      if (galleryInputRef.current) galleryInputRef.current.value = "";
    }
  }

  function removeGalleryImage(url: string) {
    setGalleryImages((current) => current.filter((img) => img !== url));
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
        images: [...uploadedImages, ...galleryImages],
        status: productForm.status,
        productType: productForm.productType,
        categoryId: productForm.categoryId || null,
        variants: variants
          .filter((variant) => variant.price.trim())
          .map((variant) => ({
            sku: variant.sku.trim() || null,
            title: variant.title.trim() || productForm.title.trim() || "Default",
            price: variant.price,
            compareAtPrice: variant.compareAtPrice.trim() || null,
            inventory: isNonPhysicalProduct ? 0 : Number.parseInt(variant.inventory, 10) || 0,
            trackInventory: isNonPhysicalProduct ? false : variant.trackInventory,
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

      router.push("/dashboard/products");
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

  return (
    <section
      className={
        editingProduct
          ? "overflow-hidden rounded-xl border border-white/70 bg-white/80 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.12)] backdrop-blur"
          : ""
      }
    >
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <p className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            {editingProduct ? "Edit product" : "New product"}
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-slate-950">
            {editingProduct ? "Update product details" : "Create a new product"}
          </h2>
        </div>
        {editingProduct ? (
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-full border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
          >
            Back
          </button>
        ) : null}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Title"
            value={productForm.title}
            onChange={(value) =>
              setProductForm((current) => ({
                ...current,
                title: value,
                // Only auto-slug when user hasn't manually edited the slug
                slug: current.slug === toSlug(current.title) ? toSlug(value) : current.slug,
              }))
            }
            placeholder="Classic Hoodie"
          />
          <Field
            label="Slug"
            value={productForm.slug}
            onChange={(value) => setProductForm((current) => ({ ...current, slug: value }))}
            placeholder="classic-hoodie"
          />
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-slate-700">Status</span>
            <select
              value={productForm.status}
              onChange={(event) =>
                setProductForm((current) => ({
                  ...current,
                  status: event.target.value as ProductFormState["status"],
                }))
              }
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
            >
              <option value="DRAFT">Draft</option>
              <option value="ACTIVE">Published</option>
            </select>
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-slate-700">Category</span>
            <select
              value={productForm.categoryId}
              onChange={(event) => setProductForm((current) => ({ ...current, categoryId: event.target.value }))}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
            >
              <option value="">No category</option>
              {categories
                .filter((c) => c.storeId === activeStoreId)
                .map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
            </select>
          </label>
          <label className="flex flex-col gap-2 sm:col-span-2">
            <span className="text-sm font-medium text-slate-700">Description</span>
            <textarea
              value={productForm.description}
              onChange={(event) => setProductForm((current) => ({ ...current, description: event.target.value }))}
              placeholder="Product summary"
              rows={4}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
            />
          </label>
          <div className="flex flex-col gap-2 sm:col-span-2">
            <span className="text-sm font-medium text-slate-700">Featured Image</span>
            {uploadedImages.length > 0 ? (
              <div className="flex flex-wrap gap-3">
                {uploadedImages.map((url) => (
                  <div key={url} className="group relative h-24 w-24 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(url)}
                      className="absolute inset-0 flex items-center justify-center bg-slate-950/50 text-xs font-semibold text-white opacity-0 transition group-hover:opacity-100"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleImagePick}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isUploading ? "Uploading…" : uploadedImages.length >= 1 ? "Replace image" : "Upload image"}
            </button>
            <p className="text-xs text-slate-400">JPEG, PNG, WebP or GIF — max 5 MB each</p>
          </div>
          <div className="flex flex-col gap-2 sm:col-span-2">
            <span className="text-sm font-medium text-slate-700">Gallery <span className="font-normal text-slate-400">({galleryImages.length}/6)</span></span>
            {galleryImages.length > 0 ? (
              <div className="flex flex-wrap gap-3">
                {galleryImages.map((url) => (
                  <div key={url} className="group relative h-24 w-24 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeGalleryImage(url)}
                      className="absolute inset-0 flex items-center justify-center bg-slate-950/50 text-xs font-semibold text-white opacity-0 transition group-hover:opacity-100"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              onChange={handleGalleryImagePick}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => galleryInputRef.current?.click()}
              disabled={isGalleryUploading || galleryImages.length >= 6}
              className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {!isGalleryUploading ? <Plus className="h-4 w-4" /> : null}
              {isGalleryUploading ? "Uploading…" : "Add gallery images"}
            </button>
            <p className="text-xs text-slate-400">Up to 6 images — JPEG, PNG, WebP or GIF, max 5 MB each</p>
          </div>
        </div>

        <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <label className="text-sm font-medium text-slate-700">Store</label>
              <p className="text-xs text-slate-500">Select which store this product belongs to</p>
            </div>
            <select
              value={activeStoreId}
              onChange={(event) => {
                setActiveStoreId(event.target.value);
                setProductForm((current) => ({ ...current, categoryId: "" }));
              }}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
            >
              {stores.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.name} / {store.currency}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-950">Variants</h3>
              <p className="text-sm text-slate-500">Add one or more size/color price points.</p>
              {isNonPhysicalProduct ? (
                <p className="mt-1 text-xs text-blue-700">
                  Inventory tracking is automatically disabled for digital and service products.
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={addVariantRow}
              aria-label="Add variant"
              title="Add variant"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700 transition hover:bg-slate-50"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { value: "PHYSICAL", label: "Physical" },
              { value: "DIGITAL", label: "Digital / Downloadable" },
              { value: "SERVICE", label: "Service" },
            ].map((option) => {
              const checked = productForm.productType === option.value;
              return (
                <label
                  key={option.value}
                  className={`flex items-center gap-3 rounded-xl border px-3 py-2 text-sm transition ${
                    checked
                      ? "border-blue-300 bg-blue-50 text-blue-900"
                      : "border-slate-200 bg-white text-slate-700"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() =>
                      setProductForm((current) => ({
                        ...current,
                        productType: option.value as ProductFormState["productType"],
                      }))
                    }
                    className="h-4 w-4 rounded border-slate-300 text-blue-600"
                  />
                  <span>{option.label}</span>
                </label>
              );
            })}
          </div>

          <div className="space-y-4">
            {variants.map((variant, index) => (
              <div key={`${index}-${variant.title}`} className="rounded-xl border border-slate-200 bg-white p-4">
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
                    placeholder="99.00"
                    type="number"
                  />
                  <Field
                    label="Sale price"
                    value={variant.compareAtPrice}
                    onChange={(value) => updateVariant(index, { compareAtPrice: value })}
                    placeholder="79.00"
                    type="number"
                  />
                  <Field
                    label="Inventory"
                    value={variant.inventory}
                    onChange={(value) => updateVariant(index, { inventory: value })}
                    placeholder="0"
                    type="number"
                    disabled={isNonPhysicalProduct}
                  />
                  <label className="flex flex-col gap-2">
                    <span className="text-sm font-medium text-slate-700">Track inventory</span>
                    <select
                      value={isNonPhysicalProduct ? "false" : variant.trackInventory ? "true" : "false"}
                      onChange={(event) =>
                        updateVariant(index, { trackInventory: event.target.value === "true" })
                      }
                      disabled={isNonPhysicalProduct}
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

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {error ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 sm:max-w-xl">
              {error}
            </div>
          ) : (
            <div />
          )}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => router.back()}
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
        </div>
      </form>
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  disabled = false,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: "text" | "number";
  disabled?: boolean;
  className?: string;
}) {
  return (
    <label className={`flex flex-col gap-2 ${className}`}>
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input
        type={type}
        min={type === "number" ? 0 : undefined}
        step={type === "number" ? "any" : undefined}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400 disabled:cursor-not-allowed disabled:bg-slate-100"
      />
    </label>
  );
}
