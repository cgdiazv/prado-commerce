"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

const availableCurrencies = ["USD", "EUR", "GBP", "CAD", "AED", "AUD"] as const;

type CurrencyCode = (typeof availableCurrencies)[number];

export default function CurrenciesPage() {
  const router = useRouter();
  const [baseCurrency, setBaseCurrency] = useState<CurrencyCode>("USD");
  const [enabledCurrencies, setEnabledCurrencies] = useState<CurrencyCode[]>(["USD", "EUR"]);

  function toggleCurrency(currency: CurrencyCode) {
    setEnabledCurrencies((current) =>
      current.includes(currency) ? current.filter((code) => code !== currency) : [...current, currency],
    );
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    router.push("/dashboard/settings");
  }

  return (
    <section className="space-y-4">
      <div className="w-full">
        <div>
          <p className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
            Settings
          </p>
          <div className="mt-4 flex items-start justify-between gap-4">
            <h1 className="text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">
              Currencies
            </h1>

            <Link
              href="/dashboard/settings"
              className="inline-flex shrink-0 items-center rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              ← Back to settings
            </Link>
          </div>
          <p className="mt-4 text-base leading-7 text-slate-600 sm:max-w-xl sm:text-lg">
            Choose which currencies customers can browse and pay with.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-slate-900">Base currency</label>
            <p className="mt-1 text-sm leading-6 text-slate-500">This is the main currency used for pricing and reporting.</p>
            <select
              value={baseCurrency}
              onChange={(event) => setBaseCurrency(event.target.value as CurrencyCode)}
              className="mt-3 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
            >
              {availableCurrencies.map((currency) => (
                <option key={currency} value={currency}>
                  {currency}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-900">Enabled currencies</label>
            <p className="mt-1 text-sm leading-6 text-slate-500">Select the currencies customers can browse and pay with.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {availableCurrencies.map((currency) => {
                const isSelected = enabledCurrencies.includes(currency);

                return (
                  <label
                    key={currency}
                    className={`flex cursor-pointer items-center justify-between rounded-xl border px-4 py-3 text-sm transition ${
                      isSelected ? "border-cyan-200 bg-cyan-50 text-cyan-900" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <span className="font-semibold">{currency}</span>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleCurrency(currency)}
                      className="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                    />
                  </label>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-900">Currency display format</label>
            <p className="mt-1 text-sm leading-6 text-slate-500">Use a generic display format placeholder for storefront pricing.</p>
            <input
              type="text"
              placeholder="$1,234.56"
              className="mt-3 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
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
