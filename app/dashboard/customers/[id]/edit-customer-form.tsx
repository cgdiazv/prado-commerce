"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShoppingBag, Calendar, ArrowUpRight, DollarSign, Package } from "lucide-react";
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

export function EditCustomerForm({ stores, customer, groups = [] }: EditCustomerFormProps) {
  const router = useRouter();
  const { language } = useLanguage();
  const isEs = language === "es";

  const [groupId, setGroupId] = useState(customer.groupId ?? "");
  const [email, setEmail] = useState(customer.email);
  const [firstName, setFirstName] = useState(customer.firstName ?? "");
  const [lastName, setLastName] = useState(customer.lastName ?? "");
  const [phone, setPhone] = useState(customer.phone ?? "");

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
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const activeStore = stores.find((s) => s.id === customer.storeId);

  function updateShippingAddress(field: keyof AddressForm, value: string) {
    setShippingAddress((current) => ({ ...current, [field]: value }));
  }

  function updateBillingAddress(field: keyof AddressForm, value: string) {
    setBillingAddress((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
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
          shippingAddress,
          billingAddress,
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
  const totalSpent = orders.reduce((sum, o) => sum + o.total, 0);
  const avgOrder = orders.length > 0 ? totalSpent / orders.length : 0;
  const currencySymbol = activeStore?.currency || "USD";

  const annualSalesMap: Record<number, { count: number; total: number }> = {};
  for (const ord of orders) {
    const yr = new Date(ord.createdAt).getFullYear();
    if (!annualSalesMap[yr]) {
      annualSalesMap[yr] = { count: 0, total: 0 };
    }
    annualSalesMap[yr].count += 1;
    annualSalesMap[yr].total += ord.total;
  }
  const annualSalesList = Object.entries(annualSalesMap)
    .map(([year, data]) => ({ year: Number(year), ...data }))
    .sort((a, b) => b.year - a.year);

  const aggregatedProducts = useMemo(() => {
    const map = new Map<string, { title: string; totalUnits: number; totalSpent: number; lastDate: string }>();
    for (const ord of orders) {
      for (const it of ord.items || []) {
        const title = it.title || "Producto";
        const entry = map.get(title) || { title, totalUnits: 0, totalSpent: 0, lastDate: ord.createdAt };
        entry.totalUnits += it.quantity;
        entry.totalSpent += it.price * it.quantity;
        if (new Date(ord.createdAt) > new Date(entry.lastDate)) {
          entry.lastDate = ord.createdAt;
        }
        map.set(title, entry);
      }
    }
    return Array.from(map.values()).sort((a, b) => b.totalUnits - a.totalUnits);
  }, [orders]);

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

      <form onSubmit={handleSubmit} className="space-y-6">
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
        </div>

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
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
              {isEs ? "Dirección de facturación" : "Billing address"}
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-2 sm:col-span-2">
                <span className="text-sm font-medium text-slate-700">{isEs ? "Dirección línea 1" : "Address line 1"}</span>
                <input
                  value={billingAddress.line1}
                  onChange={(event) => updateBillingAddress("line1", event.target.value)}
                  placeholder="123 Main St"
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
                />
              </label>

              <label className="flex flex-col gap-2 sm:col-span-2">
                <span className="text-sm font-medium text-slate-700">{isEs ? "Dirección línea 2" : "Address line 2"}</span>
                <input
                  value={billingAddress.line2}
                  onChange={(event) => updateBillingAddress("line2", event.target.value)}
                  placeholder={isEs ? "Apartamento, suite, etc." : "Apartment, suite, etc."}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-slate-700">{isEs ? "Ciudad" : "City"}</span>
                <input
                  value={billingAddress.city}
                  onChange={(event) => updateBillingAddress("city", event.target.value)}
                  placeholder="New York"
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-slate-700">{isEs ? "Estado / Región" : "State / Region"}</span>
                <input
                  value={billingAddress.state}
                  onChange={(event) => updateBillingAddress("state", event.target.value)}
                  placeholder="NY"
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-slate-700">{isEs ? "Código postal" : "Postal code"}</span>
                <input
                  value={billingAddress.postalCode}
                  onChange={(event) => updateBillingAddress("postalCode", event.target.value)}
                  placeholder="10001"
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-slate-700">{isEs ? "País" : "Country"}</span>
                <input
                  value={billingAddress.country}
                  onChange={(event) => updateBillingAddress("country", event.target.value)}
                  placeholder={isEs ? "Estados Unidos" : "United States"}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
                />
              </label>
            </div>
          </div>

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
                  {isEs ? "Límite de Crédito ($)" : "Credit Limit ($)"}
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
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
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

      {/* Módulo de Cuentas por Cobrar (CxC), Abonos e Intereses por Mora */}
      <CustomerCreditModule
        customerId={customer.id}
        storeId={customer.storeId}
        customerName={[firstName, lastName].filter(Boolean).join(" ") || email}
        customerEmail={email}
        currencySymbol={currencySymbol}
        isEs={isEs}
        initialAllowCredit={allowCredit}
        initialCreditLimit={parseFloat(creditLimit) || 0}
        initialCreditDays={parseInt(creditDays, 10) || 30}
        initialCreditInterestRate={parseFloat(creditInterestRate) || 0}
        onCreditConfigUpdated={() => router.refresh()}
      />

      {/* Amber POS: Historial de Compras por Producto y Ventas Anuales */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-cyan-600" />
            {isEs ? "Historial de Compras y Ventas Anuales" : "Purchase & Annual Sales History"}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {isEs
              ? "Registro de facturas emitidas, pedidos y desglose anual de compras del cliente."
              : "Invoices, orders placed, and annual purchase breakdown for this customer."}
          </p>
        </div>

        {/* Top KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-medium text-slate-500">{isEs ? "Gasto Total Histórico" : "Lifetime Total Spend"}</p>
            <p className="text-xl font-bold text-slate-900 mt-1">
              ${totalSpent.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              <span className="text-xs font-normal text-slate-500 ml-1">{currencySymbol}</span>
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-medium text-slate-500">{isEs ? "Total de Facturas / Pedidos" : "Total Orders / Invoices"}</p>
            <p className="text-xl font-bold text-slate-900 mt-1">{orders.length}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-medium text-slate-500">{isEs ? "Ticket Promedio" : "Average Order Value"}</p>
            <p className="text-xl font-bold text-slate-900 mt-1">
              ${avgOrder.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              <span className="text-xs font-normal text-slate-500 ml-1">{currencySymbol}</span>
            </p>
          </div>
        </div>

        {/* Resumen Anual */}
        {annualSalesList.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-cyan-600" />
              {isEs ? "Desglose de Ventas por Año" : "Sales Breakdown by Year"}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {annualSalesList.map((an) => (
                <div key={an.year} className="rounded-xl border border-cyan-100 bg-cyan-50/50 p-3">
                  <div className="flex items-center justify-between text-xs font-medium text-cyan-700">
                    <span>{an.year}</span>
                    <span>{an.count} {isEs ? (an.count === 1 ? "pedido" : "pedidos") : (an.count === 1 ? "order" : "orders")}</span>
                  </div>
                  <div className="text-base font-bold text-slate-900 mt-1">
                    ${an.total.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Vista Agregada: Historial de Compras por Producto */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
              <Package className="w-4 h-4 text-cyan-600" />
              {isEs ? "Productos Comprados (Vista Agregada)" : "Products Purchased (Aggregated View)"}
            </h3>
            <span className="text-xs text-slate-500 font-medium">
              {aggregatedProducts.length} {isEs ? "artículos diferentes" : "distinct items"}
            </span>
          </div>

          {aggregatedProducts.length === 0 ? (
            <div className="text-center py-6 rounded-xl border border-dashed border-slate-200 text-xs text-slate-400">
              {isEs ? "Sin productos individuales registrados." : "No product purchases recorded."}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {aggregatedProducts.map((p) => (
                <div
                  key={p.title}
                  className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-xs"
                >
                  <div className="min-w-0 pr-2">
                    <p className="font-semibold text-slate-900 truncate" title={p.title}>
                      {p.title}
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-400">
                      {isEs ? "Última compra: " : "Last bought: "}
                      {new Date(p.lastDate).toLocaleDateString(isEs ? "es-ES" : "en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="inline-flex items-center rounded-md bg-cyan-100 px-2 py-0.5 text-xs font-bold text-cyan-900">
                      {p.totalUnits} {isEs ? "uds" : "units"}
                    </span>
                    <p className="mt-1 text-[11px] font-semibold text-slate-700">
                      ${p.totalSpent.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* List of Orders and Purchased Products */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-cyan-600" />
            {isEs ? "Facturas y Pedidos por Fecha" : "Invoices & Orders by Date"}
          </h3>

          {orders.length === 0 ? (
            <div className="text-center py-8 rounded-xl border border-dashed border-slate-200 text-sm text-slate-500">
              {isEs ? "Este cliente aún no registra facturas ni pedidos." : "This customer has no orders or invoices yet."}
            </div>
          ) : (
            <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 overflow-hidden">
              {orders.map((ord) => (
                <div key={ord.id} className="p-4 bg-white hover:bg-slate-50/70 transition space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/dashboard/orders/${ord.id}`}
                        className="font-semibold text-cyan-700 hover:text-cyan-800 hover:underline text-sm"
                      >
                        #{ord.orderNumber}
                      </Link>
                      <span className="text-xs text-slate-500">
                        {new Date(ord.createdAt).toLocaleDateString(isEs ? "es-ES" : "en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          ord.paymentStatus === "PAID"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}
                      >
                        {ord.paymentStatus}
                      </span>
                    </div>
                    <div className="text-sm font-bold text-slate-900">
                      ${ord.total.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{" "}
                      <span className="text-xs font-normal text-slate-500">{ord.currency}</span>
                    </div>
                  </div>

                  {/* Purchased items list */}
                  {ord.items && ord.items.length > 0 && (
                    <div className="mt-2 pl-3 border-l-2 border-cyan-100 space-y-1">
                      {ord.items.map((it) => (
                        <div key={it.id} className="flex items-center justify-between text-xs text-slate-600">
                          <span className="truncate pr-2">
                            • {it.quantity}x {it.title}
                          </span>
                          <span className="font-medium shrink-0">
                            ${(it.quantity * it.price).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
