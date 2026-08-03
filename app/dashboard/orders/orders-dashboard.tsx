"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";

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

export function OrdersDashboard({
  initialStores,
  initialOrders,
  selectedStoreId,
  setupError = null,
}: OrdersDashboardProps) {
  const [stores] = useState(initialStores);
  const [orders, setOrders] = useState(initialOrders);
  const [activeStoreId, setActiveStoreId] = useState(selectedStoreId ?? initialStores[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);

  const visibleOrders = useMemo(
    () => orders.filter((order) => order.storeId === activeStoreId),
    [orders, activeStoreId],
  );

  async function refreshOrders(storeId: string) {
    const response = await fetch(`/api/orders?storeId=${encodeURIComponent(storeId)}`, {
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error("Failed to refresh orders");
    }

    const data = (await response.json()) as Order[];
    setOrders((current) => [
      ...current.filter((order) => order.storeId !== storeId),
      ...data,
    ]);
  }

  async function handleStoreChange(storeId: string) {
    setActiveStoreId(storeId);
    setError(null);

    try {
      await refreshOrders(storeId);
    } catch {
      setError("Failed to load orders for this store.");
    }
  }

  const createHref = activeStoreId
    ? `/dashboard/orders/new?storeId=${encodeURIComponent(activeStoreId)}`
    : "/dashboard/orders/new";

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
            <p className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
              Orders
            </p>
            <h1 className="mt-4 text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">
              Orders Manager
            </h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-slate-600 sm:text-lg">
              Manage and track all your customer orders here.
            </p>
          </div>

          <Link
            href={createHref}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            <Plus className="h-4 w-4" />
            New order
          </Link>
        </div>

        <div className="mt-6 flex w-full max-w-md flex-col gap-2">
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
        </div>

        {error ? (
          <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <div className="mt-8 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {visibleOrders.length === 0 ? (
            <div className="p-10 text-center text-slate-500">
              No orders yet for this store.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Order</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Customer</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Status</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Payment</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Total</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {visibleOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3 align-top font-semibold text-slate-900">#{order.orderNumber}</td>
                      <td className="px-4 py-3 align-top text-slate-700">{order.customerEmail}</td>
                      <td className="px-4 py-3 align-top text-slate-700">{order.status}</td>
                      <td className="px-4 py-3 align-top text-slate-700">{order.paymentStatus}</td>
                      <td className="px-4 py-3 align-top text-slate-700">{order.currency} {order.total}</td>
                      <td className="px-4 py-3 align-top text-slate-600">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
