"use client";

import React from "react";
import { DollarSign, ShoppingCart, TrendingUp, Store } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { DashboardMonthlyChart, MonthlyDataPoint } from "./dashboard-monthly-chart";

interface DashboardSummaryViewProps {
  totalStores: number;
  totalProducts: number;
  totalRevenue: number;
  totalOrders: number;
  baseCurrency: string;
  currentPlan: string;
  isStarter: boolean;
  dashboardError: string | null;
  monthlySales?: MonthlyDataPoint[];
  year?: number;
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
  monthlySales = [],
  year = new Date().getFullYear(),
}: DashboardSummaryViewProps) {
  const { t, language } = useLanguage();
  const isEs = language === "es";

  const formatter = new Intl.NumberFormat(language === "es" ? "es-ES" : "en-US", {
    style: "currency",
    currency: baseCurrency,
  });

  const summaryCards = [
    {
      label: t.dashboard.totalStores,
      value: totalStores.toString(),
      subtext: isEs ? "Tiendas activas" : "Active stores",
      icon: Store,
    },
    {
      label: t.dashboard.totalProducts,
      value: totalProducts.toString(),
      subtext: isEs ? "Productos en catálogo" : "Catalog products",
      icon: ShoppingCart,
    },
    {
      label: t.dashboard.totalRevenue,
      value: formatter.format(totalRevenue),
      subtext: isEs ? "Ingresos generados" : "Total generated revenue",
      icon: DollarSign,
    },
    {
      label: t.dashboard.totalOrders,
      value: totalOrders.toString(),
      subtext: isEs ? "Órdenes procesadas" : "Completed order transactions",
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
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              {t.dashboard.consoleTitle}
            </h1>
            {currentPlan ? (
              <span className="inline-flex items-center rounded-md bg-[#e6f7fa] px-2 py-0.5 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[#0891b2]">
                {currentPlan}
              </span>
            ) : null}
          </div>
          <p className="mt-1.5 max-w-2xl text-sm text-slate-500">
            {t.dashboard.consoleSubtitle}
          </p>
        </div>

        {isStarter ? (
          <div className="rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm text-cyan-800">
            {t.dashboard.starterPlanNotice}
          </div>
        ) : null}

        <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {summaryCards.map((card) => {
            const Icon = card.icon;

            return (
              <div
                key={card.label}
                className="rounded-[8px] border border-slate-200 bg-white p-3.5 sm:p-5 shadow-xs"
              >
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider truncate pr-1">
                    {card.label}
                  </span>
                  <Icon className="h-4 w-4 shrink-0 text-slate-400" />
                </div>
                <p className="mt-1.5 sm:mt-2 text-lg sm:text-2xl font-bold text-slate-900 truncate">
                  {card.value}
                </p>
                <p className="mt-0.5 sm:mt-1 text-[11px] sm:text-xs text-slate-400 truncate">
                  {card.subtext}
                </p>
              </div>
            );
          })}
        </div>

        {/* Monthly Sales (YTD) Chart */}
        <div className="mt-8">
          <DashboardMonthlyChart
            data={monthlySales}
            baseCurrency={baseCurrency}
            year={year}
          />
        </div>
      </div>
    </section>
  );
}
