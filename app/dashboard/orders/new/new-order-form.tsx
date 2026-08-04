"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";

type Store = {
  id: string;
  name: string;
  currency: string;
};

type OrderItemForm = {
  title: string;
  price: string;
  quantity: string;
};

type NewOrderFormProps = {
  stores: Store[];
  selectedStoreId: string | null;
  setupError?: string | null;
};

const emptyItem: OrderItemForm = {
  title: "",
  price: "0.00",
  quantity: "1",
};

function toMoney(value: number): string {
  return (Math.round(value * 100) / 100).toFixed(2);
}

export function NewOrderForm({ stores, selectedStoreId, setupError = null }: NewOrderFormProps) {
  const router = useRouter();
  const [activeStoreId, setActiveStoreId] = useState(selectedStoreId ?? stores[0]?.id ?? "");
  const [customerEmail, setCustomerEmail] = useState("");
  const [status, setStatus] = useState<"PENDING" | "PROCESSING" | "COMPLETED" | "CANCELLED">("PENDING");
  const [paymentStatus, setPaymentStatus] = useState<"UNPAID" | "PAID" | "REFUNDED" | "FAILED">("UNPAID");
  const [tax, setTax] = useState("0.00");
  const [shipping, setShipping] = useState("0.00");
  const [currency, setCurrency] = useState(stores[0]?.currency ?? "USD");
  const [items, setItems] = useState<OrderItemForm[]>([{ ...emptyItem }]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeStore = stores.find((store) => store.id === activeStoreId) ?? null;

  const subtotal = useMemo(() => {
    return items.reduce((total, item) => {
      const price = Number.parseFloat(item.price);
      const quantity = Number.parseInt(item.quantity, 10);

      if (!Number.isFinite(price) || !Number.isFinite(quantity) || quantity < 1) {
        return total;
      }

      return total + price * quantity;
    }, 0);
  }, [items]);

  const taxAmount = useMemo(() => {
    const value = Number.parseFloat(tax);
    return Number.isFinite(value) && value >= 0 ? value : 0;
  }, [tax]);

  const shippingAmount = useMemo(() => {
    const value = Number.parseFloat(shipping);
    return Number.isFinite(value) && value >= 0 ? value : 0;
  }, [shipping]);

  const total = useMemo(() => subtotal + taxAmount + shippingAmount, [subtotal, taxAmount, shippingAmount]);

  function addItem() {
    setItems((current) => [...current, { ...emptyItem }]);
  }

  function removeItem(index: number) {
    setItems((current) => current.filter((_, currentIndex) => currentIndex !== index));
  }

  function updateItem(index: number, patch: Partial<OrderItemForm>) {
    setItems((current) =>
      current.map((item, currentIndex) => (currentIndex === index ? { ...item, ...patch } : item)),
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      const preparedItems = items
        .map((item) => ({
          title: item.title.trim(),
          price: item.price,
          quantity: Number.parseInt(item.quantity, 10) || 0,
        }))
        .filter((item) => item.title && item.quantity > 0);

      if (!activeStoreId) {
        throw new Error("Select a store before creating an order.");
      }

      if (!customerEmail.trim()) {
        throw new Error("Customer email is required.");
      }

      if (preparedItems.length === 0) {
        throw new Error("Add at least one line item.");
      }

      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          storeId: activeStoreId,
          customerEmail,
          status,
          paymentStatus,
          tax,
          shipping,
          currency,
          items: preparedItems,
        }),
      });

      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(result.error ?? "Failed to create order");
      }

      router.push(`/dashboard/orders?storeId=${encodeURIComponent(activeStoreId)}`);
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Failed to create order");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="overflow-hidden rounded-xl border border-white/70 bg-white/80 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.12)] backdrop-blur">
      {setupError ? (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {setupError}
        </div>
      ) : null}

      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Orders
            </p>
            <h2 className="mt-1 text-2xl font-semibold text-slate-950">
              Create manual order
            </h2>
          </div>
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-full border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
          >
            Back
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Order Details Card */}
          <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-5">
            <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Order configuration</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-slate-700">Store</span>
                <select
                  value={activeStoreId}
                  onChange={(event) => {
                    const storeId = event.target.value;
                    setActiveStoreId(storeId);
                    const store = stores.find((candidate) => candidate.id === storeId);
                    if (store) {
                      setCurrency(store.currency);
                    }
                  }}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                >
                  {stores.map((store) => (
                    <option key={store.id} value={store.id}>
                      {store.name} / {store.currency}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-slate-700">Customer email</span>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(event) => setCustomerEmail(event.target.value)}
                  placeholder="customer@example.com"
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
                  required
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-slate-700">Order status</span>
                <select
                  value={status}
                  onChange={(event) => setStatus(event.target.value as typeof status)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                >
                  <option value="PENDING">PENDING</option>
                  <option value="PROCESSING">PROCESSING</option>
                  <option value="COMPLETED">COMPLETED</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-slate-700">Payment status</span>
                <select
                  value={paymentStatus}
                  onChange={(event) => setPaymentStatus(event.target.value as typeof paymentStatus)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                >
                  <option value="UNPAID">UNPAID</option>
                  <option value="PAID">PAID</option>
                  <option value="REFUNDED">REFUNDED</option>
                  <option value="FAILED">FAILED</option>
                </select>
              </label>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 bg-slate-50/50">
              <h2 className="text-sm font-semibold text-slate-900">Line items</h2>
              <button
                type="button"
                onClick={addItem}
                className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                <Plus className="h-4 w-4" />
                Add item
              </button>
            </div>

            <div className="space-y-3 p-4">
              {items.map((item, index) => (
                <div key={`${index}-${item.title}`} className="grid gap-3 sm:grid-cols-12">
                  <input
                    value={item.title}
                    onChange={(event) => updateItem(index, { title: event.target.value })}
                    placeholder="Item title"
                    className="sm:col-span-6 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.price}
                    onChange={(event) => updateItem(index, { price: event.target.value })}
                    placeholder="Price"
                    className="sm:col-span-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                  />
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={item.quantity}
                    onChange={(event) => updateItem(index, { quantity: event.target.value })}
                    placeholder="Qty"
                    className="sm:col-span-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                  />
                  <button
                    type="button"
                    disabled={items.length === 1}
                    onClick={() => removeItem(index)}
                    className="sm:col-span-1 inline-flex items-center justify-center rounded-xl border border-rose-200 text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                    title="Remove item"
                    aria-label="Remove line item"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Financial Adjustments Card */}
          <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-5">
            <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Financial adjustments</h3>
            <div className="grid gap-4 sm:grid-cols-3">
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-slate-700">Tax</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={tax}
                  onChange={(event) => setTax(event.target.value)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-slate-700">Shipping</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={shipping}
                  onChange={(event) => setShipping(event.target.value)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-slate-700">Currency</span>
                <input
                  value={currency}
                  onChange={(event) => setCurrency(event.target.value.toUpperCase())}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm uppercase outline-none transition focus:border-slate-400"
                  minLength={3}
                  maxLength={3}
                  required
                />
              </label>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            <p>Subtotal: {currency} {toMoney(subtotal)}</p>
            <p>Tax: {currency} {toMoney(taxAmount)}</p>
            <p>Shipping: {currency} {toMoney(shippingAmount)}</p>
            <p className="mt-1 font-semibold text-slate-900">Total: {currency} {toMoney(total)}</p>
          </div>

          {error ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => router.push(`/dashboard/orders${activeStoreId ? `?storeId=${encodeURIComponent(activeStoreId)}` : ""}`)}
              className="rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || !activeStoreId}
              className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? "Saving..." : "Create order"}
            </button>
          </div>
        </form>

        {!activeStore && stores.length === 0 ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Create a store first before creating orders.
          </div>
        ) : null}
      </div>
    </section>
  );
}
