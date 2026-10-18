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
    <div className="w-full max-w-full overflow-hidden rounded-[8px] border border-slate-200 bg-white p-4 sm:p-6 shadow-xs">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-200 bg-cyan-50 px-2.5 py-0.5 text-xs font-semibold text-cyan-800">
              <Calendar className="h-3 w-3" />
              {isEs ? `YTD ${year}` : `${year} YTD`}
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-500 font-medium truncate">
              {totalYtdOrders} {isEs ? (totalYtdOrders === 1 ? "pedido" : "pedidos") : (totalYtdOrders === 1 ? "order" : "orders")}
            </span>
          </div>
          <h2 className="mt-1.5 text-base sm:text-lg font-bold tracking-tight text-slate-900">
            {isEs ? "Ventas Mensuales (YTD)" : "Monthly Sales (YTD)"}
          </h2>
          <p className="text-xs text-slate-500">
            {isEs
              ? `Evolución mensual de ingresos acumulados en el año ${year}.`
              : `Monthly revenue progression for year ${year}.`}
          </p>
        </div>

        {/* Total YTD badge */}
        <div className="flex items-baseline gap-2 rounded-xl border border-slate-100 bg-slate-50/80 px-3.5 py-2 sm:px-4 sm:py-2.5 sm:text-right self-start sm:self-auto">
          <div>
            <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              {isEs ? "Total Facturado YTD" : "Total YTD Revenue"}
            </p>
            <p className="text-lg sm:text-xl font-bold tracking-tight text-cyan-900">
              {formatter.format(totalYtdRevenue)}
            </p>
          </div>
        </div>
      </div>

      {/* Chart Visual Area */}
      <div className="mt-5 sm:mt-6 w-full min-w-0">
        <div className="relative flex w-full min-w-0">
          {/* Y-Axis scale labels (visible on sm+) */}
          <div className="hidden sm:flex flex-col justify-between pr-3 text-right text-[11px] font-medium text-slate-400 select-none h-60 shrink-0 w-16">
            {yTicks.map((tick, idx) => (
              <span key={idx} className="leading-none">
                {formatShortCurrency(tick, baseCurrency, isEs)}
              </span>
            ))}
          </div>

          {/* Chart Bars Canvas */}
          <div className="relative flex-1 min-w-0 w-full">
            {/* Background horizontal grid lines */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none h-60 w-full">
              {yTicks.map((_, idx) => (
                <div
                  key={idx}
                  className={`w-full border-b ${idx === yTicks.length - 1 ? "border-slate-300" : "border-slate-100"}`}
                />
              ))}
            </div>

            {/* Container for Bars */}
            <div className="relative w-full min-w-0 pb-1">
              <div
                className="flex items-end justify-between sm:justify-around gap-1 sm:gap-2 h-60 w-full px-0.5 sm:px-2"
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

                  // Keep tooltip inside screen bounds for first and last bars
                  const tooltipAlignClass =
                    item.monthIndex <= 1
                      ? "left-0 translate-x-0"
                      : item.monthIndex >= 10
                      ? "right-0 left-auto translate-x-0"
                      : "left-1/2 -translate-x-1/2";

                  return (
                    <div
                      key={item.monthIndex}
                      className="group relative flex flex-1 min-w-0 max-w-[40px] flex-col items-center justify-end h-full cursor-pointer"
                      onClick={() => setHoveredMonth((prev) => (prev === item.monthIndex ? null : item.monthIndex))}
                      onMouseEnter={() => setHoveredMonth(item.monthIndex)}
                      onMouseLeave={() => setHoveredMonth(null)}
                    >
                      {/* Tooltip on Hover / Touch */}
                      <div
                        className={`absolute -top-14 z-20 transition-all duration-150 transform ${tooltipAlignClass} ${
                          isHovered
                            ? "opacity-100 scale-100 translate-y-0 pointer-events-auto"
                            : "opacity-0 scale-95 translate-y-1 pointer-events-none"
                        }`}
                      >
                        <div className="rounded-lg bg-slate-900 px-2.5 py-1.5 sm:px-3 text-center text-white shadow-xl whitespace-nowrap">
                          <p className="text-[10px] sm:text-[11px] font-semibold text-cyan-300">
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

                      {/* Value label on top of bar if active */}
                      {item.revenue > 0 && (
                        <span className="mb-1 hidden text-[10px] font-semibold text-slate-500 group-hover:block whitespace-nowrap">
                          {formatShortCurrency(item.revenue, baseCurrency, isEs)}
                        </span>
                      )}

                      {/* The Vertical Bar */}
                      <div
                        style={{ height: barHeightStyle }}
                        className={`w-full max-w-[18px] sm:max-w-[28px] md:max-w-[32px] min-w-[6px] rounded-t-xs sm:rounded-none transition-all duration-200 ${
                          item.revenue > 0
                            ? isHovered
                              ? "bg-cyan-500 shadow-sm"
                              : "bg-cyan-600"
                            : "bg-slate-200"
                        } ${isCurrent ? "ring-2 ring-cyan-400 ring-offset-1" : ""}`}
                        title={`${monthNameFull}: ${formatter.format(item.revenue)} (${item.orderCount} pedidos)`}
                      />

                      {/* Month label below */}
                      <div className="mt-2 text-center select-none w-full">
                        <span
                          className={`block text-[10px] sm:text-xs font-semibold truncate ${
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
                          <>
                            <span className="hidden sm:block text-[9px] font-medium uppercase tracking-tighter text-cyan-600">
                              {isEs ? "Actual" : "Now"}
                            </span>
                            <span className="sm:hidden mx-auto mt-0.5 block h-1 w-1 rounded-full bg-cyan-600" />
                          </>
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
              <span className="h-3 w-3 bg-cyan-600 inline-block" />
              <span>{isEs ? "Ventas realizadas" : "Sales revenue"}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 bg-slate-200 inline-block" />
              <span>{isEs ? "Sin ventas" : "Zero sales"}</span>
            </div>
          </div>
          {/* Mobile reference ceiling indicator */}
          <div className="sm:hidden text-[11px] text-slate-400">
            <span>{isEs ? "Máx: " : "Max: "}</span>
            <span className="font-semibold text-slate-600">{formatShortCurrency(ceiling, baseCurrency, isEs)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
