"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Calendar,
  Download,
  PackageCheck,
  Search,
  Store as StoreIcon,
  Truck,
  X,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";

export type ReceiptRecord = {
  id: string;
  storeId: string;
  poId: string;
  receivedAt: string;
  receivedBy: string | null;
  notes: string | null;
  store: {
    id: string;
    name: string;
    currency: string;
  };
  purchaseOrder: {
    id: string;
    poNumber: string;
    status: string;
    vendor: {
      id: string;
      name: string;
    };
  };
  items: Array<{
    id: string;
    qtyReceived: number;
    poItem: {
      id: string;
      title: string;
      sku: string | null;
      unitCost: any;
      variantId: string | null;
      product?: {
        id: string;
        title: string;
        images: string[];
        manufacturer: string | null;
      } | null;
      variant?: {
        id: string;
        title: string;
        price: any;
        inventory: number;
      } | null;
    };
  }>;
};

type ReceiptsClientProps = {
  initialReceipts: ReceiptRecord[];
  stores: Array<{ id: string; name: string; currency: string }>;
};

export default function ReceiptsClient({ initialReceipts, stores }: ReceiptsClientProps) {
  const { language } = useLanguage();
  const isEs = language === "es";

  const [receipts] = useState<ReceiptRecord[]>(initialReceipts);
  const [selectedStoreId, setSelectedStoreId] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const filteredReceipts = useMemo(() => {
    return receipts.filter((receipt) => {
      if (selectedStoreId !== "ALL" && receipt.storeId !== selectedStoreId) {
        return false;
      }

      const receiptDate = new Date(receipt.receivedAt);
      if (fromDate) {
        const from = new Date(fromDate);
        if (receiptDate < from) return false;
      }
      if (toDate) {
        const to = new Date(toDate);
        to.setHours(23, 59, 59, 999);
        if (receiptDate > to) return false;
      }

      if (!searchQuery.trim()) return true;

      const q = searchQuery.trim().toLowerCase();
      const matchPO = receipt.purchaseOrder.poNumber.toLowerCase().includes(q);
      const matchVendor = receipt.purchaseOrder.vendor.name.toLowerCase().includes(q);
      const matchReceiver = receipt.receivedBy?.toLowerCase().includes(q) ?? false;
      const matchNotes = receipt.notes?.toLowerCase().includes(q) ?? false;
      const matchItems = receipt.items.some(
        (item) =>
          item.poItem.title.toLowerCase().includes(q) ||
          (item.poItem.sku?.toLowerCase().includes(q) ?? false) ||
          (item.poItem.product?.manufacturer?.toLowerCase().includes(q) ?? false),
      );

      return matchPO || matchVendor || matchReceiver || matchNotes || matchItems;
    });
  }, [receipts, selectedStoreId, searchQuery, fromDate, toDate]);

  function exportToCsv() {
    const headers = [
      "Fecha Ingreso",
      "PO Number",
      "Proveedor",
      "Tienda",
      "Producto",
      "SKU",
      "Variante",
      "Marca/Fabricante",
      "Cant. Recibida",
      "Recibido Por",
      "Notas",
    ];

    const rows: string[][] = [];

    for (const receipt of filteredReceipts) {
      const dateStr = new Date(receipt.receivedAt).toLocaleString("es-ES");
      const poNum = receipt.purchaseOrder.poNumber;
      const vendorName = receipt.purchaseOrder.vendor.name;
      const storeName = receipt.store.name;
      const receiver = receipt.receivedBy || "";
      const notes = (receipt.notes || "").replace(/\n/g, " ");

      for (const item of receipt.items) {
        rows.push([
          `"${dateStr}"`,
          `"${poNum}"`,
          `"${vendorName}"`,
          `"${storeName}"`,
          `"${item.poItem.title.replace(/"/g, '""')}"`,
          `"${item.poItem.sku || ""}"`,
          `"${item.poItem.variant?.title || ""}"`,
          `"${item.poItem.product?.manufacturer || ""}"`,
          String(item.qtyReceived),
          `"${receiver}"`,
          `"${notes}"`,
        ]);
      }
    }

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `historial-ingresos-po-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <section className="min-w-0 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
              {isEs ? "Compras" : "Procurement"}
            </span>
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            {isEs ? "Historial de Ingresos de Mercancía" : "Goods Receiving History"}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {isEs
              ? "Registro cronológico de productos recibidos desde órdenes de compra y sumados al inventario."
              : "Chronological log of products received from purchase orders and added to stock."}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={exportToCsv}
            disabled={filteredReceipts.length === 0}
            className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-xs transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download className="h-4 w-4 text-slate-500" />
            {isEs ? "Exportar CSV" : "Export CSV"}
          </button>

          <Link
            href="/dashboard/procurement/purchase-orders"
            className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-xs transition hover:bg-slate-800"
          >
            <Truck className="h-4 w-4" />
            {isEs ? "Ver Órdenes de Compra" : "View Purchase Orders"}
          </Link>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                isEs
                  ? "Buscar por PO#, producto, SKU, proveedor o receptor..."
                  : "Search by PO#, product, SKU, vendor or receiver..."
              }
              className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-9 py-2 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
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

          <div className="flex flex-wrap items-center gap-3">
            {/* Store filter */}
            {stores.length > 1 && (
              <div className="flex items-center gap-2">
                <StoreIcon className="h-4 w-4 text-slate-400" />
                <select
                  value={selectedStoreId}
                  onChange={(e) => setSelectedStoreId(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-400"
                >
                  <option value="ALL">{isEs ? "Todas las tiendas" : "All Stores"}</option>
                  {stores.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Date filter */}
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-slate-400" />
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs outline-none transition focus:border-slate-400"
                title={isEs ? "Desde fecha" : "From date"}
              />
              <span className="text-xs text-slate-400">-</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs outline-none transition focus:border-slate-400"
                title={isEs ? "Hasta fecha" : "To date"}
              />
              {(fromDate || toDate) && (
                <button
                  type="button"
                  onClick={() => {
                    setFromDate("");
                    setToDate("");
                  }}
                  className="text-xs text-slate-400 hover:text-slate-600 underline"
                >
                  {isEs ? "Limpiar" : "Clear"}
                </button>
              )}
            </div>
          </div>
        </div>

      {/* Receipts List Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        {filteredReceipts.length === 0 ? (
          <div className="p-12 text-center">
            <PackageCheck className="mx-auto h-12 w-12 text-slate-300" />
            <h3 className="mt-3 text-base font-semibold text-slate-900">
              {isEs ? "No se encontraron ingresos de mercancía" : "No receiving records found"}
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              {searchQuery || fromDate || toDate || selectedStoreId !== "ALL"
                ? isEs
                  ? "Prueba a cambiar los filtros o el término de búsqueda."
                  : "Try adjusting your filters or search terms."
                : isEs
                  ? "Cuando recibas mercancía desde una orden de compra, el historial se guardará aquí."
                  : "When you receive goods on a purchase order, records will appear here."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3.5">{isEs ? "Fecha y Hora" : "Date & Time"}</th>
                  <th className="px-5 py-3.5">{isEs ? "Orden de Compra" : "Purchase Order"}</th>
                  <th className="px-5 py-3.5">{isEs ? "Proveedor" : "Vendor"}</th>
                  <th className="px-5 py-3.5">{isEs ? "Tienda / Destino" : "Store"}</th>
                  <th className="px-5 py-3.5">{isEs ? "Productos Recibidos" : "Items Received"}</th>
                  <th className="px-5 py-3.5">{isEs ? "Recibido Por" : "Received By"}</th>
                  <th className="px-5 py-3.5">{isEs ? "Notas" : "Notes"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredReceipts.map((receipt) => {
                  const date = new Date(receipt.receivedAt);
                  const formattedDate = date.toLocaleDateString(isEs ? "es-ES" : "en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  });
                  const formattedTime = date.toLocaleTimeString(isEs ? "es-ES" : "en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                  });

                  return (
                    <tr key={receipt.id} className="hover:bg-slate-50/60 transition">
                      {/* Date */}
                      <td className="px-5 py-4 whitespace-nowrap text-xs text-slate-700">
                        <div>{formattedDate}</div>
                        <div className="text-slate-500">{formattedTime}</div>
                      </td>

                      {/* PO Number */}
                      <td className="px-5 py-4 whitespace-nowrap text-xs text-slate-700">
                        <Link
                          href={`/dashboard/procurement/purchase-orders/${receipt.poId}`}
                          className="hover:text-slate-900 hover:underline"
                        >
                          {receipt.purchaseOrder.poNumber}
                        </Link>
                      </td>

                      {/* Vendor */}
                      <td className="px-5 py-4 whitespace-nowrap text-xs text-slate-700">
                        {receipt.purchaseOrder.vendor.name}
                      </td>

                      {/* Store */}
                      <td className="px-5 py-4 whitespace-nowrap text-xs text-slate-700">
                        {receipt.store.name}
                      </td>

                      {/* Items */}
                      <td className="px-5 py-4 text-xs text-slate-700">
                        <div className="space-y-1 max-w-md">
                          {receipt.items.map((item) => (
                            <div key={item.id} className="flex items-center justify-between gap-3">
                              <span className="truncate">
                                {item.poItem.title}
                                {item.poItem.sku && (
                                  <span className="text-slate-400"> ({item.poItem.sku})</span>
                                )}
                                {item.poItem.product?.manufacturer && (
                                  <span className="text-slate-400"> · {item.poItem.product.manufacturer}</span>
                                )}
                              </span>
                              <span className="shrink-0 text-slate-700">
                                +{item.qtyReceived}
                              </span>
                            </div>
                          ))}
                        </div>
                      </td>

                      {/* Receiver */}
                      <td className="px-5 py-4 whitespace-nowrap text-xs text-slate-700">
                        {receipt.receivedBy || (isEs ? "Admin" : "System")}
                      </td>

                      {/* Notes */}
                      <td className="px-5 py-4 text-xs text-slate-700 max-w-xs truncate">
                        {receipt.notes || "-"}
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
