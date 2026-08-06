"use client";

import Script from "next/script";
import { useEffect, useMemo, useState } from "react";
import { getDefaultAddress } from "@/lib/address-utils";
import { getAvailablePaymentMethods } from "@/lib/payment-options";

declare global {
  interface Window {
    Accept?: {
      dispatchData: (
        request: {
          authData: { clientKey: string; apiLoginID: string };
          cardData: { cardNumber: string; month: string; year: string; cardCode: string };
        },
        callback: (response: {
          messages?: { resultCode?: string; message?: Array<{ text?: string }> };
          opaqueData?: { dataDescriptor?: string; dataValue?: string };
        }) => void,
      ) => void;
    };
  }
}

type AddressEntry = {
  line1: string | null;
  line2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
};

type ShippingZone = {
  name: string;
  regions: string;
  rateType: "free" | "flat" | "pickup";
  rateValue: string;
};

function parseRateValue(value: string, type: string): number {
  if (type === "free") return 0;
  const num = parseFloat(value.replace(/[^0-9.]/g, ""));
  return isNaN(num) ? 0 : num;
}

function loadSavedShippingZones(): ShippingZone[] {
  if (typeof window === "undefined") {
    return [];
  }

  const saved = localStorage.getItem("prado_shipping_zones");
  if (!saved) {
    return [];
  }

  try {
    const parsed = JSON.parse(saved) as ShippingZone[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

type CheckoutFormProps = {
  cartId: string;
  currency: string;
  subtotal: number;
  storeId: string;
  offlinePaymentsEnabled?: boolean;
  stripeOnlinePaymentsEnabled?: boolean;
  onlinePaymentProvider?: "stripe" | "authorize_net" | null;
  authorizeNetConfig?: {
    loginId: string;
    clientKey: string;
    environment: "sandbox" | "production";
  } | null;
  isCartEmpty?: boolean;
};

export default function CheckoutForm({
  cartId,
  currency,
  subtotal,
  storeId,
  offlinePaymentsEnabled = false,
  stripeOnlinePaymentsEnabled = true,
  onlinePaymentProvider = null,
  authorizeNetConfig = null,
  isCartEmpty = false,
}: CheckoutFormProps) {
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
  const [shippingZones] = useState<ShippingZone[]>(() => loadSavedShippingZones());
  const [selectedZoneIdx, setSelectedZoneIdx] = useState<number>(0);
  const [shippingAmount, setShippingAmount] = useState<number>(() => {
    const zones = loadSavedShippingZones();
    if (zones.length === 0) {
      return 0;
    }
    return parseRateValue(zones[0].rateValue, zones[0].rateType);
  });
  const [paymentMethod, setPaymentMethod] = useState(
    onlinePaymentProvider ? "card" : offlinePaymentsEnabled ? "offline" : "card"
  );
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiryMonth, setCardExpiryMonth] = useState("");
  const [cardExpiryYear, setCardExpiryYear] = useState("");
  const [cardCode, setCardCode] = useState("");
  const [isAcceptJsReady, setIsAcceptJsReady] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onlineCardPaymentsEnabled = onlinePaymentProvider !== null || stripeOnlinePaymentsEnabled;
  const authorizeNetScriptSrc = authorizeNetConfig?.environment === "production"
    ? "https://js.authorize.net/v1/Accept.js"
    : "https://jstest.authorize.net/v1/Accept.js";

  const availablePaymentMethods = useMemo(
    () => getAvailablePaymentMethods(Boolean(offlinePaymentsEnabled), Boolean(onlineCardPaymentsEnabled)),
    [offlinePaymentsEnabled, onlineCardPaymentsEnabled],
  );

  const activePaymentMethod = availablePaymentMethods.includes(paymentMethod)
    ? paymentMethod
    : (availablePaymentMethods[0] || "card");
  const activePaymentProvider = activePaymentMethod === "card"
    ? (onlinePaymentProvider ?? (stripeOnlinePaymentsEnabled ? "stripe" : null))
    : "manual";

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

    void checkAuth();

  }, []);

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

  function tokenizeAuthorizeNetCard() {
    return new Promise<{ dataDescriptor: string; dataValue: string }>((resolve, reject) => {
      if (!authorizeNetConfig?.loginId || !authorizeNetConfig.clientKey) {
        reject(new Error("Authorize.net is not configured for this storefront."));
        return;
      }

      if (!window.Accept?.dispatchData) {
        reject(new Error("Authorize.net secure card form is not ready yet. Please try again."));
        return;
      }

      window.Accept.dispatchData(
        {
          authData: {
            clientKey: authorizeNetConfig.clientKey,
            apiLoginID: authorizeNetConfig.loginId,
          },
          cardData: {
            cardNumber,
            month: cardExpiryMonth,
            year: cardExpiryYear,
            cardCode,
          },
        },
        (response) => {
          const resultCode = response?.messages?.resultCode;
          if (resultCode !== "Ok" || !response?.opaqueData?.dataValue || !response?.opaqueData?.dataDescriptor) {
            const firstMessage = response?.messages?.message?.[0]?.text;
            reject(new Error(firstMessage || "Unable to tokenize your card. Please check the details and try again."));
            return;
          }

          resolve({
            dataDescriptor: response.opaqueData.dataDescriptor,
            dataValue: response.opaqueData.dataValue,
          });
        },
      );
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setStatus(null);

    try {
      const authorizeNetOpaqueData = activePaymentProvider === "authorize_net"
        ? await tokenizeAuthorizeNetCard()
        : undefined;

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
          shippingAmount,
          taxAmount: 0,
          paymentMethod: activePaymentMethod,
          paymentProvider: activePaymentProvider,
          authorizeNetOpaqueData,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Unable to place your order.");
      }

      if (typeof payload.checkoutUrl === "string" && payload.checkoutUrl) {
        window.location.href = payload.checkoutUrl;
        return;
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
      {activePaymentProvider === "authorize_net" ? (
        <Script
          src={authorizeNetScriptSrc}
          strategy="afterInteractive"
          onLoad={() => setIsAcceptJsReady(true)}
        />
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-base font-semibold text-slate-900">Customer details</p>
          <p className="text-sm text-slate-500">We’ll create an order from this cart once you submit.</p>
        </div>
        <div className="text-left sm:text-right">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Estimated total</p>
          <p className="text-lg font-bold text-slate-900">{currency} {(subtotal + shippingAmount).toFixed(2)}</p>
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

      {shippingZones.length > 0 ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-900">Shipping method</p>
          <p className="mt-1 text-sm text-slate-500">Choose your preferred shipping option.</p>
          <div className="mt-3 space-y-3">
            {shippingZones.map((zone, idx) => {
              const amount = parseRateValue(zone.rateValue, zone.rateType);
              const isSelected = selectedZoneIdx === idx;
              return (
                <label
                  key={`${zone.name}-${idx}`}
                  className={`flex items-center justify-between rounded-xl border px-4 py-3 text-sm font-medium cursor-pointer transition ${
                    isSelected
                      ? "border-cyan-600 bg-cyan-50/50 text-slate-900"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="shippingMethod"
                      checked={isSelected}
                      onChange={() => {
                        setSelectedZoneIdx(idx);
                        setShippingAmount(amount);
                      }}
                      className="h-4 w-4 border-slate-300 text-cyan-600 focus:ring-cyan-500"
                    />
                    <div>
                      <span className="font-semibold text-slate-900">{zone.name}</span>
                      <p className="text-xs text-slate-500">{zone.regions}</p>
                    </div>
                  </div>
                  <span className="font-semibold text-slate-900">
                    {zone.rateType === "free" ? "Free" : zone.rateValue}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-sm font-semibold text-slate-900">Payment method</p>
        <p className="mt-1 text-sm text-slate-500">Choose how you’d like to complete this order.</p>
        <div className="mt-3 space-y-3">
          {availablePaymentMethods.includes("card") ? (
            <button
              type="button"
              onClick={() => setPaymentMethod("card")}
              className={`w-full text-left rounded-xl border px-4 py-3 text-sm font-medium transition ${
                activePaymentMethod === "card"
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
              }`}
            >
              {activePaymentProvider === "authorize_net" ? "Card payment via Authorize.net" : "Card payment"}
            </button>
          ) : null}
          {availablePaymentMethods.includes("offline") ? (
            <label className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium cursor-pointer transition ${
              activePaymentMethod === "offline"
                ? "border-cyan-600 bg-cyan-50/50 text-slate-900"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}>
              <input
                type="checkbox"
                checked={activePaymentMethod === "offline"}
                onChange={(e) => setPaymentMethod(e.target.checked ? "offline" : "card")}
                className="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
              />
              <div>
                <span className="font-semibold text-slate-900">Payment on pickup</span>
                <p className="text-xs text-slate-500">Pay with cash, bank transfer, or manual method upon order pickup.</p>
              </div>
            </label>
          ) : null}
          {availablePaymentMethods.length === 0 ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              This store has no active payment methods yet. Ask the merchant to connect Stripe or enable offline payments.
            </div>
          ) : null}
        </div>
      </div>

      {activePaymentProvider === "authorize_net" && activePaymentMethod === "card" ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-900">Card details</p>
          <p className="mt-1 text-sm text-slate-500">
            Your card is tokenized securely by Authorize.net in the browser before Prado Commerce receives the payment token.
          </p>

          <div className="mt-3 grid gap-3">
            <input
              value={cardNumber}
              onChange={(event) => setCardNumber(event.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-0 placeholder:text-slate-400"
              placeholder="Card number"
              autoComplete="cc-number"
              inputMode="numeric"
            />

            <div className="grid gap-3 sm:grid-cols-3">
              <input
                value={cardExpiryMonth}
                onChange={(event) => setCardExpiryMonth(event.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-0 placeholder:text-slate-400"
                placeholder="MM"
                autoComplete="cc-exp-month"
                inputMode="numeric"
              />
              <input
                value={cardExpiryYear}
                onChange={(event) => setCardExpiryYear(event.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-0 placeholder:text-slate-400"
                placeholder="YYYY"
                autoComplete="cc-exp-year"
                inputMode="numeric"
              />
              <input
                value={cardCode}
                onChange={(event) => setCardCode(event.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-0 placeholder:text-slate-400"
                placeholder="CVV"
                autoComplete="cc-csc"
                inputMode="numeric"
              />
            </div>
          </div>

          {!isAcceptJsReady ? (
            <p className="mt-3 text-xs text-slate-500">Loading secure Authorize.net card form…</p>
          ) : null}
        </div>
      ) : null}

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
        disabled={
          isSubmitting ||
          isCartEmpty ||
          availablePaymentMethods.length === 0 ||
          (activePaymentProvider === "authorize_net" && !isAcceptJsReady)
        }
        className="w-full rounded-full bg-cyan-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isCartEmpty ? "Cart is empty" : isSubmitting ? "Submitting order..." : "Place order"}
      </button>

      {status ? <p className="mt-3 text-sm text-slate-600">{status}</p> : null}
    </form>
  );
}
