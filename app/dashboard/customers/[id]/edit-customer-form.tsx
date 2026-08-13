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

type Customer = {
  id: string;
  storeId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  shippingAddress: any;
  billingAddress: any;
};

type EditCustomerFormProps = {
  stores: Store[];
  customer: Customer;
};

export function EditCustomerForm({ stores, customer }: EditCustomerFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState(customer.email);
  const [firstName, setFirstName] = useState(customer.firstName ?? "");
  const [lastName, setLastName] = useState(customer.lastName ?? "");
  const [phone, setPhone] = useState(customer.phone ?? "");

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
        throw new Error("Customer email is required.");
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
          shippingAddress,
          billingAddress,
        }),
      });

      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(result.error ?? "Failed to update customer");
      }

      setSuccess("Customer profile updated successfully!");
      router.refresh();
      setTimeout(() => {
        router.push(`/dashboard/customers?storeId=${encodeURIComponent(customer.storeId)}`);
      }, 1000);
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Failed to update customer");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="min-w-0 space-y-6">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <p className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Edit customer
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-slate-950">
            Update customer profile
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

      {success && (
        <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Customer Details Card */}
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Customer details</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Store Selection Card (Readonly) */}
            <div className="space-y-2 sm:col-span-2">
              <span className="text-sm font-medium text-slate-700">Store</span>
              <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 font-medium">
                {activeStore ? `${activeStore.name} / ${activeStore.currency}` : "Unknown Store"}
              </div>
            </div>

            <label className="flex flex-col gap-2 sm:col-span-2 lg:col-span-1">
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

            <label className="flex flex-col gap-2 sm:col-span-2 lg:col-span-1">
              <span className="text-sm font-medium text-slate-700">Phone</span>
              <input
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="+1 555 123 4567"
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
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
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">

          <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Shipping address</p>
            <div className="grid gap-4 sm:grid-cols-2">
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

          <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Billing address</p>
            <div className="grid gap-4 sm:grid-cols-2">
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
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? "Saving..." : "Save changes"}
          </button>
        </div>
      </form>
    </section>
  );
}
