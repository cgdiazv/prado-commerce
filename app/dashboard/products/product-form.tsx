"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { upload } from "@vercel/blob/client";
import { useLanguage } from "@/lib/i18n/language-context";

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
  price3?: string | null;
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
  featured?: boolean;
  taxable?: boolean;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  productType: "PHYSICAL" | "DIGITAL" | "SERVICE";
  categoryId: string | null;
  brandId?: string | null;
  brand?: { id: string; name: string } | null;
  variants: ProductVariant[];
  createdAt: string | Date;
  updatedAt: string | Date;
};

type ProductFormState = {
  title: string;
  slug: string;
  description: string;
  dimension: string;
  weight: string;
  manufacturer: string;
  condition: string;
  conditionNotes: string;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  productType: "PHYSICAL" | "DIGITAL" | "SERVICE";
  categoryId: string;
  brandId: string;
  taxable: boolean;
};

type VariantFormState = {
  sku: string;
  title: string;
  price: string;
  compareAtPrice: string;
  price3: string;
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
  price3: "",
  inventory: "0",
  trackInventory: true,
  options: "",
};

const emptyProduct: ProductFormState = {
  title: "",
  slug: "",
  description: "",
  dimension: "",
  weight: "",
  manufacturer: "",
  condition: "",
  conditionNotes: "",
  status: "DRAFT",
  productType: "PHYSICAL",
  categoryId: "",
  brandId: "",
  taxable: true,
};

async function parseUploadResponse(response: Response): Promise<{ url?: string; error?: string }> {
  if (response.status === 413) {
    return { error: "Upload failed: File exceeds the server's payload size limit (max 4.5 MB)." };
  }

  const raw = await response.text();

  if (!raw) {
    return { error: "Upload failed. Empty response from server." };
  }

  try {
    return JSON.parse(raw) as { url?: string; error?: string };
  } catch {
    return { error: `Upload failed (Status ${response.status}). Unexpected server response.` };
  }
}
type Category = {
  id: string;
  name: string;
  storeId: string;
};

type Brand = {
  id: string;
  name: string;
  storeId: string;
};

type ProductFormProps = {
  stores: Store[];
  categories?: Category[];
  brands?: Brand[];
  initialProduct?: Product | null;
  selectedStoreId?: string | null;
};

export function ProductForm({ stores, categories = [], brands = [], initialProduct = null, selectedStoreId = null }: ProductFormProps) {
  const router = useRouter();
  const { language } = useLanguage();
  const isEs = language === "es";
  const [activeStoreId, setActiveStoreId] = useState(selectedStoreId ?? stores[0]?.id ?? "");
  const [availableCategories, setAvailableCategories] = useState<Category[]>(categories);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [isCreatingNewCategoryMode, setIsCreatingNewCategoryMode] = useState(false);

  const [availableBrands, setAvailableBrands] = useState<Brand[]>(brands);
  const [newBrandName, setNewBrandName] = useState("");
  const [isCreatingBrand, setIsCreatingBrand] = useState(false);
  const [isCreatingNewBrandMode, setIsCreatingNewBrandMode] = useState(false);

  const [editingProduct] = useState(initialProduct);
  const [productForm, setProductForm] = useState<ProductFormState>(
    initialProduct
      ? {
          title: initialProduct.title,
          slug: initialProduct.slug,
          description: initialProduct.description ?? "",
          dimension: initialProduct.dimension ?? "",
          weight: initialProduct.weight ?? "",
          manufacturer: initialProduct.manufacturer ?? "",
          condition: initialProduct.condition ?? "",
          conditionNotes: initialProduct.conditionNotes ?? "",
          status: initialProduct.status,
          productType: initialProduct.productType ?? "PHYSICAL",
          categoryId: initialProduct.categoryId ?? "",
          brandId: initialProduct.brandId ?? "",
          taxable: initialProduct.taxable !== undefined ? Boolean(initialProduct.taxable) : true,
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
          price3: variant.price3 ?? "",
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
  const activeStoreCategories = availableCategories
    .filter((category) => category.storeId === activeStoreId)
    .sort((left, right) => left.name.localeCompare(right.name));
  const activeStoreBrands = availableBrands
    .filter((brand) => brand.storeId === activeStoreId)
    .sort((left, right) => left.name.localeCompare(right.name));
  const isNonPhysicalProduct = productForm.productType !== "PHYSICAL";

  const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

  async function handleImagePick(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;

    if (files.length > 1) {
      setError("Only one featured image can be uploaded at a time.");
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
        const ext = file.name.split(".").pop() ?? "jpg";
        const filename = `products/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const blob = await upload(filename, file, {
          access: "public",
          handleUploadUrl: "/api/uploads/products",
        });
        if (!blob?.url) throw new Error("Upload failed. No URL returned.");
        urls.push(blob.url);
      }
      // Featured image is single-value, so selecting a new one replaces the current image.
      setUploadedImages(urls.slice(0, 1));
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
        const ext = file.name.split(".").pop() ?? "jpg";
        const filename = `products/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const blob = await upload(filename, file, {
          access: "public",
          handleUploadUrl: "/api/uploads/products",
        });
        if (!blob?.url) throw new Error("Upload failed. No URL returned.");
        urls.push(blob.url);
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

  async function handleCreateCategory() {
    const trimmedName = newCategoryName.trim();

    if (!activeStoreId) {
      setError("Select a store before creating a category.");
      return;
    }

    if (!trimmedName) {
      setError("Enter a category name.");
      return;
    }

    if (isCreatingCategory) {
      return;
    }

    setIsCreatingCategory(true);
    setError(null);

    try {
      const response = await fetch("/api/categories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          storeId: activeStoreId,
          name: trimmedName,
        }),
      });

      const result = (await response.json()) as { id?: string; name?: string; storeId?: string; error?: string };

      if (!response.ok || !result.id || !result.name || !result.storeId) {
        throw new Error(result.error ?? "Failed to create category");
      }

      const createdCategory: Category = {
        id: result.id,
        name: result.name,
        storeId: result.storeId,
      };

      setAvailableCategories((current) => {
        if (current.some((category) => category.id === createdCategory.id)) {
          return current;
        }

        return [...current, createdCategory];
      });

      setProductForm((current) => ({ ...current, categoryId: createdCategory.id }));
      setNewCategoryName("");
      setIsCreatingNewCategoryMode(false);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Failed to create category");
    } finally {
      setIsCreatingCategory(false);
    }
  }

  async function handleCreateBrand() {
    const trimmedName = newBrandName.trim();

    if (!activeStoreId) {
      setError(isEs ? "Selecciona una tienda antes de crear una marca." : "Select a store before creating a brand.");
      return;
    }

    if (!trimmedName) {
      setError(isEs ? "Ingresa un nombre para la marca." : "Enter a brand name.");
      return;
    }

    if (isCreatingBrand) {
      return;
    }

    setIsCreatingBrand(true);
    setError(null);

    try {
      const response = await fetch("/api/brands", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          storeId: activeStoreId,
          name: trimmedName,
        }),
      });

      const result = (await response.json()) as { id?: string; name?: string; storeId?: string; error?: string };

      if (!response.ok || !result.id || !result.name || !result.storeId) {
        throw new Error(result.error ?? "Failed to create brand");
      }

      const createdBrand: Brand = {
        id: result.id,
        name: result.name,
        storeId: result.storeId,
      };

      setAvailableBrands((current) => {
        if (current.some((brand) => brand.id === createdBrand.id)) {
          return current;
        }

        return [...current, createdBrand];
      });

      setProductForm((current) => ({
        ...current,
        brandId: createdBrand.id,
        manufacturer: current.manufacturer || createdBrand.name,
      }));
      setNewBrandName("");
      setIsCreatingNewBrandMode(false);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Failed to create brand");
    } finally {
      setIsCreatingBrand(false);
    }
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
        dimension: productForm.dimension.trim() || null,
        weight: productForm.weight.trim() || null,
        manufacturer: productForm.manufacturer.trim() || null,
        condition: productForm.condition.trim() || null,
        conditionNotes: productForm.conditionNotes.trim() || null,
        images: [...uploadedImages, ...galleryImages],
        status: productForm.status,
        productType: productForm.productType,
        categoryId: productForm.categoryId || null,
        brandId: productForm.brandId || null,
        taxable: productForm.taxable,
        variants: variants
          .filter((variant) => variant.price.trim())
          .map((variant) => ({
            sku: variant.sku.trim() || null,
            title: variant.title.trim() || productForm.title.trim() || "Default",
            price: variant.price,
            compareAtPrice: variant.compareAtPrice.trim() || null,
            price3: variant.price3.trim() || null,
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
    <section className="min-w-0 space-y-6">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <p className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
            {isEs ? "Productos" : "Products"}
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-slate-950">
            {editingProduct
              ? isEs ? "Actualizar detalles del producto" : "Update product details"
              : isEs ? "Crear un nuevo producto" : "Create a new product"}
          </h2>
        </div>
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-full border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
        >
          {isEs ? "Volver" : "Back"}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
            {isEs ? "Detalles del producto" : "Product details"}
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label={isEs ? "Título" : "Title"}
            value={productForm.title}
            onChange={(value) =>
              setProductForm((current) => ({
                ...current,
                title: value,
                // Only auto-slug when user hasn't manually edited the slug
                slug: current.slug === toSlug(current.title) ? toSlug(value) : current.slug,
              }))
            }
            placeholder={isEs ? "Sudadera Clásica" : "Classic Hoodie"}
          />
          <Field
            label="Slug"
            value={productForm.slug}
            onChange={(value) => setProductForm((current) => ({ ...current, slug: value }))}
            placeholder="sudadera-clasica"
          />
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-slate-700">{isEs ? "Estado" : "Status"}</span>
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
              <option value="DRAFT">{isEs ? "Borrador" : "Draft"}</option>
              <option value="ACTIVE">{isEs ? "Publicado" : "Published"}</option>
            </select>
          </label>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700">{isEs ? "Categoría" : "Category"}</span>
              {isCreatingNewCategoryMode ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreatingNewCategoryMode(false);
                      setNewCategoryName("");
                    }}
                    className="text-xs font-medium text-slate-500 hover:text-slate-700 hover:underline"
                  >
                    {isEs ? "Cancelar" : "Cancel"}
                  </button>
                  <span className="text-xs text-slate-300">•</span>
                  <button
                    type="button"
                    onClick={() => void handleCreateCategory()}
                    disabled={isCreatingCategory || !newCategoryName.trim()}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isCreatingCategory
                      ? (isEs ? "Guardando..." : "Saving...")
                      : (isEs ? "Guardar nueva" : "Save new")}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsCreatingNewCategoryMode(true)}
                  className="text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline"
                >
                  {isEs ? "+ Añadir nueva" : "+ Add new"}
                </button>
              )}
            </div>

            {isCreatingNewCategoryMode ? (
              <input
                type="text"
                autoFocus
                value={newCategoryName}
                onChange={(event) => setNewCategoryName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void handleCreateCategory();
                  } else if (event.key === "Escape") {
                    setIsCreatingNewCategoryMode(false);
                    setNewCategoryName("");
                  }
                }}
                placeholder={isEs ? "Escribe el nombre de la nueva categoría..." : "Type new category name..."}
                className="w-full rounded-xl border border-blue-400 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
              />
            ) : (
              <select
                value={productForm.categoryId}
                onChange={(event) => setProductForm((current) => ({ ...current, categoryId: event.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
              >
                <option value="">{isEs ? "Sin categoría" : "No category"}</option>
                {activeStoreCategories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700">{isEs ? "Marca" : "Brand"}</span>
              {isCreatingNewBrandMode ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreatingNewBrandMode(false);
                      setNewBrandName("");
                    }}
                    className="text-xs font-medium text-slate-500 hover:text-slate-700 hover:underline"
                  >
                    {isEs ? "Cancelar" : "Cancel"}
                  </button>
                  <span className="text-xs text-slate-300">•</span>
                  <button
                    type="button"
                    onClick={() => void handleCreateBrand()}
                    disabled={isCreatingBrand || !newBrandName.trim()}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isCreatingBrand
                      ? (isEs ? "Guardando..." : "Saving...")
                      : (isEs ? "Guardar nueva" : "Save new")}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsCreatingNewBrandMode(true)}
                  className="text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline"
                >
                  {isEs ? "+ Añadir nueva" : "+ Add new"}
                </button>
              )}
            </div>

            {isCreatingNewBrandMode ? (
              <input
                type="text"
                autoFocus
                value={newBrandName}
                onChange={(event) => setNewBrandName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void handleCreateBrand();
                  } else if (event.key === "Escape") {
                    setIsCreatingNewBrandMode(false);
                    setNewBrandName("");
                  }
                }}
                placeholder={isEs ? "Escribe el nombre de la nueva marca..." : "Type new brand name..."}
                className="w-full rounded-xl border border-blue-400 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
              />
            ) : (
              <select
                value={productForm.brandId}
                onChange={(event) => {
                  const selectedId = event.target.value;
                  const selectedBrand = activeStoreBrands.find((b) => b.id === selectedId);
                  setProductForm((current) => ({
                    ...current,
                    brandId: selectedId,
                    manufacturer: selectedBrand && !current.manufacturer ? selectedBrand.name : current.manufacturer,
                  }));
                }}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
              >
                <option value="">{isEs ? "Sin marca" : "No brand"}</option>
                {activeStoreBrands.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            )}
          </div>
          <Field
            label={isEs ? "Fabricante" : "Manufacturer"}
            value={productForm.manufacturer}
            onChange={(value) => setProductForm((current) => ({ ...current, manufacturer: value }))}
            placeholder="Acme Corp"
          />
          <label className="flex flex-col gap-2 sm:col-span-2">
            <span className="text-sm font-medium text-slate-700">{isEs ? "Descripción" : "Description"}</span>
            <textarea
              value={productForm.description}
              onChange={(event) => setProductForm((current) => ({ ...current, description: event.target.value }))}
              placeholder={isEs ? "Resumen del producto" : "Product summary"}
              rows={4}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
            />
          </label>
          <Field
            label={isEs ? "Dimensiones" : "Dimensions"}
            hint="LxWxH (Length x Width x Height)"
            value={productForm.dimension}
            onChange={(value) => setProductForm((current) => ({ ...current, dimension: value }))}
            placeholder="10 x 5 x 2 in (LxWxH)"
          />
          <Field
            label={isEs ? "Peso" : "Weight"}
            value={productForm.weight}
            onChange={(value) => setProductForm((current) => ({ ...current, weight: value }))}
            placeholder="1.5 lbs"
          />
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-slate-700">{isEs ? "Estado / Condición" : "Condition"}</span>
            <select
              value={productForm.condition}
              onChange={(event) =>
                setProductForm((current) => ({ ...current, condition: event.target.value }))
              }
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
            >
              <option value="">{isEs ? "Nuevo / Predeterminado" : "New / Default"}</option>
              <option value="NEW">{isEs ? "Nuevo" : "New"}</option>
              <option value="LIKE_NEW">{isEs ? "Usado - Como nuevo / Caja abierta" : "Used - Like New / Open Box"}</option>
              <option value="EXCELLENT">{isEs ? "Usado - Excelente" : "Used - Excellent"}</option>
              <option value="VERY_GOOD">{isEs ? "Usado - Muy bueno" : "Used - Very Good"}</option>
              <option value="GOOD">{isEs ? "Usado - Bueno" : "Used - Good"}</option>
              <option value="ACCEPTABLE">{isEs ? "Usado - Aceptable" : "Used - Fair / Acceptable"}</option>
              <option value="REFURBISHED">{isEs ? "Reacondicionado" : "Refurbished"}</option>
              <option value="FOR_PARTS">{isEs ? "Para piezas / Reparación" : "For Parts / Repair"}</option>
            </select>
          </label>
          <label className="flex flex-col gap-2 sm:col-span-2">
            <span className="text-sm font-medium text-slate-700">{isEs ? "Notas de condición" : "Condition Notes"}</span>
            <textarea
              value={productForm.conditionNotes}
              onChange={(event) =>
                setProductForm((current) => ({ ...current, conditionNotes: event.target.value }))
              }
              placeholder={isEs ? "Describe cualquier desgaste, defecto, empaque o accesorios incluidos..." : "Describe any flaws, wear, packaging details, or inclusions..."}
              rows={2}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
            />
          </label>
          <div className="flex flex-col gap-2 sm:col-span-2">
            <span className="text-sm font-medium text-slate-700">{isEs ? "Imagen destacada" : "Featured Image"}</span>
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
                      {isEs ? "Eliminar" : "Remove"}
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
              {isUploading
                ? isEs ? "Subiendo…" : "Uploading…"
                : uploadedImages.length >= 1
                  ? isEs ? "Reemplazar imagen" : "Replace image"
                  : isEs ? "Subir imagen" : "Upload image"}
            </button>
            <p className="text-xs text-slate-400">{isEs ? "JPEG, PNG, WebP o GIF — máx. 5 MB por archivo" : "JPEG, PNG, WebP or GIF — max 5 MB each"}</p>
          </div>
          <div className="flex flex-col gap-2 sm:col-span-2">
            <span className="text-sm font-medium text-slate-700">
              {isEs ? "Galería" : "Gallery"} <span className="font-normal text-slate-400">({galleryImages.length}/6)</span>
            </span>
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
                      {isEs ? "Eliminar" : "Remove"}
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
              {isGalleryUploading
                ? isEs ? "Subiendo…" : "Uploading…"
                : isEs ? "Añadir imágenes de galería" : "Add gallery images"}
            </button>
            <p className="text-xs text-slate-400">
              {isEs
                ? "Hasta 6 imágenes — JPEG, PNG, WebP o GIF, máx. 5 MB cada una"
                : "Up to 6 images — JPEG, PNG, WebP or GIF, max 5 MB each"}
            </p>
          </div>
        </div>
      </div>


        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <label className="text-sm font-medium text-slate-700">
                {isEs ? "Tienda" : "Store"}
              </label>
              <p className="text-xs text-slate-500">
                {isEs ? "Selecciona a qué tienda pertenece este producto" : "Select which store this product belongs to"}
              </p>
            </div>
            <select
              value={activeStoreId}
              onChange={(event) => {
                setActiveStoreId(event.target.value);
                setProductForm((current) => ({ ...current, categoryId: "" }));
                setNewCategoryName("");
                setIsCreatingNewCategoryMode(false);
              }}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400 sm:w-auto sm:min-w-[260px]"
            >
              {stores.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.name} / {store.currency}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-1">
            <h3 className="text-lg font-semibold text-slate-950">
              {isEs ? "Impuestos" : "Taxes"}
            </h3>
            <p className="text-sm text-slate-500">
              {isEs
                ? "Configura si este producto está sujeto al impuesto sobre ventas (ISV)."
                : "Configure whether this product is subject to sales tax (ISV)."}
            </p>
          </div>
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/50 p-4 transition hover:bg-slate-50">
            <input
              type="checkbox"
              checked={productForm.taxable}
              onChange={(event) =>
                setProductForm((current) => ({
                  ...current,
                  taxable: event.target.checked,
                }))
              }
              className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <div className="space-y-0.5">
              <span className="text-sm font-semibold text-slate-900">
                {isEs ? "Cobrar impuesto sobre este producto (Gravable)" : "Charge tax on this product (Taxable)"}
              </span>
              <p className="text-xs text-slate-500">
                {isEs
                  ? "Si se desmarca, este producto se considerará exento de impuestos (0% ISV) en las ventas de la tienda y en el POS."
                  : "If unchecked, this product will be treated as tax-exempt (0% tax) during checkout and POS sales."}
              </p>
            </div>
          </label>
        </div>

        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-950">
                {isEs ? "Variantes" : "Variants"}
              </h3>
              <p className="text-sm text-slate-500">
                {isEs ? "Añade una o más opciones de precio por talla/color." : "Add one or more size/color price points."}
              </p>
              {isNonPhysicalProduct ? (
                <p className="mt-1 text-xs text-blue-700">
                  {isEs
                    ? "El seguimiento de inventario se desactiva automáticamente para productos digitales y servicios."
                    : "Inventory tracking is automatically disabled for digital and service products."}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={addVariantRow}
              aria-label={isEs ? "Añadir variante" : "Add variant"}
              title={isEs ? "Añadir variante" : "Add variant"}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700 transition hover:bg-slate-50"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { value: "PHYSICAL", label: isEs ? "Físico" : "Physical" },
              { value: "DIGITAL", label: isEs ? "Digital / Descargable" : "Digital / Downloadable" },
              { value: "SERVICE", label: isEs ? "Servicio" : "Service" },
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
                  <p className="text-sm font-semibold text-slate-700">
                    {isEs ? `Variante ${index + 1}` : `Variant ${index + 1}`}
                  </p>
                  {variants.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => removeVariant(index)}
                      className="text-sm font-semibold text-rose-600"
                    >
                      {isEs ? "Eliminar" : "Remove"}
                    </button>
                  ) : null}
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <Field
                    label={isEs ? "Título" : "Title"}
                    value={variant.title}
                    onChange={(value) => updateVariant(index, { title: value })}
                    placeholder={isEs ? "Grande / Azul" : "Large / Blue"}
                  />
                  <Field
                    label="SKU"
                    value={variant.sku}
                    onChange={(value) => updateVariant(index, { sku: value })}
                    placeholder="SKU-123"
                  />
                  <Field
                    label={isEs ? "Inventario" : "Inventory"}
                    value={variant.inventory}
                    onChange={(value) => updateVariant(index, { inventory: value })}
                    placeholder="0"
                    type="number"
                    disabled={isNonPhysicalProduct}
                  />
                  <Field
                    label={isEs ? "Precio (P1)" : "Price (P1)"}
                    value={variant.price}
                    onChange={(value) => updateVariant(index, { price: value })}
                    placeholder="99.00"
                    type="number"
                  />
                  <Field
                    label={isEs ? "Precio 2 / Oferta (P2)" : "Price 2 / Sale (P2)"}
                    value={variant.compareAtPrice}
                    onChange={(value) => updateVariant(index, { compareAtPrice: value })}
                    placeholder="79.00"
                    type="number"
                  />
                  <Field
                    label={isEs ? "Precio 3 (P3)" : "Price 3 (P3)"}
                    value={variant.price3}
                    onChange={(value) => updateVariant(index, { price3: value })}
                    placeholder="59.00"
                    type="number"
                  />
                  <label className="flex flex-col gap-2">
                    <span className="text-sm font-medium text-slate-700">
                      {isEs ? "Rastrear inventario" : "Track inventory"}
                    </span>
                    <select
                      value={isNonPhysicalProduct ? "false" : variant.trackInventory ? "true" : "false"}
                      onChange={(event) =>
                        updateVariant(index, { trackInventory: event.target.value === "true" })
                      }
                      disabled={isNonPhysicalProduct}
                      className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                    >
                      <option value="true">{isEs ? "Sí" : "Yes"}</option>
                      <option value="false">{isEs ? "No" : "No"}</option>
                    </select>
                  </label>
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
            {isEs ? "Cancelar" : "Cancel"}
          </button>
          <button
            type="submit"
            disabled={isSaving || !activeStoreId}
            className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving
              ? isEs ? "Guardando..." : "Saving..."
              : editingProduct
                ? isEs ? "Guardar cambios" : "Save changes"
                : isEs ? "Crear producto" : "Create product"}
          </button>
          </div>
        </div>
      </form>

    </section>
  );
}

function Field({
  label,
  hint,
  value,
  onChange,
  placeholder,
  type = "text",
  disabled = false,
  className = "",
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: "text" | "number";
  disabled?: boolean;
  className?: string;
}) {
  return (
    <label className={`flex flex-col gap-2 ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-700">{label}</span>
        {hint ? <span className="text-xs text-slate-400 font-normal">{hint}</span> : null}
      </div>
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
