"use client";

import { useEffect, useState } from "react";

type ShopperOrder = {
  id: string;
  orderNumber: number;
  status: string;
  paymentStatus: string;
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  currency: string;
  createdAt: string;
};

export default function OrdersPanel() {
  const [orders, setOrders] = useState<ShopperOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadOrders() {
      try {
        const response = await fetch("/api/storefront/orders", { cache: "no-store" });
        const payload = await response.json();
        if (response.ok) {
          setOrders(payload.orders ?? []);
        }
      } finally {
        setLoading(false);
      }
    }

    void loadOrders();
  }, []);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-900">Your orders</p>
          <p className="text-sm text-slate-500">Track the purchases tied to this storefront account.</p>
        </div>
      </div>

      {loading ? (
        <p className="mt-5 text-sm text-slate-500">Loading orders…</p>
      ) : orders.length === 0 ? (
        <p className="mt-5 text-sm text-slate-500">You have not placed any orders yet.</p>
      ) : (
        <div className="mt-5 space-y-3">
          {orders.map((order) => (
            <div key={order.id} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-900">#{order.orderNumber}</p>
                  <p className="text-sm text-slate-500">{new Date(order.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-900">{order.currency} {order.total.toFixed(2)}</p>
                  <p className="text-sm text-slate-500">{order.status}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
