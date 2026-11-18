"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Plus, Search, Trash2, X } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { CURRENCIES } from "../../../stores/store-form-controls";

type StoreOption = { id: string; name: string; currency: string };
type CustomerOption = { id: string; email: string; firstName: string | null; lastName: string | null; phone: string | null };
type ProductOption = { variantId: string; title: string; sku: string | null; barcode: string | null; price: number };
type Item = { title: string; price: string; quantity: string; variantId: string | null; query: string; isSearchOpen: boolean };

const newItem: Item = { title: "", price: "0.00", quantity: "1", variantId: null, query: "", isSearchOpen: false };

export function QuoteForm({
  stores,
  selectedStoreId,
  setupError = null,
}: {
  stores: StoreOption[];
  selectedStoreId: string | null;
  setupError?: string | null;
}) {
  const router = useRouter();
  const { language } = useLanguage();
  const isEs = language === "es";
  const initialStore = stores.find((store) => store.id === selectedStoreId) ?? stores[0];
  const [storeId, setStoreId] = useState(initialStore?.id ?? "");
  const [currency, setCurrency] = useState(initialStore?.currency ?? "USD");
  const [customer, setCustomer] = useState<CustomerOption | null>(null);
  const [customerQuery, setCustomerQuery] = useState("");
  const [isCustomerSearchOpen, setIsCustomerSearchOpen] = useState(false);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [items, setItems] = useState<Item[]>([{ ...newItem }]);
  const [tax, setTax] = useState("0.00");
  const [shipping, setShipping] = useState("0.00");
  const [validUntil, setValidUntil] = useState("");
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!storeId) return;
    const controller = new AbortController();
    Promise.all([
      fetch(`/api/customers?storeId=${encodeURIComponent(storeId)}`, { signal: controller.signal, cache: "no-store" }),
      fetch(`/api/products?storeId=${encodeURIComponent(storeId)}&status=ACTIVE`, { signal: controller.signal, cache: "no-store" }),
    ])
      .then(async ([customersResponse, productsResponse]) => {
        if (!customersResponse.ok || !productsResponse.ok) throw new Error("Could not load customers or products");
        const customerResults = (await customersResponse.json()) as CustomerOption[];
        const productResults = (await productsResponse.json()) as Array<{
          title: string;
          variants: Array<{ id: string; title: string; sku: string | null; barcode: string | null; price: string | number }>;
        }>;
        setCustomers(customerResults);
        setProducts(productResults.flatMap((product) => product.variants.map((variant) => ({
          variantId: variant.id,
          title: product.variants.length > 1 ? `${product.title} (${variant.title})` : product.title,
          sku: variant.sku,
          barcode: variant.barcode,
          price: Number(variant.price),
        }))));
      })
      .catch((loadError) => {
        if (!(loadError instanceof DOMException && loadError.name === "AbortError")) {
          setError(loadError instanceof Error ? loadError.message : "Could not load customers or products");
        }
      });
    return () => controller.abort();
  }, [storeId]);

  const filteredCustomers = useMemo(() => {
    const query = customerQuery.trim().toLowerCase();
    return customers.filter((entry) =>
      [entry.email, entry.firstName, entry.lastName, `${entry.firstName ?? ""} ${entry.lastName ?? ""}`, entry.phone]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(query)),
    ).slice(0, 10);
  }, [customers, customerQuery]);

  const subtotal = useMemo(() => items.reduce((sum, item) => {
    const price = Number.parseFloat(item.price);
    const quantity = Number.parseInt(item.quantity, 10);
    return Number.isFinite(price) && Number.isFinite(quantity) ? sum + price * quantity : sum;
  }, 0), [items]);
  const total = subtotal + (Number.parseFloat(tax) || 0) + (Number.parseFloat(shipping) || 0);

  function updateItem(index: number, patch: Partial<Item>) {
    setItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
  }

  function selectProduct(index: number, product: ProductOption) {
    updateItem(index, {
      title: product.title,
      query: product.title,
      price: product.price.toFixed(2),
      variantId: product.variantId,
      isSearchOpen: false,
    });
  }

  function customerLabel(entry: CustomerOption) {
    const name = [entry.firstName, entry.lastName].filter(Boolean).join(" ");
    return `${name || (isEs ? "Cliente" : "Customer")} — ${entry.email}`;
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!customer) {
      setError(isEs ? "Selecciona un cliente." : "Select a customer.");
      return;
    }
    if (items.some((item) => !item.variantId || !item.title.trim())) {
      setError(isEs ? "Selecciona un producto para cada artículo." : "Select a product for each line item.");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId,
          customerEmail: customer.email,
          currency,
          tax,
          shipping,
          validUntil,
          notes,
          items,
        }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error || "Could not create quote");
      router.push(`/dashboard/orders/quotes?storeId=${encodeURIComponent(storeId)}`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not create quote");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="min-w-0 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">{isEs ? "Nueva cotización" : "New quote"}</h1>
          <p className="mt-1 text-sm text-slate-500">{isEs ? "Selecciona un cliente y los productos a cotizar." : "Select a customer and the products to quote."}</p>
        </div>
        <button type="button" onClick={() => router.back()} className="rounded-full border border-slate-300 px-3 py-2 text-sm text-slate-600">{isEs ? "Volver" : "Back"}</button>
      </div>

      {setupError || error ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{setupError || error}</div> : null}

      <form onSubmit={submit} className="space-y-6">
        <div className="grid gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-2">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-slate-700">{isEs ? "Tienda" : "Store"}</span>
            <select
              value={storeId}
              onChange={(event) => {
                const selected = stores.find((store) => store.id === event.target.value);
                setStoreId(event.target.value);
                setCurrency(selected?.currency ?? "USD");
                setCustomer(null);
                setCustomerQuery("");
                setItems([{ ...newItem }]);
              }}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
              required
            >
              {stores.map((store) => <option key={store.id} value={store.id}>{store.name}</option>)}
            </select>
          </label>

          <div
            className="relative flex flex-col gap-2"
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                setIsCustomerSearchOpen(false);
              }
            }}
          >
            <label htmlFor="quote-customer" className="text-sm font-medium text-slate-700">{isEs ? "Cliente" : "Customer"}</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                id="quote-customer"
                value={customerQuery}
                onChange={(event) => {
                  setCustomerQuery(event.target.value);
                  setCustomer(null);
                  setIsCustomerSearchOpen(true);
                }}
                placeholder={isEs ? "Buscar cliente..." : "Search customer..."}
                className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-10 text-sm outline-none focus:border-slate-400"
                required
                role="combobox"
                aria-expanded={isCustomerSearchOpen}
                aria-controls="quote-customer-results"
                onFocus={() => setIsCustomerSearchOpen(true)}
              />
              {customerQuery ? (
                <button
                  type="button"
                  onClick={() => {
                    setCustomer(null);
                    setCustomerQuery("");
                    setIsCustomerSearchOpen(true);
                  }}
                  className="absolute right-2.5 top-1/2 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  aria-label={isEs ? "Limpiar cliente" : "Clear customer"}
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>
            {isCustomerSearchOpen ? (
              <div
                id="quote-customer-results"
                role="listbox"
                className="absolute inset-x-0 top-full z-30 mt-1 max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-xl"
              >
                {filteredCustomers.length ? filteredCustomers.map((entry) => {
                  const name = [entry.firstName, entry.lastName].filter(Boolean).join(" ");
                  return (
                    <button
                      key={entry.id}
                      type="button"
                      role="option"
                      aria-selected={customer?.id === entry.id}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => {
                        setCustomer(entry);
                        setCustomerQuery(customerLabel(entry));
                        setIsCustomerSearchOpen(false);
                      }}
                      className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-slate-50"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-slate-900">{name || (isEs ? "Cliente" : "Customer")}</span>
                        <span className="block truncate text-xs text-slate-500">{entry.email}{entry.phone ? ` · ${entry.phone}` : ""}</span>
                      </span>
                      {customer?.id === entry.id ? <Check className="h-4 w-4 shrink-0 text-cyan-600" /> : null}
                    </button>
                  );
                }) : (
                  <p className="px-4 py-3 text-sm text-slate-500">{isEs ? "No se encontraron clientes." : "No customers found."}</p>
                )}
              </div>
            ) : null}
          </div>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-slate-700">{isEs ? "Moneda" : "Currency"}</span>
            <select value={currency} onChange={(event) => setCurrency(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm">
              {CURRENCIES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-slate-700">{isEs ? "Válida hasta" : "Valid until"}</span>
            <input type="date" value={validUntil} onChange={(event) => setValidUntil(event.target.value)} className="rounded-xl border border-slate-200 px-4 py-3 text-sm" />
          </label>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">{isEs ? "Artículos" : "Line items"}</h2>
            <button type="button" onClick={() => setItems((current) => [...current, { ...newItem }])} className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-3 py-1.5 text-sm text-slate-700"><Plus className="h-4 w-4" />{isEs ? "Agregar artículo" : "Add item"}</button>
          </div>
          <div className="space-y-3 p-5">
            {items.map((item, index) => {
              const query = item.query.trim().toLowerCase();
              const matches = products.filter((product) =>
                [product.title, product.sku, product.barcode].filter(Boolean).some((value) => value?.toLowerCase().includes(query)),
              ).slice(0, 10);
              return (
                <div key={index} className="grid grid-cols-12 gap-3">
                  <div
                    className="relative col-span-12 sm:col-span-6"
                    onBlur={(event) => {
                      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                        updateItem(index, { isSearchOpen: false });
                      }
                    }}
                  >
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        value={item.query}
                        onChange={(event) => updateItem(index, { query: event.target.value, title: "", variantId: null, price: "0.00", isSearchOpen: true })}
                        onFocus={() => updateItem(index, { isSearchOpen: true })}
                        role="combobox"
                        aria-expanded={item.isSearchOpen}
                        aria-controls={`quote-products-${index}`}
                        placeholder={isEs ? "Buscar producto, SKU o código..." : "Search product, SKU, or barcode..."}
                        className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-10 text-sm outline-none focus:border-slate-400"
                        required
                      />
                      {item.query ? (
                        <button
                          type="button"
                          onClick={() => updateItem(index, { ...newItem, quantity: item.quantity, isSearchOpen: true })}
                          className="absolute right-2.5 top-1/2 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                          aria-label={isEs ? "Limpiar producto" : "Clear product"}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      ) : null}
                    </div>
                    {item.isSearchOpen ? (
                      <div
                        id={`quote-products-${index}`}
                        role="listbox"
                        className="absolute inset-x-0 top-full z-30 mt-1 max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-xl"
                      >
                        {matches.length ? matches.map((product) => (
                          <button
                            key={product.variantId}
                            type="button"
                            role="option"
                            aria-selected={item.variantId === product.variantId}
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => selectProduct(index, product)}
                            className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-slate-50"
                          >
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-medium text-slate-900">{product.title}</span>
                              <span className="block truncate text-xs text-slate-500">{[product.sku, product.barcode].filter(Boolean).join(" · ") || (isEs ? "Sin código" : "No code")}</span>
                            </span>
                            <span className="shrink-0 text-right text-sm font-semibold text-slate-900">{currency} {product.price.toFixed(2)}</span>
                          </button>
                        )) : (
                          <p className="px-4 py-3 text-sm text-slate-500">{isEs ? "No se encontraron productos." : "No products found."}</p>
                        )}
                      </div>
                    ) : null}
                  </div>
                  <input type="number" min="0" step="0.01" value={item.price} onChange={(event) => updateItem(index, { price: event.target.value })} className="col-span-12 rounded-xl border border-slate-200 px-4 py-3 text-sm sm:col-span-3" placeholder={isEs ? "Precio" : "Price"} />
                  <input type="number" min="1" step="1" value={item.quantity} onChange={(event) => updateItem(index, { quantity: event.target.value })} className="col-span-9 rounded-xl border border-slate-200 px-4 py-3 text-sm sm:col-span-2" placeholder={isEs ? "Cant." : "Qty"} />
                  <button type="button" disabled={items.length === 1} onClick={() => setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="col-span-3 inline-flex items-center justify-center rounded-xl border border-rose-200 text-rose-700 disabled:opacity-50 sm:col-span-1" aria-label={isEs ? "Eliminar artículo" : "Remove item"}><Trash2 className="h-4 w-4" /></button>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-2"><span className="text-sm font-medium text-slate-700">{isEs ? "Impuesto" : "Tax"}</span><input type="number" min="0" step="0.01" value={tax} onChange={(event) => setTax(event.target.value)} className="rounded-xl border border-slate-200 px-4 py-3 text-sm" /></label>
            <label className="flex flex-col gap-2"><span className="text-sm font-medium text-slate-700">{isEs ? "Envío" : "Shipping"}</span><input type="number" min="0" step="0.01" value={shipping} onChange={(event) => setShipping(event.target.value)} className="rounded-xl border border-slate-200 px-4 py-3 text-sm" /></label>
          </div>
          <label className="mt-4 flex flex-col gap-2"><span className="text-sm font-medium text-slate-700">{isEs ? "Notas" : "Notes"}</span><textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} className="rounded-xl border border-slate-200 px-4 py-3 text-sm" /></label>
          <p className="mt-5 text-right text-lg font-semibold text-slate-950">{currency} {total.toFixed(2)}</p>
        </div>

        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => router.back()} className="rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700">{isEs ? "Cancelar" : "Cancel"}</button>
          <button type="submit" disabled={isSaving || !storeId} className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{isSaving ? (isEs ? "Guardando..." : "Saving...") : isEs ? "Crear cotización" : "Create quote"}</button>
        </div>
      </form>
    </section>
  );
}
