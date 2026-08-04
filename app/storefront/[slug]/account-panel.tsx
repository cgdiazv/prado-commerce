"use client";

import { useEffect, useState } from "react";

type AddressEntry = {
  line1: string | null;
  line2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
};

type AccountCustomer = {
  id: string;
  storeId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  shippingAddress: Record<string, unknown> | null;
  billingAddress: Record<string, unknown> | null;
  savedAddresses: AddressEntry[] | null;
  updatedAt: string;
};

export default function AccountPanel() {
  const [customer, setCustomer] = useState<AccountCustomer | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [line1, setLine1] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("");
  const [savedAddresses, setSavedAddresses] = useState<AddressEntry[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function loadAccount() {
      const response = await fetch("/api/storefront/account", { cache: "no-store" });
      const payload = await response.json();
      if (response.ok && payload.customer) {
        const nextCustomer = payload.customer as AccountCustomer;
        setCustomer(nextCustomer);
        setFirstName(nextCustomer.firstName ?? "");
        setLastName(nextCustomer.lastName ?? "");
        setPhone(nextCustomer.phone ?? "");
        const shipping = nextCustomer.shippingAddress as Record<string, unknown> | null;
        setLine1(String(shipping?.line1 ?? ""));
        setCity(String(shipping?.city ?? ""));
        setState(String(shipping?.state ?? ""));
        setPostalCode(String(shipping?.postalCode ?? ""));
        setCountry(String(shipping?.country ?? ""));
        setSavedAddresses(Array.isArray(nextCustomer.savedAddresses) ? nextCustomer.savedAddresses : []);
      }
    }

    void loadAccount();
  }, []);

  async function saveAccount(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setStatus(null);

    try {
      const response = await fetch("/api/storefront/account", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          phone,
          shippingAddress: {
            line1,
            city,
            state,
            postalCode,
            country,
          },
          savedAddresses,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Unable to update your account.");
      }

      setCustomer(payload.customer);
      setSavedAddresses(Array.isArray(payload.customer?.savedAddresses) ? payload.customer.savedAddresses : []);
      setStatus("Account updated successfully.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to update your account.");
    } finally {
      setIsSaving(false);
    }
  }

  function addSavedAddress() {
    const nextEntry: AddressEntry = {
      line1: line1 || null,
      line2: null,
      city: city || null,
      state: state || null,
      postalCode: postalCode || null,
      country: country || null,
    };

    if (!nextEntry.line1 && !nextEntry.city && !nextEntry.state && !nextEntry.postalCode && !nextEntry.country) {
      setStatus("Add at least a street, city, or country before saving an address.");
      return;
    }

    setSavedAddresses((current) => [...current, nextEntry]);
    setStatus("Address added to your saved addresses.");
  }

  function loadSavedAddress(address: AddressEntry) {
    setLine1(address.line1 ?? "");
    setCity(address.city ?? "");
    setState(address.state ?? "");
    setPostalCode(address.postalCode ?? "");
    setCountry(address.country ?? "");
    setStatus("Address loaded into the form.");
  }

  function removeSavedAddress(index: number) {
    setSavedAddresses((current) => current.filter((_, currentIndex) => currentIndex !== index));
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <p className="text-sm font-semibold text-slate-900">Account details</p>
        <p className="text-sm text-slate-500">Keep your profile and address information up to date.</p>
      </div>

      <form onSubmit={saveAccount} className="mt-5 space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <input value={firstName} onChange={(event) => setFirstName(event.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none" placeholder="First name" />
          <input value={lastName} onChange={(event) => setLastName(event.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none" placeholder="Last name" />
        </div>
        <input type="email" readOnly value={customer?.email ?? ""} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500" />
        <input value={phone} onChange={(event) => setPhone(event.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none" placeholder="Phone" />

        <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-sm font-semibold text-slate-800">Shipping address</p>
          <input value={line1} onChange={(event) => setLine1(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none" placeholder="Street address" />
          <div className="grid gap-3 sm:grid-cols-2">
            <input value={city} onChange={(event) => setCity(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none" placeholder="City" />
            <input value={state} onChange={(event) => setState(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none" placeholder="State" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <input value={postalCode} onChange={(event) => setPostalCode(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none" placeholder="Postal code" />
            <input value={country} onChange={(event) => setCountry(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none" placeholder="Country" />
          </div>
        </div>

        <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-800">Saved addresses</p>
              <p className="text-sm text-slate-500">Keep a few recurring addresses handy for faster checkout.</p>
            </div>
            <button type="button" onClick={addSavedAddress} className="rounded-full border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100">
              Add address
            </button>
          </div>

          {savedAddresses.length > 0 ? (
            <div className="space-y-2">
              {savedAddresses.map((address, index) => {
                const label = [address.line1, address.city, address.state, address.country].filter(Boolean).join(", ");

                return (
                  <div key={`${label}-${index}`} className="rounded-xl border border-slate-200 bg-white p-3">
                    <p className="text-sm text-slate-700">{label || "Saved address"}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button type="button" onClick={() => loadSavedAddress(address)} className="rounded-full border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-100">
                        Use
                      </button>
                      <button type="button" onClick={() => removeSavedAddress(index)} className="rounded-full border border-rose-200 px-2.5 py-1 text-xs font-medium text-rose-600 transition hover:bg-rose-50">
                        Remove
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-slate-500">No saved addresses yet.</p>
          )}
        </div>

        <button type="submit" disabled={isSaving} className="w-full rounded-full bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-70">
          {isSaving ? "Saving..." : "Save account"}
        </button>
      </form>

      {status ? <p className="mt-4 text-sm text-slate-600">{status}</p> : null}
    </div>
  );
}
