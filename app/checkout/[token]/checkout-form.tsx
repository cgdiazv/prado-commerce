"use client";

import { useEffect, useState } from "react";
import { getDefaultAddress } from "@/lib/address-utils";
import { getAvailablePaymentMethods } from "@/lib/payment-options";

type AddressEntry = {
  line1: string | null;
  line2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
};

type CheckoutFormProps = {
  cartId: string;
  currency: string;
  subtotal: number;
};

export default function CheckoutForm({ cartId, currency, subtotal }: CheckoutFormProps) {
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [line1, setLine1] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("");
  const [savedAddresses, setSavedAddresses] = useState<AddressEntry[]>([]);
  const [paymentMethod, setPaymentMethod] = useState("card");
  const [availablePaymentMethods, setAvailablePaymentMethods] = useState<string[]>(["card"]);
  const [status, setStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function loadSavedAddresses() {
      try {
        const response = await fetch("/api/storefront/account", { cache: "no-store" });
        const payload = await response.json();

        if (response.ok && payload.customer) {
          const nextSavedAddresses = Array.isArray(payload.customer.savedAddresses)
            ? (payload.customer.savedAddresses as AddressEntry[])
            : [];
          setSavedAddresses(nextSavedAddresses);

          const preferredAddress = getDefaultAddress(payload.customer.shippingAddress, nextSavedAddresses);
          if (preferredAddress) {
            setLine1(preferredAddress.line1 ?? "");
            setCity(preferredAddress.city ?? "");
            setState(preferredAddress.state ?? "");
            setPostalCode(preferredAddress.postalCode ?? "");
            setCountry(preferredAddress.country ?? "");
          }
        }
      } catch {
        // Ignore missing account data on checkout.
      }
    }

    async function loadStorePaymentOptions() {
      try {
        const response = await fetch("/api/stores", { cache: "no-store" });
        const stores = await response.json();
        if (response.ok && Array.isArray(stores) && stores[0]) {
          const methods = getAvailablePaymentMethods(Boolean(stores[0].offlinePaymentsEnabled));
          setAvailablePaymentMethods(methods);
          if (!methods.includes(paymentMethod)) {
            setPaymentMethod(methods[0] || "card");
          }
        }
      } catch {
        // Ignore store config errors and keep the default card-only option.
      }
    }

    void loadSavedAddresses();
    void loadStorePaymentOptions();
  }, []);

  function applySavedAddress(address: AddressEntry) {
    setLine1(address.line1 ?? "");
    setCity(address.city ?? "");
    setState(address.state ?? "");
    setPostalCode(address.postalCode ?? "");
    setCountry(address.country ?? "");
    setStatus("Address loaded from your saved addresses.");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setStatus(null);

    try {
      const response = await fetch("/api/storefront/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          cartId,
          email,
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
          billingAddress: {
            line1,
            city,
            state,
            postalCode,
            country,
          },
          shippingAmount: 0,
          taxAmount: 0,
          paymentMethod,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Unable to place your order.");
      }

      const params = new URLSearchParams({
        orderNumber: String(payload.order.orderNumber),
        total: payload.order.total.toFixed(2),
        currency,
      });

      window.location.href = `/checkout/${cartId}/success?${params.toString()}`;
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to place your order.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-white">Customer details</p>
          <p className="text-sm text-slate-400">We’ll create an order from this cart once you submit.</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-slate-400">Estimated total</p>
          <p className="text-lg font-semibold text-white">{currency} {subtotal.toFixed(2)}</p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <input value={firstName} onChange={(event) => setFirstName(event.target.value)} className="rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none" placeholder="First name" />
        <input value={lastName} onChange={(event) => setLastName(event.target.value)} className="rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none" placeholder="Last name" />
      </div>

      <div className="mt-3 space-y-3">
        <input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none" placeholder="Email address" />
        <input value={phone} onChange={(event) => setPhone(event.target.value)} className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none" placeholder="Phone" />
      </div>

      <div className="mt-4 space-y-3">
        <input value={line1} onChange={(event) => setLine1(event.target.value)} className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none" placeholder="Street address" />
        <div className="grid gap-3 sm:grid-cols-2">
          <input value={city} onChange={(event) => setCity(event.target.value)} className="rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none" placeholder="City" />
          <input value={state} onChange={(event) => setState(event.target.value)} className="rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none" placeholder="State" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <input value={postalCode} onChange={(event) => setPostalCode(event.target.value)} className="rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none" placeholder="Postal code" />
          <input value={country} onChange={(event) => setCountry(event.target.value)} className="rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none" placeholder="Country" />
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-white/10 bg-slate-950/60 p-3">
        <p className="text-sm font-semibold text-white">Payment method</p>
        <p className="mt-1 text-sm text-slate-400">Choose how you’d like to complete this order.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {availablePaymentMethods.includes("card") ? (
            <button
              type="button"
              onClick={() => setPaymentMethod("card")}
              className={`rounded-full px-3 py-2 text-sm font-semibold transition ${paymentMethod === "card" ? "bg-cyan-500 text-slate-950" : "border border-white/10 bg-slate-900/70 text-slate-300 hover:bg-slate-800"}`}
            >
              Card payment
            </button>
          ) : null}
          {availablePaymentMethods.includes("offline") ? (
            <button
              type="button"
              onClick={() => setPaymentMethod("offline")}
              className={`rounded-full px-3 py-2 text-sm font-semibold transition ${paymentMethod === "offline" ? "bg-cyan-500 text-slate-950" : "border border-white/10 bg-slate-900/70 text-slate-300 hover:bg-slate-800"}`}
            >
              Offline payment
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-white/10 bg-slate-950/60 p-3">
        <p className="text-sm font-semibold text-white">Saved addresses</p>
        <p className="mt-1 text-sm text-slate-400">Pick one to fill the form faster.</p>

        {savedAddresses.length > 0 ? (
          <div className="mt-3 space-y-2">
            {savedAddresses.map((address, index) => {
              const label = [address.line1, address.city, address.state, address.country].filter(Boolean).join(", ");
              return (
                <div key={`${label}-${index}`} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-slate-900/70 p-2.5">
                  <p className="text-sm text-slate-300">{label || "Saved address"}</p>
                  <button type="button" onClick={() => applySavedAddress(address)} className="rounded-full border border-cyan-400/30 px-2.5 py-1 text-xs font-semibold text-cyan-300 transition hover:bg-cyan-400/10">
                    Use
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="mt-3 text-sm text-slate-400">No saved addresses yet.</p>
        )}
      </div>

      <button type="submit" disabled={isSubmitting} className="mt-6 w-full rounded-full bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-70">
        {isSubmitting ? "Submitting order..." : "Place order"}
      </button>

      {status ? <p className="mt-4 text-sm text-slate-300">{status}</p> : null}
    </form>
  );
}
