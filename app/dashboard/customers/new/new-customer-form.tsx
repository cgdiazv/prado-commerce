"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
        throw new Error("Select a store before creating a customer.");
      }

      if (!email.trim()) {
        throw new Error("Customer email is required.");
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
        throw new Error(result.error ?? "Failed to create customer");
      }

      router.push(`/dashboard/customers?storeId=${encodeURIComponent(activeStoreId)}`);
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Failed to create customer");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section>
      {setupError ? (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {setupError}
        </div>
      ) : null}

      <div className="space-y-6">
        <div>
          <p className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
            Customers
          </p>
          <h1 className="mt-4 text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">
            Create new customer
          </h1>
          <p className="mt-3 max-w-xl text-base leading-7 text-slate-600 sm:text-lg">
            Add a customer manually to your store records.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-2 sm:col-span-2">
              <span className="text-sm font-medium text-slate-700">Store</span>
              <select
                value={activeStoreId}
                onChange={(event) => setActiveStoreId(event.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
              >
                {stores.map((store) => (
                  <option key={store.id} value={store.id}>
                    {store.name} / {store.currency}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2 sm:col-span-2">
              <span className="text-sm font-medium text-slate-700">Email</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="customer@example.com"
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
                required
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-slate-700">First name</span>
              <input
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                placeholder="Jane"
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-slate-700">Last name</span>
              <input
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                placeholder="Doe"
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
              />
            </label>

            <label className="flex flex-col gap-2 sm:col-span-2">
              <span className="text-sm font-medium text-slate-700">Phone</span>
              <input
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="+1 555 123 4567"
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
              />
            </label>

            <div className="sm:col-span-2">
              <p className="text-sm font-semibold text-slate-800">Shipping address</p>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-2 sm:col-span-2">
                  <span className="text-sm font-medium text-slate-700">Address line 1</span>
                  <input
                    value={shippingAddress.line1}
                    onChange={(event) => updateShippingAddress("line1", event.target.value)}
                    placeholder="123 Main St"
                    className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
                  />
                </label>

                <label className="flex flex-col gap-2 sm:col-span-2">
                  <span className="text-sm font-medium text-slate-700">Address line 2</span>
                  <input
                    value={shippingAddress.line2}
                    onChange={(event) => updateShippingAddress("line2", event.target.value)}
                    placeholder="Apartment, suite, etc."
                    className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
                  />
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-slate-700">City</span>
                  <input
                    value={shippingAddress.city}
                    onChange={(event) => updateShippingAddress("city", event.target.value)}
                    placeholder="New York"
                    className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
                  />
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-slate-700">State / Region</span>
                  <input
                    value={shippingAddress.state}
                    onChange={(event) => updateShippingAddress("state", event.target.value)}
                    placeholder="NY"
                    className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
                  />
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-slate-700">Postal code</span>
                  <input
                    value={shippingAddress.postalCode}
                    onChange={(event) => updateShippingAddress("postalCode", event.target.value)}
                    placeholder="10001"
                    className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
                  />
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-slate-700">Country</span>
                  <input
                    value={shippingAddress.country}
                    onChange={(event) => updateShippingAddress("country", event.target.value)}
                    placeholder="United States"
                    className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
                  />
                </label>
              </div>
            </div>

            <div className="sm:col-span-2">
              <p className="text-sm font-semibold text-slate-800">Billing address</p>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-2 sm:col-span-2">
                  <span className="text-sm font-medium text-slate-700">Address line 1</span>
                  <input
                    value={billingAddress.line1}
                    onChange={(event) => updateBillingAddress("line1", event.target.value)}
                    placeholder="123 Main St"
                    className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
                  />
                </label>

                <label className="flex flex-col gap-2 sm:col-span-2">
                  <span className="text-sm font-medium text-slate-700">Address line 2</span>
                  <input
                    value={billingAddress.line2}
                    onChange={(event) => updateBillingAddress("line2", event.target.value)}
                    placeholder="Apartment, suite, etc."
                    className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
                  />
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-slate-700">City</span>
                  <input
                    value={billingAddress.city}
                    onChange={(event) => updateBillingAddress("city", event.target.value)}
                    placeholder="New York"
                    className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
                  />
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-slate-700">State / Region</span>
                  <input
                    value={billingAddress.state}
                    onChange={(event) => updateBillingAddress("state", event.target.value)}
                    placeholder="NY"
                    className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
                  />
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-slate-700">Postal code</span>
                  <input
                    value={billingAddress.postalCode}
                    onChange={(event) => updateBillingAddress("postalCode", event.target.value)}
                    placeholder="10001"
                    className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
                  />
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-slate-700">Country</span>
                  <input
                    value={billingAddress.country}
                    onChange={(event) => updateBillingAddress("country", event.target.value)}
                    placeholder="United States"
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
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || !activeStoreId}
              className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? "Saving..." : "Create customer"}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
