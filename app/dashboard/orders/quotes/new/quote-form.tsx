"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ExternalLink, Loader2, Plus, Printer, Search, Trash2, UserPlus, X } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { CURRENCIES } from "../../../stores/store-form-controls";

type StoreOption = { id: string; name: string; currency: string };
type CustomerOption = { id: string; email: string; firstName: string | null; lastName: string | null; phone: string | null };
type ProductOption = { variantId: string; title: string; sku: string | null; barcode: string | null; price: number };
type Item = { title: string; price: string; quantity: string; variantId: string | null; query: string; isSearchOpen: boolean };
type QuoteStatus = "DRAFT" | "SENT" | "ACCEPTED" | "REJECTED" | "EXPIRED" | "CONVERTED";

export type InitialQuote = {
  id: string;
  quoteNumber: number;
  storeId: string;
  status: QuoteStatus;
  customer: CustomerOption | null;
  customerEmail: string;
  currency: string;
  tax: string;
  shipping: string;
  validUntil: string;
  notes: string;
  convertedOrderId: string | null;
  items: Array<{
    title: string;
    price: string;
    quantity: string;
    variantId: string | null;
  }>;
};

const newItem: Item = { title: "", price: "0.00", quantity: "1", variantId: null, query: "", isSearchOpen: false };

function formatCustomerLabel(entry: CustomerOption, isEs: boolean) {
  const name = [entry.firstName, entry.lastName].filter(Boolean).join(" ");
  return `${name || (isEs ? "Cliente" : "Customer")} — ${entry.email}`;
}

export function QuoteForm({
  stores,
  selectedStoreId,
  setupError = null,
  initialQuote = null,
}: {
  stores: StoreOption[];
  selectedStoreId: string | null;
  setupError?: string | null;
  initialQuote?: InitialQuote | null;
}) {
  const router = useRouter();
  const { language } = useLanguage();
  const isEs = language === "es";
  const isEditing = Boolean(initialQuote);
  const isReadOnly = initialQuote?.status === "CONVERTED";

  const initialStore = stores.find((store) => store.id === (initialQuote?.storeId ?? selectedStoreId)) ?? stores[0];
  const initialCustomer: CustomerOption | null = initialQuote
    ? (initialQuote.customer ?? {
        id: "",
        email: initialQuote.customerEmail,
        firstName: null,
        lastName: null,
        phone: null,
      })
    : null;

  const [storeId, setStoreId] = useState(initialQuote?.storeId ?? initialStore?.id ?? "");
  const [currency, setCurrency] = useState(initialQuote?.currency ?? initialStore?.currency ?? "USD");
  const [status, setStatus] = useState<QuoteStatus>(initialQuote?.status ?? "DRAFT");
  const [customer, setCustomer] = useState<CustomerOption | null>(initialCustomer);
  const [customerQuery, setCustomerQuery] = useState(
    initialCustomer ? formatCustomerLabel(initialCustomer, isEs) : "",
  );
  const [isCustomerSearchOpen, setIsCustomerSearchOpen] = useState(false);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [items, setItems] = useState<Item[]>(
    initialQuote?.items.length
      ? initialQuote.items.map((item) => ({
          title: item.title,
          price: item.price,
          quantity: item.quantity,
          variantId: item.variantId,
          query: item.title,
          isSearchOpen: false,
        }))
      : [{ ...newItem }],
  );
  const [tax, setTax] = useState(initialQuote?.tax ?? "0.00");
  const [shipping, setShipping] = useState(initialQuote?.shipping ?? "0.00");
  const [validUntil, setValidUntil] = useState(initialQuote?.validUntil ?? "");
  const [notes, setNotes] = useState(initialQuote?.notes ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isNewCustomerModalOpen, setIsNewCustomerModalOpen] = useState(false);
  const [newCustomerFirstName, setNewCustomerFirstName] = useState("");
  const [newCustomerLastName, setNewCustomerLastName] = useState("");
  const [newCustomerEmail, setNewCustomerEmail] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);
  const [newCustomerError, setNewCustomerError] = useState<string | null>(null);

  const activeStoreName = stores.find((store) => store.id === storeId)?.name ?? "";

  useEffect(() => {
    if (!isNewCustomerModalOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isCreatingCustomer) {
        setIsNewCustomerModalOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isNewCustomerModalOpen, isCreatingCustomer]);

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

  function openNewCustomerModal(prefill?: string) {
    const raw = (prefill ?? (customer ? "" : customerQuery)).trim();
    if (raw.includes("@") && !/\s/.test(raw)) {
      setNewCustomerFirstName("");
      setNewCustomerLastName("");
      setNewCustomerEmail(raw);
    } else if (raw) {
      const parts = raw.split(/\s+/);
      setNewCustomerFirstName(parts[0] ?? "");
      setNewCustomerLastName(parts.slice(1).join(" "));
      setNewCustomerEmail("");
    } else {
      setNewCustomerFirstName("");
      setNewCustomerLastName("");
      setNewCustomerEmail("");
    }
    setNewCustomerPhone("");
    setNewCustomerError(null);
    setIsCustomerSearchOpen(false);
    setIsNewCustomerModalOpen(true);
  }

  async function handleCreateCustomer(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNewCustomerError(null);

    if (!storeId) {
      setNewCustomerError(isEs ? "Selecciona una tienda primero." : "Select a store first.");
      return;
    }

    const email = newCustomerEmail.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setNewCustomerError(isEs ? "Ingresa un correo electrónico válido." : "Enter a valid email address.");
      return;
    }

    setIsCreatingCustomer(true);
    try {
      const response = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId,
          email,
          firstName: newCustomerFirstName.trim() || undefined,
          lastName: newCustomerLastName.trim() || undefined,
          phone: newCustomerPhone.trim() || undefined,
        }),
      });
      const result = (await response.json()) as Partial<CustomerOption> & { error?: string };
      if (!response.ok || !result.id || !result.email) {
        throw new Error(
          result.error || (isEs ? "No se pudo crear el cliente." : "Could not create customer."),
        );
      }

      const created: CustomerOption = {
        id: result.id,
        email: result.email,
        firstName: result.firstName ?? null,
        lastName: result.lastName ?? null,
        phone: result.phone ?? null,
      };

      setCustomers((current) => [
        created,
        ...current.filter((entry) => entry.id !== created.id),
      ]);
      setCustomer(created);
      setCustomerQuery(customerLabel(created));
      setIsCustomerSearchOpen(false);
      setError(null);
      setIsNewCustomerModalOpen(false);
    } catch (createError) {
      setNewCustomerError(
        createError instanceof Error
          ? createError.message
          : isEs
            ? "No se pudo crear el cliente."
            : "Could not create customer.",
      );
    } finally {
      setIsCreatingCustomer(false);
    }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isReadOnly) return;
    setError(null);
    if (!customer) {
      setError(isEs ? "Selecciona un cliente." : "Select a customer.");
      return;
    }
    if (items.some((item) => !item.title.trim() || (!isEditing && !item.variantId))) {
      setError(isEs ? "Selecciona un producto para cada artículo." : "Select a product for each line item.");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(
        isEditing ? `/api/quotes/${initialQuote!.id}` : "/api/quotes",
        {
          method: isEditing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...(isEditing ? { status } : { storeId }),
            customerEmail: customer.email,
            currency,
            tax,
            shipping,
            validUntil,
            notes,
            items,
          }),
        },
      );
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(
          result.error ||
            (isEditing ? "Could not update quote" : "Could not create quote"),
        );
      }
      router.push(`/dashboard/orders/quotes?storeId=${encodeURIComponent(storeId)}`);
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : isEditing
            ? "Could not update quote"
            : "Could not create quote",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="min-w-0 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">
            {isEditing
              ? isEs
                ? `Cotización #${initialQuote!.quoteNumber}`
                : `Quote #${initialQuote!.quoteNumber}`
              : isEs
                ? "Nueva cotización"
                : "New quote"}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {isReadOnly
              ? isEs
                ? "Esta cotización ya fue convertida en un pedido y es de solo lectura."
                : "This quote has already been converted into an order and is read-only."
              : isEditing
                ? isEs
                  ? "Actualiza el cliente, los artículos, impuestos o notas de esta cotización."
                  : "Update the customer, line items, totals, or notes for this quote."
                : isEs
                  ? "Selecciona un cliente y los productos a cotizar."
                  : "Select a customer and the products to quote."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isEditing ? (
            <button
              type="button"
              onClick={() =>
                window.open(
                  `/dashboard/orders/quotes/${initialQuote!.id}/print?autoPrint=true`,
                  "_blank",
                  "noopener,noreferrer",
                )
              }
              className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-3.5 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <Printer className="h-4 w-4" />
              {isEs ? "Imprimir" : "Print"}
            </button>
          ) : null}
          <button type="button" onClick={() => router.back()} className="rounded-full border border-slate-300 px-3.5 py-2 text-sm text-slate-600 transition hover:bg-slate-50">{isEs ? "Volver" : "Back"}</button>
        </div>
      </div>

      {isReadOnly ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <span>
            {isEs
              ? "Cotización convertida en pedido. No se puede editar."
              : "Quote converted to order. It can no longer be edited."}
          </span>
          {initialQuote?.convertedOrderId ? (
            <Link
              href={`/dashboard/orders/${initialQuote.convertedOrderId}`}
              className="inline-flex items-center gap-1.5 font-semibold text-emerald-900 underline underline-offset-2 hover:text-emerald-950"
            >
              {isEs ? "Ver pedido" : "View order"}
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          ) : null}
        </div>
      ) : null}

      {setupError || error ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{setupError || error}</div> : null}

      <form onSubmit={submit} className="space-y-6">
        <div className="grid gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-2">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-slate-700">{isEs ? "Tienda" : "Store"}</span>
            <select
              value={storeId}
              disabled={isEditing || isReadOnly}
              onChange={(event) => {
                const selected = stores.find((store) => store.id === event.target.value);
                setStoreId(event.target.value);
                setCurrency(selected?.currency ?? "USD");
                setCustomer(null);
                setCustomerQuery("");
                setItems([{ ...newItem }]);
              }}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none disabled:bg-slate-50 disabled:text-slate-500"
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
            <div className="flex items-center justify-between gap-2">
              <label htmlFor="quote-customer" className="text-sm font-medium text-slate-700">{isEs ? "Cliente" : "Customer"}</label>
              {!isReadOnly ? (
                <button
                  type="button"
                  disabled={!storeId}
                  onClick={() => openNewCustomerModal()}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-700 transition hover:text-cyan-800 disabled:opacity-50"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  {isEs ? "Nuevo cliente" : "New customer"}
                </button>
              ) : null}
            </div>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                id="quote-customer"
                value={customerQuery}
                disabled={isReadOnly}
                onChange={(event) => {
                  setCustomerQuery(event.target.value);
                  setCustomer(null);
                  setIsCustomerSearchOpen(true);
                }}
                placeholder={isEs ? "Buscar cliente..." : "Search customer..."}
                className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-10 text-sm outline-none focus:border-slate-400 disabled:bg-slate-50 disabled:text-slate-500"
                required
                role="combobox"
                aria-expanded={isCustomerSearchOpen}
                aria-controls="quote-customer-results"
                onFocus={() => {
                  if (!isReadOnly) setIsCustomerSearchOpen(true);
                }}
              />
              {customerQuery && !isReadOnly ? (
                <button
                  type="button"
                  onClick={() => {
                    setCustomer(null);
                    setCustomerQuery("");
                    setIsCustomerSearchOpen(true);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  aria-label={isEs ? "Limpiar cliente" : "Clear customer"}
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>
            {!isReadOnly && !isCustomerSearchOpen && customerQuery.trim() && !customer ? (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                <span>
                  {isEs
                    ? "Selecciona un cliente de la lista o crea uno nuevo."
                    : "Select a customer from the list or create a new one."}
                </span>
                <button
                  type="button"
                  onClick={() => openNewCustomerModal()}
                  className="inline-flex items-center gap-1 font-semibold text-cyan-800 underline underline-offset-2 hover:text-cyan-950"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  {isEs
                    ? `Crear "${customerQuery.trim()}"`
                    : `Create "${customerQuery.trim()}"`}
                </button>
              </div>
            ) : null}
            {!isReadOnly && isCustomerSearchOpen ? (
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
                        setError(null);
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
                <div className="border-t border-slate-100 p-1.5">
                  <button
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => openNewCustomerModal()}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-cyan-700 transition hover:bg-cyan-50"
                  >
                    <UserPlus className="h-4 w-4 shrink-0" />
                    <span className="truncate">
                      {customerQuery.trim() && !customer
                        ? isEs
                          ? `Crear "${customerQuery.trim()}" como nuevo cliente`
                          : `Create "${customerQuery.trim()}" as new customer`
                        : isEs
                          ? "Crear nuevo cliente"
                          : "Create new customer"}
                    </span>
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-slate-700">{isEs ? "Moneda" : "Currency"}</span>
            <select value={currency} disabled={isReadOnly} onChange={(event) => setCurrency(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm disabled:bg-slate-50 disabled:text-slate-500">
              {CURRENCIES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-slate-700">{isEs ? "Válida hasta" : "Valid until"}</span>
            <input type="date" value={validUntil} disabled={isReadOnly} onChange={(event) => setValidUntil(event.target.value)} className="rounded-xl border border-slate-200 px-4 py-3 text-sm disabled:bg-slate-50 disabled:text-slate-500" />
          </label>
          {isEditing && !isReadOnly ? (
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-slate-700">{isEs ? "Estado" : "Status"}</span>
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value as QuoteStatus)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
              >
                <option value="DRAFT">{isEs ? "Borrador" : "Draft"}</option>
                <option value="SENT">{isEs ? "Enviada" : "Sent"}</option>
                <option value="ACCEPTED">{isEs ? "Aceptada" : "Accepted"}</option>
                <option value="REJECTED">{isEs ? "Rechazada" : "Rejected"}</option>
                <option value="EXPIRED">{isEs ? "Vencida" : "Expired"}</option>
              </select>
            </label>
          ) : null}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">{isEs ? "Artículos" : "Line items"}</h2>
            {!isReadOnly ? (
              <button type="button" onClick={() => setItems((current) => [...current, { ...newItem }])} className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-3 py-1.5 text-sm text-slate-700"><Plus className="h-4 w-4" />{isEs ? "Agregar artículo" : "Add item"}</button>
            ) : null}
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
                        disabled={isReadOnly}
                        onChange={(event) => updateItem(index, { query: event.target.value, title: "", variantId: null, price: "0.00", isSearchOpen: true })}
                        onFocus={() => {
                          if (!isReadOnly) updateItem(index, { isSearchOpen: true });
                        }}
                        role="combobox"
                        aria-expanded={item.isSearchOpen}
                        aria-controls={`quote-products-${index}`}
                        placeholder={isEs ? "Buscar producto, SKU o código..." : "Search product, SKU, or barcode..."}
                        className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-10 text-sm outline-none focus:border-slate-400 disabled:bg-slate-50 disabled:text-slate-500"
                        required
                      />
                      {item.query && !isReadOnly ? (
                        <button
                          type="button"
                          onClick={() => updateItem(index, { ...newItem, quantity: item.quantity, isSearchOpen: true })}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                          aria-label={isEs ? "Limpiar producto" : "Clear product"}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      ) : null}
                    </div>
                    {!isReadOnly && item.isSearchOpen ? (
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
                  <input type="number" min="0" step="0.01" value={item.price} disabled={isReadOnly} onChange={(event) => updateItem(index, { price: event.target.value })} className="col-span-12 rounded-xl border border-slate-200 px-4 py-3 text-sm disabled:bg-slate-50 disabled:text-slate-500 sm:col-span-3" placeholder={isEs ? "Precio" : "Price"} />
                  <input type="number" min="1" step="1" value={item.quantity} disabled={isReadOnly} onChange={(event) => updateItem(index, { quantity: event.target.value })} className="col-span-9 rounded-xl border border-slate-200 px-4 py-3 text-sm disabled:bg-slate-50 disabled:text-slate-500 sm:col-span-2" placeholder={isEs ? "Cant." : "Qty"} />
                  <button type="button" disabled={isReadOnly || items.length === 1} onClick={() => setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="col-span-3 inline-flex items-center justify-center rounded-xl border border-rose-200 text-rose-700 disabled:opacity-50 sm:col-span-1" aria-label={isEs ? "Eliminar artículo" : "Remove item"}><Trash2 className="h-4 w-4" /></button>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-2"><span className="text-sm font-medium text-slate-700">{isEs ? "Impuesto" : "Tax"}</span><input type="number" min="0" step="0.01" value={tax} disabled={isReadOnly} onChange={(event) => setTax(event.target.value)} className="rounded-xl border border-slate-200 px-4 py-3 text-sm disabled:bg-slate-50 disabled:text-slate-500" /></label>
            <label className="flex flex-col gap-2"><span className="text-sm font-medium text-slate-700">{isEs ? "Envío" : "Shipping"}</span><input type="number" min="0" step="0.01" value={shipping} disabled={isReadOnly} onChange={(event) => setShipping(event.target.value)} className="rounded-xl border border-slate-200 px-4 py-3 text-sm disabled:bg-slate-50 disabled:text-slate-500" /></label>
          </div>
          <label className="mt-4 flex flex-col gap-2"><span className="text-sm font-medium text-slate-700">{isEs ? "Notas" : "Notes"}</span><textarea value={notes} disabled={isReadOnly} onChange={(event) => setNotes(event.target.value)} rows={3} className="rounded-xl border border-slate-200 px-4 py-3 text-sm disabled:bg-slate-50 disabled:text-slate-500" /></label>
          <p className="mt-5 text-right text-lg font-semibold text-slate-950">{currency} {total.toFixed(2)}</p>
        </div>

        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => router.back()} className="rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700">{isReadOnly ? (isEs ? "Volver" : "Back") : (isEs ? "Cancelar" : "Cancel")}</button>
          {!isReadOnly ? (
            <button type="submit" disabled={isSaving || !storeId} className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
              {isSaving
                ? isEs
                  ? "Guardando..."
                  : "Saving..."
                : isEditing
                  ? isEs
                    ? "Guardar cambios"
                    : "Save changes"
                  : isEs
                    ? "Crear cotización"
                    : "Create quote"}
            </button>
          ) : null}
        </div>
      </form>

      {isNewCustomerModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-[2px]"
          onClick={() => {
            if (!isCreatingCustomer) setIsNewCustomerModalOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-quote-customer-title"
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
              <div>
                <h2 id="new-quote-customer-title" className="text-base font-semibold text-slate-950">
                  {isEs ? "Nuevo cliente" : "New customer"}
                </h2>
                {activeStoreName ? (
                  <p className="mt-0.5 text-xs text-slate-500">
                    {isEs ? `Se agregará a ${activeStoreName}` : `Will be added to ${activeStoreName}`}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                disabled={isCreatingCustomer}
                onClick={() => setIsNewCustomerModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
                aria-label={isEs ? "Cerrar" : "Close"}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="space-y-4 p-5">
              {newCustomerError ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700">
                  {newCustomerError}
                </div>
              ) : null}

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium text-slate-700">{isEs ? "Nombre" : "First name"}</span>
                  <input
                    type="text"
                    value={newCustomerFirstName}
                    onChange={(event) => setNewCustomerFirstName(event.target.value)}
                    placeholder={isEs ? "Ej. Bryan" : "e.g. Bryan"}
                    className="rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-slate-400"
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium text-slate-700">{isEs ? "Apellido" : "Last name"}</span>
                  <input
                    type="text"
                    value={newCustomerLastName}
                    onChange={(event) => setNewCustomerLastName(event.target.value)}
                    placeholder={isEs ? "Ej. Daryl" : "e.g. Daryl"}
                    className="rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-slate-400"
                  />
                </label>
              </div>

              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-slate-700">
                  {isEs ? "Correo electrónico" : "Email"} <span className="text-rose-500">*</span>
                </span>
                <input
                  type="email"
                  required
                  autoFocus
                  value={newCustomerEmail}
                  onChange={(event) => setNewCustomerEmail(event.target.value)}
                  placeholder="customer@example.com"
                  className="rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-slate-400"
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-slate-700">
                  {isEs ? "Teléfono (opcional)" : "Phone (optional)"}
                </span>
                <input
                  type="tel"
                  value={newCustomerPhone}
                  onChange={(event) => setNewCustomerPhone(event.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-slate-400"
                />
              </label>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  disabled={isCreatingCustomer}
                  onClick={() => setIsNewCustomerModalOpen(false)}
                  className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  {isEs ? "Cancelar" : "Cancel"}
                </button>
                <button
                  type="submit"
                  disabled={isCreatingCustomer}
                  className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
                >
                  {isCreatingCustomer ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {isEs ? "Creando..." : "Creating..."}
                    </>
                  ) : (
                    isEs ? "Crear cliente" : "Create customer"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}
