"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Plan = "STARTER" | "PRO" | "ENTERPRISE";

type ManagePlanPanelProps = {
  merchantId: string;
  currentPlan: Plan;
};

const planLabels: Record<Plan, string> = {
  STARTER: "Starter",
  PRO: "Pro",
  ENTERPRISE: "Enterprise",
};

const planDescriptions: Record<Plan, string> = {
  STARTER: "Ideal for getting started with one storefront and core commerce tools.",
  PRO: "Adds more stores, custom domains, and advanced growth features.",
  ENTERPRISE: "Designed for larger teams with expanded limits and more control.",
};

export function ManagePlanPanel({ merchantId, currentPlan }: ManagePlanPanelProps) {
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState<Plan>(currentPlan);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleUpdatePlan(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);

    const response = await fetch(`/api/admin/merchants/${merchantId}/plan`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ plan: selectedPlan }),
    });

    const result = (await response.json()) as { error?: string; plan?: Plan };

    if (!response.ok) {
      setError(result.error ?? "Failed to update plan.");
      return;
    }

    setSelectedPlan((result.plan ?? selectedPlan) as Plan);
    setMessage("Plan updated. Your dashboard limits will refresh shortly.");
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <article className="rounded-xl border border-cyan-200 bg-cyan-50/70 p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-2xl">
          <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-cyan-800">Manage account upgrades</h2>
          <p className="mt-2 text-sm text-cyan-900">
            Upgrade or downgrade your Prado Commerce plan at any time. Changes apply immediately after you confirm them.
          </p>
        </div>
        <span className="inline-flex rounded-full border border-cyan-300 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-cyan-700">
          Current: {planLabels[currentPlan]}
        </span>
      </div>

      <div className="mt-4 rounded-xl border border-cyan-200 bg-white/80 p-4">
        <form onSubmit={handleUpdatePlan} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex w-full max-w-xs flex-col gap-2">
            <span className="text-sm font-medium text-cyan-900">Plan</span>
            <select
              value={selectedPlan}
              onChange={(event) => setSelectedPlan(event.target.value as Plan)}
              className="rounded-xl border border-cyan-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-cyan-500"
              disabled={isPending}
            >
              <option value="STARTER">Starter</option>
              <option value="PRO">Pro</option>
              <option value="ENTERPRISE">Enterprise</option>
            </select>
          </label>

          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center justify-center rounded-full bg-cyan-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-cyan-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? "Updating..." : "Update plan"}
          </button>
        </form>

        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-cyan-800">
          <span className="font-medium">{planDescriptions[selectedPlan]}</span>
          <Link
            href="/pricing"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-cyan-700 underline-offset-2 hover:underline"
          >
            View pricing
          </Link>
        </div>
      </div>

      {message ? (
        <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {message}
        </div>
      ) : null}

      {error ? (
        <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </div>
      ) : null}
    </article>
  );
}
