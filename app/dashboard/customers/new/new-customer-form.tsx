"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/lib/i18n/language-context";

type Store = {
  id: string;
  name: string;
  currency: string;
};

type AddressForm = {
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
};

const emptyAddress: AddressForm = {
  line1: "",
  line2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "",
};

type NewCustomerFormProps = {
  stores: Store[];
  selectedStoreId: string | null;
  setupError?: string | null;
};

export function NewCustomerForm({ stores, selectedStoreId, setupError = null }: NewCustomerFormProps) {
  const router = useRouter();
  const { language } = useLanguage();
  const isEs = language === "es";

  const [activeStoreId, setActiveStoreId] = useState(selectedStoreId ?? stores[0]?.id ?? "");
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [shippingAddress, setShippingAddress] = useState<AddressForm>(emptyAddress);
  const [billingAddress, setBillingAddress] = useState<AddressForm>(emptyAddress);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

    try {
      if (!activeStoreId) {
        throw new Error(isEs ? "Selecciona una tienda antes de crear un cliente." : "Select a store before creating a customer.");
      }

      if (!email.trim()) {
        throw new Error(isEs ? "El correo del cliente es obligatorio." : "Customer email is required.");
      }

      const response = await fetch("/api/customers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          storeId: activeStoreId,
          email,
          firstName,
          lastName,
          phone,
          shippingAddress,
          billingAddress,
        }),
      });

      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(result.error ?? (isEs ? "Error al crear el cliente" : "Failed to create customer"));
      }

      router.push(`/dashboard/customers?storeId=${encodeURIComponent(activeStoreId)}`);
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : isEs
            ? "Error al crear el cliente"
            : "Failed to create customer"
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

      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <p className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            {isEs ? "Nuevo cliente" : "New customer"}
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-slate-950">
            {isEs ? "Crear perfil de cliente" : "Create customer profile"}
          </h2>
          <p className="mt-2 max-w-xl text-sm text-slate-600">
            {isEs ? "Añade un cliente manualmente a los registros de tu tienda." : "Add a customer manually to your store records."}
          </p>
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
        {/* Customer Details Card */}
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
            {isEs ? "Detalles del cliente" : "Customer details"}
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <span className="text-sm font-medium text-slate-700">{isEs ? "Tienda" : "Store"}</span>
              <select
                value={activeStoreId}
                onChange={(event) => setActiveStoreId(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
              >
                {stores.map((store) => (
                  <option key={store.id} value={store.id}>
                    {store.name} / {store.currency}
                  </option>
                ))}
              </select>
            </div>

            <label className="flex flex-col gap-2 sm:col-span-2 lg:col-span-1">
              <span className="text-sm font-medium text-slate-700">{isEs ? "Correo electrónico" : "Email"}</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="cliente@ejemplo.com"
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
                    placeholder="Miami"
                    className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
                  />
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-slate-700">{isEs ? "Estado / Región" : "State / Region"}</span>
                  <input
                    value={shippingAddress.state}
                    onChange={(event) => updateShippingAddress("state", event.target.value)}
                    placeholder="FL"
                    className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
                  />
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-slate-700">{isEs ? "Código postal" : "Postal code"}</span>
                  <input
                    value={shippingAddress.postalCode}
                    onChange={(event) => updateShippingAddress("postalCode", event.target.value)}
                    placeholder="33101"
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
                    placeholder="Miami"
                    className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
                  />
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-slate-700">{isEs ? "Estado / Región" : "State / Region"}</span>
                  <input
                    value={billingAddress.state}
                    onChange={(event) => updateBillingAddress("state", event.target.value)}
                    placeholder="FL"
                    className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
                  />
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-slate-700">{isEs ? "Código postal" : "Postal code"}</span>
                  <input
                    value={billingAddress.postalCode}
                    onChange={(event) => updateBillingAddress("postalCode", event.target.value)}
                    placeholder="33101"
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
        </div>

        {error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() =>
              router.push(
                `/dashboard/customers${activeStoreId ? `?storeId=${encodeURIComponent(activeStoreId)}` : ""}`,
              )
            }
            className="rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            {isEs ? "Cancelar" : "Cancel"}
          </button>
          <button
            type="submit"
            disabled={isSaving || !activeStoreId}
            className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving
              ? isEs ? "Guardando..." : "Saving..."
              : isEs ? "Crear cliente" : "Create customer"}
          </button>
        </div>
      </form>
    </section>
  );
}

