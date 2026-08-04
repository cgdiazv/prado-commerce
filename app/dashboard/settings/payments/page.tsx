"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type ProviderStatus = {
  stripe: boolean;
  authorizeNet: boolean;
};

export default function PaymentsPage() {
  const router = useRouter();
  const [providerStatus, setProviderStatus] = useState<ProviderStatus>({
    stripe: false,
    authorizeNet: false,
  });
  const [defaultProvider, setDefaultProvider] = useState<"stripe" | "authorizeNet">("stripe");
  const [offlinePaymentsEnabled, setOfflinePaymentsEnabled] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function loadStoreSettings() {
      try {
        const response = await fetch("/api/stores", { cache: "no-store" });
        const stores = await response.json();
        if (response.ok && Array.isArray(stores) && stores[0]) {
          setOfflinePaymentsEnabled(Boolean(stores[0].offlinePaymentsEnabled));
        }
      } catch {
        // Ignore loading errors and keep the default state.
      }
    }

    void loadStoreSettings();
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);

    try {
      const response = await fetch("/api/stores", { cache: "no-store" });
      const stores = await response.json();
      const store = Array.isArray(stores) && stores[0] ? stores[0] : null;

      if (!store?.id) {
        throw new Error("Store not found");
      }

      const patchResponse = await fetch(`/api/stores/${store.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          offlinePaymentsEnabled,
        }),
      });

      const payload = await patchResponse.json();
      if (!patchResponse.ok) {
        throw new Error(payload.error || "Unable to update payments settings.");
      }

      router.push("/dashboard/settings");
    } catch (error) {
      console.error("[PAYMENTS_SETTINGS_SAVE_ERROR]", error);
      alert(error instanceof Error ? error.message : "Unable to save payments settings.");
    } finally {
      setIsSaving(false);
    }
  }

  function toggleProvider(provider: keyof ProviderStatus) {
    setProviderStatus((current) => ({ ...current, [provider]: !current[provider] }));
  }

  function toggleOfflinePayments() {
    setOfflinePaymentsEnabled((current) => !current);
  }

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
            Connect Stripe and Authorize.net to manage payment processing for your store.
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
          <div>
            <label className="block text-sm font-semibold text-slate-900">Default payment provider</label>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Choose which provider is used first for checkout routing.
            </p>
            <select
              value={defaultProvider}
              onChange={(event) => setDefaultProvider(event.target.value as "stripe" | "authorizeNet")}
              className="mt-3 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
            >
              <option value="stripe">Stripe</option>
              <option value="authorizeNet">Authorize.net</option>
            </select>
          </div>

          <div className="grid gap-4">
            <article className={`rounded-xl border p-5 shadow-sm ${providerStatus.stripe ? "border-cyan-200 bg-cyan-50" : "border-slate-200 bg-white"}`}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-base font-semibold text-slate-950">Stripe</h2>
                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    Connect Stripe to accept card payments and powered checkouts.
                  </p>
                </div>
                <span className={`inline-flex min-w-28 items-center justify-center rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap ${providerStatus.stripe ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                  {providerStatus.stripe ? "Connected" : "Not connected"}
                </span>
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => toggleProvider("stripe")}
                  className="rounded-full bg-[#635BFF] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#5247f5]"
                >
                  {providerStatus.stripe ? "Disconnect Stripe" : "Connect Stripe"}
                </button>
                <button
                  type="button"
                  className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Configure keys
                </button>
              </div>
            </article>

            <article className={`rounded-xl border p-5 shadow-sm ${providerStatus.authorizeNet ? "border-cyan-200 bg-cyan-50" : "border-slate-200 bg-white"}`}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-base font-semibold text-slate-950">Authorize.net</h2>
                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    Connect Authorize.net for gateway-based payment processing.
                  </p>
                </div>
                <span className={`inline-flex min-w-28 items-center justify-center rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap ${providerStatus.authorizeNet ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                  {providerStatus.authorizeNet ? "Connected" : "Not connected"}
                </span>
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => toggleProvider("authorizeNet")}
                  className="rounded-full bg-[#1F73B7] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1a629c]"
                >
                  {providerStatus.authorizeNet ? "Disconnect Authorize.net" : "Connect Authorize.net"}
                </button>
                <button
                  type="button"
                  className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Configure keys
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
