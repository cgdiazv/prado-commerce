"use client";

import { useState, type KeyboardEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/lib/i18n/language-context";

import { CustomerCreditModule } from "./customer-credit-module";

type Store = {
  id: string;
  name: string;
  currency: string;
  lateInterestRate?: number | null;
  lateInterestGraceDays?: number | null;
};

type AddressForm = {
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
};

type CustomerGroup = {
  id: string;
  name: string;
};

type AddressRecord = {
  line1?: string | null;
  line2?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
};

export type CustomerOrderItem = {
  id: string;
  title: string;
  quantity: number;
  price: number;
};

export type CustomerOrder = {
  id: string;
  orderNumber: number;
  total: number;
  currency: string;
  status: string;
  paymentStatus: string;
  dueDate?: string | null;
  interestAmount?: number;
  createdAt: string;
  items: CustomerOrderItem[];
};

type CustomerPaymentRecord = {
  id: string;
  storeId: string;
  customerId: string;
  orderId?: string | null;
  orderNumber?: number | null;
  amount: number;
  interestAmount: number;
  paymentMethod: string;
  reference?: string | null;
  notes?: string | null;
  receivedBy?: string | null;
  paidAt: string;
  createdAt?: string;
};

type Customer = {
  id: string;
  storeId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  groupId?: string | null;
  taxExempt?: boolean;
  taxExemptEnabled?: boolean;
  shippingAddress: AddressRecord | null;
  billingAddress: AddressRecord | null;
  allowCredit?: boolean;
  creditLimit?: number;
  creditDays?: number;
  creditInterestRate?: number;
  orders?: CustomerOrder[];
  payments?: CustomerPaymentRecord[];
};

type EditCustomerFormProps = {
  stores: Store[];
  customer: Customer;
  groups?: CustomerGroup[];
};

const customerTabs = ["details", "addresses", "credit", "accounts", "history"] as const;
type CustomerTab = (typeof customerTabs)[number];

export function EditCustomerForm({ stores, customer, groups = [] }: EditCustomerFormProps) {
  const router = useRouter();
  const { language } = useLanguage();
  const isEs = language === "es";
  const [activeTab, setActiveTab] = useState<CustomerTab>("details");
  const [historyYear, setHistoryYear] = useState("");
  const [historyProduct, setHistoryProduct] = useState("");

  const [groupId, setGroupId] = useState(customer.groupId ?? "");
  const [email, setEmail] = useState(customer.email);
  const [firstName, setFirstName] = useState(customer.firstName ?? "");
  const [lastName, setLastName] = useState(customer.lastName ?? "");
  const [phone, setPhone] = useState(customer.phone ?? "");
  const [taxExempt, setTaxExempt] = useState(customer.taxExempt ?? false);

  const [allowCredit, setAllowCredit] = useState(customer.allowCredit ?? false);
  const [creditLimit, setCreditLimit] = useState(String(customer.creditLimit ?? 0));
  const [creditDays, setCreditDays] = useState(String(customer.creditDays ?? 30));
  const [creditInterestRate, setCreditInterestRate] = useState(String(customer.creditInterestRate ?? 0));

  const initShipping: AddressForm = {
    line1: customer.shippingAddress?.line1 ?? "",
    line2: customer.shippingAddress?.line2 ?? "",
    city: customer.shippingAddress?.city ?? "",
    state: customer.shippingAddress?.state ?? "",
    postalCode: customer.shippingAddress?.postalCode ?? "",
    country: customer.shippingAddress?.country ?? "",
  };

  const initBilling: AddressForm = {
    line1: customer.billingAddress?.line1 ?? "",
    line2: customer.billingAddress?.line2 ?? "",
    city: customer.billingAddress?.city ?? "",
    state: customer.billingAddress?.state ?? "",
    postalCode: customer.billingAddress?.postalCode ?? "",
    country: customer.billingAddress?.country ?? "",
  };

  const [shippingAddress, setShippingAddress] = useState<AddressForm>(initShipping);
  const [billingAddress, setBillingAddress] = useState<AddressForm>(initBilling);
  const [sameAsShipping, setSameAsShipping] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const activeStore = stores.find((s) => s.id === customer.storeId);
  const effectiveBillingAddress = sameAsShipping ? shippingAddress : billingAddress;

  function handleTabKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;

    event.preventDefault();
    const currentIndex = customerTabs.indexOf(activeTab);
    const nextIndex = event.key === "Home"
      ? 0
      : event.key === "End"
        ? customerTabs.length - 1
        : (currentIndex + (event.key === "ArrowRight" ? 1 : -1) + customerTabs.length) % customerTabs.length;
    const nextTab = customerTabs[nextIndex];
    setActiveTab(nextTab);
    document.getElementById(`customer-tab-${nextTab}`)?.focus();
  }

  function updateShippingAddress(field: keyof AddressForm, value: string) {
    setShippingAddress((current) => ({ ...current, [field]: value }));
  }

  function updateBillingAddress(field: keyof AddressForm, value: string) {
    setBillingAddress((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const invalidField = event.currentTarget.querySelector<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(":invalid");
    if (invalidField) {
      const panel = invalidField.closest<HTMLElement>("[data-customer-tab]");
      const tab = customerTabs.find((candidate) => candidate === panel?.dataset.customerTab);
      if (tab) setActiveTab(tab);
      setSuccess(null);
      setError(invalidField.validationMessage);
      requestAnimationFrame(() => invalidField.focus());
      return;
    }
    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      if (!email.trim()) {
        throw new Error(isEs ? "El correo electrónico del cliente es obligatorio." : "Customer email is required.");
      }

      const response = await fetch(`/api/customers/${customer.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          firstName,
          lastName,
          phone,
          groupId: groupId || null,
          taxExempt,
          shippingAddress,
          billingAddress: effectiveBillingAddress,
          allowCredit,
          creditLimit: parseFloat(creditLimit) || 0,
          creditDays: parseInt(creditDays, 10) || 30,
          creditInterestRate: parseFloat(creditInterestRate) || 0,
        }),
      });

      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(result.error ?? (isEs ? "Error al actualizar el cliente" : "Failed to update customer"));
      }

      setSuccess(isEs ? "¡Perfil de cliente actualizado con éxito!" : "Customer profile updated successfully!");
      router.refresh();
      setTimeout(() => {
        router.push(`/dashboard/customers?storeId=${encodeURIComponent(customer.storeId)}`);
      }, 1000);
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : isEs
            ? "Error al actualizar el cliente"
            : "Failed to update customer",
      );
    } finally {
      setIsSaving(false);
    }
  }

  const orders = customer.orders || [];
  const historyYears = [...new Set(orders.map((order) => new Date(order.createdAt).getFullYear()))].sort((a, b) => b - a);
  const historyProducts = [...new Set(orders.flatMap((order) => order.items.map((item) => item.title)))].sort((a, b) => a.localeCompare(b));
  const filteredOrders = orders.filter((order) =>
    (!historyYear || String(new Date(order.createdAt).getFullYear()) === historyYear) &&
    (!historyProduct || order.items.some((item) => item.title === historyProduct)),
  );
  const currencyCode = activeStore?.currency || (isEs ? "Moneda desconocida" : "Unknown currency");
  const tabLabels: Record<CustomerTab, string> = isEs
    ? {
        details: "Detalles del cliente",
        addresses: "Direcciones",
        credit: "Condiciones de crédito",
        accounts: "Cuentas por cobrar",
        history: "Historial de compras",
      }
    : {
        details: "Customer Details",
        addresses: "Addresses",
        credit: "Credit & Collection Terms",
        accounts: "Accounts Receivable",
        history: "Purchase History",
      };

  return (
    <section className="min-w-0 space-y-6">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-950">
            {isEs ? "Actualizar perfil de cliente" : "Update customer profile"}
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

      {success && (
        <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {success}
        </div>
      )}

      <div
        role="tablist"
        aria-label={isEs ? "Secciones del perfil de cliente" : "Customer profile sections"}
        className="flex min-w-0 flex-row overflow-x-auto border-b border-slate-200 bg-slate-50/70"
      >
        {customerTabs.map((tab) => (
            <button
              key={tab}
              id={`customer-tab-${tab}`}
              type="button"
              role="tab"
              aria-selected={activeTab === tab}
              aria-controls={`customer-panel-${tab}`}
              tabIndex={activeTab === tab ? 0 : -1}
              onClick={() => setActiveTab(tab)}
              onKeyDown={handleTabKeyDown}
              className={`flex shrink-0 items-center border-b-4 px-4 py-3 text-left text-xs font-bold transition ${
                activeTab === tab
                  ? "border-cyan-600 bg-white text-cyan-700"
                  : "border-transparent text-slate-500 hover:bg-white/70 hover:text-slate-800"
              }`}
            >
              {tabLabels[tab]}
            </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} noValidate hidden={activeTab === "accounts" || activeTab === "history"} className="space-y-6">
        <div id="customer-panel-details" role="tabpanel" aria-labelledby="customer-tab-details" data-customer-tab="details" hidden={activeTab !== "details"}>
        {/* Customer Details Card */}
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
            {isEs ? "Detalles del cliente" : "Customer details"}
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Store Selection Card (Readonly) */}
            <div className="space-y-2 sm:col-span-2">
              <span className="text-sm font-medium text-slate-700">{isEs ? "Tienda" : "Store"}</span>
              <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 font-medium">
                {activeStore ? `${activeStore.name} / ${activeStore.currency}` : isEs ? "Tienda desconocida" : "Unknown Store"}
              </div>
            </div>

            <label className="flex flex-col gap-2 sm:col-span-2 lg:col-span-1">
              <span className="text-sm font-medium text-slate-700">{isEs ? "Correo electrónico" : "Email"}</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="customer@example.com"
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
                required
              />
            </label>

            <label className="flex flex-col gap-2 sm:col-span-2 lg:col-span-1">
              <span className="text-sm font-medium text-slate-700">{isEs ? "Teléfono" : "Phone"}</span>
              <input
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="+1 555 123 4567"
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-slate-700">{isEs ? "Nombre" : "First name"}</span>
              <input
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                placeholder="Jane"
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-slate-700">{isEs ? "Apellido" : "Last name"}</span>
              <input
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                placeholder="Doe"
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
              />
            </label>

            <label className="flex flex-col gap-2 sm:col-span-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700">{isEs ? "Grupo de clientes" : "Customer group"}</span>
                <a
                  href={`/dashboard/customers/groups/new?storeId=${encodeURIComponent(customer.storeId)}`}
                  className="text-xs font-semibold text-cyan-700 hover:text-cyan-800"
                >
                  {isEs ? "+ Crear nuevo grupo" : "+ Create new group"}
                </a>
              </div>
              <select
                value={groupId}
                onChange={(event) => setGroupId(event.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
              >
                <option value="">{isEs ? "Ninguno (Cliente estándar)" : "None (Standard customer)"}</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {customer.taxExemptEnabled ? (
            <label className="mt-4 flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              <span>
                <span className="block font-medium">{isEs ? "Cliente exento de impuestos" : "Tax-exempt customer"}</span>
                <span className="mt-1 block text-xs text-slate-500">
                  {isEs
                    ? "No se cobrará impuesto automáticamente en los pedidos de este cliente."
                    : "Automatic tax will not be charged on this customer’s orders."}
                </span>
              </span>
              <input
                type="checkbox"
                checked={taxExempt}
                onChange={(event) => setTaxExempt(event.target.checked)}
                className="h-4 w-4 accent-slate-900"
              />
            </label>
          ) : null}
        </div>
        </div>

        <div id="customer-panel-addresses" role="tabpanel" aria-labelledby="customer-tab-addresses" data-customer-tab="addresses" hidden={activeTab !== "addresses"}>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
              {isEs ? "Dirección de envío" : "Shipping address"}
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-2 sm:col-span-2">
                <span className="text-sm font-medium text-slate-700">{isEs ? "Dirección línea 1" : "Address line 1"}</span>
                <input
                  value={shippingAddress.line1}
                  onChange={(event) => updateShippingAddress("line1", event.target.value)}
                  placeholder="123 Main St"
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
                />
              </label>

              <label className="flex flex-col gap-2 sm:col-span-2">
                <span className="text-sm font-medium text-slate-700">{isEs ? "Dirección línea 2" : "Address line 2"}</span>
                <input
                  value={shippingAddress.line2}
                  onChange={(event) => updateShippingAddress("line2", event.target.value)}
                  placeholder={isEs ? "Apartamento, suite, etc." : "Apartment, suite, etc."}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-slate-700">{isEs ? "Ciudad" : "City"}</span>
                <input
                  value={shippingAddress.city}
                  onChange={(event) => updateShippingAddress("city", event.target.value)}
                  placeholder="New York"
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-slate-700">{isEs ? "Estado / Región" : "State / Region"}</span>
                <input
                  value={shippingAddress.state}
                  onChange={(event) => updateShippingAddress("state", event.target.value)}
                  placeholder="NY"
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-slate-700">{isEs ? "Código postal" : "Postal code"}</span>
                <input
                  value={shippingAddress.postalCode}
                  onChange={(event) => updateShippingAddress("postalCode", event.target.value)}
                  placeholder="10001"
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-slate-700">{isEs ? "País" : "Country"}</span>
                <input
                  value={shippingAddress.country}
                  onChange={(event) => updateShippingAddress("country", event.target.value)}
                  placeholder={isEs ? "Estados Unidos" : "United States"}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
                />
              </label>
            </div>
          </div>
          <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                {isEs ? "Dirección de facturación" : "Billing address"}
              </p>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={sameAsShipping}
                  onChange={(event) => setSameAsShipping(event.target.checked)}
                  className="h-4 w-4 accent-slate-900"
                />
                {isEs ? "Igual a la dirección de envío" : "Same as shipping address"}
              </label>
            </div>
            {sameAsShipping && (
              <p className="text-xs text-slate-500">
                {isEs
                  ? "Desmarca la casilla para recuperar la dirección de facturación anterior."
                  : "Uncheck to restore the previous billing address."}
              </p>
            )}
            <fieldset disabled={sameAsShipping} className="grid gap-4 sm:grid-cols-2 disabled:opacity-60">
              <label className="flex flex-col gap-2 sm:col-span-2">
                <span className="text-sm font-medium text-slate-700">{isEs ? "Dirección línea 1" : "Address line 1"}</span>
                <input
                  value={effectiveBillingAddress.line1}
                  onChange={(event) => updateBillingAddress("line1", event.target.value)}
                  placeholder="123 Main St"
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
                />
              </label>

              <label className="flex flex-col gap-2 sm:col-span-2">
                <span className="text-sm font-medium text-slate-700">{isEs ? "Dirección línea 2" : "Address line 2"}</span>
                <input
                  value={effectiveBillingAddress.line2}
                  onChange={(event) => updateBillingAddress("line2", event.target.value)}
                  placeholder={isEs ? "Apartamento, suite, etc." : "Apartment, suite, etc."}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-slate-700">{isEs ? "Ciudad" : "City"}</span>
                <input
                  value={effectiveBillingAddress.city}
                  onChange={(event) => updateBillingAddress("city", event.target.value)}
                  placeholder="New York"
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-slate-700">{isEs ? "Estado / Región" : "State / Region"}</span>
                <input
                  value={effectiveBillingAddress.state}
                  onChange={(event) => updateBillingAddress("state", event.target.value)}
                  placeholder="NY"
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-slate-700">{isEs ? "Código postal" : "Postal code"}</span>
                <input
                  value={effectiveBillingAddress.postalCode}
                  onChange={(event) => updateBillingAddress("postalCode", event.target.value)}
                  placeholder="10001"
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-slate-700">{isEs ? "País" : "Country"}</span>
                <input
                  value={effectiveBillingAddress.country}
                  onChange={(event) => updateBillingAddress("country", event.target.value)}
                  placeholder={isEs ? "Estados Unidos" : "United States"}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
                />
              </label>
            </fieldset>
          </div>
          </div>
        </div>

        <div id="customer-panel-credit" role="tabpanel" aria-labelledby="customer-tab-credit" data-customer-tab="credit" hidden={activeTab !== "credit"}>
          {/* Condiciones Comerciales y Línea de Crédito */}
          <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                  {isEs ? "Condiciones de Crédito y Cobranza" : "Credit & Collection Terms"}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {isEs
                    ? "Configura la autorización de compras al crédito, cupo máximo y tasa de mora."
                    : "Configure credit purchase authorization, maximum limit, and late interest rate."}
                </p>
              </div>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={allowCredit}
                  onChange={(e) => setAllowCredit(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-xs font-bold text-slate-800">
                  {isEs ? "Habilitar Crédito" : "Enable Credit"}
                </span>
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-3 pt-1">
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-slate-700">
                  {isEs ? "Límite de Crédito" : "Credit Limit"}{currencyCode ? ` (${currencyCode})` : ""}
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  disabled={!allowCredit}
                  value={creditLimit}
                  onChange={(event) => setCreditLimit(event.target.value)}
                  placeholder="0.00"
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold font-mono outline-none transition placeholder:text-slate-400 focus:border-slate-400 disabled:bg-slate-50 disabled:text-slate-400"
                />
                <span className="text-[11px] text-slate-400">
                  {isEs ? "Monto máximo autorizado para deber." : "Max authorized outstanding amount."}
                </span>
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-slate-700">
                  {isEs ? "Plazo de Crédito (Días)" : "Credit Terms (Days)"}
                </span>
                <input
                  type="number"
                  step="1"
                  min="1"
                  disabled={!allowCredit}
                  value={creditDays}
                  onChange={(event) => setCreditDays(event.target.value)}
                  placeholder="30"
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition placeholder:text-slate-400 focus:border-slate-400 disabled:bg-slate-50 disabled:text-slate-400"
                />
                <span className="text-[11px] text-slate-400">
                  {isEs ? "Días para vencimiento (ej. 15, 30, 60)." : "Days until due (e.g. 15, 30, 60)."}
                </span>
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-slate-700">
                  {isEs ? "Tasa Mensual por Mora (%)" : "Monthly Late Rate (%)"}
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  disabled={!allowCredit}
                  value={creditInterestRate}
                  onChange={(event) => setCreditInterestRate(event.target.value)}
                  placeholder="0.00"
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition placeholder:text-slate-400 focus:border-slate-400 disabled:bg-slate-50 disabled:text-slate-400"
                />
                <span className="text-[11px] text-slate-400">
                  {isEs ? "0% para usar la tasa global de la tienda." : "0% to use store default rate."}
                </span>
              </label>
            </div>
          </div>
        </div>

        {error && (
          <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() =>
              router.push(
                `/dashboard/customers${customer.storeId ? `?storeId=${encodeURIComponent(customer.storeId)}` : ""}`,
              )
            }
            className="rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            {isEs ? "Cancelar" : "Cancel"}
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? (isEs ? "Guardando..." : "Saving...") : isEs ? "Guardar cambios" : "Save changes"}
          </button>
        </div>
      </form>

      <div id="customer-panel-accounts" role="tabpanel" aria-labelledby="customer-tab-accounts" hidden={activeTab !== "accounts"}>
      {/* Módulo de Cuentas por Cobrar (CxC), Abonos e Intereses por Mora */}
      <CustomerCreditModule
        customerId={customer.id}
        storeId={customer.storeId}
        customerName={[firstName, lastName].filter(Boolean).join(" ") || email}
        customerEmail={email}
        currencyCode={currencyCode}
        isEs={isEs}
        initialAllowCredit={allowCredit}
        onCreditConfigUpdated={() => router.refresh()}
      />
      </div>

      <div id="customer-panel-history" role="tabpanel" aria-labelledby="customer-tab-history" hidden={activeTab !== "history"}>
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            {isEs ? "Historial de Compras y Ventas Anuales" : "Purchase & Annual Sales History"}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {isEs
              ? "Consulta los pedidos y filtra por año o producto. Cada total corresponde al pedido completo."
              : "Review orders and filter by year or product. Totals reflect each entire order."}
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-4">
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-700">
            {isEs ? "Año" : "Year"}
            <select value={historyYear} onChange={(event) => setHistoryYear(event.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900">
              <option value="">{isEs ? "Todos los años" : "All years"}</option>
              {historyYears.map((year) => <option key={year} value={year}>{year}</option>)}
            </select>
          </label>
          <label className="flex min-w-0 flex-col gap-1 text-xs font-medium text-slate-700">
            {isEs ? "Producto" : "Product"}
            <select value={historyProduct} onChange={(event) => setHistoryProduct(event.target.value)} className="max-w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900">
              <option value="">{isEs ? "Todos los productos" : "All products"}</option>
              {historyProducts.map((product) => <option key={product} value={product}>{product}</option>)}
            </select>
          </label>
        </div>

        <div className="space-y-3">
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="min-w-full text-left text-xs">
                <caption className="sr-only">{isEs ? "Facturas y Pedidos por Fecha" : "Invoices & Orders by Date"}</caption>
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th scope="col" className="px-4 py-3">{isEs ? "Factura / Pedido" : "Invoice / Order"}</th>
                    <th scope="col" className="px-4 py-3">{isEs ? "Fecha" : "Date"}</th>
                    <th scope="col" className="px-4 py-3">{isEs ? "Estado de pago" : "Payment status"}</th>
                    <th scope="col" className="px-4 py-3">{isEs ? "Productos" : "Items"}</th>
                    <th scope="col" className="px-4 py-3 text-right">{isEs ? "Total" : "Total"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredOrders.map((ord) => (
                    <tr key={ord.id} className="align-top hover:bg-slate-50/70">
                      <td className="px-4 py-3">
                        <Link href={`/dashboard/orders/${ord.id}`} className="font-semibold text-cyan-700 hover:text-cyan-800 hover:underline">
                          #{ord.orderNumber}
                        </Link>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                        {new Date(ord.createdAt).toLocaleDateString(isEs ? "es-ES" : "en-US", {
                          year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded border px-2 py-0.5 font-medium ${
                          ord.paymentStatus === "PAID"
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-amber-200 bg-amber-50 text-amber-700"
                        }`}>
                          {ord.paymentStatus}
                        </span>
                      </td>
                      <td className="min-w-56 px-4 py-3 text-slate-600">
                        {ord.items.length > 0 && (
                          <ul className="space-y-1">
                            {ord.items.map((it) => (
                              <li key={it.id}>
                                {it.quantity}x {it.title} — {(it.quantity * it.price).toFixed(2)} {ord.currency}
                              </li>
                            ))}
                          </ul>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-slate-900">
                        {ord.total.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {ord.currency}
                      </td>
                    </tr>
                  ))}
                  {filteredOrders.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                        {orders.length === 0
                          ? (isEs ? "Este cliente aún no registra facturas ni pedidos." : "This customer has no orders or invoices yet.")
                          : (isEs ? "No hay pedidos que coincidan con los filtros." : "No orders match the selected filters.")}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
        </div>
      </div>
      </div>
    </section>
  );
}
