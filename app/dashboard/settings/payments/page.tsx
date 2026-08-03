"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

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

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    router.push("/dashboard/settings");
  }

  function toggleProvider(provider: keyof ProviderStatus) {
    setProviderStatus((current) => ({ ...current, [provider]: !current[provider] }));
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

          <div className="grid gap-4 lg:grid-cols-2">
            <article className={`rounded-xl border p-5 shadow-sm ${providerStatus.stripe ? "border-cyan-200 bg-cyan-50" : "border-slate-200 bg-white"}`}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-base font-semibold text-slate-950">Stripe</h2>
                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    Connect Stripe to accept card payments and powered checkouts.
                  </p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${providerStatus.stripe ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                  {providerStatus.stripe ? "Connected" : "Not connected"}
                </span>
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => toggleProvider("stripe")}
                  className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
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
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${providerStatus.authorizeNet ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                  {providerStatus.authorizeNet ? "Connected" : "Not connected"}
                </span>
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => toggleProvider("authorizeNet")}
                  className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
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

          <div>
            <label className="block text-sm font-semibold text-slate-900">Payment notes</label>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Add any internal reminders about payment setup, account IDs, or testing status.
            </p>
            <textarea
              placeholder="Internal payment setup notes"
              className="mt-3 min-h-28 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
            />
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
            className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Save changes
          </button>
        </div>
      </form>
    </section>
  );
}
