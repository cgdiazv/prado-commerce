"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, Plus, Search, Shield, Store, SlidersHorizontal, X } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";

type Store = {
  id: string;
  name: string;
  currency: string;
};

type CustomerGroup = {
  id: string;
  name: string;
};

type Customer = {
  id: string;
  storeId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  groupId: string | null;
  group: { id: string; name: string } | null;
  shippingAddress: unknown | null;
  billingAddress: unknown | null;
  allowCredit?: boolean;
  creditLimit?: number;
  creditDays?: number;
  creditInterestRate?: number;
  currentBalance?: number;
  availableCredit?: number;
  createdAt: string | Date;
};

type CustomersDashboardProps = {
  initialStores: Store[];
  initialCustomers: Customer[];
  initialGroups?: CustomerGroup[];
  selectedStoreId: string | null;
  setupError?: string | null;
};

function SortIndicator({ active, direction }: { active: boolean; direction: "asc" | "desc" }) {
  return (
    <span className="ml-1 flex flex-col leading-none text-[9px]">
      <span className={active && direction === "asc" ? "text-slate-950" : "text-slate-400"}>▲</span>
      <span className={active && direction === "desc" ? "text-slate-950" : "text-slate-400"}>▼</span>
    </span>
  );
}

export function CustomersDashboard({
  initialStores,
  initialCustomers,
  initialGroups = [],
  selectedStoreId,
  setupError = null,
}: CustomersDashboardProps) {
  const router = useRouter();
  const { language } = useLanguage();
  const isEs = language === "es";
  const [stores] = useState(initialStores);
  const [customers, setCustomers] = useState(initialCustomers);
  const [groups, setGroups] = useState<CustomerGroup[]>(initialGroups);
  const [activeStoreId, setActiveStoreId] = useState(selectedStoreId ?? "ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGroupFilter, setSelectedGroupFilter] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<"name" | "email" | "phone" | "group" | "createdAt">("createdAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [pageSize, setPageSize] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState<"" | "clear" | "delete">("");
  const [isApplyingBulkAction, setIsApplyingBulkAction] = useState(false);
  const [mobileActiveFilter, setMobileActiveFilter] = useState<"store" | "search" | "actions" | null>(null);
  const selectAllRef = useRef<HTMLInputElement | null>(null);

  const activeCustomers = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const filtered = customers.filter((customer) => {
      if (activeStoreId !== "ALL" && customer.storeId !== activeStoreId) {
        return false;
      }

      if (selectedGroupFilter) {
        if (selectedGroupFilter === "__none__") {
          if (customer.groupId || customer.group?.id) return false;
        } else {
          if (customer.groupId !== selectedGroupFilter && customer.group?.id !== selectedGroupFilter) {
            return false;
          }
        }
      }

      if (!normalizedQuery) {
        return true;
      }

      const fullName = `${customer.firstName ?? ""} ${customer.lastName ?? ""}`.trim();
      const groupName = customer.group?.name ?? "";
      return [fullName, customer.email, customer.phone ?? "", groupName]
        .some((value) => value.toLowerCase().includes(normalizedQuery));
    });
    
    return [...filtered].sort((a, b) => {
      let valA: string | number;
      let valB: string | number;

      if (sortField === "name") {
        valA = `${a.firstName ?? ""} ${a.lastName ?? ""}`.trim().toLowerCase();
        valB = `${b.firstName ?? ""} ${b.lastName ?? ""}`.trim().toLowerCase();
      } else if (sortField === "group") {
        valA = (a.group?.name ?? "").toLowerCase();
        valB = (b.group?.name ?? "").toLowerCase();
      } else if (sortField === "createdAt") {
        valA = new Date(a.createdAt).getTime();
        valB = new Date(b.createdAt).getTime();
      } else {
        valA = (a[sortField] ?? "").toLowerCase();
        valB = (b[sortField] ?? "").toLowerCase();
      }

      if (valA < valB) return sortDirection === "asc" ? -1 : 1;
      if (valA > valB) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [customers, activeStoreId, searchQuery, selectedGroupFilter, sortField, sortDirection]);

  const totalCustomers = activeCustomers.length;
  const totalPages = Math.max(1, Math.ceil(totalCustomers / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStart = totalCustomers === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const pageEnd = Math.min(safeCurrentPage * pageSize, totalCustomers);

  const paginatedCustomers = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return activeCustomers.slice(start, start + pageSize);
  }, [activeCustomers, safeCurrentPage, pageSize]);

  const paginatedCustomerIds = useMemo(
    () => paginatedCustomers.map((customer) => customer.id),
    [paginatedCustomers],
  );

  const activeCustomerIdSet = useMemo(
    () => new Set(activeCustomers.map((customer) => customer.id)),
    [activeCustomers],
  );

  const validSelectedCustomerIds = useMemo(
    () => selectedCustomerIds.filter((id) => activeCustomerIdSet.has(id)),
    [selectedCustomerIds, activeCustomerIdSet],
  );

  const selectedOnPageCount = useMemo(
    () => paginatedCustomerIds.filter((id) => validSelectedCustomerIds.includes(id)).length,
    [paginatedCustomerIds, validSelectedCustomerIds],
  );

  const allOnPageSelected = paginatedCustomerIds.length > 0 && selectedOnPageCount === paginatedCustomerIds.length;
  const someOnPageSelected = selectedOnPageCount > 0 && !allOnPageSelected;

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }

    setCurrentPage(1);
  };

  async function refreshCustomers(storeId: string) {
    const [custRes, groupRes] = await Promise.all([
      fetch(`/api/customers?storeId=${encodeURIComponent(storeId)}`, { cache: "no-store" }),
      fetch(`/api/customer-groups?storeId=${encodeURIComponent(storeId)}`, { cache: "no-store" }),
    ]);

    if (!custRes.ok) {
      throw new Error("Failed to refresh customers");
    }

    const data = (await custRes.json()) as Customer[];
    if (storeId === "ALL") {
      setCustomers(data);
    } else {
      setCustomers((current) => [
        ...current.filter((customer) => customer.storeId !== storeId),
        ...data,
      ]);
    }

    if (groupRes.ok) {
      const gData = await groupRes.json();
      setGroups(gData);
    }
  }

  async function handleStoreChange(storeId: string) {
    setActiveStoreId(storeId);
    setError(null);
    setCurrentPage(1);
    setSelectedGroupFilter("");
    setSelectedCustomerIds([]);
    setBulkAction("");

    try {
      await refreshCustomers(storeId);
    } catch {
      setError("Failed to load customers for this store.");
    }
  }

  useEffect(() => {
    if (!selectAllRef.current) {
      return;
    }

    selectAllRef.current.indeterminate = someOnPageSelected;
  }, [someOnPageSelected]);

  function toggleCustomerSelection(customerId: string) {
    setSelectedCustomerIds((current) => {
      if (current.includes(customerId)) {
        return current.filter((id) => id !== customerId);
      }

      return [...current, customerId];
    });
  }

  function toggleSelectAllOnPage(checked: boolean) {
    if (!checked) {
      setSelectedCustomerIds((current) => current.filter((id) => !paginatedCustomerIds.includes(id)));
      return;
    }

    setSelectedCustomerIds((current) => Array.from(new Set([...current, ...paginatedCustomerIds])));
  }

  async function handleApplyBulkAction() {
    if (!bulkAction) {
      return;
    }

    if (bulkAction === "clear") {
      setSelectedCustomerIds([]);
      setBulkAction("");
      return;
    }

    if (validSelectedCustomerIds.length === 0) {
      return;
    }

    setError(null);
    setIsApplyingBulkAction(true);

    try {
      const responses = await Promise.all(
        validSelectedCustomerIds.map((customerId) =>
          fetch(`/api/customers/${customerId}`, {
            method: "DELETE",
          }),
        ),
      );

      if (responses.some((response) => !response.ok)) {
        throw new Error("Failed to delete selected customers");
      }

      const selectedIdSet = new Set(validSelectedCustomerIds);
      setCustomers((current) => current.filter((customer) => !selectedIdSet.has(customer.id)));
      setSelectedCustomerIds([]);
      setBulkAction("");
    } catch {
      setError("Failed to apply action to selected customers.");
    } finally {
      setIsApplyingBulkAction(false);
    }
  }

  const targetStoreId = activeStoreId !== "ALL" ? activeStoreId : stores[0]?.id;
  const createHref = targetStoreId
    ? `/dashboard/customers/new?storeId=${encodeURIComponent(targetStoreId)}`
    : "/dashboard/customers/new";

  return (
    <section>
      {setupError ? (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {setupError}
        </div>
      ) : null}

      <div className="space-y-4">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">
              {isEs ? "Administrador de Clientes" : "Customers Manager"}
            </h1>
            <p className="mt-1 max-w-xl text-sm text-slate-500">
              {isEs
                ? "Visualiza y administra todos tus clientes."
                : "View and manage all your customers."}
            </p>
          </div>

          <div className="flex w-full flex-wrap items-center gap-3 lg:w-auto">
            <Link
              href={`/dashboard/customers/groups${activeStoreId && activeStoreId !== "ALL" ? `?storeId=${encodeURIComponent(activeStoreId)}` : ""}`}
              className="hidden items-center justify-center gap-2 rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-xs transition hover:bg-slate-50 lg:inline-flex"
            >
              <Shield className="h-4 w-4 text-cyan-600" />
              {isEs ? "Grupos de clientes" : "Customer Groups"}
            </Link>
            <Link
              href={createHref}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 sm:w-auto"
            >
              <Plus className="h-4 w-4" />
              {isEs ? "Nuevo cliente" : "New customer"}
            </Link>
          </div>
        </div>

        {/* Desktop Controls (lg+) */}
        <div className="mt-6 hidden w-full flex-col gap-4 lg:flex lg:flex-row lg:items-end">
          <div className="w-full shrink-0 flex-col gap-2 lg:w-56">
            <span className="text-sm font-medium text-slate-700">{isEs ? "Tienda" : "Store"}</span>
            <div className="relative mt-2">
              <Store className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <select
                value={activeStoreId}
                onChange={(event) => void handleStoreChange(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-9 text-sm font-medium text-slate-700 outline-none transition hover:bg-slate-50 focus:border-slate-400 shadow-2xs appearance-none cursor-pointer"
              >
                <option value="ALL">{isEs ? "Todas las tiendas" : "All Stores"}</option>
                {stores.map((store) => (
                  <option key={store.id} value={store.id}>
                    {store.name} {store.currency ? `(${store.currency})` : ""}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>
          </div>

          <label className="w-full min-w-0 flex-1 flex-col gap-2">
            <span className="text-sm font-medium text-slate-700">{isEs ? "Buscar" : "Search"}</span>
            <div className="relative mt-2">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => {
                  setSearchQuery(event.target.value);
                  setCurrentPage(1);
                }}
                placeholder={isEs ? "Nombre, correo, teléfono o grupo" : "Name, email, phone, or group"}
                className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
              />
            </div>
          </label>

          {groups.length > 0 && (
            <div className="w-full shrink-0 flex-col gap-2 lg:w-48">
              <span className="text-sm font-medium text-slate-700">{isEs ? "Filtrar por grupo" : "Filter by group"}</span>
              <select
                value={selectedGroupFilter}
                onChange={(e) => {
                  setSelectedGroupFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
              >
                <option value="">{isEs ? "Todos los grupos" : "All groups"}</option>
                <option value="__none__">{isEs ? "Sin grupo" : "Without group"}</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="w-full shrink-0 flex-col gap-2 lg:ml-auto lg:w-auto">
            <div className="flex justify-end">
              <span className="whitespace-nowrap text-sm font-medium text-slate-700">{isEs ? "Acciones" : "Actions"}</span>
            </div>
            <div className="mt-2 flex items-center gap-3 lg:justify-end">
              <button
                type="button"
                onClick={() => void handleApplyBulkAction()}
                disabled={
                  isApplyingBulkAction ||
                  !bulkAction ||
                  (bulkAction === "delete" && validSelectedCustomerIds.length === 0)
                }
                className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isEs ? "Aplicar" : "Apply"}
              </button>
              <select
                value={bulkAction}
                onChange={(event) => setBulkAction(event.target.value as "" | "clear" | "delete")}
                className="w-44 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
              >
                <option value="">{isEs ? "Seleccionar acción" : "Select action"}</option>
                <option value="delete">{isEs ? "Eliminar seleccionados" : "Delete selected"}</option>
                <option value="clear">{isEs ? "Limpiar selección" : "Clear selection"}</option>
              </select>
            </div>
          </div>
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
              aria-label={isEs ? "Buscar clientes" : "Search customers"}
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

            {/* Actions Icon Button */}
            <button
              type="button"
              onClick={() => setMobileActiveFilter((prev) => (prev === "actions" ? null : "actions"))}
              aria-label={isEs ? "Acciones por lote" : "Bulk actions"}
              title={isEs ? "Acciones" : "Actions"}
              className={`relative inline-flex h-11 w-11 items-center justify-center rounded-xl border transition ${
                mobileActiveFilter === "actions"
                  ? "border-slate-950 bg-slate-950 text-white shadow-sm"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-2xs"
              }`}
            >
              <SlidersHorizontal className="h-5 w-5" />
              {validSelectedCustomerIds.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-cyan-600 px-1 text-[11px] font-bold text-white shadow-xs">
                  {validSelectedCustomerIds.length}
                </span>
              )}
            </button>

            {/* Compact query pill if search is active but search panel is collapsed */}
            {searchQuery.trim() && mobileActiveFilter !== "search" && (
              <div className="flex min-w-0 flex-1 items-center justify-between gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                <span className="truncate">"{searchQuery}"</span>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setCurrentPage(1);
                  }}
                  className="rounded p-0.5 text-slate-400 hover:text-slate-700"
                  aria-label={isEs ? "Limpiar búsqueda" : "Clear search"}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {/* Customer Groups button on mobile */}
            <Link
              href={`/dashboard/customers/groups${activeStoreId ? `?storeId=${encodeURIComponent(activeStoreId)}` : ""}`}
              className="ml-auto inline-flex h-11 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-800 shadow-2xs transition hover:bg-slate-50 hover:border-slate-400"
              title={isEs ? "Grupos de clientes" : "Customer Groups"}
            >
              <Shield className="h-4 w-4 text-cyan-600" />
              <span className="hidden min-[420px]:inline">{isEs ? "Grupos de clientes" : "Customer Groups"}</span>
              <span className="min-[420px]:hidden">{isEs ? "Grupos" : "Groups"}</span>
            </Link>
          </div>

          {/* Revealed Store Selector */}
          {mobileActiveFilter === "store" && (
            <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  {isEs ? "Tienda" : "Store"}
                </span>
                <button
                  type="button"
                  onClick={() => setMobileActiveFilter(null)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  aria-label={isEs ? "Cerrar" : "Close"}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="relative">
                <Store className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <select
                  value={activeStoreId}
                  onChange={(event) => void handleStoreChange(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-8 text-sm outline-none transition focus:border-slate-400 appearance-none cursor-pointer"
                >
                  <option value="ALL">{isEs ? "Todas las tiendas" : "All Stores"}</option>
                  {stores.map((store) => (
                    <option key={store.id} value={store.id}>
                      {store.name} {store.currency ? `(${store.currency})` : ""}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>

              {groups.length > 0 && (
                <div className="pt-2 border-t border-slate-100">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    {isEs ? "Filtrar por grupo" : "Filter by group"}
                  </span>
                  <select
                    value={selectedGroupFilter}
                    onChange={(e) => {
                      setSelectedGroupFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-slate-400"
                  >
                    <option value="">{isEs ? "Todos los grupos" : "All groups"}</option>
                    <option value="__none__">{isEs ? "Sin grupo" : "Without group"}</option>
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* Revealed Search Input */}
          {mobileActiveFilter === "search" && (
            <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  {isEs ? "Buscar" : "Search"}
                </span>
                <button
                  type="button"
                  onClick={() => setMobileActiveFilter(null)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  aria-label={isEs ? "Cerrar" : "Close"}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  autoFocus
                  value={searchQuery}
                  onChange={(event) => {
                    setSearchQuery(event.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder={isEs ? "Nombre, correo, teléfono o grupo" : "Name, email, phone, or group"}
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-9 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setCurrentPage(1);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:text-slate-600"
                    aria-label={isEs ? "Limpiar" : "Clear"}
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Revealed Actions Controls */}
          {mobileActiveFilter === "actions" && (
            <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  {isEs ? "Acciones por lote" : "Bulk Actions"}
                  {validSelectedCustomerIds.length > 0 && ` (${validSelectedCustomerIds.length})`}
                </span>
                <button
                  type="button"
                  onClick={() => setMobileActiveFilter(null)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  aria-label={isEs ? "Cerrar" : "Close"}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={bulkAction}
                  onChange={(event) => setBulkAction(event.target.value as "" | "clear" | "delete")}
                  className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-slate-400"
                >
                  <option value="">{isEs ? "Seleccionar acción" : "Select action"}</option>
                  <option value="delete">{isEs ? "Eliminar seleccionados" : "Delete selected"}</option>
                  <option value="clear">{isEs ? "Limpiar selección" : "Clear selection"}</option>
                </select>
                <button
                  type="button"
                  onClick={() => void handleApplyBulkAction()}
                  disabled={
                    isApplyingBulkAction ||
                    !bulkAction ||
                    (bulkAction === "delete" && validSelectedCustomerIds.length === 0)
                  }
                  className="shrink-0 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isEs ? "Aplicar" : "Apply"}
                </button>
              </div>
            </div>
          )}
        </div>

        {error ? (
          <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <div className="mt-8 overflow-hidden rounded-[8px] border border-slate-200 bg-white shadow-sm">
          {totalCustomers === 0 ? (
            <div className="p-10 text-center text-slate-500">
              {searchQuery.trim()
                ? (isEs ? "Ningún cliente coincide con tu búsqueda." : "No customers match your search.")
                : (isEs ? "Aún no hay clientes para esta tienda." : "No customers yet for this store.")}
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs font-medium text-slate-600">
                  {isEs
                    ? `Mostrando ${pageStart}-${pageEnd} de ${totalCustomers} clientes`
                    : `Showing ${pageStart}-${pageEnd} of ${totalCustomers} customers`}
                </p>
                <div className="flex items-center gap-4">
                  <p className="whitespace-nowrap text-xs font-medium text-slate-600">
                    {isEs
                      ? `${validSelectedCustomerIds.length} seleccionado${validSelectedCustomerIds.length === 1 ? "" : "s"}`
                      : `${validSelectedCustomerIds.length} selected`}
                  </p>
                  <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
                    {isEs ? "Filas por página" : "Rows per page"}
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

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="w-12 px-4 py-3 text-left font-semibold text-slate-600">
                      <input
                        ref={selectAllRef}
                        type="checkbox"
                        checked={allOnPageSelected}
                        onChange={(event) => toggleSelectAllOnPage(event.target.checked)}
                        aria-label={isEs ? "Seleccionar todos los clientes de esta página" : "Select all customers on this page"}
                        className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                      />
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">
                      <button
                        type="button"
                        onClick={() => handleSort("name")}
                        className="flex items-center gap-1 transition hover:text-slate-950"
                      >
                        {isEs ? "Nombre" : "Name"}
                        <SortIndicator active={sortField === "name"} direction={sortDirection} />
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">
                      <button
                        type="button"
                        onClick={() => handleSort("email")}
                        className="flex items-center gap-1 transition hover:text-slate-950"
                      >
                        {isEs ? "Correo" : "Email"}
                        <SortIndicator active={sortField === "email"} direction={sortDirection} />
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">
                      <button
                        type="button"
                        onClick={() => handleSort("phone")}
                        className="flex items-center gap-1 transition hover:text-slate-950"
                      >
                        {isEs ? "Teléfono" : "Phone"}
                        <SortIndicator active={sortField === "phone"} direction={sortDirection} />
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">
                      <button
                        type="button"
                        onClick={() => handleSort("group")}
                        className="flex items-center gap-1 transition hover:text-slate-950"
                      >
                        {isEs ? "Grupo" : "Group"}
                        <SortIndicator active={sortField === "group"} direction={sortDirection} />
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">
                      {isEs ? "Crédito / Saldo (CxC)" : "Credit / Balance"}
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">
                      <button
                        type="button"
                        onClick={() => handleSort("createdAt")}
                        className="flex items-center gap-1 transition hover:text-slate-950"
                      >
                        {isEs ? "Fecha" : "Created"}
                        <SortIndicator active={sortField === "createdAt"} direction={sortDirection} />
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {paginatedCustomers.map((customer) => {
                    const fullName = `${customer.firstName ?? ""} ${customer.lastName ?? ""}`.trim();

                    return (
                      <tr
                        key={customer.id}
                        onClick={() => router.push(`/dashboard/customers/${customer.id}`)}
                        className={`cursor-pointer transition-colors ${validSelectedCustomerIds.includes(customer.id) ? "bg-cyan-50/60" : "hover:bg-cyan-50/40"}`}
                      >
                        <td className="px-4 py-3 align-top">
                          <input
                            type="checkbox"
                            checked={validSelectedCustomerIds.includes(customer.id)}
                            onChange={() => toggleCustomerSelection(customer.id)}
                            onClick={(event) => event.stopPropagation()}
                            aria-label={`Select ${fullName || customer.email}`}
                            className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                          />
                        </td>
                        <td className="px-4 py-3 align-top text-xs text-slate-700">
                          <div>{fullName || "-"}</div>
                          {activeStoreId === "ALL" && stores.length > 1 && (
                            <div className="text-[11px] text-slate-400 font-normal">
                              {stores.find((s) => s.id === customer.storeId)?.name}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 align-top text-xs text-slate-700">{customer.email}</td>
                        <td className="px-4 py-3 align-top text-xs text-slate-700">{customer.phone || "-"}</td>
                        <td className="px-4 py-3 align-top text-xs text-slate-700">
                          {customer.group?.name || "—"}
                        </td>
                        <td className="px-4 py-3 align-top text-xs">
                          {customer.allowCredit ? (
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1.5 font-bold">
                                <span className={Number(customer.currentBalance || 0) > 0 ? "text-amber-700" : "text-emerald-700"}>
                                  ${Number(customer.currentBalance || 0).toFixed(2)}
                                </span>
                                <span className="text-[10px] text-slate-400 font-normal">
                                  / ${Number(customer.creditLimit || 0).toFixed(2)}
                                </span>
                              </div>
                              <div className="text-[10px]">
                                {Number(customer.currentBalance || 0) > 0 ? (
                                  <span className="inline-flex items-center gap-0.5 text-amber-700 font-medium">
                                    • {isEs ? "Saldo pendiente" : "Pending debt"}
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-0.5 text-emerald-700 font-medium">
                                    • {isEs ? "Al día" : "Zero balance"}
                                  </span>
                                )}
                              </div>
                            </div>
                          ) : (
                            <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                              {isEs ? "Contado" : "Cash Only"}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 align-top text-xs text-slate-700">
                          {new Date(customer.createdAt).toLocaleDateString(isEs ? "es-ES" : "en-US")}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between border-t border-slate-200 bg-white px-4 py-3">
                <button
                  type="button"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={safeCurrentPage <= 1}
                  className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isEs ? "Anterior" : "Previous"}
                </button>
                <p className="text-xs font-medium text-slate-600">
                  {isEs
                    ? `Página ${safeCurrentPage} de ${totalPages}`
                    : `Page ${safeCurrentPage} of ${totalPages}`}
                </p>
                <button
                  type="button"
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={safeCurrentPage >= totalPages}
                  className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isEs ? "Siguiente" : "Next"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
