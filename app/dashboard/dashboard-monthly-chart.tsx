"use client";

import { useState } from "react";
import { Calendar } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";

export type MonthlyDataPoint = {
  monthIndex: number;
  revenue: number;
  orderCount: number;
};

interface DashboardMonthlyChartProps {
  data: MonthlyDataPoint[];
  baseCurrency: string;
  year: number;
}

const MONTH_LABELS_ES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const MONTH_LABELS_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const MONTH_NAMES_FULL_ES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];
const MONTH_NAMES_FULL_EN = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

function formatShortCurrency(amount: number, currency: string, isEs: boolean): string {
  if (amount >= 1_000_000) {
    return `${currency === "USD" ? "$" : ""}${(amount / 1_000_000).toFixed(1)}M`;
  }
  if (amount >= 1_000) {
    return `${currency === "USD" ? "$" : ""}${(amount / 1_000).toFixed(1)}k`;
  }
  return new Intl.NumberFormat(isEs ? "es-ES" : "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function DashboardMonthlyChart({
  data,
  baseCurrency,
  year,
}: DashboardMonthlyChartProps) {
  const { language } = useLanguage();
  const isEs = language === "es";
  const [hoveredMonth, setHoveredMonth] = useState<number | null>(null);

  const monthLabels = isEs ? MONTH_LABELS_ES : MONTH_LABELS_EN;
  const monthNamesFull = isEs ? MONTH_NAMES_FULL_ES : MONTH_NAMES_FULL_EN;

  const formatter = new Intl.NumberFormat(isEs ? "es-ES" : "en-US", {
    style: "currency",
    currency: baseCurrency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const totalYtdRevenue = data.reduce((sum, item) => sum + item.revenue, 0);
  const totalYtdOrders = data.reduce((sum, item) => sum + item.orderCount, 0);

  const currentMonthIndex = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const isCurrentYear = year === currentYear;

  const maxVal = Math.max(...data.map((d) => d.revenue), 0);
  // Ensure a nice round ceiling for the Y axis
  const ceiling = maxVal > 0 ? Math.ceil(maxVal * 1.15) : 1000;

  const yTicks = [
    ceiling,
    ceiling * 0.75,
    ceiling * 0.5,
    ceiling * 0.25,
    0,
  ];

  return (
    <div className="rounded-[8px] border border-slate-200 bg-white p-5 sm:p-6 shadow-xs">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-200 bg-cyan-50 px-2.5 py-0.5 text-xs font-semibold text-cyan-800">
              <Calendar className="h-3 w-3" />
              {isEs ? `YTD ${year}` : `${year} YTD`}
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-500 font-medium">
              {totalYtdOrders} {isEs ? (totalYtdOrders === 1 ? "pedido" : "pedidos") : (totalYtdOrders === 1 ? "order" : "orders")}
            </span>
          </div>
          <h2 className="mt-1.5 text-lg font-bold tracking-tight text-slate-900">
            {isEs ? "Ventas Mensuales (YTD)" : "Monthly Sales (YTD)"}
          </h2>
          <p className="text-xs text-slate-500">
            {isEs
              ? `Evolución mensual de ingresos acumulados en el año ${year}.`
              : `Monthly revenue progression for year ${year}.`}
          </p>
        </div>

        {/* Total YTD badge */}
        <div className="flex items-baseline gap-2 rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-2.5 sm:text-right">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              {isEs ? "Total Facturado YTD" : "Total YTD Revenue"}
            </p>
            <p className="text-xl font-bold tracking-tight text-cyan-900">
              {formatter.format(totalYtdRevenue)}
            </p>
          </div>
        </div>
      </div>

      {/* Chart Visual Area */}
      <div className="mt-6">
        <div className="relative flex">
          {/* Y-Axis scale labels */}
          <div className="hidden sm:flex flex-col justify-between pr-3 text-right text-[11px] font-medium text-slate-400 select-none h-60 shrink-0 w-16">
            {yTicks.map((tick, idx) => (
              <span key={idx} className="leading-none">
                {formatShortCurrency(tick, baseCurrency, isEs)}
              </span>
            ))}
          </div>

          {/* Chart Bars Canvas */}
          <div className="relative flex-1">
            {/* Background horizontal grid lines */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none h-60">
              {yTicks.map((_, idx) => (
                <div
                  key={idx}
                  className={`w-full border-b ${idx === yTicks.length - 1 ? "border-slate-300" : "border-slate-100"}`}
                />
              ))}
            </div>

            {/* Scrollable Container for Bars (Scrollbar hidden) */}
            <div className="relative overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden pb-1">
              <div
                className="flex items-end justify-start sm:justify-around gap-[5px] h-60 px-2 min-w-max"
                style={{ paddingBottom: "1px" }}
              >
                {data.map((item) => {
                  const monthNameShort = monthLabels[item.monthIndex] ?? `M${item.monthIndex + 1}`;
                  const monthNameFull = monthNamesFull[item.monthIndex] ?? monthNameShort;
                  const isHovered = hoveredMonth === item.monthIndex;
                  const isCurrent = isCurrentYear && item.monthIndex === currentMonthIndex;

                  // Compute height percentage (0 to 100%)
                  const heightPercent = ceiling > 0 ? (item.revenue / ceiling) * 100 : 0;
                  const barHeightStyle = heightPercent > 0
                    ? `max(6px, ${heightPercent.toFixed(1)}%)`
                    : "2px";

                  return (
                    <div
                      key={item.monthIndex}
                      className="group relative flex flex-col items-center justify-end h-full cursor-pointer"
                      onMouseEnter={() => setHoveredMonth(item.monthIndex)}
                      onMouseLeave={() => setHoveredMonth(null)}
                    >
                      {/* Tooltip on Hover */}
                      <div
                        className={`absolute -top-14 z-20 pointer-events-none transition-all duration-150 transform -translate-x-1/2 left-1/2 ${
                          isHovered
                            ? "opacity-100 scale-100 translate-y-0"
                            : "opacity-0 scale-95 translate-y-1"
                        }`}
                      >
                        <div className="rounded-lg bg-slate-900 px-3 py-1.5 text-center text-white shadow-xl whitespace-nowrap">
                          <p className="text-[11px] font-semibold text-cyan-300">
                            {monthNameFull} {year}
                          </p>
                          <p className="text-xs font-bold">
                            {formatter.format(item.revenue)}
                          </p>
                          <p className="text-[10px] text-slate-300">
                            {item.orderCount} {isEs ? (item.orderCount === 1 ? "pedido" : "pedidos") : (item.orderCount === 1 ? "order" : "orders")}
                          </p>
                        </div>
                      </div>

                      {/* Value label on top of bar if active or high */}
                      {item.revenue > 0 && (
                        <span className="mb-1 hidden text-[10px] font-semibold text-slate-500 group-hover:block whitespace-nowrap">
                          {formatShortCurrency(item.revenue, baseCurrency, isEs)}
                        </span>
                      )}

                      {/* The Vertical Bar */}
                      <div
                        style={{ height: barHeightStyle }}
                        className={`w-[32px] min-w-[30px] rounded-none transition-all duration-200 ${
                          item.revenue > 0
                            ? isHovered
                              ? "bg-cyan-500 shadow-sm"
                              : "bg-cyan-600"
                            : "bg-slate-200"
                        } ${isCurrent ? "ring-2 ring-cyan-400 ring-offset-1" : ""}`}
                        title={`${monthNameFull}: ${formatter.format(item.revenue)} (${item.orderCount} pedidos)`}
                      />

                      {/* Month label below */}
                      <div className="mt-2 text-center select-none">
                        <span
                          className={`block text-xs font-semibold ${
                            isCurrent
                              ? "text-cyan-700 font-bold"
                              : isHovered
                                ? "text-slate-900 font-bold"
                                : "text-slate-500"
                          }`}
                        >
                          {monthNameShort}
                        </span>
                        {isCurrent && (
                          <span className="block text-[9px] font-medium uppercase tracking-tighter text-cyan-600">
                            {isEs ? "Actual" : "Now"}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Legend & Highlights */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3 text-xs text-slate-500">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-none bg-cyan-600 inline-block" />
              <span>{isEs ? "Ventas realizadas" : "Sales revenue"}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-none bg-slate-200 inline-block" />
              <span>{isEs ? "Sin ventas" : "Zero sales"}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
