"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Check, ChevronRight, Pencil, Plus, Trash2, X } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { setStoredActiveStoreId, subscribeToActiveStoreChange } from "@/lib/dashboard-store-selection";

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
  parentCategoryId: string | null;
  updatedAt?: string | Date;
};

function isDescendantCategory(
  candidateId: string,
  ancestorId: string,
  categories: Category[],
) {
  let parentId = categories.find((category) => category.id === candidateId)?.parentCategoryId;
  const visited = new Set<string>();

  while (parentId && !visited.has(parentId)) {
    if (parentId === ancestorId) return true;
    visited.add(parentId);
    parentId = categories.find((category) => category.id === parentId)?.parentCategoryId ?? null;
  }

  return false;
}

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
  const { language } = useLanguage();
  const isEs = language === "es";
  const [stores] = useState(initialStores);
  const [categories, setCategories] = useState(initialCategories);
  const [activeStoreId, setActiveStoreId] = useState(selectedStoreId ?? initialStores[0]?.id ?? "");
  const [categoryName, setCategoryName] = useState("");
  const [categorySlug, setCategorySlug] = useState("");
  const [categoryDescription, setCategoryDescription] = useState("");
  const [categoryParentCategoryId, setCategoryParentCategoryId] = useState("");
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
  const activeStoreCategoryNameById = useMemo(
    () =>
      new Map(
        activeStoreCategories.map((category) => [category.id, category.name]),
      ),
    [activeStoreCategories],
  );
  const activeStoreCategorySlugById = useMemo(
    () =>
      new Map(
        activeStoreCategories.map((category) => [category.id, category.slug]),
      ),
    [activeStoreCategories],
  );

  function resetCategoryForm() {
    setCategoryName("");
    setCategorySlug("");
    setCategoryDescription("");
    setCategoryParentCategoryId("");
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
    setStoredActiveStoreId(storeId);
    setCategoryError(null);
    setEditingCategoryId(null);

    try {
      await refreshCategories(storeId);
    } catch {
      setCategoryError("Failed to load categories for this store.");
    }
  }

  useEffect(() => {
    return subscribeToActiveStoreChange((newStoreId) => {
      if (newStoreId && newStoreId !== "ALL" && newStoreId !== activeStoreId && stores.some((s) => s.id === newStoreId)) {
        setActiveStoreId(newStoreId);
        void refreshCategories(newStoreId).catch(() => {});
      }
    });
  }, [activeStoreId, stores]);

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
    setCategoryParentCategoryId(category.parentCategoryId ?? "");
    setCategoryError(null);
  }

  function cancelEditCategory() {
    setEditingCategoryId(null);
    setEditingCategoryName("");
    setEditingCategorySlug("");
    setCategoryParentCategoryId("");
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
          parentCategoryId: categoryParentCategoryId || null,
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
          parentCategoryId: categoryParentCategoryId || null,
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
    if (
      !confirm(
        isEs
          ? "¿Eliminar esta categoría? Los productos perderán esta asignación de categoría y sus subcategorías quedarán sin padre."
          : "Delete this category? Products will lose this category assignment and its child categories will become top-level.",
      )
    ) {
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
        throw new Error(data.error ?? (isEs ? "No se pudo eliminar la categoría" : "Failed to delete category"));
      }

      setCategories((current) =>
        current
          .filter((category) => category.id !== categoryId)
          .map((category) =>
            category.parentCategoryId === categoryId
              ? { ...category, parentCategoryId: null }
              : category,
          ),
      );
      if (editingCategoryId === categoryId) {
        cancelEditCategory();
      }
    } catch (error) {
      setCategoryError(error instanceof Error ? error.message : (isEs ? "No se pudo eliminar la categoría" : "Failed to delete category"));
    } finally {
      setIsCategorySaving(false);
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

        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">
              {isEs
                ? "Organiza tu catálogo con grupos claros de categorías."
                : "Organize your catalog with clean category groups."}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {isEs
                ? "Crea, edita y elimina categorías por tienda para estructurar la navegación de productos."
                : "Create, edit, and remove categories per store to keep product browsing structured."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={openCreateCategoryModal}
              disabled={!activeStoreId}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              <Plus className="h-4 w-4" />
              {isEs ? "Nueva categoría" : "New category"}
            </button>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-4 lg:max-w-md">
          <label className="flex w-full flex-col gap-2">
            <span className="text-sm font-medium text-slate-700">{isEs ? "Tienda" : "Store"}</span>
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

        <div className="mt-8 overflow-hidden rounded-[8px] border border-slate-200 bg-white shadow-sm">
          {activeStoreCategories.length === 0 ? (
            <div className="p-10 text-center text-slate-500">
              {activeStore
                ? (isEs ? `Aún no hay categorías para ${activeStore.name}.` : `No categories yet for ${activeStore.name}.`)
                : (isEs ? "Aún no hay categorías para esta tienda." : "No categories yet for this store.")}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full table-fixed divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="w-1/6 px-4 py-3 text-left font-semibold text-slate-600">{isEs ? "Nombre" : "Name"}</th>
                    <th className="w-1/6 px-4 py-3 text-left font-semibold text-slate-600">Slug</th>
                    <th className="w-1/6 px-4 py-3 text-left font-semibold text-slate-600">{isEs ? "Padre" : "Parent"}</th>
                    <th className="w-1/6 px-4 py-3 text-left font-semibold text-slate-600">{isEs ? "Slug padre" : "Parent slug"}</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">{isEs ? "Actualizado" : "Updated"}</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-600">{isEs ? "Acciones" : "Actions"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {activeStoreCategories.map((category) => {
                    const isEditing = editingCategoryId === category.id;

                    return (
                      <tr key={category.id} className="hover:bg-slate-50/70">
                        <td className="px-4 py-3 align-middle">
                          {isEditing ? (
                            <input
                              value={editingCategoryName}
                              onChange={(event) => setEditingCategoryName(event.target.value)}
                              autoFocus
                              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                            />
                          ) : (
                            <span className="text-xs text-slate-700">{category.name}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 align-middle text-xs text-slate-700">
                          {isEditing ? (
                            <input
                              value={editingCategorySlug}
                              onChange={(event) => setEditingCategorySlug(event.target.value)}
                              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                            />
                          ) : (
                            <span>{category.slug}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 align-middle text-xs text-slate-700">
                          {isEditing ? (
                            <select
                              value={categoryParentCategoryId}
                              onChange={(event) => setCategoryParentCategoryId(event.target.value)}
                              className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                            >
                              <option value="">{isEs ? "Sin padre" : "No parent"}</option>
                              {activeStoreCategories
                                .filter(
                                  (candidate) =>
                                    candidate.id !== category.id &&
                                    !isDescendantCategory(candidate.id, category.id, activeStoreCategories),
                                )
                                .map((candidate) => (
                                  <option key={candidate.id} value={candidate.id}>
                                    {candidate.name}
                                  </option>
                                ))}
                            </select>
                          ) : category.parentCategoryId
                            ? (activeStoreCategoryNameById.get(category.parentCategoryId) ?? "-")
                            : "-"}
                        </td>
                        <td className="px-4 py-3 align-middle text-xs text-slate-700">
                          {category.parentCategoryId
                            ? (activeStoreCategorySlugById.get(category.parentCategoryId) ?? "-")
                            : "-"}
                        </td>
                        <td className="px-4 py-3 align-middle text-xs text-slate-700">
                          {category.updatedAt ? new Date(category.updatedAt).toLocaleDateString(isEs ? "es-ES" : "en-US") : "-"}
                        </td>
                        <td className="px-4 py-3 align-middle">
                          <div className="flex justify-end gap-2">
                            {isEditing ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => void handleSaveCategory(category.id)}
                                  disabled={!editingCategoryName.trim() || isCategorySaving}
                                  aria-label={isEs ? "Guardar categoría" : "Save category"}
                                  title={isEs ? "Guardar" : "Save"}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-emerald-600 transition hover:bg-emerald-50 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  <Check className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={cancelEditCategory}
                                  aria-label={isEs ? "Cancelar edición" : "Cancel category edit"}
                                  title={isEs ? "Cancelar" : "Cancel"}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={() => beginEditCategory(category)}
                                aria-label={isEs ? "Editar categoría" : "Edit category"}
                                title={isEs ? "Editar" : "Edit"}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => void handleDeleteCategory(category.id)}
                              disabled={isCategorySaving}
                              aria-label={isEs ? "Eliminar categoría" : "Delete category"}
                              title={isEs ? "Eliminar" : "Delete"}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-rose-500 transition hover:bg-rose-50 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
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
                <h3 className="text-lg font-semibold text-slate-900">
                  {isEs ? "Crear categoría" : "Create category"}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  {activeStore
                    ? (isEs ? `Crea una categoría para ${activeStore.name}.` : `Create a category for ${activeStore.name}.`)
                    : (isEs ? "Selecciona una tienda primero." : "Select a store first.")}
                </p>
              </div>
              <button
                type="button"
                onClick={closeCreateCategoryModal}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 text-slate-700 transition hover:bg-slate-50"
                aria-label={isEs ? "Cerrar modal" : "Close create category modal"}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={(event) => void handleCreateCategory(event)} className="mt-5 space-y-3">
              <input
                value={categoryName}
                onChange={(event) => setCategoryName(event.target.value)}
                placeholder={isEs ? "Nombre de la categoría" : "Category name"}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
              />
              <input
                value={categorySlug}
                onChange={(event) => setCategorySlug(event.target.value)}
                placeholder={isEs ? "Slug (opcional)" : "Slug (optional)"}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
              />
              <input
                value={categoryDescription}
                onChange={(event) => setCategoryDescription(event.target.value)}
                placeholder={isEs ? "Descripción (opcional)" : "Description (optional)"}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
              />
              <label className="flex w-full flex-col gap-2">
                <span className="text-sm font-medium text-slate-700">
                  {isEs ? "Categoría padre (opcional)" : "Parent category (optional)"}
                </span>
                <select
                  value={categoryParentCategoryId}
                  onChange={(event) => setCategoryParentCategoryId(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                >
                  <option value="">{isEs ? "Sin categoría padre" : "No parent category"}</option>
                  {activeStoreCategories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeCreateCategoryModal}
                  className="rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  {isEs ? "Cancelar" : "Cancel"}
                </button>
                <button
                  type="submit"
                  disabled={!activeStoreId || !categoryName.trim() || isCategorySaving}
                  className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isCategorySaving
                    ? (isEs ? "Guardando..." : "Saving...")
                    : (isEs ? "Crear categoría" : "Create category")}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
