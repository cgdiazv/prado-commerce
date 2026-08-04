"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Check, ChevronRight, Pencil, Plus, Trash2, X } from "lucide-react";

type Store = {
  id: string;
  name: string;
  slug: string;
  currency: string;
};

type Category = {
  id: string;
  storeId: string;
  name: string;
  slug: string;
  description: string | null;
  updatedAt?: string | Date;
};

type CategoriesDashboardProps = {
  initialStores: Store[];
  initialCategories: Category[];
  selectedStoreId: string | null;
  setupError?: string | null;
};

export function CategoriesDashboard({
  initialStores,
  initialCategories,
  selectedStoreId,
  setupError = null,
}: CategoriesDashboardProps) {
  const [stores] = useState(initialStores);
  const [categories, setCategories] = useState(initialCategories);
  const [activeStoreId, setActiveStoreId] = useState(selectedStoreId ?? initialStores[0]?.id ?? "");
  const [categoryName, setCategoryName] = useState("");
  const [categorySlug, setCategorySlug] = useState("");
  const [categoryDescription, setCategoryDescription] = useState("");
  const [isCreateCategoryModalOpen, setIsCreateCategoryModalOpen] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState("");
  const [editingCategorySlug, setEditingCategorySlug] = useState("");
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [isCategorySaving, setIsCategorySaving] = useState(false);

  const activeStore = stores.find((store) => store.id === activeStoreId) ?? null;
  const activeStoreCategories = useMemo(
    () => categories.filter((category) => category.storeId === activeStoreId),
    [categories, activeStoreId],
  );

  function resetCategoryForm() {
    setCategoryName("");
    setCategorySlug("");
    setCategoryDescription("");
  }

  async function refreshCategories(storeId: string) {
    const response = await fetch(`/api/categories?storeId=${encodeURIComponent(storeId)}`, {
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error("Failed to refresh categories");
    }

    const data = (await response.json()) as Category[];
    setCategories((current) => [
      ...current.filter((category) => category.storeId !== storeId),
      ...data,
    ]);
  }

  async function handleStoreChange(storeId: string) {
    setActiveStoreId(storeId);
    setCategoryError(null);
    setEditingCategoryId(null);

    try {
      await refreshCategories(storeId);
    } catch {
      setCategoryError("Failed to load categories for this store.");
    }
  }

  function openCreateCategoryModal() {
    resetCategoryForm();
    setCategoryError(null);
    setIsCreateCategoryModalOpen(true);
  }

  function closeCreateCategoryModal() {
    setIsCreateCategoryModalOpen(false);
  }

  function beginEditCategory(category: Category) {
    setEditingCategoryId(category.id);
    setEditingCategoryName(category.name);
    setEditingCategorySlug(category.slug);
    setCategoryError(null);
  }

  function cancelEditCategory() {
    setEditingCategoryId(null);
    setEditingCategoryName("");
    setEditingCategorySlug("");
  }

  async function handleCreateCategory(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!activeStoreId) {
      setCategoryError("Select a store before creating a category.");
      return;
    }

    setIsCategorySaving(true);
    setCategoryError(null);

    try {
      const response = await fetch("/api/categories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          storeId: activeStoreId,
          name: categoryName,
          slug: categorySlug || undefined,
          description: categoryDescription || undefined,
        }),
      });

      const data = (await response.json()) as Category | { error?: string };

      if (!response.ok) {
        throw new Error((data as { error?: string }).error ?? "Failed to create category");
      }

      setCategories((current) => [...current, data as Category]);
      resetCategoryForm();
      setIsCreateCategoryModalOpen(false);
    } catch (error) {
      setCategoryError(error instanceof Error ? error.message : "Failed to create category");
    } finally {
      setIsCategorySaving(false);
    }
  }

  async function handleSaveCategory(categoryId: string) {
    setIsCategorySaving(true);
    setCategoryError(null);

    try {
      const response = await fetch(`/api/categories/${categoryId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: editingCategoryName,
          slug: editingCategorySlug,
        }),
      });

      const data = (await response.json()) as Category | { error?: string };

      if (!response.ok) {
        throw new Error((data as { error?: string }).error ?? "Failed to update category");
      }

      setCategories((current) =>
        current.map((category) =>
          category.id === categoryId
            ? {
                ...category,
                ...(data as Category),
              }
            : category,
        ),
      );
      cancelEditCategory();
    } catch (error) {
      setCategoryError(error instanceof Error ? error.message : "Failed to update category");
    } finally {
      setIsCategorySaving(false);
    }
  }

  async function handleDeleteCategory(categoryId: string) {
    if (!confirm("Delete this category? Products in this category will become uncategorized.")) {
      return;
    }

    setIsCategorySaving(true);
    setCategoryError(null);

    try {
      const response = await fetch(`/api/categories/${categoryId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error ?? "Failed to delete category");
      }

      setCategories((current) => current.filter((category) => category.id !== categoryId));
      if (editingCategoryId === categoryId) {
        cancelEditCategory();
      }
    } catch (error) {
      setCategoryError(error instanceof Error ? error.message : "Failed to delete category");
    } finally {
      setIsCategorySaving(false);
    }
  }

  return (
    <>
      <section>
        <nav aria-label="Breadcrumb" className="mb-4 flex flex-wrap items-center gap-2 text-sm text-slate-500">
          <Link href="/dashboard" className="transition hover:text-slate-900">
            Dashboard
          </Link>
          <ChevronRight className="h-4 w-4 text-slate-400" />
          <Link href="/dashboard/products" className="transition hover:text-slate-900">
            Products
          </Link>
          <ChevronRight className="h-4 w-4 text-slate-400" />
          <span className="font-semibold text-slate-900" aria-current="page">
            Categories
          </span>
        </nav>

        {setupError ? (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {setupError}
          </div>
        ) : null}

        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl space-y-4">
            <p className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
              Product Categories
            </p>
            <h1 className="text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">
              Organize your catalog with clean category groups.
            </h1>
            <p className="max-w-xl text-base leading-7 text-slate-600 sm:text-lg">
              Create, edit, and remove categories per store to keep product browsing structured.
            </p>
          </div>

          <div className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-end">
            <button
              type="button"
              onClick={openCreateCategoryModal}
              disabled={!activeStoreId}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              <Plus className="h-4 w-4" />
              New category
            </button>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-4 lg:max-w-md">
          <label className="flex w-full flex-col gap-2">
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
        </div>

        {categoryError ? (
          <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {categoryError}
          </div>
        ) : null}

        <div className="mt-8 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {activeStoreCategories.length === 0 ? (
            <div className="p-10 text-center text-slate-500">
              {activeStore ? `No categories yet for ${activeStore.name}.` : "No categories yet for this store."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Name</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Slug</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Updated</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {activeStoreCategories.map((category) => {
                    const isEditing = editingCategoryId === category.id;

                    return (
                      <tr key={category.id} className="hover:bg-slate-50/70">
                        <td className="px-4 py-3 align-top">
                          <input
                            value={isEditing ? editingCategoryName : category.name}
                            onChange={(event) => setEditingCategoryName(event.target.value)}
                            disabled={!isEditing}
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none disabled:bg-slate-100"
                          />
                        </td>
                        <td className="px-4 py-3 align-top">
                          <input
                            value={isEditing ? editingCategorySlug : category.slug}
                            onChange={(event) => setEditingCategorySlug(event.target.value)}
                            disabled={!isEditing}
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none disabled:bg-slate-100"
                          />
                        </td>
                        <td className="px-4 py-3 align-top text-slate-600">
                          {category.updatedAt ? new Date(category.updatedAt).toLocaleDateString() : "-"}
                        </td>
                        <td className="px-4 py-3 align-top">
                          <div className="flex justify-end gap-2">
                            {isEditing ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => void handleSaveCategory(category.id)}
                                  disabled={!editingCategoryName.trim() || isCategorySaving}
                                  aria-label="Save category"
                                  title="Save"
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-emerald-300 text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  <Check className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={cancelEditCategory}
                                  aria-label="Cancel category edit"
                                  title="Cancel"
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 text-slate-700 transition hover:bg-white"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={() => beginEditCategory(category)}
                                aria-label="Edit category"
                                title="Edit"
                                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 text-slate-700 transition hover:bg-white"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => void handleDeleteCategory(category.id)}
                              disabled={isCategorySaving}
                              aria-label="Delete category"
                              title="Delete"
                              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-rose-200 text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {isCreateCategoryModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-xl rounded-xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Create category</h3>
                <p className="mt-1 text-sm text-slate-500">
                  {activeStore ? `Create a category for ${activeStore.name}.` : "Select a store first."}
                </p>
              </div>
              <button
                type="button"
                onClick={closeCreateCategoryModal}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 text-slate-700 transition hover:bg-slate-50"
                aria-label="Close create category modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={(event) => void handleCreateCategory(event)} className="mt-5 space-y-3">
              <input
                value={categoryName}
                onChange={(event) => setCategoryName(event.target.value)}
                placeholder="Category name"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
              />
              <input
                value={categorySlug}
                onChange={(event) => setCategorySlug(event.target.value)}
                placeholder="Slug (optional)"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
              />
              <input
                value={categoryDescription}
                onChange={(event) => setCategoryDescription(event.target.value)}
                placeholder="Description (optional)"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
              />
              <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeCreateCategoryModal}
                  className="rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!activeStoreId || !categoryName.trim() || isCategorySaving}
                  className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isCategorySaving ? "Saving..." : "Create category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
