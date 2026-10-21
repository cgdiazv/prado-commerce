"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Search, FileText } from "lucide-react";
import { useLanguage } from "@/lib/i18n/language-context";
import { getStoredActiveStoreId, setStoredActiveStoreId, subscribeToActiveStoreChange } from "@/lib/dashboard-store-selection";

type Store = {
  id: string;
  name: string;
  currency: string;
};

type Vendor = {
  id: string;
  name: string;
  storeId: string;
};

type POItemSummary = {
  id: string;
  qtyOrdered: number;
  qtyReceived: number;
  unitCost: string;
  totalCost: string;
};

type PurchaseOrder = {
  id: string;
  storeId: string;
  vendorId: string;
  poNumber: string;
  status: "DRAFT" | "SENT" | "PARTIAL" | "RECEIVED" | "CANCELLED";
  issueDate: string;
  expectedDate: string | null;
  total: string;
  createdAt: string;
  store: { id: string; name: string; currency: string };
  vendor: { id: string; name: string; contactEmail: string | null };
  items: POItemSummary[];
  _count: { receipts: number };
};

type POListClientProps = {
  initialStores: Store[];
  initialVendors: Vendor[];
  initialPurchaseOrders: PurchaseOrder[];
  initialSelectedStoreId?: string;
};

type POSortField =
  | "poNumber"
  | "vendor"
  | "createdAt"
  | "expectedDate"
  | "total"
  | "status";

const statusColors: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-700 border-slate-200",
  SENT: "bg-blue-50 text-blue-700 border-blue-200",
  PARTIAL: "bg-amber-50 text-amber-700 border-amber-200",
  RECEIVED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  CANCELLED: "bg-red-50 text-red-700 border-red-200",
};

function SortIndicator({ active, direction }: { active: boolean; direction: "asc" | "desc" }) {
  return (
    <span className="ml-1 inline-flex flex-col leading-none text-[9px]">
      <span className={active && direction === "asc" ? "text-slate-950 font-bold" : "text-slate-400"}>▲</span>
      <span className={active && direction === "desc" ? "text-slate-950 font-bold" : "text-slate-400"}>▼</span>
    </span>
  );
}

export default function POListClient({
  initialStores,
  initialVendors,
  initialPurchaseOrders,
  initialSelectedStoreId,
}: POListClientProps) {
  const { language } = useLanguage();
  const isEs = language === "es";

  const [purchaseOrders] = useState<PurchaseOrder[]>(initialPurchaseOrders);
  const [selectedStoreId, setSelectedStoreId] = useState<string>(() => {
    if (initialSelectedStoreId) return initialSelectedStoreId;
    const stored = getStoredActiveStoreId();
    if (stored) return stored;
    return "ALL";
  });
  const [selectedVendorId, setSelectedVendorId] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Sort state
  const [sortField, setSortField] = useState<POSortField>("createdAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // Pagination state
  const [pageSize, setPageSize] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);

  const handleSort = (field: POSortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection(
        field === "createdAt" || field === "total" ? "desc" : "asc"
      );
    }
    setCurrentPage(1);
  };

  const filteredPOs = useMemo(() => {
    return purchaseOrders.filter((po) => {
      const matchesStore = selectedStoreId === "ALL" || po.storeId === selectedStoreId;
      const matchesVendor = selectedVendorId === "ALL" || po.vendorId === selectedVendorId;
      const matchesStatus = selectedStatus === "ALL" || po.status === selectedStatus;
      const matchesSearch =
        !searchQuery.trim() ||
        po.poNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        po.vendor.name.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesStore && matchesVendor && matchesStatus && matchesSearch;
    });
  }, [purchaseOrders, selectedStoreId, selectedVendorId, selectedStatus, searchQuery]);


  useEffect(() => {
    return subscribeToActiveStoreChange((newStoreId) => {
      if (newStoreId && newStoreId !== selectedStoreId) {
        setSelectedStoreId(newStoreId);
        setCurrentPage(1);
      }
    });
  }, [selectedStoreId]);

  const sortedPOs = useMemo(() => {
    const list = [...filteredPOs];

    list.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case "poNumber":
          comparison = a.poNumber.localeCompare(b.poNumber, undefined, { numeric: true });
          break;
        case "vendor":
          comparison = a.vendor.name.localeCompare(b.vendor.name);
          break;
        case "createdAt":
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case "expectedDate": {
          const aTime = a.expectedDate ? new Date(a.expectedDate).getTime() : 0;
          const bTime = b.expectedDate ? new Date(b.expectedDate).getTime() : 0;
          comparison = aTime - bTime;
          break;
        }
        case "total":
          comparison = Number(a.total || 0) - Number(b.total || 0);
          break;
        case "status":
          comparison = a.status.localeCompare(b.status);
          break;
        default: {
          const aTime = new Date(a.createdAt).getTime();
          const bTime = new Date(b.createdAt).getTime();
          comparison = aTime - bTime;
          break;
        }
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });

    return list;
  }, [filteredPOs, sortField, sortDirection]);

  const totalPOs = sortedPOs.length;
  const totalPages = Math.max(1, Math.ceil(totalPOs / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStart = totalPOs === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const pageEnd = Math.min(safeCurrentPage * pageSize, totalPOs);

  const paginatedPOs = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return sortedPOs.slice(start, start + pageSize);
  }, [sortedPOs, safeCurrentPage, pageSize]);

  return (
    <section className="min-w-0 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950">
            {isEs ? "Órdenes de compra" : "Purchase Orders"}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {isEs
              ? "Crea, emite y recibe envíos de inventario de tus proveedores."
              : "Create, issue, and receive inventory stock shipments from your suppliers."}
          </p>
        </div>
        <Link
          href="/dashboard/procurement/purchase-orders/new"
          className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          <Plus className="h-4 w-4" />
          {isEs ? "Nueva OC" : "New Purchase Order"}
        </Link>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder={isEs ? "Buscar por N.º de OC o proveedor..." : "Search by PO # or vendor..."}
            className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {initialStores.length > 1 && (
            <select
              value={selectedStoreId}
              onChange={(e) => {
                const newId = e.target.value;
                setSelectedStoreId(newId);
                setStoredActiveStoreId(newId);
                setCurrentPage(1);
              }}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium outline-none transition focus:border-slate-400"
            >
              <option value="ALL">{isEs ? "Todas las tiendas" : "All Stores"}</option>
              {initialStores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          )}

          <select
            value={selectedVendorId}
            onChange={(e) => {
              setSelectedVendorId(e.target.value);
              setCurrentPage(1);
            }}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium outline-none transition focus:border-slate-400"
          >
            <option value="ALL">{isEs ? "Todos los proveedores" : "All Vendors"}</option>
            {initialVendors.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setCurrentPage(1);
            }}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium outline-none transition focus:border-slate-400"
          >
            <option value="ALL">{isEs ? "Todos los estados" : "All Statuses"}</option>
            <option value="DRAFT">{isEs ? "BORRADOR" : "DRAFT"}</option>
            <option value="SENT">{isEs ? "ENVIADA" : "SENT"}</option>
            <option value="PARTIAL">{isEs ? "PARCIAL" : "PARTIAL"}</option>
            <option value="RECEIVED">{isEs ? "RECIBIDA" : "RECEIVED"}</option>
            <option value="CANCELLED">{isEs ? "CANCELADA" : "CANCELLED"}</option>
          </select>
        </div>
      </div>

      {/* PO Table Card */}
      {filteredPOs.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
          <FileText className="mx-auto h-10 w-10 text-slate-400" />
          <h3 className="mt-3 text-sm font-semibold text-slate-900">
            {isEs ? "No se encontraron órdenes de compra" : "No purchase orders found"}
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            {searchQuery || selectedStatus !== "ALL"
              ? isEs
                ? "Ninguna orden de compra coincide con los filtros."
                : "No purchase order matches your filter criteria."
              : isEs
                ? "Genera una orden de compra para solicitar existencias a tu proveedor."
                : "Generate a purchase order to request stock from your vendor."}
          </p>
          {!searchQuery && selectedStatus === "ALL" && (
            <Link
              href="/dashboard/procurement/purchase-orders/new"
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-xs font-semibold text-white"
            >
              <Plus className="h-3.5 w-3.5" />
              {isEs ? "Nueva OC" : "New Purchase Order"}
            </Link>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-[8px] border border-slate-200 bg-white shadow-sm">
          {/* Top Pagination / Rows Per Page Bar */}
          <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50/70 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs font-medium text-slate-600">
              {isEs
                ? `Mostrando ${pageStart}-${pageEnd} de ${totalPOs} órdenes`
                : `Showing ${pageStart}-${pageEnd} of ${totalPOs} purchase orders`}
            </p>
            <div className="flex items-center gap-4">
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
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-100 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  {/* 1. PO No. */}
                  <th className="px-5 py-3.5">
                    <button
                      type="button"
                      onClick={() => handleSort("poNumber")}
                      className="flex items-center gap-1 transition hover:text-slate-950 font-semibold uppercase tracking-wider"
                    >
                      {isEs ? "N.º de orden" : "PO No."}
                      <SortIndicator active={sortField === "poNumber"} direction={sortDirection} />
                    </button>
                  </th>

                  {/* 2. Vendor */}
                  <th className="px-5 py-3.5">
                    <button
                      type="button"
                      onClick={() => handleSort("vendor")}
                      className="flex items-center gap-1 transition hover:text-slate-950 font-semibold uppercase tracking-wider"
                    >
                      {isEs ? "Proveedor" : "Vendor"}
                      <SortIndicator active={sortField === "vendor"} direction={sortDirection} />
                    </button>
                  </th>

                  {/* 3. Created date */}
                  <th className="px-5 py-3.5">
                    <button
                      type="button"
                      onClick={() => handleSort("createdAt")}
                      className="flex items-center gap-1 transition hover:text-slate-950 font-semibold uppercase tracking-wider"
                    >
                      {isEs ? "Fecha creación" : "Created Date"}
                      <SortIndicator active={sortField === "createdAt"} direction={sortDirection} />
                    </button>
                  </th>

                  {/* 4. Expected Date */}
                  <th className="px-5 py-3.5">
                    <button
                      type="button"
                      onClick={() => handleSort("expectedDate")}
                      className="flex items-center gap-1 transition hover:text-slate-950 font-semibold uppercase tracking-wider"
                    >
                      {isEs ? "Fecha estimada" : "Expected Date"}
                      <SortIndicator active={sortField === "expectedDate"} direction={sortDirection} />
                    </button>
                  </th>

                  {/* 5. Total */}
                  <th className="px-5 py-3.5 text-right">
                    <button
                      type="button"
                      onClick={() => handleSort("total")}
                      className="ml-auto flex items-center gap-1 transition hover:text-slate-950 font-semibold uppercase tracking-wider"
                    >
                      {isEs ? "Total" : "Total"}
                      <SortIndicator active={sortField === "total"} direction={sortDirection} />
                    </button>
                  </th>

                  {/* 6. Status */}
                  <th className="px-5 py-3.5">
                    <button
                      type="button"
                      onClick={() => handleSort("status")}
                      className="flex items-center gap-1 transition hover:text-slate-950 font-semibold uppercase tracking-wider"
                    >
                      {isEs ? "Estado" : "Status"}
                      <SortIndicator active={sortField === "status"} direction={sortDirection} />
                    </button>
                  </th>

                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedPOs.map((po) => {
                  const formatter = new Intl.NumberFormat(isEs ? "es-ES" : "en-US", {
                    style: "currency",
                    currency: po.store.currency,
                  });

                  const statusLabels: Record<string, string> = {
                    DRAFT: isEs ? "BORRADOR" : "DRAFT",
                    SENT: isEs ? "ENVIADA" : "SENT",
                    PARTIAL: isEs ? "PARCIAL" : "PARTIAL",
                    RECEIVED: isEs ? "RECIBIDA" : "RECEIVED",
                    CANCELLED: isEs ? "CANCELADA" : "CANCELLED",
                  };

                  return (
                    <tr key={po.id} className="transition hover:bg-slate-50/80">
                      {/* 1. PO No. */}
                      <td className="px-5 py-4 text-xs text-slate-700">
                        <Link href={`/dashboard/procurement/purchase-orders/${po.id}`} className="hover:text-slate-900 hover:underline">
                          {po.poNumber}
                        </Link>
                        <p className="text-slate-500">{po.store.name}</p>
                      </td>

                      {/* 2. Vendor */}
                      <td className="px-5 py-4 text-xs text-slate-700">
                        <div>{po.vendor.name}</div>
                        {po.vendor.contactEmail && (
                          <p className="text-slate-500">{po.vendor.contactEmail}</p>
                        )}
                      </td>

                      {/* 3. Created date */}
                      <td className="px-5 py-4 text-xs text-slate-700">
                        {new Date(po.createdAt).toLocaleDateString(isEs ? "es-ES" : "en-US")}
                      </td>

                      {/* 4. Expected Date */}
                      <td className="px-5 py-4 text-xs text-slate-700">
                        {po.expectedDate
                          ? new Date(po.expectedDate).toLocaleDateString(isEs ? "es-ES" : "en-US")
                          : isEs
                            ? "No especificada"
                            : "Not specified"}
                      </td>

                      {/* 5. Total */}
                      <td className="px-5 py-4 text-right text-xs text-slate-700">
                        {formatter.format(Number(po.total))}
                      </td>

                      {/* 6. Status */}
                      <td className="px-5 py-4 text-xs text-slate-700">
                        {statusLabels[po.status] ?? po.status}
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Bottom Pagination Footer */}
          <div className="flex items-center justify-between border-t border-slate-200 bg-white px-5 py-3">
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
        </div>
      )}
    </section>
  );
}
