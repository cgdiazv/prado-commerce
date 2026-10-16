"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Search, Users, Pencil, Trash2, Check, X, Shield, FolderPlus, ArrowRight } from "lucide-react";
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
  const [error, setError] = useState<string | null>(null);

  // Quick Inline/Modal Create State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDescription, setNewGroupDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);

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

  const totalMembers = useMemo(() => {
    return activeGroups.reduce((acc, curr) => acc + (curr._count?.customers ?? 0), 0);
  }, [activeGroups]);

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

  async function handleCreateGroup(e: React.FormEvent) {
    e.preventDefault();
    if (!newGroupName.trim()) {
      setError(isEs ? "El nombre del grupo es obligatorio" : "Group name is required");
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const res = await fetch("/api/customer-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId: activeStoreId,
          name: newGroupName.trim(),
          description: newGroupDescription.trim() || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || (isEs ? "Error al crear grupo" : "Failed to create group"));
      }

      setGroups((current) => [data, ...current]);
      setNewGroupName("");
      setNewGroupDescription("");
      setIsCreateModalOpen(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error creating group");
    } finally {
      setIsCreating(false);
    }
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
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/customers"
              className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 hover:text-cyan-700 transition"
            >
              {isEs ? "Clientes" : "Customers"}
            </Link>
            <span className="text-xs text-slate-400">/</span>
            <span className="inline-flex rounded-full border border-cyan-200 bg-cyan-50 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-700">
              {isEs ? "Grupos" : "Groups"}
            </span>
          </div>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
            {isEs ? "Grupos de Clientes" : "Customer Groups"}
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600 sm:text-base">
            {isEs
              ? "Organiza a tus clientes en grupos o segmentos (VIP, Mayoristas, Minoristas) para precios especiales o promociones personalizadas."
              : "Organize your customers into groups or tiers (VIP, Wholesale, Retail) for special pricing and targeted marketing."}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setError(null);
              setIsCreateModalOpen(true);
            }}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-xs transition hover:bg-slate-50 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            {isEs ? "Creación rápida" : "Quick Add"}
          </button>
          <Link
            href={`/dashboard/customers/groups/new${activeStoreId ? `?storeId=${encodeURIComponent(activeStoreId)}` : ""}`}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-600 px-5 py-2.5 text-sm font-semibold text-white shadow-xs transition hover:bg-cyan-700 cursor-pointer"
          >
            <FolderPlus className="h-4 w-4" />
            {isEs ? "Nuevo grupo de clientes" : "New Customer Group"}
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              {isEs ? "Grupos activos" : "Active Groups"}
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-50 text-cyan-600">
              <Shield className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{activeGroups.length}</span>
            <span className="text-xs text-slate-500">{isEs ? "en esta tienda" : "in this store"}</span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              {isEs ? "Clientes asignados" : "Grouped Customers"}
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{totalMembers}</span>
            <span className="text-xs text-slate-500">{isEs ? "miembros totales" : "total members"}</span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              {isEs ? "Gestión y Segmentación" : "Segmentation"}
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <ArrowRight className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <Link
              href={`/dashboard/customers${activeStoreId ? `?storeId=${encodeURIComponent(activeStoreId)}` : ""}`}
              className="text-xs font-bold text-cyan-700 hover:text-cyan-800 inline-flex items-center gap-1"
            >
              {isEs ? "Ver todos los clientes" : "View all customers"} →
            </Link>
          </div>
        </div>
      </div>

      {/* Store Selector & Search Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1 max-w-2xl">
          <div className="w-full sm:w-64">
            <select
              value={activeStoreId}
              onChange={(e) => handleStoreChange(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-800 shadow-xs outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
            >
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.currency})
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
              placeholder={isEs ? "Buscar por nombre o descripción..." : "Search by name or description..."}
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-800 placeholder:text-slate-400 shadow-xs outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
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
                  className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xs transition hover:bg-cyan-700"
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
                          <div className="flex items-center gap-2.5">
                            <span className="inline-flex items-center rounded-full bg-cyan-50 px-3 py-1 text-xs font-bold text-cyan-700 border border-cyan-200/80">
                              {group.name}
                            </span>
                          </div>
                        )}
                      </td>

                      <td className="px-6 py-4 align-top text-slate-600">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editingDescription}
                            onChange={(e) => setEditingDescription(e.target.value)}
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 outline-none focus:border-cyan-500"
                            placeholder={isEs ? "Descripción opcional..." : "Optional description..."}
                          />
                        ) : (
                          <span className="line-clamp-2 text-xs text-slate-600">
                            {group.description || "—"}
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4 align-top text-center">
                        <Link
                          href={`/dashboard/customers?storeId=${encodeURIComponent(group.storeId)}`}
                          className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 hover:bg-cyan-50 hover:text-cyan-700 px-3 py-0.5 text-xs font-semibold text-slate-700 transition"
                          title={isEs ? "Ver clientes en Clientes" : "View customers in Customers"}
                        >
                          <Users className="h-3 w-3 text-slate-400" />
                          <span>{group._count?.customers ?? 0}</span>
                        </Link>
                      </td>

                      <td className="px-6 py-4 align-top text-xs text-slate-500">
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

      {/* Quick Add Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl animate-slide-in">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700">
                  <Shield className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {isEs ? "Crear Grupo de Clientes" : "Create Customer Group"}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {isEs ? "Añade un nuevo segmento a tu tienda" : "Add a new segment to your store"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateGroup} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  {isEs ? "Nombre del grupo *" : "Group Name *"}
                </label>
                <input
                  type="text"
                  required
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder={isEs ? "Ej. VIP, Mayoristas, Regular" : "e.g. VIP, Wholesale, Regular"}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:bg-white focus:ring-2 focus:ring-cyan-500/20"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  {isEs ? "Descripción (Opcional)" : "Description (Optional)"}
                </label>
                <textarea
                  rows={3}
                  value={newGroupDescription}
                  onChange={(e) => setNewGroupDescription(e.target.value)}
                  placeholder={isEs ? "Notas o detalles sobre los beneficios o criterios de este grupo..." : "Notes or details on criteria/benefits for this tier..."}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:bg-white focus:ring-2 focus:ring-cyan-500/20"
                />
              </div>

              {/* Live Preview Badge */}
              {newGroupName.trim() && (
                <div className="rounded-xl border border-cyan-100 bg-cyan-50/50 p-3">
                  <span className="text-[11px] font-semibold text-cyan-800 block mb-1">
                    {isEs ? "Vista previa en tabla:" : "Preview in table:"}
                  </span>
                  <span className="inline-flex items-center rounded-full bg-cyan-100 px-3 py-0.5 text-xs font-bold text-cyan-800 border border-cyan-200">
                    {newGroupName.trim()}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="rounded-xl border border-slate-300 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                >
                  {isEs ? "Cancelar" : "Cancel"}
                </button>
                <button
                  type="submit"
                  disabled={isCreating || !newGroupName.trim()}
                  className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-cyan-700 transition disabled:opacity-50 cursor-pointer"
                >
                  {isCreating ? (isEs ? "Creando..." : "Creating...") : (isEs ? "Guardar grupo" : "Save Group")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
