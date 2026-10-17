"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Search, Users, Pencil, Trash2, Check, X, Store } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";

type Store = {
  id: string;
  name: string;
  currency: string;
};

type CustomerGroup = {
  id: string;
  storeId: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: {
    customers: number;
  };
};

type GroupsDashboardProps = {
  initialStores: Store[];
  initialGroups: CustomerGroup[];
  selectedStoreId: string | null;
  setupError?: string | null;
};

export function GroupsDashboard({
  initialStores,
  initialGroups,
  selectedStoreId,
  setupError = null,
}: GroupsDashboardProps) {
  const { language } = useLanguage();
  const isEs = language === "es";

  const [stores] = useState(initialStores);
  const [groups, setGroups] = useState(initialGroups);
  const [activeStoreId, setActiveStoreId] = useState(selectedStoreId ?? initialStores[0]?.id ?? "");
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileActiveFilter, setMobileActiveFilter] = useState<"store" | "search" | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Editing State
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingDescription, setEditingDescription] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  // Deleting State
  const [deletingGroupId, setDeletingGroupId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const activeGroups = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return groups
      .filter((g) => g.storeId === activeStoreId)
      .filter((g) => {
        if (!q) return true;
        return (
          g.name.toLowerCase().includes(q) ||
          (g.description && g.description.toLowerCase().includes(q))
        );
      });
  }, [groups, activeStoreId, searchQuery]);

  async function refreshGroups(storeId: string) {
    try {
      const res = await fetch(`/api/customer-groups?storeId=${encodeURIComponent(storeId)}`, {
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        setGroups((current) => [
          ...current.filter((g) => g.storeId !== storeId),
          ...data,
        ]);
      }
    } catch (e) {
      console.error("Failed to refresh groups", e);
    }
  }

  function handleStoreChange(newStoreId: string) {
    setActiveStoreId(newStoreId);
    setError(null);
    setEditingGroupId(null);
    void refreshGroups(newStoreId);
  }

  async function handleUpdateGroup(groupId: string) {
    if (!editingName.trim()) {
      setError(isEs ? "El nombre no puede estar vacío" : "Name cannot be empty");
      return;
    }

    setIsUpdating(true);
    setError(null);

    try {
      const res = await fetch(`/api/customer-groups/${groupId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editingName.trim(),
          description: editingDescription.trim() || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || (isEs ? "Error al actualizar" : "Failed to update"));
      }

      setGroups((current) =>
        current.map((g) => (g.id === groupId ? { ...g, ...data } : g))
      );
      setEditingGroupId(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error updating group");
    } finally {
      setIsUpdating(false);
    }
  }

  async function handleDeleteGroup(groupId: string) {
    setIsDeleting(true);
    setError(null);

    try {
      const res = await fetch(`/api/customer-groups/${groupId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || (isEs ? "Error al eliminar" : "Failed to delete"));
      }

      setGroups((current) => current.filter((g) => g.id !== groupId));
      setDeletingGroupId(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error deleting group");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <section className="space-y-6">
      {setupError ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {setupError}
        </div>
      ) : null}

      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/dashboard/customers"
              className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
            >
              {isEs ? "Clientes" : "Customers"}
            </Link>
          </div>
          <h1 className="mt-1 text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">
            {isEs ? "Grupos de Clientes" : "Customer Groups"}
          </h1>
          <p className="mt-1 max-w-xl text-sm text-slate-500">
            {isEs
              ? "Organiza a tus clientes en grupos o segmentos (VIP, Mayoristas, Minoristas) para precios especiales o promociones personalizadas."
              : "Organize your customers into groups or tiers (VIP, Wholesale, Retail) for special pricing and targeted marketing."}
          </p>
        </div>

        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center lg:w-auto">
          <Link
            href={`/dashboard/customers/groups/new${activeStoreId ? `?storeId=${encodeURIComponent(activeStoreId)}` : ""}`}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-2xs transition hover:bg-slate-800 sm:w-auto"
          >
            <Plus className="h-4 w-4" />
            {isEs ? "Nuevo grupo de clientes" : "New Customer Group"}
          </Link>
        </div>
      </div>

      {/* Desktop Controls (lg+) */}
      <div className="mt-6 hidden w-full flex-col gap-4 lg:flex lg:flex-row lg:items-end">
        <div className="w-full shrink-0 flex-col gap-2 lg:w-56">
          <span className="text-sm font-medium text-slate-700">{isEs ? "Tienda" : "Store"}</span>
          <select
            value={activeStoreId}
            onChange={(e) => handleStoreChange(e.target.value)}
            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
          >
            {stores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.currency})
              </option>
            ))}
          </select>
        </div>

        <label className="w-full min-w-0 flex-1 flex-col gap-2">
          <span className="text-sm font-medium text-slate-700">{isEs ? "Buscar" : "Search"}</span>
          <div className="relative mt-2">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isEs ? "Buscar por nombre o descripción..." : "Search by name or description..."}
              className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </label>
      </div>

      {/* Mobile Controls (lg:hidden) - Icon triggers that reveal options on tap */}
      <div className="mt-4 space-y-3 lg:hidden">
        <div className="flex items-center gap-2">
          {/* Store Icon Button */}
          <button
            type="button"
            onClick={() => setMobileActiveFilter((prev) => (prev === "store" ? null : "store"))}
            aria-label={isEs ? "Seleccionar tienda" : "Select store"}
            title={isEs ? "Tienda" : "Store"}
            className={`relative inline-flex h-11 w-11 items-center justify-center rounded-xl border transition ${
              mobileActiveFilter === "store"
                ? "border-slate-950 bg-slate-950 text-white shadow-sm"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-2xs"
            }`}
          >
            <Store className="h-5 w-5" />
          </button>

          {/* Search Icon Button */}
          <button
            type="button"
            onClick={() => setMobileActiveFilter((prev) => (prev === "search" ? null : "search"))}
            aria-label={isEs ? "Buscar grupos" : "Search groups"}
            title={isEs ? "Buscar" : "Search"}
            className={`relative inline-flex h-11 w-11 items-center justify-center rounded-xl border transition ${
              mobileActiveFilter === "search"
                ? "border-slate-950 bg-slate-950 text-white shadow-sm"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-2xs"
            }`}
          >
            <Search className="h-5 w-5" />
            {searchQuery.trim().length > 0 && (
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-cyan-500" />
            )}
          </button>

          {/* Compact query pill if search is active but search panel is collapsed */}
          {searchQuery.trim() && mobileActiveFilter !== "search" && (
            <div className="flex min-w-0 flex-1 items-center justify-between gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
              <span className="truncate">"{searchQuery}"</span>
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="rounded p-0.5 text-slate-400 hover:text-slate-700"
                aria-label={isEs ? "Limpiar búsqueda" : "Clear search"}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

        </div>

        {/* Revealed Store Selector Panel */}
        {mobileActiveFilter === "store" && (
          <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                {isEs ? "Tienda Activa" : "Active Store"}
              </span>
              <button
                type="button"
                onClick={() => setMobileActiveFilter(null)}
                className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label={isEs ? "Cerrar" : "Close"}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div>
              <span className="text-xs text-slate-500">{isEs ? "Tienda" : "Store"}</span>
              <select
                value={activeStoreId}
                onChange={(e) => {
                  handleStoreChange(e.target.value);
                  setMobileActiveFilter(null);
                }}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-800 outline-none focus:border-slate-400"
              >
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.currency})
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Revealed Search Panel */}
        {mobileActiveFilter === "search" && (
          <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                {isEs ? "Buscar Grupos" : "Search Groups"}
              </span>
              <button
                type="button"
                onClick={() => setMobileActiveFilter(null)}
                className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label={isEs ? "Cerrar" : "Close"}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isEs ? "Buscar por nombre o descripción..." : "Search by name or description..."}
                autoFocus
                className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-10 pr-9 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-slate-400"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
                  aria-label={isEs ? "Limpiar búsqueda" : "Clear search"}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {/* Groups List Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
        {activeGroups.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-600 mb-4">
              <Users className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              {searchQuery
                ? (isEs ? "No se encontraron grupos" : "No groups found")
                : (isEs ? "Aún no hay grupos de clientes creados" : "No customer groups created yet")}
            </h3>
            <p className="mt-1 text-sm text-slate-500 max-w-sm mx-auto">
              {searchQuery
                ? (isEs ? "Intenta con otro término de búsqueda." : "Try adjusting your search criteria.")
                : (isEs ? "Crea grupos como VIP, Mayoristas o Frecuentes para segmentar tu base de clientes." : "Create tiers like VIP, Wholesale, or Regulars to categorize and reward your customers.")}
            </p>
            {!searchQuery && (
              <div className="mt-5 flex justify-center gap-3">
                <Link
                  href={`/dashboard/customers/groups/new${activeStoreId ? `?storeId=${encodeURIComponent(activeStoreId)}` : ""}`}
                  className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  <Plus className="h-4 w-4" />
                  {isEs ? "Crear primer grupo" : "Create first group"}
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50/80">
                <tr>
                  <th className="px-6 py-3.5 text-left font-semibold text-slate-700">
                    {isEs ? "Nombre del grupo" : "Group Name"}
                  </th>
                  <th className="px-6 py-3.5 text-left font-semibold text-slate-700">
                    {isEs ? "Descripción" : "Description"}
                  </th>
                  <th className="px-6 py-3.5 text-center font-semibold text-slate-700">
                    {isEs ? "Miembros" : "Members"}
                  </th>
                  <th className="px-6 py-3.5 text-left font-semibold text-slate-700">
                    {isEs ? "Fecha de creación" : "Created Date"}
                  </th>
                  <th className="px-6 py-3.5 text-right font-semibold text-slate-700">
                    {isEs ? "Acciones" : "Actions"}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {activeGroups.map((group) => {
                  const isEditing = editingGroupId === group.id;
                  const isPendingDelete = deletingGroupId === group.id;

                  return (
                    <tr key={group.id} className="transition-colors hover:bg-slate-50/60">
                      <td className="px-6 py-4 align-top">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            className="w-full rounded-lg border border-cyan-500 bg-white px-3 py-1.5 text-sm font-medium text-slate-900 outline-none ring-2 ring-cyan-500/20"
                            placeholder={isEs ? "Nombre del grupo" : "Group name"}
                            autoFocus
                          />
                        ) : (
                          <span className="text-xs text-slate-700">
                            {group.name}
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4 align-top text-xs text-slate-700">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editingDescription}
                            onChange={(e) => setEditingDescription(e.target.value)}
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 outline-none focus:border-cyan-500"
                            placeholder={isEs ? "Descripción opcional..." : "Optional description..."}
                          />
                        ) : (
                          <span className="line-clamp-2 text-xs text-slate-700">
                            {group.description || "—"}
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4 align-top text-center text-xs text-slate-700">
                        <Link
                          href={`/dashboard/customers?storeId=${encodeURIComponent(group.storeId)}`}
                          className="hover:underline"
                          title={isEs ? "Ver clientes en Clientes" : "View customers in Customers"}
                        >
                          {group._count?.customers ?? 0}
                        </Link>
                      </td>

                      <td className="px-6 py-4 align-top text-xs text-slate-700">
                        {new Date(group.createdAt).toLocaleDateString(isEs ? "es-ES" : "en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>

                      <td className="px-6 py-4 align-top text-right">
                        {isEditing ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => void handleUpdateGroup(group.id)}
                              disabled={isUpdating}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition disabled:opacity-50"
                              title={isEs ? "Guardar cambios" : "Save changes"}
                            >
                              <Check className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingGroupId(null)}
                              disabled={isUpdating}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-100 transition"
                              title={isEs ? "Cancelar" : "Cancel"}
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ) : isPendingDelete ? (
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-xs text-rose-600 font-medium">
                              {isEs ? "¿Eliminar?" : "Delete?"}
                            </span>
                            <button
                              type="button"
                              onClick={() => void handleDeleteGroup(group.id)}
                              disabled={isDeleting}
                              className="rounded-lg bg-rose-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-rose-700 transition disabled:opacity-50"
                            >
                              {isEs ? "Sí" : "Yes"}
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingGroupId(null)}
                              disabled={isDeleting}
                              className="rounded-lg border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 transition"
                            >
                              {isEs ? "No" : "No"}
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingGroupId(group.id);
                                setEditingName(group.name);
                                setEditingDescription(group.description || "");
                                setDeletingGroupId(null);
                              }}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-700 transition"
                              title={isEs ? "Editar grupo" : "Edit group"}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setDeletingGroupId(group.id);
                                setEditingGroupId(null);
                              }}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 transition"
                              title={isEs ? "Eliminar grupo" : "Delete group"}
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
  );
}
