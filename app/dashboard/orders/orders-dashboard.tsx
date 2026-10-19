"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, Plus, Search, Store, SlidersHorizontal, X } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";

type Store = {
  id: string;
  name: string;
  currency: string;
};

type Order = {
  id: string;
  storeId: string;
  orderNumber: number;
  customerEmail: string;
  customerName: string | null;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "CANCELLED";
  paymentStatus: "UNPAID" | "PAID" | "REFUNDED" | "FAILED";
  subtotal: string;
  tax: string;
  shipping: string;
  total: string;
  currency: string;
  createdAt: string | Date;
};

type OrdersDashboardProps = {
  initialStores: Store[];
  initialOrders: Order[];
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

export function OrdersDashboard({
  initialStores,
  initialOrders,
  selectedStoreId,
  setupError = null,
}: OrdersDashboardProps) {
  const router = useRouter();
  const { language } = useLanguage();
  const isEs = language === "es";
  const [stores] = useState(initialStores);
  const [orders, setOrders] = useState(initialOrders);
  const [activeStoreId, setActiveStoreId] = useState(selectedStoreId ?? "ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<keyof Order | "paymentStatus">("createdAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [pageSize, setPageSize] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState<
    ""
    | "clear"
    | "status_processing"
    | "status_completed"
    | "status_cancelled"
    | "status_cancelled_restock"
    | "payment_paid"
    | "payment_refunded"
    | "payment_refunded_restock"
  >("");
  const [isApplyingBulkAction, setIsApplyingBulkAction] = useState(false);
  const [mobileActiveFilter, setMobileActiveFilter] = useState<"store" | "search" | "actions" | null>(null);
  const selectAllRef = useRef<HTMLInputElement | null>(null);

  const visibleOrders = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const filtered = orders.filter((order) => {
      if (activeStoreId !== "ALL" && order.storeId !== activeStoreId) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      return [order.customerName ?? "", order.customerEmail, order.status, order.paymentStatus]
        .some((value) => value.toLowerCase().includes(normalizedQuery));
    });
    
    return [...filtered].sort((a, b) => {
      let valA: any;
      let valB: any;

      if (sortField === "total") {
        valA = parseFloat(a.total);
        valB = parseFloat(b.total);
      } else if (sortField === "customerName") {
        valA = (a.customerName || a.customerEmail).toLowerCase();
        valB = (b.customerName || b.customerEmail).toLowerCase();
      } else if (sortField === "createdAt") {
        valA = new Date(a.createdAt).getTime();
        valB = new Date(b.createdAt).getTime();
      } else {
        valA = a[sortField];
        valB = b[sortField];
      }

      if (valA < valB) return sortDirection === "asc" ? -1 : 1;
      if (valA > valB) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [orders, activeStoreId, searchQuery, sortField, sortDirection]);

  const totalOrders = visibleOrders.length;
  const totalPages = Math.max(1, Math.ceil(totalOrders / pageSize));
  const pageStart = totalOrders === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const pageEnd = Math.min(currentPage * pageSize, totalOrders);

  useEffect(() => {
    setCurrentPage((prev) => Math.min(prev, totalPages));
  }, [totalPages]);

  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return visibleOrders.slice(start, start + pageSize);
  }, [visibleOrders, currentPage, pageSize]);

  const paginatedOrderIds = useMemo(
    () => paginatedOrders.map((order) => order.id),
    [paginatedOrders],
  );

  const selectedOnPageCount = useMemo(
    () => paginatedOrderIds.filter((id) => selectedOrderIds.includes(id)).length,
    [paginatedOrderIds, selectedOrderIds],
  );

  const allOnPageSelected = paginatedOrderIds.length > 0 && selectedOnPageCount === paginatedOrderIds.length;
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

  async function refreshOrders(storeId: string) {
    const response = await fetch(`/api/orders?storeId=${encodeURIComponent(storeId)}`, {
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error("Failed to refresh orders");
    }

    const data = (await response.json()) as Order[];
    if (storeId === "ALL") {
      setOrders(data);
    } else {
      setOrders((current) => [
        ...current.filter((order) => order.storeId !== storeId),
        ...data,
      ]);
    }
  }

  async function handleStoreChange(storeId: string) {
    setActiveStoreId(storeId);
    setError(null);
    setCurrentPage(1);
    setSelectedOrderIds([]);
    setBulkAction("");

    try {
      await refreshOrders(storeId);
    } catch {
      setError("Failed to load orders for this store.");
    }
  }

  useEffect(() => {
    const activeOrderIdSet = new Set(visibleOrders.map((order) => order.id));
    setSelectedOrderIds((current) => current.filter((id) => activeOrderIdSet.has(id)));
  }, [visibleOrders]);

  useEffect(() => {
    if (!selectAllRef.current) {
      return;
    }

    selectAllRef.current.indeterminate = someOnPageSelected;
  }, [someOnPageSelected]);

  function toggleOrderSelection(orderId: string) {
    setSelectedOrderIds((current) => {
      if (current.includes(orderId)) {
        return current.filter((id) => id !== orderId);
      }

      return [...current, orderId];
    });
  }

  function toggleSelectAllOnPage(checked: boolean) {
    if (!checked) {
      setSelectedOrderIds((current) => current.filter((id) => !paginatedOrderIds.includes(id)));
      return;
    }

    setSelectedOrderIds((current) => Array.from(new Set([...current, ...paginatedOrderIds])));
  }

  async function handleApplyBulkAction() {
    if (!bulkAction) {
      return;
    }

    if (bulkAction === "clear") {
      setSelectedOrderIds([]);
      setBulkAction("");
      return;
    }

    if (selectedOrderIds.length === 0) {
      return;
    }

    let patchPayload: { status?: Order["status"]; paymentStatus?: Order["paymentStatus"]; restock?: boolean } = {};

    if (bulkAction === "status_processing") {
      patchPayload = { status: "PROCESSING" };
    } else if (bulkAction === "status_completed") {
      const confirmed = window.confirm(
        isEs
          ? "¿Marcar los pedidos seleccionados como completados? Esto puede generar correos con factura para esos pedidos."
          : "Mark selected orders as completed? This may trigger invoice emails for those orders.",
      );

      if (!confirmed) {
        return;
      }

      patchPayload = { status: "COMPLETED" };
    } else if (bulkAction === "status_cancelled") {
      patchPayload = { status: "CANCELLED" };
    } else if (bulkAction === "status_cancelled_restock") {
      const confirmed = window.confirm(
        isEs
          ? "¿Cancelar los pedidos seleccionados y reingresar los artículos al inventario?"
          : "Cancel selected orders and restock items to inventory?",
      );

      if (!confirmed) {
        return;
      }

      patchPayload = { status: "CANCELLED", restock: true };
    } else if (bulkAction === "payment_paid") {
      const confirmed = window.confirm(
        isEs
          ? "¿Marcar los pedidos seleccionados como pagados? Esto puede generar correos con factura para esos pedidos."
          : "Mark selected orders as paid? This may trigger invoice emails for those orders.",
      );

      if (!confirmed) {
        return;
      }

      patchPayload = { paymentStatus: "PAID" };
    } else if (bulkAction === "payment_refunded") {
      patchPayload = { paymentStatus: "REFUNDED" };
    } else if (bulkAction === "payment_refunded_restock") {
      const confirmed = window.confirm(
        isEs
          ? "¿Reembolsar los pedidos seleccionados y reingresar los artículos al inventario?"
          : "Refund selected orders and restock items to inventory?",
      );

      if (!confirmed) {
        return;
      }

      patchPayload = { paymentStatus: "REFUNDED", restock: true };
    }

    if (!patchPayload.status && !patchPayload.paymentStatus) {
      return;
    }

    setError(null);
    setIsApplyingBulkAction(true);

    try {
      const responses = await Promise.all(
        selectedOrderIds.map((orderId) =>
          fetch(`/api/orders/${orderId}`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(patchPayload),
          }),
        ),
      );

      if (responses.some((response) => !response.ok)) {
        throw new Error(isEs ? "No se pudieron actualizar los pedidos seleccionados" : "Failed to apply bulk order updates");
      }

      setOrders((current) =>
        current.map((order) =>
          selectedOrderIds.includes(order.id)
            ? {
                ...order,
                ...(patchPayload.status ? { status: patchPayload.status } : {}),
                ...(patchPayload.paymentStatus ? { paymentStatus: patchPayload.paymentStatus } : {}),
              }
            : order,
        ),
      );
      setSelectedOrderIds([]);
      setBulkAction("");
    } catch {
      setError(isEs ? "No se pudo aplicar la acción a los pedidos seleccionados." : "Failed to apply action to selected orders.");
    } finally {
      setIsApplyingBulkAction(false);
    }
  }

  const targetStoreId = activeStoreId !== "ALL" ? activeStoreId : stores[0]?.id;
  const createHref = targetStoreId
    ? `/dashboard/orders/new?storeId=${encodeURIComponent(targetStoreId)}`
    : "/dashboard/orders/new";

  const posHref = targetStoreId
    ? `/dashboard/orders/pos?storeId=${encodeURIComponent(targetStoreId)}`
    : "/dashboard/orders/pos";

  return (
    <section className="min-w-0">
      {setupError ? (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {setupError}
        </div>
      ) : null}

      <div className="min-w-0 space-y-4">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">
              {isEs ? "Administrador de Pedidos" : "Orders Manager"}
            </h1>
            <p className="mt-1 max-w-xl text-sm text-slate-500">
              {isEs
                ? "Administra y rastrea todos los pedidos de tus clientes aquí."
                : "Manage and track all your customer orders here."}
            </p>
          </div>

          <div className="flex w-full flex-wrap items-center gap-3 lg:w-auto">
            <Link
              href={posHref}
              className="hidden items-center justify-center gap-2 rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 hover:border-slate-400 shadow-sm lg:inline-flex"
            >
              <Store className="h-4 w-4 text-cyan-600" />
              {isEs ? "Punto de Venta (POS)" : "Point of Sale (POS)"}
            </Link>

            <Link
              href={createHref}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 sm:w-auto"
            >
              <Plus className="h-4 w-4" />
              {isEs ? "Nuevo pedido" : "New order"}
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
                placeholder={isEs ? "Cliente, estado o pago" : "Customer, status, or payment"}
                className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
              />
            </div>
          </label>

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
                  (bulkAction !== "clear" && selectedOrderIds.length === 0)
                }
                className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isEs ? "Aplicar" : "Apply"}
              </button>
              <select
                value={bulkAction}
                onChange={(event) => setBulkAction(event.target.value as typeof bulkAction)}
                className="w-52 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
              >
                <option value="">{isEs ? "Seleccionar acción" : "Select action"}</option>
                <option value="status_processing">{isEs ? "Marcar en proceso" : "Mark as processing"}</option>
                <option value="status_completed">{isEs ? "Marcar como completado" : "Mark as completed"}</option>
                <option value="status_cancelled">{isEs ? "Marcar como cancelado" : "Mark as cancelled"}</option>
                <option value="status_cancelled_restock">{isEs ? "Cancelar y devolver al inventario" : "Cancel & restock inventory"}</option>
                <option value="payment_paid">{isEs ? "Marcar como pagado" : "Mark as paid"}</option>
                <option value="payment_refunded">{isEs ? "Marcar como reembolsado" : "Mark as refunded"}</option>
                <option value="payment_refunded_restock">{isEs ? "Reembolsar y devolver al inventario" : "Refund & restock inventory"}</option>
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
              aria-label={isEs ? "Buscar pedidos" : "Search orders"}
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
              {selectedOrderIds.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-cyan-600 px-1 text-[11px] font-bold text-white shadow-xs">
                  {selectedOrderIds.length}
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

            {/* Point of Sale (POS) button on mobile */}
            <Link
              href={posHref}
              className="ml-auto inline-flex h-11 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-800 shadow-2xs transition hover:bg-slate-50 hover:border-slate-400"
              title={isEs ? "Punto de Venta (POS)" : "Point of Sale (POS)"}
            >
              <Store className="h-4 w-4 text-cyan-600" />
              <span className="hidden min-[420px]:inline">{isEs ? "Punto de Venta (POS)" : "Point of Sale (POS)"}</span>
              <span className="min-[420px]:hidden">POS</span>
            </Link>
          </div>

          {/* Revealed Store Selector */}
          {mobileActiveFilter === "store" && (
            <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
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
                  placeholder={isEs ? "Cliente, estado o pago" : "Customer, status, or payment"}
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
                  {selectedOrderIds.length > 0 && ` (${selectedOrderIds.length})`}
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
                  onChange={(event) => setBulkAction(event.target.value as typeof bulkAction)}
                  className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-slate-400"
                >
                  <option value="">{isEs ? "Seleccionar acción" : "Select action"}</option>
                  <option value="status_processing">{isEs ? "Marcar en proceso" : "Mark as processing"}</option>
                  <option value="status_completed">{isEs ? "Marcar como completado" : "Mark as completed"}</option>
                  <option value="status_cancelled">{isEs ? "Marcar como cancelado" : "Mark as cancelled"}</option>
                  <option value="status_cancelled_restock">{isEs ? "Cancelar y devolver al inventario" : "Cancel & restock inventory"}</option>
                  <option value="payment_paid">{isEs ? "Marcar como pagado" : "Mark as paid"}</option>
                  <option value="payment_refunded">{isEs ? "Marcar como reembolsado" : "Mark as refunded"}</option>
                  <option value="payment_refunded_restock">{isEs ? "Reembolsar y devolver al inventario" : "Refund & restock inventory"}</option>
                  <option value="clear">{isEs ? "Limpiar selección" : "Clear selection"}</option>
                </select>
                <button
                  type="button"
                  onClick={() => void handleApplyBulkAction()}
                  disabled={
                    isApplyingBulkAction ||
                    !bulkAction ||
                    (bulkAction !== "clear" && selectedOrderIds.length === 0)
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

        <div className="mt-8 min-w-0 overflow-hidden rounded-[8px] border border-slate-200 bg-white shadow-sm">
          {totalOrders === 0 ? (
            <div className="p-10 text-center text-slate-500">
              {searchQuery.trim()
                ? (isEs ? "Ningún pedido coincide con tu búsqueda." : "No orders match your search.")
                : (isEs ? "Aún no hay pedidos para esta tienda." : "No orders yet for this store.")}
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs font-medium text-slate-600">
                  {isEs
                    ? `Mostrando ${pageStart}-${pageEnd} de ${totalOrders} pedidos`
                    : `Showing ${pageStart}-${pageEnd} of ${totalOrders} orders`}
                </p>
                <div className="flex items-center gap-4">
                  <p className="whitespace-nowrap text-xs font-medium text-slate-600">
                    {isEs
                      ? `${selectedOrderIds.length} seleccionado${selectedOrderIds.length === 1 ? "" : "s"}`
                      : `${selectedOrderIds.length} selected`}
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

              <div className="w-full max-w-full overflow-x-auto overscroll-x-contain">
                <table className="min-w-[760px] divide-y divide-slate-200 text-sm md:min-w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="w-12 whitespace-nowrap px-4 py-3 text-left font-semibold text-slate-600">
                      <input
                        ref={selectAllRef}
                        type="checkbox"
                        checked={allOnPageSelected}
                        onChange={(event) => toggleSelectAllOnPage(event.target.checked)}
                        aria-label={isEs ? "Seleccionar todos los pedidos de esta página" : "Select all orders on this page"}
                        className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                      />
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 text-left font-semibold text-slate-600">
                      <button
                        type="button"
                        onClick={() => handleSort("orderNumber")}
                        className="flex items-center gap-1 transition hover:text-slate-950"
                      >
                        {isEs ? "Pedido" : "Order"}
                        <SortIndicator active={sortField === "orderNumber"} direction={sortDirection} />
                      </button>
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 text-left font-semibold text-slate-600">
                      <button
                        type="button"
                        onClick={() => handleSort("customerEmail")}
                        className="flex items-center gap-1 transition hover:text-slate-950"
                      >
                        {isEs ? "Cliente" : "Customer"}
                        <SortIndicator active={sortField === "customerEmail"} direction={sortDirection} />
                      </button>
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 text-left font-semibold text-slate-600">
                      <button
                        type="button"
                        onClick={() => handleSort("status")}
                        className="flex items-center gap-1 transition hover:text-slate-950"
                      >
                        {isEs ? "Estado" : "Status"}
                        <SortIndicator active={sortField === "status"} direction={sortDirection} />
                      </button>
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 text-left font-semibold text-slate-600">
                      <button
                        type="button"
                        onClick={() => handleSort("paymentStatus")}
                        className="flex items-center gap-1 transition hover:text-slate-950"
                      >
                        {isEs ? "Pago" : "Payment"}
                        <SortIndicator active={sortField === "paymentStatus"} direction={sortDirection} />
                      </button>
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 text-left font-semibold text-slate-600">
                      <button
                        type="button"
                        onClick={() => handleSort("total")}
                        className="flex items-center gap-1 transition hover:text-slate-950"
                      >
                        Total
                        <SortIndicator active={sortField === "total"} direction={sortDirection} />
                      </button>
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 text-left font-semibold text-slate-600">
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
                  {paginatedOrders.map((order) => {
                    const formatter = new Intl.NumberFormat(isEs ? "es-ES" : "en-US", {
                      style: "currency",
                      currency: order.currency || "USD",
                    });
                    
                    const statusLabels: Record<string, string> = {
                      PENDING: isEs ? "Pendiente" : "Pending",
                      PROCESSING: isEs ? "En proceso" : "Processing",
                      COMPLETED: isEs ? "Completado" : "Completed",
                      CANCELLED: isEs ? "Cancelado" : "Cancelled",
                    };

                    const paymentLabels: Record<string, string> = {
                      UNPAID: isEs ? "No pagado" : "Unpaid",
                      PAID: isEs ? "Pagado" : "Paid",
                      REFUNDED: isEs ? "Reembolsado" : "Refunded",
                      FAILED: isEs ? "Fallido" : "Failed",
                    };

                    return (
                    <tr
                      key={order.id}
                      onClick={() => router.push(`/dashboard/orders/${order.id}`)}
                      className={`cursor-pointer transition-colors ${selectedOrderIds.includes(order.id) ? "bg-cyan-50/60" : "hover:bg-cyan-50/40"}`}
                    >
                      <td className="whitespace-nowrap px-4 py-3 align-top">
                        <input
                          type="checkbox"
                          checked={selectedOrderIds.includes(order.id)}
                          onChange={() => toggleOrderSelection(order.id)}
                          onClick={(event) => event.stopPropagation()}
                          aria-label={`Select order #${order.orderNumber}`}
                          className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                        />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 align-top text-xs text-slate-700">
                        <div className="font-semibold text-slate-900">#{order.orderNumber}</div>
                        {activeStoreId === "ALL" && stores.length > 1 && (
                          <div className="text-[11px] text-slate-400 font-normal">
                            {stores.find((s) => s.id === order.storeId)?.name}
                          </div>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 align-top text-xs text-slate-700">{order.customerEmail}</td>
                      <td className="whitespace-nowrap px-4 py-3 align-top text-xs text-slate-700">
                        {statusLabels[order.status] ?? order.status}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 align-top text-xs text-slate-700">
                        {paymentLabels[order.paymentStatus] ?? order.paymentStatus}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 align-top text-xs text-slate-700">{formatter.format(Number(order.total))}</td>
                      <td className="whitespace-nowrap px-4 py-3 align-top text-xs text-slate-700">
                        {new Date(order.createdAt).toLocaleDateString(isEs ? "es-ES" : "en-US")}
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
                  disabled={currentPage <= 1}
                  className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isEs ? "Anterior" : "Previous"}
                </button>
                <p className="text-xs font-medium text-slate-600">
                  {isEs
                    ? `Página ${currentPage} de ${totalPages}`
                    : `Page ${currentPage} of ${totalPages}`}
                </p>
                <button
                  type="button"
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage >= totalPages}
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
