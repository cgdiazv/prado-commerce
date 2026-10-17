"use client";

import React from "react";
import { DollarSign, ShoppingCart, TrendingUp, Store } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";

interface DashboardSummaryViewProps {
  totalStores: number;
  totalProducts: number;
  totalRevenue: number;
  totalOrders: number;
  baseCurrency: string;
  currentPlan: string;
  isStarter: boolean;
  dashboardError: string | null;
}

export function DashboardSummaryView({
  totalStores,
  totalProducts,
  totalRevenue,
  totalOrders,
  baseCurrency,
  currentPlan,
  isStarter,
  dashboardError,
}: DashboardSummaryViewProps) {
  const { t, language } = useLanguage();

  const formatter = new Intl.NumberFormat(language === "es" ? "es-ES" : "en-US", {
    style: "currency",
    currency: baseCurrency,
  });

  const summaryCards = [
    {
      label: t.dashboard.totalStores,
      value: totalStores.toString(),
      icon: Store,
    },
    {
      label: t.dashboard.totalProducts,
      value: totalProducts.toString(),
      icon: ShoppingCart,
    },
    {
      label: t.dashboard.totalRevenue,
      value: formatter.format(totalRevenue),
      icon: DollarSign,
    },
    {
      label: t.dashboard.totalOrders,
      value: totalOrders.toString(),
      icon: TrendingUp,
    },
  ];

  return (
    <section>
      {dashboardError ? (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {dashboardError}
        </div>
      ) : null}

      <div className="space-y-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
              {t.dashboard.overviewBadge}
            </p>
            <span className="inline-flex rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-cyan-700">
              {currentPlan}
            </span>
          </div>
          <h1 className="mt-1 text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">
            {t.dashboard.consoleTitle}
          </h1>
          <p className="mt-1 max-w-xl text-sm text-slate-500">
            {t.dashboard.consoleSubtitle}
          </p>
        </div>

        {isStarter ? (
          <div className="rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm text-cyan-800">
            {t.dashboard.starterPlanNotice}
          </div>
        ) : null}

        <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {summaryCards.map((card) => {
            const Icon = card.icon;

            return (
              <div
                key={card.label}
                className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md"
              >
                <div className="inline-flex rounded border border-slate-200/80 bg-slate-50 p-2 text-slate-700 shadow-2xs">
                  <Icon className="h-5 w-5" />
                </div>
                <p className="mt-4 text-sm font-medium text-slate-600">
                  {card.label}
                </p>
                <p className="mt-2 text-3xl font-semibold text-slate-950">
                  {card.value}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
