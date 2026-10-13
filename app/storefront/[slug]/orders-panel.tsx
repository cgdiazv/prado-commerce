"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/lib/i18n/LanguageContext";

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
  const { t, language } = useLanguage();
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
          <p className="text-sm font-semibold text-slate-900">{t.storefront.yourOrders}</p>
          <p className="text-sm text-slate-500">{t.storefront.trackPurchases}</p>
        </div>
      </div>

      {loading ? (
        <p className="mt-5 text-sm text-slate-500">{t.storefront.loadingOrders}</p>
      ) : orders.length === 0 ? (
        <p className="mt-5 text-sm text-slate-500">{t.storefront.noOrdersYet}</p>
      ) : (
        <div className="mt-5 space-y-3">
          {orders.map((order) => (
            <div key={order.id} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-900">#{order.orderNumber}</p>
                  <p className="text-sm text-slate-500">
                    {new Date(order.createdAt).toLocaleDateString(language === "es" ? "es-ES" : "en-US")}
                  </p>
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
