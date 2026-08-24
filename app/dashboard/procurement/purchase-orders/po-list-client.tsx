"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Search, FileText, ChevronRight } from "lucide-react";

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
};

const statusColors: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-700 border-slate-200",
  SENT: "bg-blue-50 text-blue-700 border-blue-200",
  PARTIAL: "bg-amber-50 text-amber-700 border-amber-200",
  RECEIVED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  CANCELLED: "bg-red-50 text-red-700 border-red-200",
};

export default function POListClient({ initialStores, initialVendors, initialPurchaseOrders }: POListClientProps) {
  const [purchaseOrders] = useState<PurchaseOrder[]>(initialPurchaseOrders);
  const [selectedStoreId, setSelectedStoreId] = useState<string>("ALL");
  const [selectedVendorId, setSelectedVendorId] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredPOs = purchaseOrders.filter((po) => {
    const matchesStore = selectedStoreId === "ALL" || po.storeId === selectedStoreId;
    const matchesVendor = selectedVendorId === "ALL" || po.vendorId === selectedVendorId;
    const matchesStatus = selectedStatus === "ALL" || po.status === selectedStatus;
    const matchesSearch =
      !searchQuery.trim() ||
      po.poNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      po.vendor.name.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesStore && matchesVendor && matchesStatus && matchesSearch;
  });

  return (
    <section className="min-w-0 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950">Purchase Orders</h1>
          <p className="mt-1 text-sm text-slate-500">
            Create, issue, and receive inventory stock shipments from your suppliers.
          </p>
        </div>
        <Link
          href="/dashboard/procurement/purchase-orders/new"
          className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          <Plus className="h-4 w-4" />
          New Purchase Order
        </Link>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by PO # or vendor..."
            className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {initialStores.length > 1 && (
            <select
              value={selectedStoreId}
              onChange={(e) => setSelectedStoreId(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium outline-none transition focus:border-slate-400"
            >
              <option value="ALL">All Stores</option>
              {initialStores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          )}

          <select
            value={selectedVendorId}
            onChange={(e) => setSelectedVendorId(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium outline-none transition focus:border-slate-400"
          >
            <option value="ALL">All Vendors</option>
            {initialVendors.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium outline-none transition focus:border-slate-400"
          >
            <option value="ALL">All Statuses</option>
            <option value="DRAFT">DRAFT</option>
            <option value="SENT">SENT</option>
            <option value="PARTIAL">PARTIAL</option>
            <option value="RECEIVED">RECEIVED</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>
        </div>
      </div>

      {/* PO Table */}
      {filteredPOs.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
          <FileText className="mx-auto h-10 w-10 text-slate-400" />
          <h3 className="mt-3 text-sm font-semibold text-slate-900">No purchase orders found</h3>
          <p className="mt-1 text-xs text-slate-500">
            {searchQuery || selectedStatus !== "ALL"
              ? "No purchase order matches your filter criteria."
              : "Generate a purchase order to request stock from your vendor."}
          </p>
          {!searchQuery && selectedStatus === "ALL" && (
            <Link
              href="/dashboard/procurement/purchase-orders/new"
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-xs font-semibold text-white"
            >
              <Plus className="h-3.5 w-3.5" />
              New Purchase Order
            </Link>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-100 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3.5">PO Number</th>
                  <th className="px-5 py-3.5">Vendor</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Fulfillment Progress</th>
                  <th className="px-5 py-3.5">Expected Date</th>
                  <th className="px-5 py-3.5 text-right">Total</th>
                  <th className="px-5 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPOs.map((po) => {
                  const totalOrdered = po.items.reduce((acc, i) => acc + i.qtyOrdered, 0);
                  const totalReceived = po.items.reduce((acc, i) => acc + i.qtyReceived, 0);
                  const progressPct = totalOrdered > 0 ? Math.min(100, Math.round((totalReceived / totalOrdered) * 100)) : 0;
                  const formatter = new Intl.NumberFormat("en-US", { style: "currency", currency: po.store.currency });

                  return (
                    <tr key={po.id} className="transition hover:bg-slate-50/80">
                      <td className="px-5 py-4 font-semibold text-slate-900">
                        <Link href={`/dashboard/procurement/purchase-orders/${po.id}`} className="hover:text-blue-600">
                          {po.poNumber}
                        </Link>
                        <p className="text-xs font-normal text-slate-500">{po.store.name}</p>
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-medium text-slate-900">{po.vendor.name}</div>
                        {po.vendor.contactEmail && (
                          <p className="text-xs text-slate-500">{po.vendor.contactEmail}</p>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusColors[po.status]}`}>
                          {po.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 min-w-[160px]">
                        <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
                          <span>{totalReceived} of {totalOrdered} units</span>
                          <span className="font-semibold">{progressPct}%</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className={`h-full transition-all ${progressPct === 100 ? "bg-emerald-500" : progressPct > 0 ? "bg-amber-500" : "bg-slate-300"}`}
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                      </td>
                      <td className="px-5 py-4 text-xs text-slate-600">
                        {po.expectedDate ? new Date(po.expectedDate).toLocaleDateString() : "Not specified"}
                      </td>
                      <td className="px-5 py-4 text-right font-bold text-slate-900">
                        {formatter.format(Number(po.total))}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <Link
                          href={`/dashboard/procurement/purchase-orders/${po.id}`}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 hover:text-slate-950"
                        >
                          View / Receive
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
