"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  Calendar,
  ChevronDown,
  ChevronRight,
  Download,
  FileText,
  Search,
  Store as StoreIcon,
  Tag,
  TrendingUp,
  UserCheck,
  Users,
  X,
  Package,
  DollarSign,
  Layers,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";

export type CustomerProductPurchase = {
  productId: string;
  productTitle: string;
  totalUnits: number;
  totalSpent: number;
  lastPurchasedDate: string;
};

export type CustomerReportItem = {
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  storeName: string;
  totalSpent: number;
  totalCost?: number;
  totalProfit?: number;
  totalOrders: number;
  firstOrderDate: string;
  lastOrderDate: string;
  annualSales: Record<string, { totalSpent: number; orderCount: number }>;
  purchasedProducts?: CustomerProductPurchase[];
  orders: Array<{
    id: string;
    orderNumber: string;
    date: string;
    total: number;
    currency: string;
    paymentStatus: string;
    fulfillmentStatus: string;
    itemsCount: number;
  }>;
};

export type BrandReportItem = {
  brand: string;
  unitsSold: number;
  totalRevenue: number;
  orderCount: number;
  percentage: number;
  topProducts: Array<{
    title: string;
    units: number;
    revenue: number;
  }>;
};

export type MonthlyBreakdownItem = {
  month: string;
  revenue: number;
  cost: number;
  profit: number;
  margin: number;
  orders: number;
};

export type ReportSummary = {
  totalRevenue: number;
  totalCost?: number;
  totalProfit?: number;
  profitMargin?: number;
  totalOrdersCount: number;
  averageOrderValue: number;
  uniqueCustomers: number;
  uniqueBrands: number;
  monthlyBreakdown?: MonthlyBreakdownItem[];
};

type ReportsDashboardClientProps = {
  initialCustomers: CustomerReportItem[];
  initialBrands: BrandReportItem[];
  initialSummary: ReportSummary;
  stores: Array<{ id: string; name: string; currency: string }>;
  availableYears: string[];
  initialTab?: "customers" | "brands" | "profit";
};

export default function ReportsDashboardClient({
  initialCustomers,
  initialBrands,
  initialSummary,
  stores,
  availableYears,
  initialTab = "customers",
}: ReportsDashboardClientProps) {
  const { language } = useLanguage();
  const isEs = language === "es";

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const tabParam = searchParams?.get("tab");
  const resolvedTab: "customers" | "brands" | "profit" =
    tabParam === "brands"
      ? "brands"
      : tabParam === "profit"
        ? "profit"
        : tabParam === "customers"
          ? "customers"
          : initialTab;

  const [activeTab, setActiveTab] = useState<"customers" | "brands" | "profit">(resolvedTab);

  // Sync state whenever the URL search param changes (e.g. clicking sidebar links or browser back/forward)
  useEffect(() => {
    if (tabParam === "brands" || tabParam === "profit" || tabParam === "customers") {
      setActiveTab(tabParam);
    } else if (!tabParam && initialTab) {
      setActiveTab(initialTab);
    }
  }, [tabParam, initialTab]);

  const handleTabChange = (newTab: "customers" | "brands" | "profit") => {
    setActiveTab(newTab);
    setSearchQuery("");
    const params = new URLSearchParams(searchParams ? searchParams.toString() : "");
    params.set("tab", newTab);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const [selectedStoreId, setSelectedStoreId] = useState<string>("ALL");
  const [selectedYear, setSelectedYear] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCustomerId, setExpandedCustomerId] = useState<string | null>(null);
  const [mobileActiveFilter, setMobileActiveFilter] = useState<"store" | "search" | "year" | null>(null);

  const activeCurrency = stores[0]?.currency || "USD";
  const formatter = new Intl.NumberFormat(isEs ? "es-ES" : "en-US", {
    style: "currency",
    currency: activeCurrency,
  });

  // Filter Customers
  const filteredCustomers = useMemo(() => {
    return initialCustomers.filter((customer) => {
      if (selectedStoreId !== "ALL" && customer.storeName !== stores.find((s) => s.id === selectedStoreId)?.name) {
        // approximate match if storeName
      }

      if (selectedYear !== "ALL") {
        if (!customer.annualSales[selectedYear] || customer.annualSales[selectedYear].orderCount === 0) {
          return false;
        }
      }

      if (!searchQuery.trim()) return true;

      const q = searchQuery.trim().toLowerCase();
      return (
        customer.customerName.toLowerCase().includes(q) ||
        customer.customerEmail.toLowerCase().includes(q) ||
        (customer.customerPhone?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [initialCustomers, selectedStoreId, selectedYear, searchQuery, stores]);

  // Filter Brands
  const filteredBrands = useMemo(() => {
    return initialBrands.filter((brand) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.trim().toLowerCase();
      const matchBrand = brand.brand.toLowerCase().includes(q);
      const matchProds = brand.topProducts.some((p) => p.title.toLowerCase().includes(q));
      return matchBrand || matchProds;
    });
  }, [initialBrands, searchQuery]);

  function exportCustomersCsv() {
    const headers = [
      "Cliente",
      "Email",
      "Teléfono",
      "Total Gastado",
      "Total Pedidos",
      "Primera Compra",
      "Última Compra",
      "Ventas por Año",
      "Productos Comprados",
    ];

    const rows = filteredCustomers.map((c) => {
      const annualStr = Object.entries(c.annualSales)
        .map(([yr, data]) => `${yr}: $${data.totalSpent} (${data.orderCount} pedidos)`)
        .join(" | ");

      const productsStr = (c.purchasedProducts || [])
        .map((p) => `${p.productTitle} (${p.totalUnits} uds)`)
        .join(" | ");

      return [
        `"${c.customerName.replace(/"/g, '""')}"`,
        `"${c.customerEmail}"`,
        `"${c.customerPhone || ""}"`,
        c.totalSpent.toString(),
        c.totalOrders.toString(),
        `"${new Date(c.firstOrderDate).toLocaleDateString(isEs ? "es-ES" : "en-US")}"`,
        `"${new Date(c.lastOrderDate).toLocaleDateString(isEs ? "es-ES" : "en-US")}"`,
        `"${annualStr}"`,
        `"${productsStr.replace(/"/g, '""')}"`,
      ];
    });

    downloadCsv(`reporte-ventas-clientes-${new Date().toISOString().slice(0, 10)}.csv`, [headers.join(","), ...rows.map((r) => r.join(","))].join("\n"));
  }

  function exportBrandsCsv() {
    const headers = ["Marca / Fabricante", "Unidades Vendidas", "Ventas Totales ($)", "% del Total", "Pedidos"];
    const rows = filteredBrands.map((b) => [
      `"${b.brand.replace(/"/g, '""')}"`,
      b.unitsSold.toString(),
      b.totalRevenue.toString(),
      `${b.percentage}%`,
      b.orderCount.toString(),
    ]);

    downloadCsv(`reporte-ventas-marcas-${new Date().toISOString().slice(0, 10)}.csv`, [headers.join(","), ...rows.map((r) => r.join(","))].join("\n"));
  }

  function exportProfitCsv() {
    const headers = [
      "Mes",
      "Ventas / Ingresos ($)",
      "Costo de Mercancía ($)",
      "Ganancia Neta / Profit ($)",
      "Margen (%)",
      "Pedidos",
    ];

    const rows = (initialSummary.monthlyBreakdown || []).map((m) => [
      `"${m.month}"`,
      m.revenue.toString(),
      m.cost.toString(),
      m.profit.toString(),
      `${m.margin}%`,
      m.orders.toString(),
    ]);

    downloadCsv(
      `reporte-ventas-costo-profit-${new Date().toISOString().slice(0, 10)}.csv`,
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n"),
    );
  }

  function downloadCsv(filename: string, content: string) {
    const blob = new Blob(["\uFEFF" + content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <section className="min-w-0 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            {isEs ? "Reportes de Ventas y Finanzas" : "Sales & Finance Reports"}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {isEs
              ? "Consulta ventas, ganancia neta (profit = venta - costo), compras por cliente y rendimiento por marca."
              : "Analyze sales, net profit (profit = price - cost), customer purchase history, and brand performance."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {activeTab === "customers" && (
            <button
              type="button"
              onClick={exportCustomersCsv}
              disabled={filteredCustomers.length === 0}
              className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-xs transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Download className="h-4 w-4 text-slate-500" />
              {isEs ? "Exportar Clientes CSV" : "Export Customers CSV"}
            </button>
          )}

          {activeTab === "brands" && (
            <button
              type="button"
              onClick={exportBrandsCsv}
              disabled={filteredBrands.length === 0}
              className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-xs transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Download className="h-4 w-4 text-slate-500" />
              {isEs ? "Exportar Marcas CSV" : "Export Brands CSV"}
            </button>
          )}

          {activeTab === "profit" && (
            <button
              type="button"
              onClick={exportProfitCsv}
              disabled={!initialSummary.monthlyBreakdown || initialSummary.monthlyBreakdown.length === 0}
              className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-xs transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Download className="h-4 w-4 text-slate-500" />
              {isEs ? "Exportar Profit CSV" : "Export Profit CSV"}
            </button>
          )}
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-[8px] border border-slate-200 bg-white p-3 sm:p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-semibold uppercase tracking-wider truncate pr-1">
              {isEs ? "Ventas Totales" : "Total Revenue"}
            </span>
            <TrendingUp className="h-4 w-4 shrink-0 text-slate-400" />
          </div>
          <p className="mt-1.5 text-base sm:text-xl font-bold text-slate-900 truncate">
            {formatter.format(initialSummary.totalRevenue)}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-400 truncate">
            {isEs ? "Ingresos generados" : "Total generated revenue"}
          </p>
        </div>

        <div className="rounded-[8px] border border-slate-200 bg-white p-3 sm:p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-semibold uppercase tracking-wider truncate pr-1">
              {isEs ? "Costo Total" : "Total Cost"}
            </span>
            <DollarSign className="h-4 w-4 shrink-0 text-slate-400" />
          </div>
          <p className="mt-1.5 text-base sm:text-xl font-bold text-slate-900 truncate">
            {formatter.format(initialSummary.totalCost || 0)}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-400 truncate">
            {isEs ? "Costo de mercancía" : "Cost of goods sold"}
          </p>
        </div>

        <div className="rounded-[8px] border border-emerald-200 bg-emerald-50/50 p-3 sm:p-4 shadow-xs">
          <div className="flex items-center justify-between text-emerald-800">
            <span className="text-[11px] font-semibold uppercase tracking-wider truncate pr-1">
              {isEs ? "Ganancia (Profit)" : "Net Profit"}
            </span>
            <TrendingUp className="h-4 w-4 shrink-0 text-emerald-600" />
          </div>
          <p className="mt-1.5 text-base sm:text-xl font-bold text-emerald-950 truncate">
            {formatter.format(initialSummary.totalProfit || 0)}
          </p>
          <p className="mt-0.5 text-[11px] font-medium text-emerald-700 truncate">
            {isEs ? `Margen: ${initialSummary.profitMargin || 0}%` : `Margin: ${initialSummary.profitMargin || 0}%`}
          </p>
        </div>

        <div className="rounded-[8px] border border-slate-200 bg-white p-3 sm:p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-semibold uppercase tracking-wider truncate pr-1">
              {isEs ? "Pedidos" : "Orders Count"}
            </span>
            <FileText className="h-4 w-4 shrink-0 text-slate-400" />
          </div>
          <p className="mt-1.5 text-base sm:text-xl font-bold text-slate-900 truncate">
            {initialSummary.totalOrdersCount}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-400 truncate">
            {isEs ? "Órdenes procesadas" : "Completed orders"}
          </p>
        </div>

        <div className="rounded-[8px] border border-slate-200 bg-white p-3 sm:p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-semibold uppercase tracking-wider truncate pr-1">
              {isEs ? "Ticket Promedio" : "Avg Order"}
            </span>
            <TrendingUp className="h-4 w-4 shrink-0 text-slate-400" />
          </div>
          <p className="mt-1.5 text-base sm:text-xl font-bold text-slate-900 truncate">
            {formatter.format(initialSummary.averageOrderValue)}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-400 truncate">
            {isEs ? "Promedio por pedido" : "Average spend"}
          </p>
        </div>

        <div className="rounded-[8px] border border-slate-200 bg-white p-3 sm:p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-semibold uppercase tracking-wider truncate pr-1">
              {isEs ? "Clientes" : "Customers"}
            </span>
            <UserCheck className="h-4 w-4 shrink-0 text-slate-400" />
          </div>
          <p className="mt-1.5 text-base sm:text-xl font-bold text-slate-900 truncate">
            {initialSummary.uniqueCustomers}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-400 truncate">
            {isEs ? "Compradores únicos" : "Unique buyers"}
          </p>
        </div>
      </div>

      {/* Desktop Controls (hidden lg:flex) */}
      <div className="hidden w-full flex-row items-center gap-3 lg:flex">
        {/* Store selector to the left of all */}
        <div className="relative shrink-0">
          <StoreIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <select
            value={selectedStoreId}
            onChange={(e) => setSelectedStoreId(e.target.value)}
            className="h-10 rounded-xl border border-slate-200 bg-white pl-9 pr-8 text-xs font-semibold text-slate-700 outline-none transition hover:bg-slate-50 focus:border-slate-400 shadow-2xs appearance-none cursor-pointer"
          >
            <option value="ALL">{isEs ? "Todas las tiendas" : "All Stores"}</option>
            {stores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
        </div>

        {/* Report Type selector */}
        <div className="relative shrink-0">
          {activeTab === "customers" ? (
            <Users className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          ) : activeTab === "profit" ? (
            <TrendingUp className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          ) : (
            <Tag className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          )}
          <select
            value={activeTab}
            onChange={(e) => {
              handleTabChange(e.target.value as "customers" | "brands" | "profit");
            }}
            className="h-10 rounded-xl border border-slate-200 bg-white pl-9 pr-8 text-xs font-semibold text-slate-700 outline-none transition hover:bg-slate-50 focus:border-slate-400 shadow-2xs appearance-none cursor-pointer"
          >
            <option value="customers">
              {isEs ? "Ventas y Productos por Cliente" : "Sales by Customer"}
            </option>
            <option value="brands">
              {isEs ? "Ventas por Marcas" : "Sales by Brand"}
            </option>
            <option value="profit">
              {isEs ? "Ventas, Costo y Profit Mensual" : "Monthly Profit & Cost"}
            </option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
        </div>

        {/* Search Input for Current Tab */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              activeTab === "customers"
                ? isEs
                  ? "Buscar por nombre de cliente, correo o teléfono..."
                  : "Search customer by name, email or phone..."
                : isEs
                  ? "Buscar por nombre de marca o producto..."
                  : "Search brand or product name..."
            }
            className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-9 text-xs outline-none transition placeholder:text-slate-400 focus:border-slate-400 shadow-2xs"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Year selector */}
        <div className="relative shrink-0">
          <Calendar className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="h-10 rounded-xl border border-slate-200 bg-white pl-8 pr-8 text-xs font-semibold text-slate-700 outline-none transition hover:bg-slate-50 focus:border-slate-400 shadow-2xs appearance-none cursor-pointer"
          >
            <option value="ALL">{isEs ? "Todos los años" : "All Years"}</option>
            {availableYears.map((yr) => (
              <option key={yr} value={yr}>
                {yr}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
        </div>
      </div>

      {/* Mobile Controls (lg:hidden) - Icon triggers that reveal options on tap */}
      <div className="mt-2 space-y-3 lg:hidden">
        <div className="flex items-center gap-2">
          {/* Store Icon Button */}
          <button
            type="button"
            onClick={() => setMobileActiveFilter((prev) => (prev === "store" ? null : "store"))}
            aria-label={isEs ? "Seleccionar tienda" : "Select store"}
            title={isEs ? "Tienda" : "Store"}
            className={`relative inline-flex h-11 w-11 items-center justify-center rounded-xl border transition shrink-0 ${
              mobileActiveFilter === "store"
                ? "border-slate-950 bg-slate-950 text-white shadow-sm"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-2xs"
            }`}
          >
            <StoreIcon className="h-5 w-5" />
            {selectedStoreId !== "ALL" && (
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-cyan-500" />
            )}
          </button>

          {/* Search Icon Button */}
          <button
            type="button"
            onClick={() => setMobileActiveFilter((prev) => (prev === "search" ? null : "search"))}
            aria-label={isEs ? "Buscar" : "Search"}
            title={isEs ? "Buscar" : "Search"}
            className={`relative inline-flex h-11 w-11 items-center justify-center rounded-xl border transition shrink-0 ${
              mobileActiveFilter === "search"
                ? "border-slate-950 bg-slate-950 text-white shadow-sm"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-2xs"
            }`}
          >
            <Search className="h-5 w-5" />
            {searchQuery.trim().length > 0 && (
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-cyan-500" />
            )}
          </button>

          {/* Year / Calendar Icon Button */}
          <button
            type="button"
            onClick={() => setMobileActiveFilter((prev) => (prev === "year" ? null : "year"))}
            aria-label={isEs ? "Filtrar por año" : "Filter by year"}
            title={isEs ? "Año" : "Year"}
            className={`relative inline-flex h-11 w-11 items-center justify-center rounded-xl border transition shrink-0 ${
              mobileActiveFilter === "year"
                ? "border-slate-950 bg-slate-950 text-white shadow-sm"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-2xs"
            }`}
          >
            <Calendar className="h-5 w-5" />
            {selectedYear !== "ALL" && (
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-cyan-500" />
            )}
          </button>

          {/* Report Type selector on mobile (ml-auto) */}
          <div className="relative ml-auto shrink-0">
            {activeTab === "customers" ? (
              <Users className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            ) : activeTab === "profit" ? (
              <TrendingUp className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            ) : (
              <Tag className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            )}
            <select
              value={activeTab}
              onChange={(e) => {
                handleTabChange(e.target.value as "customers" | "brands" | "profit");
              }}
              className="h-11 rounded-xl border border-slate-200 bg-white pl-9 pr-8 text-xs font-semibold text-slate-700 outline-none transition hover:bg-slate-50 focus:border-slate-400 shadow-2xs appearance-none cursor-pointer"
            >
              <option value="customers">
                {isEs ? "Clientes" : "Customers"}
              </option>
              <option value="brands">
                {isEs ? "Marcas" : "Brands"}
              </option>
              <option value="profit">
                {isEs ? "Profit" : "Profit"}
              </option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          </div>
        </div>

        {/* Compact query pill if search is active but search panel is collapsed */}
        {searchQuery.trim() && mobileActiveFilter !== "search" && (
          <div className="flex min-w-0 items-center justify-between gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
            <span className="truncate">"{searchQuery}"</span>
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="rounded p-0.5 text-slate-400 hover:text-slate-700"
              aria-label={isEs ? "Limpiar búsqueda" : "Clear search"}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Revealed Store Selector Panel */}
        {mobileActiveFilter === "store" && (
          <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                {isEs ? "Tienda Activa" : "Active Store"}
              </span>
              <button
                type="button"
                onClick={() => setMobileActiveFilter(null)}
                className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label={isEs ? "Cerrar" : "Close"}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div>
              <select
                value={selectedStoreId}
                onChange={(e) => {
                  setSelectedStoreId(e.target.value);
                  setMobileActiveFilter(null);
                }}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-800 outline-none focus:border-slate-400"
              >
                <option value="ALL">{isEs ? "Todas las tiendas" : "All Stores"}</option>
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.currency})
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Revealed Search Panel */}
        {mobileActiveFilter === "search" && (
          <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                {isEs ? "Buscar" : "Search"}
              </span>
              <button
                type="button"
                onClick={() => setMobileActiveFilter(null)}
                className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label={isEs ? "Cerrar" : "Close"}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  activeTab === "customers"
                    ? isEs
                      ? "Buscar por cliente, correo o teléfono..."
                      : "Search customer by name, email or phone..."
                    : isEs
                      ? "Buscar por nombre de marca o producto..."
                      : "Search brand or product name..."
                }
                autoFocus
                className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-10 pr-9 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-slate-400"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
                  aria-label={isEs ? "Limpiar búsqueda" : "Clear search"}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Revealed Year Panel */}
        {mobileActiveFilter === "year" && (
          <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                {isEs ? "Filtrar por Año" : "Filter by Year"}
              </span>
              <button
                type="button"
                onClick={() => setMobileActiveFilter(null)}
                className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label={isEs ? "Cerrar" : "Close"}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div>
              <select
                value={selectedYear}
                onChange={(e) => {
                  setSelectedYear(e.target.value);
                  setMobileActiveFilter(null);
                }}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-800 outline-none focus:border-slate-400"
              >
                <option value="ALL">{isEs ? "Todos los años" : "All Years"}</option>
                {availableYears.map((yr) => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* TAB 1: CUSTOMERS SALES REPORT */}
      {activeTab === "customers" && (
        <div className="overflow-hidden rounded-[8px] border border-slate-200 bg-white shadow-xs">
          {filteredCustomers.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="mx-auto h-12 w-12 text-slate-300" />
              <h3 className="mt-3 text-base font-semibold text-slate-900">
                {isEs ? "No se encontraron clientes" : "No customer records found"}
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                {searchQuery || selectedYear !== "ALL"
                  ? isEs
                    ? "Prueba a cambiar el año seleccionado o el término de búsqueda."
                    : "Try adjusting your year filter or search query."
                  : isEs
                    ? "Los clientes y sus compras anuales aparecerán aquí."
                    : "Customers and annual purchases will show here."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-3.5">{isEs ? "Cliente" : "Customer"}</th>
                    <th className="px-5 py-3.5">{isEs ? "Total Comprado" : "Total Spent"}</th>
                    <th className="px-5 py-3.5">{isEs ? "Pedidos" : "Orders"}</th>
                    <th className="px-5 py-3.5">{isEs ? "Ventas Anuales (Desglose)" : "Annual Breakdown"}</th>
                    <th className="px-5 py-3.5">{isEs ? "Última Compra" : "Last Purchase"}</th>
                    <th className="px-5 py-3.5 text-right">{isEs ? "Acciones" : "Actions"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCustomers.map((customer) => {
                    const isExpanded = expandedCustomerId === customer.customerId;
                    const yearsList = Object.entries(customer.annualSales).sort(
                      (a, b) => b[0].localeCompare(a[0]),
                    );

                    return (
                      <React.Fragment key={customer.customerId}>
                        <tr className="hover:bg-slate-50/60 transition">
                          {/* Customer */}
                          <td className="px-5 py-4 text-xs text-slate-700">
                            <div>{customer.customerName}</div>
                            <div className="text-slate-500">{customer.customerEmail}</div>
                            {customer.customerPhone && (
                              <div className="text-slate-400">{customer.customerPhone}</div>
                            )}
                          </td>

                          {/* Total Spent */}
                          <td className="px-5 py-4 whitespace-nowrap text-xs text-slate-700">
                            <span>{formatter.format(customer.totalSpent)}</span>
                          </td>

                          {/* Orders Count */}
                          <td className="px-5 py-4 whitespace-nowrap text-xs text-slate-700">
                            <span>{customer.totalOrders} {isEs ? "pedidos" : "orders"}</span>
                          </td>

                          {/* Annual Sales Breakdown */}
                          <td className="px-5 py-4 text-xs text-slate-700">
                            <div className="flex flex-wrap gap-2 text-xs">
                              {yearsList.map(([yr, data]) => (
                                <span key={yr}>
                                  <span className="text-slate-900">{yr}:</span> {formatter.format(data.totalSpent)}{" "}
                                  <span className="text-slate-400">({data.orderCount})</span>
                                </span>
                              ))}
                            </div>
                          </td>

                          {/* Last Purchase Date */}
                          <td className="px-5 py-4 whitespace-nowrap text-xs text-slate-700">
                            {new Date(customer.lastOrderDate).toLocaleDateString(
                              isEs ? "es-ES" : "en-US",
                              { year: "numeric", month: "short", day: "numeric" },
                            )}
                          </td>

                          {/* Expand orders history button */}
                          <td className="px-5 py-4 whitespace-nowrap text-right">
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedCustomerId(isExpanded ? null : customer.customerId)
                              }
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs transition"
                            >
                              <span>{isEs ? "Historial" : "History"}</span>
                              {isExpanded ? (
                                <ChevronDown className="h-3.5 w-3.5" />
                              ) : (
                                <ChevronRight className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </td>
                        </tr>

                        {/* Expanded Orders and Products History */}
                        {isExpanded && (
                          <tr className="bg-slate-50/80">
                            <td colSpan={6} className="px-6 py-4">
                              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs space-y-5">
                                {/* Aggregated Purchased Products by Customer */}
                                <div>
                                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-3">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                                      <Package className="h-4 w-4 text-cyan-700" />
                                      {isEs
                                        ? `Productos Comprados — ${customer.customerName}`
                                        : `Products Purchased — ${customer.customerName}`}
                                    </h4>
                                    <span className="text-xs font-medium text-slate-500">
                                      {customer.purchasedProducts?.length || 0} {isEs ? "artículos diferentes adquiridos" : "distinct products bought"}
                                    </span>
                                  </div>

                                  {customer.purchasedProducts && customer.purchasedProducts.length > 0 ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                                      {customer.purchasedProducts.map((prod) => (
                                        <div
                                          key={prod.productTitle}
                                          className="flex items-center justify-between rounded-xl border border-slate-200/90 bg-slate-50/60 p-3 text-xs transition hover:bg-slate-50 hover:border-slate-300"
                                        >
                                          <div className="min-w-0 pr-2">
                                            <p className="font-semibold text-slate-900 truncate" title={prod.productTitle}>
                                              {prod.productTitle}
                                            </p>
                                            <p className="mt-0.5 text-[11px] text-slate-400">
                                              {isEs ? "Última compra: " : "Last bought: "}
                                              {new Date(prod.lastPurchasedDate).toLocaleDateString(isEs ? "es-ES" : "en-US", {
                                                month: "short",
                                                day: "numeric",
                                                year: "numeric",
                                              })}
                                            </p>
                                          </div>
                                          <div className="text-right shrink-0">
                                            <span className="inline-flex items-center rounded-md bg-cyan-100 px-2 py-0.5 text-xs font-bold text-cyan-950">
                                              {prod.totalUnits} {isEs ? "uds" : "units"}
                                            </span>
                                            <p className="mt-1 text-[11px] font-semibold text-slate-700">
                                              {formatter.format(prod.totalSpent)}
                                            </p>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-xs text-slate-400 italic">
                                      {isEs
                                        ? "No hay productos individuales registrados en las órdenes de este cliente."
                                        : "No individual product items recorded in orders."}
                                    </p>
                                  )}
                                </div>

                                {/* Orders History per Date */}
                                <div className="border-t border-slate-100 pt-4">
                                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                                    {isEs
                                      ? `Historial de Pedidos x Fecha — ${customer.customerName}`
                                      : `Order History by Date — ${customer.customerName}`}
                                  </h4>
                                  <div className="divide-y divide-slate-100">
                                    {customer.orders.map((ord) => (
                                      <div
                                        key={ord.id}
                                        className="flex items-center justify-between py-2.5 text-xs text-slate-700 hover:bg-slate-50 px-2 rounded-lg"
                                      >
                                        <div className="flex items-center gap-3">
                                          <Link
                                            href={`/dashboard/orders/${ord.id}`}
                                            className="font-bold text-cyan-700 hover:underline inline-flex items-center gap-1"
                                          >
                                            <FileText className="h-3 w-3" /> #{ord.orderNumber}
                                          </Link>
                                          <span className="text-slate-500">
                                            {new Date(ord.date).toLocaleString(isEs ? "es-ES" : "en-US", {
                                              year: "numeric",
                                              month: "short",
                                              day: "numeric",
                                              hour: "2-digit",
                                              minute: "2-digit",
                                            })}
                                          </span>
                                        </div>

                                        <div className="flex items-center gap-4">
                                          <span className="text-slate-500">
                                            {ord.itemsCount} {isEs ? "artículos" : "items"}
                                          </span>
                                          <span className="rounded-md bg-emerald-50 px-2 py-0.5 font-bold text-emerald-700">
                                            {formatter.format(ord.total)}
                                          </span>
                                          <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                                            {ord.paymentStatus}
                                          </span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: BRAND SALES REPORT */}
      {activeTab === "brands" && (
        <div className="space-y-6">
          {/* Brands Table */}
          <div className="overflow-hidden rounded-[8px] border border-slate-200 bg-white shadow-xs">
            {filteredBrands.length === 0 ? (
              <div className="p-12 text-center">
                <Tag className="mx-auto h-12 w-12 text-slate-300" />
                <h3 className="mt-3 text-base font-semibold text-slate-900">
                  {isEs ? "No se encontraron marcas" : "No brand records found"}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  {isEs
                    ? "Los productos vendidos con marca/fabricante configurado aparecerán aquí."
                    : "Sold products with configured manufacturers will appear here."}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-5 py-3.5">{isEs ? "Marca / Fabricante" : "Brand / Manufacturer"}</th>
                      <th className="px-5 py-3.5">{isEs ? "Unidades Vendidas" : "Units Sold"}</th>
                      <th className="px-5 py-3.5">{isEs ? "Ventas Totales ($)" : "Total Revenue"}</th>
                      <th className="px-5 py-3.5">{isEs ? "Participación (%)" : "% Share"}</th>
                      <th className="px-5 py-3.5">{isEs ? "Productos Más Vendidos" : "Top Selling Products"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredBrands.map((brand) => (
                      <tr key={brand.brand} className="hover:bg-slate-50/60 transition">
                        {/* Brand */}
                        <td className="px-5 py-4 whitespace-nowrap text-xs text-slate-700">
                          {brand.brand}
                        </td>

                        {/* Units Sold */}
                        <td className="px-5 py-4 whitespace-nowrap text-xs text-slate-700">
                          {brand.unitsSold} {isEs ? "unid." : "units"}
                        </td>

                        {/* Revenue */}
                        <td className="px-5 py-4 whitespace-nowrap text-xs text-slate-700">
                          {formatter.format(brand.totalRevenue)}
                        </td>

                        {/* % Share */}
                        <td className="px-5 py-4 whitespace-nowrap text-xs text-slate-700">
                          {brand.percentage}%
                        </td>

                        {/* Top Products */}
                        <td className="px-5 py-4 text-xs text-slate-700">
                          <div className="flex flex-col gap-1 text-xs">
                            {brand.topProducts.map((p) => (
                              <div key={p.title} className="flex items-center justify-between gap-3 text-slate-700">
                                <span className="truncate max-w-xs">{p.title}</span>
                                <span className="text-slate-500 whitespace-nowrap">
                                  {p.units} unid. ({formatter.format(p.revenue)})
                                </span>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: MONTHLY COST, REVENUE & PROFIT REPORT */}
      {activeTab === "profit" && (
        <div className="overflow-hidden rounded-[8px] border border-slate-200 bg-white shadow-xs">
          <div className="border-b border-slate-200 bg-slate-50/70 px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {isEs ? "Desglose Mensual: Ventas, Costos y Ganancia Neta (Profit)" : "Monthly Breakdown: Sales, Cost & Net Profit"}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {isEs
                  ? "Cálculo en vivo: Ganancia Neta (Profit) = Precio de Venta - Costo Unitario de variantes."
                  : "Live calculation: Net Profit = Sale Price - Unit Cost of sold variants."}
              </p>
            </div>
            <button
              type="button"
              onClick={exportProfitCsv}
              disabled={!initialSummary.monthlyBreakdown || initialSummary.monthlyBreakdown.length === 0}
              className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-xs transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 self-start sm:self-auto"
            >
              <Download className="h-3.5 w-3.5 text-slate-500" />
              {isEs ? "Exportar Profit CSV" : "Export Profit CSV"}
            </button>
          </div>

          {(!initialSummary.monthlyBreakdown || initialSummary.monthlyBreakdown.length === 0) ? (
            <div className="p-12 text-center">
              <TrendingUp className="mx-auto h-12 w-12 text-slate-300" />
              <h3 className="mt-3 text-base font-semibold text-slate-900">
                {isEs ? "Sin datos de ventas mensuales" : "No monthly sales data"}
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                {isEs ? "Las ventas y métricas de profit aparecerán cuando se completen órdenes." : "Sales and profit metrics will appear here as orders complete."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-3.5">{isEs ? "Mes" : "Month"}</th>
                    <th className="px-5 py-3.5">{isEs ? "Pedidos" : "Orders"}</th>
                    <th className="px-5 py-3.5">{isEs ? "Ingresos (Ventas)" : "Revenue"}</th>
                    <th className="px-5 py-3.5">{isEs ? "Costo Mercancía" : "Cost of Goods"}</th>
                    <th className="px-5 py-3.5">{isEs ? "Ganancia Neta (Profit)" : "Net Profit"}</th>
                    <th className="px-5 py-3.5">{isEs ? "Margen (%)" : "Margin (%)"}</th>
                    <th className="px-5 py-3.5">{isEs ? "Ticket Prom." : "Avg Order"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {initialSummary.monthlyBreakdown.map((row) => {
                    const avg = row.orders > 0 ? row.revenue / row.orders : 0;
                    const isProfitable = row.profit >= 0;
                    return (
                      <tr key={row.month} className="hover:bg-slate-50/60 transition">
                        <td className="px-5 py-4 font-semibold text-slate-900 text-xs">
                          {row.month}
                        </td>
                        <td className="px-5 py-4 text-xs text-slate-700">
                          {row.orders} {isEs ? "pedidos" : "orders"}
                        </td>
                        <td className="px-5 py-4 text-xs font-semibold text-slate-900">
                          {formatter.format(row.revenue)}
                        </td>
                        <td className="px-5 py-4 text-xs text-slate-600">
                          {formatter.format(row.cost)}
                        </td>
                        <td className="px-5 py-4 text-xs font-bold">
                          <span className={isProfitable ? "text-emerald-700" : "text-rose-700"}>
                            {formatter.format(row.profit)}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-xs">
                          <span
                            className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-bold ${
                              row.margin >= 30
                                ? "bg-emerald-100 text-emerald-800"
                                : row.margin > 0
                                ? "bg-cyan-100 text-cyan-800"
                                : "bg-rose-100 text-rose-800"
                            }`}
                          >
                            {row.margin}%
                          </span>
                        </td>
                        <td className="px-5 py-4 text-xs text-slate-700">
                          {formatter.format(avg)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
