"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { useLanguage } from "@/lib/i18n/language-context";

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
  const { language } = useLanguage();
  const isEs = language === "es";

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
        throw new Error(isEs ? "Selecciona una tienda antes de crear un pedido." : "Select a store before creating an order.");
      }

      if (!customerEmail.trim()) {
        throw new Error(isEs ? "El correo electrónico del cliente es obligatorio." : "Customer email is required.");
      }

      if (preparedItems.length === 0) {
        throw new Error(isEs ? "Agrega al menos un artículo." : "Add at least one line item.");
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
        throw new Error(result.error ?? (isEs ? "Error al crear el pedido" : "Failed to create order"));
      }

      router.push(`/dashboard/orders?storeId=${encodeURIComponent(activeStoreId)}`);
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : isEs
            ? "Error al crear el pedido"
            : "Failed to create order",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="min-w-0 space-y-6">
      {setupError ? (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {setupError}
        </div>
      ) : null}
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              {isEs ? "Pedidos" : "Orders"}
            </p>
            <h2 className="mt-1 text-2xl font-semibold text-slate-950">
              {isEs ? "Crear pedido manual" : "Create manual order"}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-full border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
          >
            {isEs ? "Volver" : "Back"}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Order Details Card */}
          <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
              {isEs ? "Configuración del pedido" : "Order configuration"}
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-slate-700">{isEs ? "Tienda" : "Store"}</span>
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
                <span className="text-sm font-medium text-slate-700">{isEs ? "Correo del cliente" : "Customer email"}</span>
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
                <span className="text-sm font-medium text-slate-700">{isEs ? "Estado del pedido" : "Order status"}</span>
                <select
                  value={status}
                  onChange={(event) => setStatus(event.target.value as typeof status)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                >
                  <option value="PENDING">{isEs ? "PENDIENTE" : "PENDING"}</option>
                  <option value="PROCESSING">{isEs ? "EN PROCESO" : "PROCESSING"}</option>
                  <option value="COMPLETED">{isEs ? "COMPLETADO" : "COMPLETED"}</option>
                  <option value="CANCELLED">{isEs ? "CANCELADO" : "CANCELLED"}</option>
                </select>
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-slate-700">{isEs ? "Estado del pago" : "Payment status"}</span>
                <select
                  value={paymentStatus}
                  onChange={(event) => setPaymentStatus(event.target.value as typeof paymentStatus)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                >
                  <option value="UNPAID">{isEs ? "NO PAGADO" : "UNPAID"}</option>
                  <option value="PAID">{isEs ? "PAGADO" : "PAID"}</option>
                  <option value="REFUNDED">{isEs ? "REEMBOLSADO" : "REFUNDED"}</option>
                  <option value="FAILED">{isEs ? "FALLIDO" : "FAILED"}</option>
                </select>
              </label>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 bg-white">
              <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                {isEs ? "Artículos del pedido" : "Line items"}
              </h2>
              <button
                type="button"
                onClick={addItem}
                className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                <Plus className="h-4 w-4" />
                {isEs ? "Agregar artículo" : "Add item"}
              </button>
            </div>

            <div className="space-y-3 p-5">
              {items.map((item, index) => (
                <div key={`${index}-${item.title}`} className="grid gap-3 sm:grid-cols-12">
                  <input
                    value={item.title}
                    onChange={(event) => updateItem(index, { title: event.target.value })}
                    placeholder={isEs ? "Título del artículo" : "Item title"}
                    className="sm:col-span-6 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.price}
                    onChange={(event) => updateItem(index, { price: event.target.value })}
                    placeholder={isEs ? "Precio" : "Price"}
                    className="sm:col-span-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                  />
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={item.quantity}
                    onChange={(event) => updateItem(index, { quantity: event.target.value })}
                    placeholder={isEs ? "Cant." : "Qty"}
                    className="sm:col-span-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                  />
                  <button
                    type="button"
                    disabled={items.length === 1}
                    onClick={() => removeItem(index)}
                    className="sm:col-span-1 inline-flex items-center justify-center rounded-xl border border-rose-200 text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                    title={isEs ? "Eliminar artículo" : "Remove item"}
                    aria-label={isEs ? "Eliminar artículo" : "Remove line item"}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Financial Adjustments Card */}
          <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
              {isEs ? "Ajustes financieros" : "Financial adjustments"}
            </h3>
            <div className="grid gap-4 sm:grid-cols-3">
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-slate-700">{isEs ? "Impuesto" : "Tax"}</span>
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
                <span className="text-sm font-medium text-slate-700">{isEs ? "Envío" : "Shipping"}</span>
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
                <span className="text-sm font-medium text-slate-700">{isEs ? "Moneda" : "Currency"}</span>
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

          <div className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-700 shadow-sm">
            <p>{isEs ? "Subtotal: " : "Subtotal: "}{currency} {toMoney(subtotal)}</p>
            <p>{isEs ? "Impuesto: " : "Tax: "}{currency} {toMoney(taxAmount)}</p>
            <p>{isEs ? "Envío: " : "Shipping: "}{currency} {toMoney(shippingAmount)}</p>
            <p className="mt-1 font-semibold text-slate-900">{isEs ? "Total: " : "Total: "}{currency} {toMoney(total)}</p>
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
              {isEs ? "Cancelar" : "Cancel"}
            </button>
            <button
              type="submit"
              disabled={isSaving || !activeStoreId}
              className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? (isEs ? "Guardando..." : "Saving...") : isEs ? "Crear pedido" : "Create order"}
            </button>
          </div>
        </form>

      {!activeStore && stores.length === 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {isEs ? "Crea una tienda primero antes de crear pedidos." : "Create a store first before creating orders."}
        </div>
      ) : null}
    </section>
  );
}
