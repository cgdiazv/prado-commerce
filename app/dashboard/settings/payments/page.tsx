"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type StripeStatus = {
  stripeConnected: boolean;
  stripeConnectAccountId: string | null;
  stripeChargesEnabled: boolean;
  stripePayoutsEnabled: boolean;
  stripeDetailsSubmitted: boolean;
};

type StoreSummary = {
  id: string;
  name: string;
  offlinePaymentsEnabled?: boolean;
  stripeConnectAccountId?: string | null;
  stripeChargesEnabled?: boolean;
  stripePayoutsEnabled?: boolean;
  stripeDetailsSubmitted?: boolean;
  authNetLoginId?: string | null;
  authNetClientKey?: string | null;
  authNetEnv?: "sandbox" | "production" | string;
  authNetConfigured?: boolean;
};

export default function PaymentsPage() {
  const router = useRouter();
  const [store, setStore] = useState<StoreSummary | null>(null);
  const [stripeStatus, setStripeStatus] = useState<StripeStatus>({
    stripeConnected: false,
    stripeConnectAccountId: null,
    stripeChargesEnabled: false,
    stripePayoutsEnabled: false,
    stripeDetailsSubmitted: false,
  });
  const [isStripeLoading, setIsStripeLoading] = useState(true);
  const [isStripeActionPending, setIsStripeActionPending] = useState(false);
  const [offlinePaymentsEnabled, setOfflinePaymentsEnabled] = useState(false);
  const [authNetLoginId, setAuthNetLoginId] = useState("");
  const [authNetClientKey, setAuthNetClientKey] = useState("");
  const [authNetTransKey, setAuthNetTransKey] = useState("");
  const [authNetEnv, setAuthNetEnv] = useState<"sandbox" | "production">("sandbox");
  const [isDisconnectingAuthNet, setIsDisconnectingAuthNet] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  async function refreshStripeStatus(storeId: string) {
    const response = await fetch(`/api/stores/${storeId}/stripe-connect`, { cache: "no-store" });
    const payload = await response.json() as (StripeStatus & { error?: string });

    if (!response.ok) {
      throw new Error(payload.error || "Unable to load Stripe status.");
    }

    setStripeStatus({
      stripeConnected: payload.stripeConnected,
      stripeConnectAccountId: payload.stripeConnectAccountId,
      stripeChargesEnabled: payload.stripeChargesEnabled,
      stripePayoutsEnabled: payload.stripePayoutsEnabled,
      stripeDetailsSubmitted: payload.stripeDetailsSubmitted,
    });
  }

  useEffect(() => {
    async function loadStoreSettings() {
      setIsStripeLoading(true);

      try {
        const response = await fetch("/api/stores", { cache: "no-store" });
        const stores = (await response.json()) as StoreSummary[];

        if (!response.ok) {
          throw new Error("Unable to load stores.");
        }

        const firstStore = Array.isArray(stores) && stores[0] ? stores[0] : null;
        if (!firstStore) {
          setStore(null);
          return;
        }

        setStore(firstStore);
        setOfflinePaymentsEnabled(Boolean(firstStore.offlinePaymentsEnabled));
        setAuthNetLoginId(firstStore.authNetLoginId ?? "");
        setAuthNetClientKey(firstStore.authNetClientKey ?? "");
        setAuthNetEnv(firstStore.authNetEnv === "production" ? "production" : "sandbox");

        if (firstStore.stripeConnectAccountId) {
          await refreshStripeStatus(firstStore.id);
        } else {
          setStripeStatus({
            stripeConnected: false,
            stripeConnectAccountId: null,
            stripeChargesEnabled: false,
            stripePayoutsEnabled: false,
            stripeDetailsSubmitted: false,
          });
        }
      } catch (error) {
        console.error("[PAYMENTS_SETTINGS_LOAD_ERROR]", error);
      } finally {
        setIsStripeLoading(false);
      }
    }

    void loadStoreSettings();
  }, []);

  async function handleStripeAction(action: "onboard" | "dashboard" | "disconnect") {
    if (!store?.id) {
      alert("Store not found");
      return;
    }

    setIsStripeActionPending(true);

    try {
      const response = await fetch(`/api/stores/${store.id}/stripe-connect`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action }),
      });

      const payload = await response.json() as { error?: string; url?: string };

      if (!response.ok) {
        throw new Error(payload.error || "Unable to complete Stripe action.");
      }

      if ((action === "onboard" || action === "dashboard") && payload.url) {
        window.location.href = payload.url;
        return;
      }

      if (action === "disconnect") {
        setStripeStatus({
          stripeConnected: false,
          stripeConnectAccountId: null,
          stripeChargesEnabled: false,
          stripePayoutsEnabled: false,
          stripeDetailsSubmitted: false,
        });
        setOfflinePaymentsEnabled(true);
      }

      await refreshStripeStatus(store.id);
    } catch (error) {
      console.error("[PAYMENTS_STRIPE_ACTION_ERROR]", error);
      alert(error instanceof Error ? error.message : "Unable to complete Stripe action.");
    } finally {
      setIsStripeActionPending(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);

    try {
      if (!store?.id) {
        throw new Error("Store not found");
      }

      const patchResponse = await fetch(`/api/stores/${store.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          offlinePaymentsEnabled,
          authNetLoginId,
          authNetClientKey,
          authNetTransKey: authNetTransKey || undefined,
          authNetEnv,
        }),
      });

      const payload = await patchResponse.json();
      if (!patchResponse.ok) {
        throw new Error(payload.error || "Unable to update payments settings.");
      }

      setAuthNetTransKey("");

      router.push("/dashboard/settings");
    } catch (error) {
      console.error("[PAYMENTS_SETTINGS_SAVE_ERROR]", error);
      alert(error instanceof Error ? error.message : "Unable to save payments settings.");
    } finally {
      setIsSaving(false);
    }
  }

  function toggleOfflinePayments() {
    setOfflinePaymentsEnabled((current) => !current);
  }

  async function handleDisconnectAuthorizeNet() {
    if (!store?.id) {
      alert("Store not found");
      return;
    }

    setIsDisconnectingAuthNet(true);

    try {
      const response = await fetch(`/api/stores/${store.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          authNetLoginId: null,
          authNetClientKey: null,
          authNetTransKey: null,
          authNetEnv: "sandbox",
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Unable to disconnect Authorize.net.");
      }

      setAuthNetLoginId("");
      setAuthNetClientKey("");
      setAuthNetTransKey("");
      setAuthNetEnv("sandbox");
      setStore((current) => current ? { ...current, authNetConfigured: false, authNetLoginId: null, authNetClientKey: null, authNetEnv: "sandbox" } : current);
    } catch (error) {
      console.error("[PAYMENTS_AUTHNET_DISCONNECT_ERROR]", error);
      alert(error instanceof Error ? error.message : "Unable to disconnect Authorize.net.");
    } finally {
      setIsDisconnectingAuthNet(false);
    }
  }

  const isStripeReady = stripeStatus.stripeChargesEnabled && stripeStatus.stripePayoutsEnabled;
  const showStripePending = stripeStatus.stripeConnectAccountId && !isStripeReady;
  const disableStripeDisconnect = isStripeActionPending || !stripeStatus.stripeConnectAccountId;

  return (
    <section className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
            Settings
          </p>
          <h1 className="mt-4 text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">
            Payments
          </h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-slate-600 sm:text-lg">
            Connect Stripe to accept online card payments and transfer payouts to your business.
          </p>
        </div>

        <Link
          href="/dashboard/settings"
          className="inline-flex shrink-0 items-center rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          ← Back to settings
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="space-y-5">
          {store ? (
            <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              Managing payments for <span className="font-semibold text-slate-900">{store.name}</span>.
            </p>
          ) : (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Create a store before configuring payment providers.
            </p>
          )}

          <div className="grid gap-4">
            <article className={`rounded-xl border p-5 shadow-sm ${isStripeReady ? "border-cyan-200 bg-cyan-50" : "border-slate-200 bg-white"}`}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-base font-semibold text-slate-950">Stripe</h2>
                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    Connect a Stripe account to accept online card payments in checkout.
                  </p>
                </div>
                <span className={`inline-flex min-w-28 items-center justify-center rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap ${
                  isStripeReady
                    ? "bg-emerald-100 text-emerald-700"
                    : showStripePending
                      ? "bg-amber-100 text-amber-700"
                      : "bg-slate-100 text-slate-500"
                }`}>
                  {isStripeLoading
                    ? "Checking"
                    : isStripeReady
                      ? "Connected"
                      : showStripePending
                        ? "Pending setup"
                        : "Not connected"}
                </span>
              </div>

              <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-600">
                <p>
                  Charges enabled: <span className="font-semibold">{stripeStatus.stripeChargesEnabled ? "Yes" : "No"}</span>
                </p>
                <p className="mt-1">
                  Payouts enabled: <span className="font-semibold">{stripeStatus.stripePayoutsEnabled ? "Yes" : "No"}</span>
                </p>
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={!store || isStripeActionPending}
                  onClick={() => void handleStripeAction("onboard")}
                  className="rounded-full bg-[#635BFF] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#5247f5]"
                >
                  {showStripePending ? "Continue onboarding" : isStripeReady ? "Reconnect Stripe" : "Connect Stripe"}
                </button>
                <button
                  type="button"
                  disabled={!store || isStripeActionPending || !isStripeReady}
                  onClick={() => void handleStripeAction("dashboard")}
                  className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Open Stripe dashboard
                </button>
                <button
                  type="button"
                  disabled={disableStripeDisconnect}
                  onClick={() => {
                    if (confirm("Disconnect Stripe from this store?")) {
                      void handleStripeAction("disconnect");
                    }
                  }}
                  className="rounded-full border border-rose-300 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Disconnect Stripe
                </button>
              </div>
            </article>

            <article className={`rounded-xl border p-5 shadow-sm ${store?.authNetConfigured ? "border-cyan-200 bg-cyan-50" : "border-slate-200 bg-white"}`}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-base font-semibold text-slate-950">Authorize.net</h2>
                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    Use Accept.js tokenization so Prado Commerce never receives raw card numbers.
                  </p>
                </div>
                <span className={`inline-flex min-w-28 items-center justify-center rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap ${store?.authNetConfigured ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                  {store?.authNetConfigured ? "Configured" : "Not connected"}
                </span>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-slate-700">API Login ID</span>
                  <input
                    value={authNetLoginId}
                    onChange={(event) => setAuthNetLoginId(event.target.value)}
                    placeholder="5KP3u95bQpv"
                    className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                  />
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-slate-700">Public Client Key</span>
                  <input
                    value={authNetClientKey}
                    onChange={(event) => setAuthNetClientKey(event.target.value)}
                    placeholder="1234567890abcdef1234567890abcdef"
                    className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                  />
                </label>

                <label className="flex flex-col gap-2 md:col-span-2">
                  <span className="text-sm font-medium text-slate-700">Transaction Key</span>
                  <input
                    type="password"
                    value={authNetTransKey}
                    onChange={(event) => setAuthNetTransKey(event.target.value)}
                    placeholder={store?.authNetConfigured ? "Leave blank to keep the current key" : "Enter transaction key"}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                  />
                </label>

                <label className="flex flex-col gap-2 md:col-span-2">
                  <span className="text-sm font-medium text-slate-700">Environment</span>
                  <select
                    value={authNetEnv}
                    onChange={(event) => setAuthNetEnv(event.target.value === "production" ? "production" : "sandbox")}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                  >
                    <option value="sandbox">Sandbox (testing)</option>
                    <option value="production">Production (live)</option>
                  </select>
                </label>
              </div>

              <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
                <p className="font-semibold text-slate-900">How this works</p>
                <ul className="mt-2 space-y-2 leading-6">
                  <li>• Buyers enter card details in the storefront, and Accept.js tokenizes them in the browser.</li>
                  <li>• Prado Commerce receives only the one-time opaque token and routes the charge through your gateway credentials.</li>
                  <li>• If Stripe is also connected, Stripe remains the preferred online card provider for now.</li>
                </ul>
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={!store?.authNetConfigured || isDisconnectingAuthNet}
                  onClick={() => {
                    if (confirm("Disconnect Authorize.net from this store?")) {
                      void handleDisconnectAuthorizeNet();
                    }
                  }}
                  className="rounded-full border border-rose-300 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Disconnect Authorize.net
                </button>
              </div>
            </article>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-900">Offline payments</label>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Allow customers to place orders and pay later through cash, bank transfer, or another manual method.
                </p>
              </div>
              <button
                type="button"
                onClick={toggleOfflinePayments}
                className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${offlinePaymentsEnabled ? "border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100" : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"}`}
              >
                {offlinePaymentsEnabled ? "Enabled" : "Enable"}
              </button>
            </div>

            <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-sm font-semibold text-slate-900">How it works</p>
              <ul className="mt-2 space-y-2 text-sm leading-6 text-slate-600">
                <li>• Customers can choose offline payment at checkout.</li>
                <li>• You can confirm payment manually from the order dashboard.</li>
                <li>• Add notes for pickup, invoicing, or bank-transfer instructions.</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Link
            href="/dashboard/settings"
            className="rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSaving}
            className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSaving ? "Saving..." : "Save changes"}
          </button>
        </div>
      </form>
    </section>
  );
}
