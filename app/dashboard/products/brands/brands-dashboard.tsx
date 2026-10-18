"use client";

import { useMemo, useState } from "react";
import { Check, ChevronRight, Pencil, Plus, Search, Tag, Trash2, X } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";

type Store = {
  id: string;
  name: string;
  slug: string;
  currency: string;
};

type Brand = {
  id: string;
  storeId: string;
  name: string;
  slug: string;
  description: string | null;
  updatedAt?: string | Date;
  _count?: {
    products: number;
  };
};

type BrandsDashboardProps = {
  initialStores: Store[];
  initialBrands: Brand[];
  selectedStoreId: string | null;
  setupError?: string | null;
};

export function BrandsDashboard({
  initialStores,
  initialBrands,
  selectedStoreId,
  setupError = null,
}: BrandsDashboardProps) {
  const { language } = useLanguage();
  const isEs = language === "es";
  const [stores] = useState(initialStores);
  const [brands, setBrands] = useState(initialBrands);
  const [activeStoreId, setActiveStoreId] = useState(selectedStoreId ?? initialStores[0]?.id ?? "");
  const [searchQuery, setSearchQuery] = useState("");
  const [brandName, setBrandName] = useState("");
  const [brandSlug, setBrandSlug] = useState("");
  const [brandDescription, setBrandDescription] = useState("");
  const [isCreateBrandModalOpen, setIsCreateBrandModalOpen] = useState(false);
  const [editingBrandId, setEditingBrandId] = useState<string | null>(null);
  const [editingBrandName, setEditingBrandName] = useState("");
  const [editingBrandSlug, setEditingBrandSlug] = useState("");
  const [brandError, setBrandError] = useState<string | null>(null);
  const [isBrandSaving, setIsBrandSaving] = useState(false);

  const activeStore = stores.find((store) => store.id === activeStoreId) ?? null;
  const activeStoreBrands = useMemo(
    () => brands.filter((brand) => brand.storeId === activeStoreId),
    [brands, activeStoreId],
  );

  const filteredBrands = useMemo(() => {
    if (!searchQuery.trim()) return activeStoreBrands;
    const q = searchQuery.toLowerCase().trim();
    return activeStoreBrands.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        b.slug.toLowerCase().includes(q) ||
        (b.description && b.description.toLowerCase().includes(q)),
    );
  }, [activeStoreBrands, searchQuery]);

  function resetBrandForm() {
    setBrandName("");
    setBrandSlug("");
    setBrandDescription("");
  }

  async function refreshBrands(storeId: string) {
    const response = await fetch(`/api/brands?storeId=${encodeURIComponent(storeId)}`, {
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error("Failed to refresh brands");
    }

    const data = (await response.json()) as Brand[];
    setBrands((current) => [
      ...current.filter((brand) => brand.storeId !== storeId),
      ...data,
    ]);
  }

  async function handleStoreChange(storeId: string) {
    setActiveStoreId(storeId);
    setBrandError(null);
    setEditingBrandId(null);

    try {
      await refreshBrands(storeId);
    } catch {
      setBrandError(isEs ? "No se pudieron cargar las marcas de la tienda seleccionada" : "Could not load brands for the selected store");
    }
  }

  function handleNameChange(value: string) {
    setBrandName(value);
    setBrandSlug(
      value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, ""),
    );
  }

  function handleEditNameChange(value: string) {
    setEditingBrandName(value);
    setEditingBrandSlug(
      value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, ""),
    );
  }

  function openCreateBrandModal() {
    setBrandError(null);
    resetBrandForm();
    setIsCreateBrandModalOpen(true);
  }

  function closeCreateBrandModal() {
    setIsCreateBrandModalOpen(false);
    resetBrandForm();
  }

  async function handleCreateBrand() {
    if (!activeStoreId) {
      setBrandError(isEs ? "Selecciona una tienda primero" : "Select a store first");
      return;
    }

    if (!brandName.trim()) {
      setBrandError(isEs ? "El nombre de la marca es requerido" : "Brand name is required");
      return;
    }

    setIsBrandSaving(true);
    setBrandError(null);

    try {
      const response = await fetch("/api/brands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId: activeStoreId,
          name: brandName,
          slug: brandSlug,
          description: brandDescription,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || (isEs ? "Error al crear la marca" : "Failed to create brand"));
      }

      await refreshBrands(activeStoreId);
      closeCreateBrandModal();
    } catch (error) {
      setBrandError(error instanceof Error ? error.message : (isEs ? "No se pudo crear la marca" : "Failed to create brand"));
    } finally {
      setIsBrandSaving(false);
    }
  }

  function startEditBrand(brand: Brand) {
    setEditingBrandId(brand.id);
    setEditingBrandName(brand.name);
    setEditingBrandSlug(brand.slug);
    setBrandError(null);
  }

  function cancelEditBrand() {
    setEditingBrandId(null);
    setEditingBrandName("");
    setEditingBrandSlug("");
  }

  async function handleSaveEditBrand(brandId: string) {
    if (!editingBrandName.trim()) {
      setBrandError(isEs ? "El nombre de la marca no puede estar vacío" : "Brand name cannot be empty");
      return;
    }

    setIsBrandSaving(true);
    setBrandError(null);

    try {
      const response = await fetch(`/api/brands/${brandId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editingBrandName,
          slug: editingBrandSlug,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || (isEs ? "Error al actualizar la marca" : "Failed to update brand"));
      }

      await refreshBrands(activeStoreId);
      cancelEditBrand();
    } catch (error) {
      setBrandError(error instanceof Error ? error.message : (isEs ? "No se pudo actualizar la marca" : "Failed to update brand"));
    } finally {
      setIsBrandSaving(false);
    }
  }

  async function handleDeleteBrand(brandId: string, name: string) {
    const confirmationMessage = isEs
      ? `¿Estás seguro de que deseas eliminar la marca "${name}"? Los productos asignados quedarán sin marca vinculada.`
      : `Are you sure you want to delete the brand "${name}"? Associated products will have no linked brand.`;

    if (!window.confirm(confirmationMessage)) {
      return;
    }

    setIsBrandSaving(true);
    setBrandError(null);

    try {
      const response = await fetch(`/api/brands/${brandId}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || (isEs ? "Error al eliminar la marca" : "Failed to delete brand"));
      }

      await refreshBrands(activeStoreId);
      if (editingBrandId === brandId) {
        cancelEditBrand();
      }
    } catch (error) {
      setBrandError(error instanceof Error ? error.message : (isEs ? "No se pudo eliminar la marca" : "Failed to delete brand"));
    } finally {
      setIsBrandSaving(false);
    }
  }

  return (
    <>
      <section className="space-y-6">
        {setupError ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {setupError}
          </div>
        ) : null}

        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">
              {isEs ? "Marcas y Fabricantes" : "Brands & Manufacturers"}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {isEs
                ? "Administra las marcas de tus productos por tienda para estructurar tu catálogo y reportes de ventas."
                : "Manage product brands per store to structure your catalog and sales analytics."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={openCreateBrandModal}
              disabled={!activeStoreId}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-2xs transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              <Plus className="h-4 w-4" />
              {isEs ? "Nueva marca" : "New brand"}
            </button>
          </div>
        </div>

        {/* Filter & Controls Bar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="w-full sm:w-64">
            <select
              value={activeStoreId}
              onChange={(event) => void handleStoreChange(event.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none transition hover:bg-slate-50 focus:border-slate-400 shadow-2xs"
            >
              {stores.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.name} ({store.currency})
                </option>
              ))}
            </select>
          </div>

          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isEs ? "Buscar marcas por nombre o descripción..." : "Search brands by name or description..."}
              className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-9 text-xs outline-none transition placeholder:text-slate-400 focus:border-slate-400 shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {brandError ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {brandError}
          </div>
        ) : null}

        {/* Brands Table */}
        <div className="overflow-hidden rounded-[8px] border border-slate-200 bg-white shadow-xs">
          {filteredBrands.length === 0 ? (
            <div className="p-10 text-center text-slate-500">
              <Tag className="mx-auto h-10 w-10 text-slate-300 mb-2" />
              <p className="font-semibold text-slate-700">
                {searchQuery
                  ? (isEs ? "No se encontraron marcas para la búsqueda." : "No brands found matching your search.")
                  : activeStore
                    ? (isEs ? `Aún no hay marcas registradas para ${activeStore.name}.` : `No brands yet for ${activeStore.name}.`)
                    : (isEs ? "Aún no hay marcas para esta tienda." : "No brands yet for this store.")}
              </p>
              {!searchQuery && (
                <button
                  type="button"
                  onClick={openCreateBrandModal}
                  className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-700 hover:underline"
                >
                  <Plus className="h-3.5 w-3.5" />
                  {isEs ? "Crear primera marca" : "Create first brand"}
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50/70 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-3.5 text-left">{isEs ? "Marca" : "Brand"}</th>
                    <th className="px-5 py-3.5 text-left">{isEs ? "Slug" : "Slug"}</th>
                    <th className="px-5 py-3.5 text-left">{isEs ? "Descripción" : "Description"}</th>
                    <th className="px-5 py-3.5 text-center">{isEs ? "Productos" : "Products"}</th>
                    <th className="px-5 py-3.5 text-right">{isEs ? "Acciones" : "Actions"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredBrands.map((brand) => {
                    const isEditing = editingBrandId === brand.id;

                    return (
                      <tr key={brand.id} className="transition-colors hover:bg-slate-50/60">
                        <td className="px-5 py-4 text-xs text-slate-700 font-semibold">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editingBrandName}
                              onChange={(e) => handleEditNameChange(e.target.value)}
                              className="w-full rounded-lg border border-slate-300 px-2 py-1 text-xs outline-none focus:border-slate-500"
                            />
                          ) : (
                            brand.name
                          )}
                        </td>
                        <td className="px-5 py-4 text-xs text-slate-500 font-mono">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editingBrandSlug}
                              onChange={(e) => setEditingBrandSlug(e.target.value)}
                              className="w-full rounded-lg border border-slate-300 px-2 py-1 text-xs outline-none focus:border-slate-500 font-mono"
                            />
                          ) : (
                            brand.slug
                          )}
                        </td>
                        <td className="px-5 py-4 text-xs text-slate-500 max-w-xs truncate">
                          {brand.description || "—"}
                        </td>
                        <td className="px-5 py-4 text-xs text-slate-700 text-center whitespace-nowrap">
                          {brand._count?.products ?? 0} {isEs ? "productos" : "products"}
                        </td>
                        <td className="px-5 py-4 text-right whitespace-nowrap">
                          {isEditing ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => void handleSaveEditBrand(brand.id)}
                                disabled={isBrandSaving}
                                className="rounded-lg bg-emerald-600 p-1.5 text-white hover:bg-emerald-700 disabled:opacity-50"
                                title={isEs ? "Guardar" : "Save"}
                              >
                                <Check className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={cancelEditBrand}
                                className="rounded-lg border border-slate-300 p-1.5 text-slate-600 hover:bg-slate-100"
                                title={isEs ? "Cancelar" : "Cancel"}
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => startEditBrand(brand)}
                                className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                                title={isEs ? "Editar" : "Edit"}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleDeleteBrand(brand.id, brand.name)}
                                className="rounded-lg border border-slate-200 p-1.5 text-rose-600 hover:bg-rose-50 hover:border-rose-300"
                                title={isEs ? "Eliminar" : "Delete"}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          )}
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

      {/* Create Brand Modal */}
      {isCreateBrandModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                {isEs ? "Nueva Marca" : "New Brand"}
              </h3>
              <button
                type="button"
                onClick={closeCreateBrandModal}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700">
                  {isEs ? "Nombre de la marca *" : "Brand Name *"}
                </label>
                <input
                  type="text"
                  value={brandName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. Nike, Apple, Acme"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm outline-none focus:border-slate-400"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">
                  {isEs ? "Slug (identificador URL)" : "Slug (URL identifier)"}
                </label>
                <input
                  type="text"
                  value={brandSlug}
                  onChange={(e) => setBrandSlug(e.target.value)}
                  placeholder="e.g. nike, apple"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-mono outline-none focus:border-slate-400"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">
                  {isEs ? "Descripción (opcional)" : "Description (optional)"}
                </label>
                <textarea
                  value={brandDescription}
                  onChange={(e) => setBrandDescription(e.target.value)}
                  placeholder={isEs ? "Breve resumen de la marca o fabricante..." : "Brief summary of the brand or maker..."}
                  rows={3}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm outline-none focus:border-slate-400"
                />
              </div>

              {brandError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs text-rose-700">
                  {brandError}
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={closeCreateBrandModal}
                disabled={isBrandSaving}
                className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                {isEs ? "Cancelar" : "Cancel"}
              </button>
              <button
                type="button"
                onClick={() => void handleCreateBrand()}
                disabled={isBrandSaving || !brandName.trim()}
                className="rounded-full bg-slate-950 px-5 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
              >
                {isBrandSaving ? (isEs ? "Guardando..." : "Saving...") : isEs ? "Crear marca" : "Create brand"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
