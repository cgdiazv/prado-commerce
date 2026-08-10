"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, CreditCard, Mail, Phone, MapPin, Package, Truck } from "lucide-react";

type Address = {
  firstName?: string;
  lastName?: string;
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  phone?: string;
} | null;

function parseAddress(value: unknown): Address {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Exclude<Address, null>
    : null;
}

type OrderItem = {
  id: string;
  title: string;
  price: string;
  quantity: number;
};

type Order = {
  id: string;
  orderNumber: number;
  customerEmail: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "CANCELLED";
  paymentStatus: "UNPAID" | "PAID" | "REFUNDED" | "FAILED";
  fulfillmentStatus: "UNFULFILLED" | "SHIPPED";
  trackingNumber: string | null;
  trackingCarrier: string | null;
  trackingUrl: string | null;
  shippedAt: string | null;
  shipStationOrderId: string | null;
  shipStationSyncedAt: string | null;
  shipStationSyncError: string | null;
  subtotal: string;
  tax: string;
  shipping: string;
  total: string;
  currency: string;
  shippingAddress: unknown;
  billingAddress: unknown;
  createdAt: string;
  items: OrderItem[];
  store: {
    name: string;
    currency: string;
  };
};

type OrderDetailClientProps = {
  initialOrder: Order;
};

const statusColors: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-700 border-amber-200",
  PROCESSING: "bg-blue-50 text-blue-700 border-blue-200",
  COMPLETED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  CANCELLED: "bg-rose-50 text-rose-700 border-rose-200",
};

const paymentStatusColors: Record<string, string> = {
  UNPAID: "bg-amber-50 text-amber-700 border-amber-200",
  PAID: "bg-emerald-50 text-emerald-700 border-emerald-200",
  REFUNDED: "bg-purple-50 text-purple-700 border-purple-200",
  FAILED: "bg-rose-50 text-rose-700 border-rose-200",
};

export default function OrderDetailClient({ initialOrder }: OrderDetailClientProps) {
  const router = useRouter();
  const [order, setOrder] = useState<Order>(initialOrder);
  const [status, setStatus] = useState(initialOrder.status);
  const [paymentStatus, setPaymentStatus] = useState(initialOrder.paymentStatus);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: order.currency || "USD",
  });

  const parsedShipping = parseAddress(order.shippingAddress);
  const parsedBilling = parseAddress(order.billingAddress);

  async function handleSaveChanges() {
    setIsSaving(true);
    setSaveStatus(null);

    try {
      const response = await fetch(`/api/orders/${order.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          status,
          paymentStatus,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Failed to update order");
      }

      setOrder((current) => ({
        ...current,
        status: payload.order.status,
        paymentStatus: payload.order.paymentStatus,
      }));
      setSaveStatus("Changes saved successfully!");
      router.refresh();
    } catch (error) {
      setSaveStatus(error instanceof Error ? error.message : "Failed to save changes");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="overflow-hidden rounded-xl border border-white/70 bg-white/80 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.12)] backdrop-blur space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-5">
        <div>
          <p className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
            Process Order
          </p>
          <div className="mt-2 flex items-center gap-3">
            <h1 className="text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">
              Order #{order.orderNumber}
            </h1>
            <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusColors[order.status]}`}>
              {order.status}
            </span>
            <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${paymentStatusColors[order.paymentStatus]}`}>
              {order.paymentStatus}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Placed on {new Date(order.createdAt).toLocaleString()} at {order.store.name}
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-full border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 self-start sm:self-center"
        >
          Back
        </button>
      </div>

      {saveStatus && (
        <div className={`rounded-xl border px-4 py-3 text-sm ${saveStatus.includes("success") ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}>
          {saveStatus}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        {/* Left Side Details */}
        <div className="space-y-6">
          {/* Items Purchased */}
          <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
              <Package className="h-4 w-4 text-slate-400" /> Items purchased
            </h2>
            <div className="mt-4 divide-y divide-slate-100">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-semibold text-slate-900">{item.title}</p>
                    <p className="text-xs text-slate-500">
                      {formatter.format(Number(item.price))} × {item.quantity}
                    </p>
                  </div>
                  <p className="font-semibold text-slate-900">
                    {formatter.format(Number(item.price) * item.quantity)}
                  </p>
                </div>
              ))}
            </div>
          </article>

          {/* Customer Details */}
          <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
              <Mail className="h-4 w-4 text-slate-400" /> Customer details
            </h2>
            <div className="mt-4 space-y-3">
              <div className="flex items-center gap-2 text-sm text-slate-700">
                <Mail className="h-4 w-4 text-slate-400" />
                <span>{order.customerEmail}</span>
              </div>
              {parsedShipping?.phone && (
                <div className="flex items-center gap-2 text-sm text-slate-700">
                  <Phone className="h-4 w-4 text-slate-400" />
                  <span>{parsedShipping.phone}</span>
                </div>
              )}
            </div>
          </article>

          {/* Shipping and Billing addresses */}
          <div className="grid gap-6 md:grid-cols-2">
            <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                <MapPin className="h-4 w-4 text-slate-400" /> Shipping address
              </h2>
              {parsedShipping && (parsedShipping.line1 || parsedShipping.city) ? (
                <div className="mt-4 text-sm text-slate-700 space-y-1">
                  <p className="font-medium text-slate-950">
                    {[parsedShipping.firstName, parsedShipping.lastName].filter(Boolean).join(" ") || "Customer"}
                  </p>
                  <p>{parsedShipping.line1}</p>
                  {parsedShipping.line2 && <p>{parsedShipping.line2}</p>}
                  <p>
                    {[parsedShipping.city, parsedShipping.state, parsedShipping.postalCode].filter(Boolean).join(", ")}
                  </p>
                  <p>{parsedShipping.country}</p>
                </div>
              ) : (
                <p className="mt-4 text-sm text-slate-500 italic">No shipping address provided</p>
              )}
            </article>

            <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                <CreditCard className="h-4 w-4 text-slate-400" /> Billing address
              </h2>
              {parsedBilling && (parsedBilling.line1 || parsedBilling.city) ? (
                <div className="mt-4 text-sm text-slate-700 space-y-1">
                  <p className="font-medium text-slate-950">
                    {[parsedBilling.firstName, parsedBilling.lastName].filter(Boolean).join(" ") || "Customer"}
                  </p>
                  <p>{parsedBilling.line1}</p>
                  {parsedBilling.line2 && <p>{parsedBilling.line2}</p>}
                  <p>
                    {[parsedBilling.city, parsedBilling.state, parsedBilling.postalCode].filter(Boolean).join(", ")}
                  </p>
                  <p>{parsedBilling.country}</p>
                </div>
              ) : (
                <p className="mt-4 text-sm text-slate-500 italic">No billing address provided</p>
              )}
            </article>
          </div>
        </div>

        {/* Right Side Process Card */}
        <div className="space-y-6">
          <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
              <Truck className="h-4 w-4 text-slate-400" /> Fulfillment
            </h2>
            <div className="mt-4 space-y-2 text-sm text-slate-700">
              <div className="flex justify-between gap-4">
                <span>Status</span>
                <span className="font-semibold text-slate-950">
                  {order.fulfillmentStatus === "SHIPPED" ? "Shipped" : "Unfulfilled"}
                </span>
              </div>
              {order.shipStationOrderId ? (
                <div className="flex justify-between gap-4">
                  <span>ShipStation order</span>
                  <span className="font-medium text-slate-950">{order.shipStationOrderId}</span>
                </div>
              ) : null}
              {order.trackingNumber ? (
                <div className="flex justify-between gap-4">
                  <span>Tracking</span>
                  {order.trackingUrl ? (
                    <a href={order.trackingUrl} target="_blank" rel="noreferrer" className="font-medium text-cyan-700 hover:underline">
                      {order.trackingNumber}
                    </a>
                  ) : (
                    <span className="font-medium text-slate-950">{order.trackingNumber}</span>
                  )}
                </div>
              ) : null}
              {order.trackingCarrier ? (
                <div className="flex justify-between gap-4">
                  <span>Carrier</span>
                  <span className="font-medium text-slate-950">{order.trackingCarrier}</span>
                </div>
              ) : null}
              {order.shippedAt ? (
                <div className="flex justify-between gap-4">
                  <span>Shipped</span>
                  <span>{new Date(order.shippedAt).toLocaleDateString()}</span>
                </div>
              ) : null}
              {order.shipStationSyncError ? (
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-800">
                  ShipStation sync: {order.shipStationSyncError}
                </p>
              ) : null}
              {!order.shipStationSyncError && order.shipStationSyncedAt ? (
                <p className="text-xs text-slate-500">
                  Synced {new Date(order.shipStationSyncedAt).toLocaleString()}
                </p>
              ) : null}
            </div>
          </article>

          {/* Order Processing Actions */}
          <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
              <Clock className="h-4 w-4 text-slate-400" /> Process order
            </h2>
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">Order Status</label>
                <select
                  value={status}
                  onChange={(event) => setStatus(event.target.value as Order["status"])}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                >
                  <option value="PENDING">Pending</option>
                  <option value="PROCESSING">Processing</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">Payment Status</label>
                <select
                  value={paymentStatus}
                  onChange={(event) => setPaymentStatus(event.target.value as Order["paymentStatus"])}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                >
                  <option value="UNPAID">Unpaid</option>
                  <option value="PAID">Paid</option>
                  <option value="REFUNDED">Refunded</option>
                  <option value="FAILED">Failed</option>
                </select>
              </div>

              <button
                type="button"
                onClick={handleSaveChanges}
                disabled={isSaving}
                className="w-full rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-75"
              >
                {isSaving ? "Saving changes..." : "Save changes"}
              </button>
            </div>
          </article>

          {/* Financial Summary */}
          <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
              Financial summary
            </h2>
            <div className="mt-4 space-y-2.5 text-sm text-slate-700">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{formatter.format(Number(order.subtotal))}</span>
              </div>
              <div className="flex justify-between">
                <span>Shipping</span>
                <span>{formatter.format(Number(order.shipping))}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax</span>
                <span>{formatter.format(Number(order.tax))}</span>
              </div>
              <div className="flex justify-between border-t border-slate-100 pt-2.5 font-bold text-slate-950 text-base">
                <span>Total</span>
                <span>{formatter.format(Number(order.total))}</span>
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
