"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/lib/i18n/language-context";

export type Plan = "STARTER" | "PRO" | "ENTERPRISE";

type ManagePlanPanelProps = {
  merchantId: string;
  currentPlan: Plan | string;
};

export function ManagePlanPanel({ merchantId, currentPlan }: ManagePlanPanelProps) {
  const router = useRouter();
  const { language } = useLanguage();
  const isEs = language === "es";

  const normalizedPlan: Plan =
    currentPlan === "PRO"
      ? "PRO"
      : currentPlan === "ENTERPRISE"
      ? "ENTERPRISE"
      : "STARTER";

  const planLabels: Record<Plan, string> = {
    STARTER: isEs ? "Inicial" : "Starter",
    PRO: "Pro",
    ENTERPRISE: isEs ? "Empresarial" : "Enterprise",
  };

  const planDescriptions: Record<Plan, string> = {
    STARTER: isEs
      ? "Ideal para comenzar con una tienda y herramientas de comercio básicas."
      : "Ideal for getting started with one storefront and core commerce tools.",
    PRO: isEs
      ? "Agrega más tiendas, dominios personalizados y funciones avanzadas de crecimiento."
      : "Adds more stores, custom domains, and advanced growth features.",
    ENTERPRISE: isEs
      ? "Diseñado para equipos grandes con límites ampliados y mayor control."
      : "Designed for larger teams with expanded limits and more control.",
  };

  const [selectedPlan, setSelectedPlan] = useState<Plan>(normalizedPlan);
  const [effectivePlan, setEffectivePlan] = useState<Plan>(normalizedPlan);
  const [billingInterval, setBillingInterval] = useState<"month" | "year">("month");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function getPlanRank(plan: Plan) {
    if (plan === "ENTERPRISE") {
      return 2;
    }

    if (plan === "PRO") {
      return 1;
    }

    return 0;
  }

  async function handleUpdatePlan(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);

    const isUpgrade = getPlanRank(selectedPlan) > getPlanRank(effectivePlan);

    if (isUpgrade) {
      const checkoutResponse = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          plan: selectedPlan,
          interval: billingInterval,
        }),
      });

      const checkoutResult = (await checkoutResponse.json()) as { error?: string; url?: string };

      if (checkoutResult.url) {
        window.location.assign(checkoutResult.url);
        return;
      }

      setError(checkoutResult.error ?? (isEs ? "Error al iniciar el pago." : "Failed to start billing checkout."));
      return;
    }

    const response = await fetch(`/api/admin/merchants/${merchantId}/plan`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ plan: selectedPlan }),
    });

    const result = (await response.json()) as { error?: string; plan?: Plan };

    if (!response.ok) {
      setError(result.error ?? (isEs ? "Error al actualizar el plan." : "Failed to update plan."));
      return;
    }

    setSelectedPlan((result.plan ?? selectedPlan) as Plan);
    setEffectivePlan((result.plan ?? selectedPlan) as Plan);
    setMessage(
      isEs
        ? "Plan actualizado. Los límites de tu panel se actualizarán en breve."
        : "Plan updated. Your dashboard limits will refresh shortly.",
    );
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-2xl">
          <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
            {isEs ? "Gestionar mejoras de cuenta" : "Manage account upgrades"}
          </h2>
          <p className="mt-2 text-sm text-slate-700">
            {isEs
              ? "Mejora o cambia tu plan de Prado Commerce en cualquier momento. Los cambios se aplican de inmediato."
              : "Upgrade or downgrade your Prado Commerce plan at any time. Changes apply immediately after you confirm them."}
          </p>
        </div>
        <span className="inline-flex rounded-full border border-slate-300 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700">
          {isEs ? "Actual" : "Current"}: {planLabels[normalizedPlan]}
        </span>
      </div>

      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
        <form onSubmit={handleUpdatePlan} className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          <label className="flex w-full max-w-xs flex-col gap-2">
            <span className="text-sm font-medium text-slate-700">{isEs ? "Plan" : "Plan"}</span>
            <select
              value={selectedPlan}
              onChange={(event) => setSelectedPlan(event.target.value as Plan)}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-slate-500"
              disabled={isPending}
            >
              <option value="STARTER">{isEs ? "Inicial (Starter)" : "Starter"}</option>
              <option value="PRO">Pro</option>
              <option value="ENTERPRISE">{isEs ? "Empresarial (Enterprise)" : "Enterprise"}</option>
            </select>
          </label>

          {getPlanRank(selectedPlan) > getPlanRank(effectivePlan) ? (
            <label className="flex w-full max-w-xs flex-col gap-2">
              <span className="text-sm font-medium text-slate-700">{isEs ? "Facturación" : "Billing"}</span>
              <select
                value={billingInterval}
                onChange={(event) => setBillingInterval(event.target.value as "month" | "year")}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-slate-500"
                disabled={isPending}
              >
                <option value="month">{isEs ? "Mensual" : "Monthly"}</option>
                <option value="year">{isEs ? "Anual" : "Yearly"}</option>
              </select>
            </label>
          ) : null}

          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending
              ? isEs
                ? "Actualizando..."
                : "Updating..."
              : getPlanRank(selectedPlan) > getPlanRank(effectivePlan)
                ? isEs
                  ? "Continuar al pago"
                  : "Continue to checkout"
                : isEs
                  ? "Actualizar plan"
                  : "Update plan"}
          </button>
        </form>

        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-slate-700">
          <span className="font-medium">{planDescriptions[selectedPlan]}</span>
          <Link
            href="/pricing"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-slate-900 underline-offset-2 hover:underline"
          >
            {isEs ? "Ver precios" : "View pricing"}
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
