"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Plus, Search, Trash2, X } from "lucide-react";
import { useLanguage } from "@/lib/i18n/language-context";
import { CURRENCIES } from "../../stores/store-form-controls";

type Store = {
  id: string;
  name: string;
  currency: string;
};

type OrderItemForm = {
  title: string;
  price: string;
  quantity: string;
  variantId: string | null;
  query: string;
  isSearchOpen: boolean;
  activeResultIndex: number;
};

type CustomerLookupResult = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
};

type ProductLookupResult = {
  id: string;
  title: string;
  slug: string;
  variants: Array<{
    id: string;
    title: string;
    sku: string | null;
    barcode: string | null;
    price: string | number;
    inventory: number;
  }>;
};

type ProductOption = {
  variantId: string;
  title: string;
  sku: string | null;
  barcode: string | null;
  price: number;
  inventory: number;
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
  variantId: null,
  query: "",
  isSearchOpen: false,
  activeResultIndex: -1,
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
  const [customerQuery, setCustomerQuery] = useState("");
  const [customers, setCustomers] = useState<CustomerLookupResult[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerLookupResult | null>(null);
  const [isCustomerListOpen, setIsCustomerListOpen] = useState(false);
  const [activeCustomerIndex, setActiveCustomerIndex] = useState(-1);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);
  const [customerLookupError, setCustomerLookupError] = useState<string | null>(null);
  const [status, setStatus] = useState<"PENDING" | "PROCESSING" | "COMPLETED" | "CANCELLED">("PENDING");
  const [paymentStatus, setPaymentStatus] = useState<"UNPAID" | "PAID" | "REFUNDED" | "FAILED">("UNPAID");
  const [tax, setTax] = useState("0.00");
  const [shipping, setShipping] = useState("0.00");
  const [currency, setCurrency] = useState(stores[0]?.currency ?? "USD");
  const [items, setItems] = useState<OrderItemForm[]>([{ ...emptyItem }]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [productLookupError, setProductLookupError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeStore = stores.find((store) => store.id === activeStoreId) ?? null;

  useEffect(() => {
    const controller = new AbortController();

    async function loadCustomers() {
      if (!activeStoreId) {
        setCustomers([]);
        return;
      }

      setIsLoadingCustomers(true);
      setCustomerLookupError(null);

      try {
        const response = await fetch(
          `/api/customers?storeId=${encodeURIComponent(activeStoreId)}`,
          { cache: "no-store", signal: controller.signal },
        );
        const result = (await response.json()) as CustomerLookupResult[] | { error?: string };

        if (!response.ok || !Array.isArray(result)) {
          throw new Error(
            !Array.isArray(result) && result.error
              ? result.error
              : isEs
                ? "No se pudieron cargar los clientes."
                : "Could not load customers.",
          );
        }

        setCustomers(result);
      } catch (lookupError) {
        if (lookupError instanceof DOMException && lookupError.name === "AbortError") {
          return;
        }

        setCustomers([]);
        setCustomerLookupError(
          lookupError instanceof Error
            ? lookupError.message
            : isEs
              ? "No se pudieron cargar los clientes."
              : "Could not load customers.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setIsLoadingCustomers(false);
        }
      }
    }

    void loadCustomers();
    return () => controller.abort();
  }, [activeStoreId, isEs]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadProducts() {
      if (!activeStoreId) {
        setProducts([]);
        return;
      }

      setIsLoadingProducts(true);
      setProductLookupError(null);

      try {
        const response = await fetch(
          `/api/products?storeId=${encodeURIComponent(activeStoreId)}&status=ACTIVE`,
          { cache: "no-store", signal: controller.signal },
        );
        const result = (await response.json()) as ProductLookupResult[] | { error?: string };

        if (!response.ok || !Array.isArray(result)) {
          throw new Error(
            !Array.isArray(result) && result.error
              ? result.error
              : isEs
                ? "No se pudieron cargar los productos."
                : "Could not load products.",
          );
        }

        setProducts(
          result.flatMap((product) =>
            product.variants.map((variant) => ({
              variantId: variant.id,
              title:
                product.variants.length > 1
                  ? `${product.title} (${variant.title})`
                  : product.title,
              sku: variant.sku,
              barcode: variant.barcode,
              price: Number(variant.price),
              inventory: Number(variant.inventory),
            })),
          ),
        );
      } catch (lookupError) {
        if (lookupError instanceof DOMException && lookupError.name === "AbortError") {
          return;
        }

        setProducts([]);
        setProductLookupError(
          lookupError instanceof Error
            ? lookupError.message
            : isEs
              ? "No se pudieron cargar los productos."
              : "Could not load products.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setIsLoadingProducts(false);
        }
      }
    }

    void loadProducts();
    return () => controller.abort();
  }, [activeStoreId, isEs]);

  const filteredCustomers = useMemo(() => {
    const query = customerQuery.trim().toLowerCase();
    if (!query) return customers.slice(0, 10);

    return customers
      .filter((customer) =>
        [
          customer.email,
          customer.firstName,
          customer.lastName,
          `${customer.firstName ?? ""} ${customer.lastName ?? ""}`,
          customer.phone,
        ]
          .filter(Boolean)
          .some((value) => value?.toLowerCase().includes(query)),
      )
      .slice(0, 10);
  }, [customerQuery, customers]);

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

  function getProductResults(query: string) {
    const normalizedQuery = query.trim().toLowerCase();
    const matches = normalizedQuery
      ? products.filter((product) =>
          [product.title, product.sku, product.barcode]
            .filter(Boolean)
            .some((value) => value?.toLowerCase().includes(normalizedQuery)),
        )
      : products;

    return matches.slice(0, 10);
  }

  function selectProduct(index: number, product: ProductOption) {
    updateItem(index, {
      title: product.title,
      price: toMoney(Number.isFinite(product.price) ? product.price : 0),
      variantId: product.variantId,
      query: product.title,
      isSearchOpen: false,
      activeResultIndex: -1,
    });
  }

  function selectCustomer(customer: CustomerLookupResult) {
    const fullName = [customer.firstName, customer.lastName].filter(Boolean).join(" ");
    setSelectedCustomer(customer);
    setCustomerEmail(customer.email);
    setCustomerQuery(fullName || customer.email);
    setIsCustomerListOpen(false);
    setActiveCustomerIndex(-1);
    setCustomerLookupError(null);
  }

  function clearCustomer() {
    setSelectedCustomer(null);
    setCustomerEmail("");
    setCustomerQuery("");
    setIsCustomerListOpen(true);
    setActiveCustomerIndex(-1);
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
          variantId: item.variantId,
        }))
        .filter((item) => item.title && item.quantity > 0);

      if (!activeStoreId) {
        throw new Error(isEs ? "Selecciona una tienda antes de crear un pedido." : "Select a store before creating an order.");
      }

      if (!customerEmail.trim()) {
        throw new Error(isEs ? "Selecciona un cliente." : "Select a customer.");
      }

      if (preparedItems.length === 0) {
        throw new Error(isEs ? "Agrega al menos un artículo." : "Add at least one line item.");
      }

      if (items.some((item) => !item.variantId)) {
        throw new Error(
          isEs
            ? "Selecciona un producto para cada artículo."
            : "Select a product for each line item.",
        );
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
            <h2 className="text-2xl font-semibold text-slate-950">
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
                    setSelectedCustomer(null);
                    setCustomerEmail("");
                    setCustomerQuery("");
                    setCustomers([]);
                    setIsCustomerListOpen(false);
                    setActiveCustomerIndex(-1);
                    setProducts([]);
                    setItems([{ ...emptyItem }]);
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

              <div
                className="relative flex flex-col gap-2"
                onBlur={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                    setIsCustomerListOpen(false);
                    setActiveCustomerIndex(-1);
                  }
                }}
              >
                <label htmlFor="customer-search" className="text-sm font-medium text-slate-700">
                  {isEs ? "Cliente" : "Customer"}
                </label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="customer-search"
                    type="text"
                    role="combobox"
                    aria-autocomplete="list"
                    aria-controls="customer-search-results"
                    aria-expanded={isCustomerListOpen}
                    aria-activedescendant={
                      activeCustomerIndex >= 0
                        ? `customer-search-result-${filteredCustomers[activeCustomerIndex]?.id}`
                        : undefined
                    }
                    value={customerQuery}
                    onChange={(event) => {
                      setCustomerQuery(event.target.value);
                      setSelectedCustomer(null);
                      setCustomerEmail("");
                      setIsCustomerListOpen(true);
                      setActiveCustomerIndex(-1);
                    }}
                    onFocus={() => setIsCustomerListOpen(true)}
                    onKeyDown={(event) => {
                      if (event.key === "ArrowDown") {
                        event.preventDefault();
                        setIsCustomerListOpen(true);
                        setActiveCustomerIndex((current) =>
                          Math.min(current + 1, filteredCustomers.length - 1),
                        );
                      } else if (event.key === "ArrowUp") {
                        event.preventDefault();
                        setActiveCustomerIndex((current) => Math.max(current - 1, 0));
                      } else if (event.key === "Enter" && isCustomerListOpen) {
                        event.preventDefault();
                        const customer = filteredCustomers[activeCustomerIndex];
                        if (customer) selectCustomer(customer);
                      } else if (event.key === "Escape") {
                        setIsCustomerListOpen(false);
                        setActiveCustomerIndex(-1);
                      }
                    }}
                    placeholder={
                      isEs
                        ? "Buscar por nombre, correo o teléfono..."
                        : "Search by name, email, or phone..."
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-10 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
                    autoComplete="off"
                    required
                  />
                  {isLoadingCustomers ? (
                    <Loader2 className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-400" />
                  ) : customerQuery ? (
                    <button
                      type="button"
                      onClick={clearCustomer}
                      className="absolute right-2.5 top-1/2 rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                      aria-label={isEs ? "Limpiar cliente" : "Clear customer"}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>

                {isCustomerListOpen ? (
                  <div
                    id="customer-search-results"
                    role="listbox"
                    aria-label={isEs ? "Resultados de clientes" : "Customer results"}
                    className="absolute inset-x-0 top-full z-20 mt-1 max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
                  >
                    {filteredCustomers.length > 0 ? (
                      filteredCustomers.map((customer, index) => {
                        const fullName =
                          [customer.firstName, customer.lastName].filter(Boolean).join(" ") ||
                          (isEs ? "Sin nombre" : "Unnamed customer");
                        return (
                          <button
                            key={customer.id}
                            id={`customer-search-result-${customer.id}`}
                            type="button"
                            role="option"
                            aria-selected={selectedCustomer?.id === customer.id}
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => selectCustomer(customer)}
                            onMouseEnter={() => setActiveCustomerIndex(index)}
                            className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition ${
                              activeCustomerIndex === index ? "bg-slate-100" : "hover:bg-slate-50"
                            }`}
                          >
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-medium text-slate-900">
                                {fullName}
                              </span>
                              <span className="block truncate text-xs text-slate-500">
                                {customer.email}
                                {customer.phone ? ` · ${customer.phone}` : ""}
                              </span>
                            </span>
                            {selectedCustomer?.id === customer.id ? (
                              <Check className="h-4 w-4 shrink-0 text-cyan-600" />
                            ) : null}
                          </button>
                        );
                      })
                    ) : (
                      <p className="px-4 py-3 text-sm text-slate-500">
                        {isLoadingCustomers
                          ? isEs
                            ? "Cargando clientes..."
                            : "Loading customers..."
                          : customerLookupError
                            ? customerLookupError
                            : isEs
                              ? "No se encontraron clientes."
                              : "No customers found."}
                      </p>
                    )}
                  </div>
                ) : null}
                {customerLookupError && !isCustomerListOpen ? (
                  <p className="text-xs text-rose-600">{customerLookupError}</p>
                ) : null}
              </div>

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

          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
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
                <div key={index} className="grid grid-cols-12 gap-3">
                  <div
                    className="relative col-span-12 sm:col-span-6"
                    onBlur={(event) => {
                      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                        updateItem(index, { isSearchOpen: false, activeResultIndex: -1 });
                      }
                    }}
                  >
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        role="combobox"
                        aria-autocomplete="list"
                        aria-controls={`product-search-results-${index}`}
                        aria-expanded={item.isSearchOpen}
                        aria-activedescendant={
                          item.activeResultIndex >= 0
                            ? `product-search-result-${index}-${getProductResults(item.query)[item.activeResultIndex]?.variantId}`
                            : undefined
                        }
                        value={item.query}
                        onChange={(event) =>
                          updateItem(index, {
                            query: event.target.value,
                            title: "",
                            variantId: null,
                            price: "0.00",
                            isSearchOpen: true,
                            activeResultIndex: -1,
                          })
                        }
                        onFocus={() => updateItem(index, { isSearchOpen: true })}
                        onKeyDown={(event) => {
                          const results = getProductResults(item.query);
                          if (event.key === "ArrowDown") {
                            event.preventDefault();
                            updateItem(index, {
                              isSearchOpen: true,
                              activeResultIndex: Math.min(
                                item.activeResultIndex + 1,
                                results.length - 1,
                              ),
                            });
                          } else if (event.key === "ArrowUp") {
                            event.preventDefault();
                            updateItem(index, {
                              activeResultIndex: Math.max(item.activeResultIndex - 1, 0),
                            });
                          } else if (event.key === "Enter" && item.isSearchOpen) {
                            event.preventDefault();
                            const product = results[item.activeResultIndex];
                            if (product) selectProduct(index, product);
                          } else if (event.key === "Escape") {
                            updateItem(index, { isSearchOpen: false, activeResultIndex: -1 });
                          }
                        }}
                        placeholder={
                          isEs
                            ? "Buscar producto, SKU o código..."
                            : "Search product, SKU, or barcode..."
                        }
                        className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-10 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
                        autoComplete="off"
                        required
                      />
                      {isLoadingProducts ? (
                        <Loader2 className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-400" />
                      ) : item.query ? (
                        <button
                          type="button"
                          onClick={() =>
                            updateItem(index, {
                              ...emptyItem,
                              quantity: item.quantity,
                              isSearchOpen: true,
                            })
                          }
                          className="absolute right-2.5 top-1/2 rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                          aria-label={isEs ? "Limpiar producto" : "Clear product"}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      ) : null}
                    </div>

                    {item.isSearchOpen ? (
                      <div
                        id={`product-search-results-${index}`}
                        role="listbox"
                        aria-label={isEs ? "Resultados de productos" : "Product results"}
                        className="absolute inset-x-0 top-full z-20 mt-1 max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
                      >
                        {getProductResults(item.query).length > 0 ? (
                          getProductResults(item.query).map((product, resultIndex) => (
                            <button
                              key={product.variantId}
                              id={`product-search-result-${index}-${product.variantId}`}
                              type="button"
                              role="option"
                              aria-selected={item.variantId === product.variantId}
                              onMouseDown={(event) => event.preventDefault()}
                              onClick={() => selectProduct(index, product)}
                              onMouseEnter={() =>
                                updateItem(index, { activeResultIndex: resultIndex })
                              }
                              className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition ${
                                item.activeResultIndex === resultIndex
                                  ? "bg-slate-100"
                                  : "hover:bg-slate-50"
                              }`}
                            >
                              <span className="min-w-0">
                                <span className="block truncate text-sm font-medium text-slate-900">
                                  {product.title}
                                </span>
                                <span className="block truncate text-xs text-slate-500">
                                  {[product.sku, product.barcode]
                                    .filter(Boolean)
                                    .join(" · ") ||
                                    (isEs ? "Sin código" : "No code")}
                                </span>
                              </span>
                              <span className="shrink-0 text-right">
                                <span className="block text-sm font-semibold text-slate-900">
                                  {currency} {toMoney(product.price)}
                                </span>
                                <span className="block text-[11px] text-slate-500">
                                  {product.inventory} {isEs ? "disponibles" : "available"}
                                </span>
                              </span>
                            </button>
                          ))
                        ) : (
                          <p className="px-4 py-3 text-sm text-slate-500">
                            {isLoadingProducts
                              ? isEs
                                ? "Cargando productos..."
                                : "Loading products..."
                              : productLookupError
                                ? productLookupError
                                : isEs
                                  ? "No se encontraron productos."
                                  : "No products found."}
                          </p>
                        )}
                      </div>
                    ) : null}
                    {productLookupError && !item.isSearchOpen ? (
                      <p className="mt-1 text-xs text-rose-600">{productLookupError}</p>
                    ) : null}
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.price}
                    onChange={(event) => updateItem(index, { price: event.target.value })}
                    placeholder={isEs ? "Precio" : "Price"}
                    className="col-span-12 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400 sm:col-span-3"
                  />
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={item.quantity}
                    onChange={(event) => updateItem(index, { quantity: event.target.value })}
                    placeholder={isEs ? "Cant." : "Qty"}
                    className="col-span-9 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400 sm:col-span-2"
                  />
                  <button
                    type="button"
                    disabled={items.length === 1}
                    onClick={() => removeItem(index)}
                    className="col-span-3 inline-flex items-center justify-center rounded-xl border border-rose-200 py-3 text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50 sm:col-span-1"
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
                <select
                  value={currency}
                  onChange={(event) => setCurrency(event.target.value)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm uppercase outline-none transition focus:border-slate-400"
                  required
                >
                  {CURRENCIES.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
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
