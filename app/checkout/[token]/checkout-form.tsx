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
  storeId: string;
  offlinePaymentsEnabled?: boolean;
};

export default function CheckoutForm({ cartId, currency, subtotal, storeId, offlinePaymentsEnabled = false }: CheckoutFormProps) {
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authFirstName, setAuthFirstName] = useState("");
  const [authLastName, setAuthLastName] = useState("");
  const [authStatus, setAuthStatus] = useState<string | null>(null);
  const [isAuthing, setIsAuthing] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null); // null = loading
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
  const [availablePaymentMethods, setAvailablePaymentMethods] = useState<string[]>(() =>
    getAvailablePaymentMethods(Boolean(offlinePaymentsEnabled))
  );
  const [status, setStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      try {
        const r = await fetch("/api/storefront/auth", { cache: "no-store" });
        const p = await r.json();
        setIsLoggedIn(Boolean(p.customer));
      } catch {
        setIsLoggedIn(false);
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
          return;
        }
      } catch {
        // Ignore store config errors and keep prop default options.
      }

      const methods = getAvailablePaymentMethods(Boolean(offlinePaymentsEnabled));
      setAvailablePaymentMethods(methods);
    }

    void checkAuth();
    void loadStorePaymentOptions();
  }, [offlinePaymentsEnabled]);

  useEffect(() => {
    async function loadCustomerProfile() {
      if (isLoggedIn !== true) return;
      try {
        const response = await fetch("/api/storefront/account", { cache: "no-store" });
        const payload = await response.json();

        if (response.ok && payload.customer) {
          if (payload.customer.email) setEmail(payload.customer.email);
          if (payload.customer.firstName) setFirstName(payload.customer.firstName);
          if (payload.customer.lastName) setLastName(payload.customer.lastName);
          if (payload.customer.phone) setPhone(payload.customer.phone);

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

    void loadCustomerProfile();
  }, [isLoggedIn]);

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
  async function handleAuth(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsAuthing(true);
    setAuthStatus(null);
    try {
      const r = await fetch("/api/storefront/auth", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: authMode, storeId, email: authEmail, password: authPassword, firstName: authFirstName, lastName: authLastName }),
      });
      const p = await r.json();
      if (!r.ok) throw new Error(p.error || "Unable to sign in.");
      setEmail(p.customer?.email ?? authEmail);
      setFirstName(p.customer?.firstName ?? "");
      setLastName(p.customer?.lastName ?? "");
      setIsLoggedIn(true);
    } catch (err) {
      setAuthStatus(err instanceof Error ? err.message : "Unable to sign in.");
    } finally {
      setIsAuthing(false);
    }
  }

  if (isLoggedIn === null) {
    return <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Loading…</div>;
  }

  if (!isLoggedIn) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-base font-semibold text-slate-900">Sign in to continue</p>
        <p className="mt-1 text-sm text-slate-500">You need a storefront account to place an order.</p>
        <div className="mt-4 flex gap-2 rounded-full border border-slate-200 p-1">
          {(["signin", "signup"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setAuthMode(m)}
              className={`flex-1 rounded-full px-3 py-2 text-sm font-medium transition ${
                authMode === m ? "bg-slate-900 text-white" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {m === "signin" ? "Sign in" : "Create account"}
            </button>
          ))}
        </div>
        <form onSubmit={handleAuth} className="mt-4 space-y-3">
          {authMode === "signup" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                value={authFirstName}
                onChange={(e) => setAuthFirstName(e.target.value)}
                placeholder="First name"
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none ring-0 placeholder:text-slate-400"
              />
              <input
                value={authLastName}
                onChange={(e) => setAuthLastName(e.target.value)}
                placeholder="Last name"
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none ring-0 placeholder:text-slate-400"
              />
            </div>
          )}
          <input
            type="email"
            required
            value={authEmail}
            onChange={(e) => setAuthEmail(e.target.value)}
            placeholder="Email address"
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none ring-0 placeholder:text-slate-400"
          />
          <input
            type="password"
            required
            minLength={6}
            value={authPassword}
            onChange={(e) => setAuthPassword(e.target.value)}
            placeholder={authMode === "signup" ? "Create a password" : "Password"}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none ring-0 placeholder:text-slate-400"
          />
          <button
            type="submit"
            disabled={isAuthing}
            className="w-full rounded-full bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-cyan-500 disabled:opacity-70"
          >
            {isAuthing ? "Working…" : authMode === "signin" ? "Sign in" : "Create account"}
          </button>
          {authStatus && <p className="text-sm text-rose-600">{authStatus}</p>}
        </form>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-base font-semibold text-slate-900">Customer details</p>
          <p className="text-sm text-slate-500">We’ll create an order from this cart once you submit.</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Estimated total</p>
          <p className="text-lg font-bold text-slate-900">{currency} {subtotal.toFixed(2)}</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <input
          value={firstName}
          onChange={(event) => setFirstName(event.target.value)}
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none ring-0 placeholder:text-slate-400"
          placeholder="First name"
        />
        <input
          value={lastName}
          onChange={(event) => setLastName(event.target.value)}
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none ring-0 placeholder:text-slate-400"
          placeholder="Last name"
        />
      </div>

      <div className="space-y-3">
        <input
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none ring-0 placeholder:text-slate-400"
          placeholder="Email address"
        />
        <input
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none ring-0 placeholder:text-slate-400"
          placeholder="Phone"
        />
      </div>

      <div className="space-y-3">
        <input
          value={line1}
          onChange={(event) => setLine1(event.target.value)}
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none ring-0 placeholder:text-slate-400"
          placeholder="Street address"
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            value={city}
            onChange={(event) => setCity(event.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none ring-0 placeholder:text-slate-400"
            placeholder="City"
          />
          <input
            value={state}
            onChange={(event) => setState(event.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none ring-0 placeholder:text-slate-400"
            placeholder="State"
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            value={postalCode}
            onChange={(event) => setPostalCode(event.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none ring-0 placeholder:text-slate-400"
            placeholder="Postal code"
          />
          <input
            value={country}
            onChange={(event) => setCountry(event.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none ring-0 placeholder:text-slate-400"
            placeholder="Country"
          />
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-sm font-semibold text-slate-900">Payment method</p>
        <p className="mt-1 text-sm text-slate-500">Choose how you’d like to complete this order.</p>
        <div className="mt-3 space-y-3">
          {availablePaymentMethods.includes("card") ? (
            <button
              type="button"
              onClick={() => setPaymentMethod("card")}
              className={`w-full text-left rounded-xl border px-4 py-3 text-sm font-medium transition ${
                paymentMethod === "card"
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
              }`}
            >
              Card payment
            </button>
          ) : null}
          {availablePaymentMethods.includes("offline") ? (
            <label className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium cursor-pointer transition ${
              paymentMethod === "offline"
                ? "border-cyan-600 bg-cyan-50/50 text-slate-900"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}>
              <input
                type="checkbox"
                checked={paymentMethod === "offline"}
                onChange={(e) => setPaymentMethod(e.target.checked ? "offline" : "card")}
                className="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
              />
              <div>
                <span className="font-semibold text-slate-900">Payment on pickup</span>
                <p className="text-xs text-slate-500">Pay with cash, bank transfer, or manual method upon order pickup.</p>
              </div>
            </label>
          ) : null}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-sm font-semibold text-slate-900">Saved addresses</p>
        <p className="mt-1 text-sm text-slate-500">Pick one to fill the form faster.</p>

        {savedAddresses.length > 0 ? (
          <div className="mt-3 space-y-2">
            {savedAddresses.map((address, index) => {
              const label = [address.line1, address.city, address.state, address.country].filter(Boolean).join(", ");
              return (
                <div key={`${label}-${index}`} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3">
                  <p className="text-sm text-slate-700">{label || "Saved address"}</p>
                  <button
                    type="button"
                    onClick={() => applySavedAddress(address)}
                    className="rounded-full border border-cyan-600 px-3 py-1 text-xs font-semibold text-cyan-700 transition hover:bg-cyan-50"
                  >
                    Use
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="mt-3 text-sm text-slate-500">No saved addresses yet.</p>
        )}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-full bg-cyan-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isSubmitting ? "Submitting order..." : "Place order"}
      </button>

      {status ? <p className="mt-3 text-sm text-slate-600">{status}</p> : null}
    </form>
  );
}
