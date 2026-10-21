"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  DollarSign,
  Calendar,
  Store,
  RefreshCw,
  Printer,
  Save,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  CreditCard,
  Banknote,
  Coins,
  FileText,
  Calculator,
  Lock,
  Unlock,
  TrendingUp,
  Percent,
  Clock,
  User,
  ShieldCheck,
  Building,
  ArrowDownRight,
  ArrowUpRight,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";

export interface Terminal {
  id: string;
  name: string;
  code: string;
  location?: string;
}

export interface Cashier {
  id: string;
  name: string;
  role: string;
}

export interface StoreOption {
  id: string;
  name: string;
  currency: string;
}

export interface DayEndReportClientProps {
  initialDate: string;
  stores: StoreOption[];
  initialData?: any;
  initialSelectedStoreId?: string;
}

interface DenominationCount {
  bills: {
    100: number;
    50: number;
    20: number;
    10: number;
    5: number;
    2: number;
    1: number;
  };
  coins: {
    1: number;
    0.5: number;
    0.25: number;
    0.1: number;
    0.05: number;
    0.01: number;
  };
  rolls: {
    1: number; // $25 per roll of $1
    0.5: number; // $10 per roll of $0.50
    0.25: number; // $10 per roll of quarters (40)
    0.1: number; // $5 per roll of dimes (50)
    0.05: number; // $2 per roll of nickels (40)
    0.01: number; // $0.50 per roll of pennies (50)
  };
}

const defaultDenominations: DenominationCount = {
  bills: { 100: 0, 50: 0, 20: 0, 10: 0, 5: 0, 2: 0, 1: 0 },
  coins: { 1: 0, 0.5: 0, 0.25: 0, 0.1: 0, 0.05: 0, 0.01: 0 },
  rolls: { 1: 0, 0.5: 0, 0.25: 0, 0.1: 0, 0.05: 0, 0.01: 0 },
};

const PAYMENT_ROWS = [
  { key: "CASH", label: "Cash / Efectivo", icon: Banknote },
  { key: "DEBIT", label: "Debit Card / Débito", icon: CreditCard },
  { key: "VISA", label: "Visa", icon: CreditCard },
  { key: "MASTERCARD", label: "Mastercard (M/C)", icon: CreditCard },
  { key: "AMEX", label: "American Express (Amex)", icon: CreditCard },
  { key: "DISCOVER", label: "Discover", icon: CreditCard },
  { key: "ZELLE", label: "Zelle", icon: TrendingUp },
  { key: "CASHAPP", label: "Cash App", icon: TrendingUp },
  { key: "TRANSFER", label: "Bank Transfer / Transferencia", icon: Building },
  { key: "AR_CREDIT", label: "A/R Credit / Venta al Crédito", icon: FileText },
  { key: "CHECK", label: "Check / Cheque", icon: FileText },
  { key: "STORE_CREDIT", label: "Store Credit / Saldo a Favor", icon: DollarSign },
  { key: "GIFT_CARD", label: "Gift Card / Certificado", icon: CreditCard },
  { key: "POINTS", label: "Loyalty Points / Puntos", icon: Percent },
  { key: "OTHER", label: "Other / Otros", icon: DollarSign },
];

export default function DayEndReportClient({
  initialDate,
  stores = [],
  initialData,
  initialSelectedStoreId,
}: DayEndReportClientProps) {
  const { language } = useLanguage();
  const isEs = language === "es";

  // Filter States
  const [selectedDate, setSelectedDate] = useState<string>(initialDate);
  const [selectedStoreId, setSelectedStoreId] = useState<string>(
    initialSelectedStoreId || stores[0]?.id || initialData?.store?.id || ""
  );
  const [scope, setScope] = useState<"store" | "till" | "cashier">("store");
  const [selectedTerminal, setSelectedTerminal] = useState<string>("ALL");
  const [selectedCashier, setSelectedCashier] = useState<string>("ALL");

  // Server Data
  const [reportData, setReportData] = useState<any>(initialData || null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Cash Calculator State
  const [denominations, setDenominations] = useState<DenominationCount>(
    initialData?.savedClosing?.floatBreakdown || defaultDenominations
  );
  const [showRolls, setShowRolls] = useState<boolean>(false);
  const [cashDrop, setCashDrop] = useState<number>(
    initialData?.savedClosing?.cashDrop || 0
  );
  const [beginningFloat, setBeginningFloat] = useState<number>(
    initialData?.savedClosing?.beginningFloat !== undefined
      ? initialData?.savedClosing?.beginningFloat
      : 200
  );
  const [paidIn, setPaidIn] = useState<number>(
    initialData?.savedClosing?.paidIn || 0
  );
  const [paidOut, setPaidOut] = useState<number>(
    initialData?.savedClosing?.paidOut || 0
  );

  // Payment Reconciliation Matrix State (Counted / Actual amounts)
  const [paymentAmounts, setPaymentAmounts] = useState<Record<string, number>>(
    initialData?.savedClosing?.paymentAmounts || {}
  );

  // Memo & Audit
  const [memo, setMemo] = useState<string>(
    initialData?.savedClosing?.memo || ""
  );
  const [closingCashier, setClosingCashier] = useState<string>(
    initialData?.savedClosing?.cashier || ""
  );

  // Open Drawer Feedback
  const [drawerKicked, setDrawerKicked] = useState(false);

  // Currency Formatter
  const currencySymbol = useMemo(() => {
    const s = stores.find((item) => item.id === selectedStoreId);
    return s?.currency === "HNL" ? "L" : "$";
  }, [stores, selectedStoreId]);

  const formatMoney = useCallback(
    (amount: number) => {
      const formatted = Math.abs(amount).toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
      if (amount < 0) {
        return `(${currencySymbol}${formatted})`;
      }
      return `${currencySymbol}${formatted}`;
    },
    [currencySymbol]
  );

  // Fetch Report Data
  const loadReport = useCallback(
    async (date: string, storeId: string) => {
      if (!storeId) return;
      setIsLoading(true);
      try {
        const res = await fetch(
          `/api/reports/day-end?date=${encodeURIComponent(date)}&storeId=${encodeURIComponent(storeId)}`
        );
        if (res.ok) {
          const data = await res.json();
          setReportData(data);
          if (data.savedClosing) {
            if (data.savedClosing.floatBreakdown) {
              setDenominations(data.savedClosing.floatBreakdown);
            }
            if (data.savedClosing.paymentAmounts) {
              setPaymentAmounts(data.savedClosing.paymentAmounts);
            }
            if (data.savedClosing.cashDrop !== undefined) {
              setCashDrop(data.savedClosing.cashDrop);
            }
            if (data.savedClosing.beginningFloat !== undefined) {
              setBeginningFloat(data.savedClosing.beginningFloat);
            }
            if (data.savedClosing.paidIn !== undefined) {
              setPaidIn(data.savedClosing.paidIn);
            }
            if (data.savedClosing.paidOut !== undefined) {
              setPaidOut(data.savedClosing.paidOut);
            }
            if (data.savedClosing.memo) {
              setMemo(data.savedClosing.memo);
            }
            if (data.savedClosing.cashier) {
              setClosingCashier(data.savedClosing.cashier);
            }
          }
        }
      } catch (err) {
        console.error("Failed to fetch Day End data", err);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (selectedStoreId && selectedDate) {
      loadReport(selectedDate, selectedStoreId);
    }
  }, [selectedDate, selectedStoreId, loadReport]);

  // Handle Bill / Coin changes
  const handleBillChange = (denom: keyof DenominationCount["bills"], val: string) => {
    const num = Math.max(0, parseInt(val, 10) || 0);
    setDenominations((prev) => ({
      ...prev,
      bills: { ...prev.bills, [denom]: num },
    }));
  };

  const handleCoinChange = (denom: keyof DenominationCount["coins"], val: string) => {
    const num = Math.max(0, parseInt(val, 10) || 0);
    setDenominations((prev) => ({
      ...prev,
      coins: { ...prev.coins, [denom]: num },
    }));
  };

  const handleRollChange = (denom: keyof DenominationCount["rolls"], val: string) => {
    const num = Math.max(0, parseInt(val, 10) || 0);
    setDenominations((prev) => ({
      ...prev,
      rolls: { ...prev.rolls, [denom]: num },
    }));
  };

  // Calculate Cash Totals
  const totalBillsCash = useMemo(() => {
    const b = denominations.bills;
    return (
      b[100] * 100 +
      b[50] * 50 +
      b[20] * 20 +
      b[10] * 10 +
      b[5] * 5 +
      b[2] * 2 +
      b[1] * 1
    );
  }, [denominations.bills]);

  const totalCoinsCash = useMemo(() => {
    const c = denominations.coins;
    return (
      c[1] * 1 +
      c[0.5] * 0.5 +
      c[0.25] * 0.25 +
      c[0.1] * 0.1 +
      c[0.05] * 0.05 +
      c[0.01] * 0.01
    );
  }, [denominations.coins]);

  const totalRollsCash = useMemo(() => {
    const r = denominations.rolls;
    // standard US roll values
    return (
      r[1] * 25 + // 25 dollar coins
      r[0.5] * 10 + // 20 halves
      r[0.25] * 10 + // 40 quarters
      r[0.1] * 5 + // 50 dimes
      r[0.05] * 2 + // 40 nickels
      r[0.01] * 0.5 // 50 pennies
    );
  }, [denominations.rolls]);

  const totalCashCounted = useMemo(() => {
    return totalBillsCash + totalCoinsCash + totalRollsCash;
  }, [totalBillsCash, totalCoinsCash, totalRollsCash]);

  const totalCashDeposit = useMemo(() => {
    return Math.max(0, totalCashCounted + cashDrop - beginningFloat);
  }, [totalCashCounted, cashDrop, beginningFloat]);

  // Sync cash counted to Payment Matrix
  const syncCashToMatrix = () => {
    setPaymentAmounts((prev) => ({
      ...prev,
      CASH: totalCashCounted,
    }));
  };

  // Quick autofill non-cash payment amounts from expected
  const autoFillNonCashExpected = () => {
    if (!reportData?.paymentExpectedTotals) return;
    const next = { ...paymentAmounts };
    PAYMENT_ROWS.forEach((row) => {
      if (row.key !== "CASH") {
        next[row.key] = reportData.paymentExpectedTotals[row.key] || 0;
      }
    });
    setPaymentAmounts(next);
  };

  // Payment Matrix Totals & Variance
  const paymentMatrixTotals = useMemo(() => {
    const expectedTotals = reportData?.paymentExpectedTotals || {};
    let totalExpected = 0;
    let totalActual = 0;

    PAYMENT_ROWS.forEach((row) => {
      const exp = Number(expectedTotals[row.key] || 0);
      const act = Number(paymentAmounts[row.key] || 0);
      totalExpected += exp;
      totalActual += act;
    });

    const netVariance = totalActual - totalExpected;
    return {
      totalExpected,
      totalActual,
      netVariance,
    };
  }, [reportData?.paymentExpectedTotals, paymentAmounts]);

  // Save Day End Closing
  const handleSaveDayEnd = async () => {
    setIsSaving(true);
    setSaveSuccessMsg(null);
    try {
      const payload = {
        storeId: selectedStoreId,
        date: selectedDate,
        scope,
        register: selectedTerminal,
        cashier: closingCashier || selectedCashier,
        floatBreakdown: denominations,
        totalCash: totalCashCounted,
        cashDrop,
        beginningFloat,
        totalCashDeposit,
        paymentAmounts,
        memo,
        paidIn,
        paidOut,
        status: "COMPLETED",
      };

      const res = await fetch("/api/reports/day-end", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setSaveSuccessMsg(
          isEs
            ? "¡Cierre de día guardado y conciliado exitosamente!"
            : "Day End closing successfully saved and reconciled!"
        );
        setTimeout(() => setSaveSuccessMsg(null), 5000);
        loadReport(selectedDate, selectedStoreId);
      } else {
        alert("Failed to save Day End record");
      }
    } catch (e) {
      console.error(e);
      alert("Error saving closing record");
    } finally {
      setIsSaving(false);
    }
  };

  // Open Till Trigger
  const handleOpenTill = () => {
    setDrawerKicked(true);
    setTimeout(() => setDrawerKicked(false), 3000);
  };

  // Print Window
  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  const expectedSalesWithTax = reportData?.totals?.salesWithTax || 0;
  const netSales = reportData?.totals?.netSales || 0;
  const tax1 = reportData?.totals?.tax1 || 0;
  const inventoryCost = reportData?.totals?.inventoryCost || 0;
  const grossProfit = reportData?.totals?.grossProfit || 0;
  const grossMarginPercent =
    netSales > 0 ? ((grossProfit / netSales) * 100).toFixed(1) : "0.0";
  const ordersCount = reportData?.totals?.ordersCount || 0;

  return (
    <div className="space-y-6 pb-16">
      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #day-end-printable-area,
          #day-end-printable-area * {
            visibility: visible;
          }
          #day-end-printable-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* ================= HEADER ================= */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {isEs ? "Cierre de Día y Cuadre de Caja" : "Day End & Cash Drawer Reconciliation"}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {isEs
              ? "Conciliación de arqueo de caja, lotes de pago, ventas netas e inventario vendido (Z-Report)."
              : "End of day reconciliation, cash drawer float, card payment batches, and net sales (Z-Report)."}
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 no-print">
          <button
            type="button"
            onClick={handleOpenTill}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold border transition shadow-xs cursor-pointer ${
              drawerKicked
                ? "bg-emerald-500 border-emerald-600 text-white animate-pulse"
                : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300"
            }`}
            title={isEs ? "Enviar pulso de apertura a gaveta de dinero (F4)" : "Open cash drawer kick pulse (F4)"}
          >
            {drawerKicked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4 text-amber-500" />}
            <span>{drawerKicked ? (isEs ? "¡Cajón Abierto!" : "Till Kicked!") : (isEs ? "Abrir Gaveta" : "Open Till")}</span>
          </button>

          <button
            type="button"
            onClick={() => loadReport(selectedDate, selectedStoreId)}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition shadow-xs cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isLoading ? "animate-spin" : ""}`} />
            <span>{isEs ? "Recargar" : "Reload"}</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-xs cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-cyan-400" />
            <span>{isEs ? "Imprimir Cierre Z" : "Print Z-Report"}</span>
          </button>

          <button
            type="button"
            onClick={handleSaveDayEnd}
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
          >
            <Save className={`w-4 h-4 ${isSaving ? "animate-spin" : ""}`} />
            <span>{isSaving ? (isEs ? "Guardando..." : "Saving...") : (isEs ? "Guardar Cierre" : "Save Day End")}</span>
          </button>
        </div>
      </div>

      {/* Success Notification Banner */}
      {saveSuccessMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl text-xs font-semibold flex items-center justify-between shadow-xs animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{saveSuccessMsg}</span>
          </div>
          {reportData?.savedClosing?.savedAt && (
            <span className="text-[11px] text-emerald-600">
              {new Date(reportData.savedClosing.savedAt).toLocaleTimeString()}
            </span>
          )}
        </div>
      )}

      {/* ================= CONTROLS & FILTER BAR ================= */}
      <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-xs space-y-3 no-print">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Store Selector */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              {isEs ? "Tienda Activa" : "Store"}
            </label>
            <div className="relative">
              <select
                value={selectedStoreId}
                onChange={(e) => setSelectedStoreId(e.target.value)}
                className="w-full bg-slate-50 hover:bg-white text-slate-800 text-xs font-bold rounded-lg border border-slate-200 pl-8 pr-3 py-2 outline-none focus:border-cyan-500 transition cursor-pointer"
              >
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.currency})
                  </option>
                ))}
              </select>
              <Store className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
            </div>
          </div>

          {/* Date Picker & Presets */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              {isEs ? "Fecha del Cierre" : "Day End Date"}
            </label>
            <div className="flex items-center gap-1.5">
              <div className="relative flex-1">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full bg-slate-50 hover:bg-white text-slate-800 text-xs font-bold rounded-lg border border-slate-200 pl-8 pr-3 py-2 outline-none focus:border-cyan-500 transition"
                />
                <Calendar className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
              </div>
              <button
                type="button"
                onClick={() => setSelectedDate(new Date().toISOString().split("T")[0])}
                className={`px-2.5 py-2 rounded-lg text-xs font-bold border transition cursor-pointer ${
                  selectedDate === new Date().toISOString().split("T")[0]
                    ? "bg-cyan-50 border-cyan-400 text-cyan-700"
                    : "bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200"
                }`}
                title={isEs ? "Hoy" : "Today"}
              >
                {isEs ? "Hoy" : "Today"}
              </button>
            </div>
          </div>

          {/* Filter Scope Radio Pills */}
          <div className="lg:col-span-2">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              {isEs ? "Alcance del Cuadre" : "Reconciliation Scope"}
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setScope("store")}
                className={`py-2 px-3 rounded-lg text-xs font-bold border transition text-center cursor-pointer ${
                  scope === "store"
                    ? "bg-cyan-600 border-cyan-600 text-white shadow-xs"
                    : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-white"
                }`}
              >
                {isEs ? "Toda la Tienda" : "By Store (All)"}
              </button>
              <button
                type="button"
                onClick={() => setScope("till")}
                className={`py-2 px-3 rounded-lg text-xs font-bold border transition text-center cursor-pointer ${
                  scope === "till"
                    ? "bg-cyan-600 border-cyan-600 text-white shadow-xs"
                    : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-white"
                }`}
              >
                {isEs ? "Por Caja / Till" : "By Till / Terminal"}
              </button>
              <button
                type="button"
                onClick={() => setScope("cashier")}
                className={`py-2 px-3 rounded-lg text-xs font-bold border transition text-center cursor-pointer ${
                  scope === "cashier"
                    ? "bg-cyan-600 border-cyan-600 text-white shadow-xs"
                    : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-white"
                }`}
              >
                {isEs ? "Por Cajero" : "By Cashier"}
              </button>
            </div>
          </div>
        </div>

        {/* Sub-Filters if By Till or By Cashier selected */}
        {(scope === "till" || scope === "cashier") && (
          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-3">
            {scope === "till" && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-600">{isEs ? "Seleccionar Caja:" : "Select Terminal:"}</span>
                <select
                  value={selectedTerminal}
                  onChange={(e) => setSelectedTerminal(e.target.value)}
                  className="bg-white border border-slate-200 rounded-md px-3 py-1 text-xs font-semibold outline-none focus:border-cyan-500"
                >
                  <option value="ALL">{isEs ? "Todas las Cajas" : "All Terminals"}</option>
                  {(reportData?.terminals || []).map((t: Terminal) => (
                    <option key={t.id} value={t.name}>
                      {t.name} ({t.code})
                    </option>
                  ))}
                </select>
              </div>
            )}
            {scope === "cashier" && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-600">{isEs ? "Seleccionar Cajero:" : "Select Cashier:"}</span>
                <select
                  value={selectedCashier}
                  onChange={(e) => setSelectedCashier(e.target.value)}
                  className="bg-white border border-slate-200 rounded-md px-3 py-1 text-xs font-semibold outline-none focus:border-cyan-500"
                >
                  <option value="ALL">{isEs ? "Todos los Cajeros" : "All Cashiers"}</option>
                  {(reportData?.cashiers || []).map((c: Cashier) => (
                    <option key={c.id} value={c.name}>
                      {c.name} ({c.role})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ================= HERO KPI METRICS ================= */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {/* 1. Gross Sales */}
        <div className="p-3.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              {isEs ? "Ventas con Impuesto" : "Sales w/ Tax"}
            </span>
            <DollarSign className="w-4 h-4 text-cyan-600" />
          </div>
          <div className="text-lg sm:text-xl font-bold font-mono text-slate-900">
            {formatMoney(expectedSalesWithTax)}
          </div>
          <div className="text-[10px] text-slate-400 font-medium mt-0.5">
            {ordersCount} {ordersCount === 1 ? (isEs ? "orden procesada" : "order processed") : (isEs ? "órdenes procesadas" : "orders processed")}
          </div>
        </div>

        {/* 2. Expected Cash */}
        <div className="p-3.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              {isEs ? "Efectivo Esperado" : "Expected Cash"}
            </span>
            <Banknote className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-lg sm:text-xl font-bold font-mono text-slate-900">
            {formatMoney(reportData?.paymentExpectedTotals?.CASH || 0)}
          </div>
          <div className="text-[10px] text-slate-400 font-medium mt-0.5">
            {isEs ? "Calculado de ventas POS" : "System register tally"}
          </div>
        </div>

        {/* 3. Counted Cash in Till */}
        <div className="p-3.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              {isEs ? "Efectivo Contado" : "Counted Cash"}
            </span>
            <Calculator className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-lg sm:text-xl font-bold font-mono text-indigo-700">
            {formatMoney(totalCashCounted)}
          </div>
          <div className="text-[10px] text-slate-400 font-medium mt-0.5">
            {isEs ? "Gaveta + monedas físicas" : "Drawer bills & coin counts"}
          </div>
        </div>

        {/* 4. Net Variance / Cuadre */}
        <div
          className={`p-3.5 rounded-xl border shadow-2xs ${
            Math.abs(paymentMatrixTotals.netVariance) < 0.01
              ? "bg-emerald-50/60 border-emerald-300 text-emerald-950"
              : paymentMatrixTotals.netVariance > 0
              ? "bg-cyan-50/60 border-cyan-300 text-cyan-950"
              : "bg-rose-50/60 border-rose-300 text-rose-950"
          }`}
        >
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              {isEs ? "Diferencia / Cuadre" : "Over / (Short)"}
            </span>
            {Math.abs(paymentMatrixTotals.netVariance) < 0.01 ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertTriangle className={`w-4 h-4 ${paymentMatrixTotals.netVariance > 0 ? "text-cyan-600" : "text-rose-600"}`} />
            )}
          </div>
          <div className="text-lg sm:text-xl font-bold font-mono">
            {formatMoney(paymentMatrixTotals.netVariance)}
          </div>
          <div className="text-[10px] font-semibold mt-0.5">
            {Math.abs(paymentMatrixTotals.netVariance) < 0.01
              ? (isEs ? "✓ Caja perfectamente cuadrada" : "✓ Perfectly balanced")
              : paymentMatrixTotals.netVariance > 0
              ? (isEs ? "Sobrante en caja" : "Over collected")
              : (isEs ? "Faltante en caja" : "Shortage in till")}
          </div>
        </div>

        {/* 5. Total Cash Deposit */}
        <div className="p-3.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs col-span-2 md:col-span-1">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              {isEs ? "Depósito Bancario" : "Total Cash Deposit"}
            </span>
            <Building className="w-4 h-4 text-slate-700" />
          </div>
          <div className="text-lg sm:text-xl font-bold font-mono text-emerald-700">
            {formatMoney(totalCashDeposit)}
          </div>
          <div className="text-[10px] text-slate-400 font-medium mt-0.5">
            {isEs ? "Contado + Drops - Fondo" : "Counted + Drops - Float"}
          </div>
        </div>
      </div>

      {/* ================= 3-COLUMN WORKSPACE (AMBERPOS MATCHING OPTIONS) ================= */}
      <div id="day-end-printable-area" className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* ================= LEFT COLUMN: FLOAT TOTALS CALCULATOR (4 COLS) ================= */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Coins className="w-4 h-4 text-cyan-600" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  {isEs ? "Calculadora de Fondo y Efectivo" : "Float & Cash Calculator"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowRolls((prev) => !prev)}
                className={`text-[11px] font-bold px-2 py-0.5 rounded transition no-print ${
                  showRolls ? "bg-cyan-100 text-cyan-800" : "bg-slate-200 text-slate-600 hover:bg-slate-300"
                }`}
              >
                {showRolls ? (isEs ? "Ocultar Rollos" : "Hide Rolls") : (isEs ? "+ Rollos Moneda" : "+ Coin Rolls")}
              </button>
            </div>

            {/* Denomination Inputs */}
            <div className="p-4 space-y-3">
              {/* Bills Header */}
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider pb-1 border-b border-slate-100 flex justify-between">
                <span>{isEs ? "Billetes" : "Bills"}</span>
                <span>{isEs ? "Subtotal" : "Subtotal"}</span>
              </div>

              {/* Bills List */}
              <div className="space-y-1.5 font-mono text-xs">
                {[100, 50, 20, 10, 5, 2, 1].map((denom) => {
                  const d = denom as keyof DenominationCount["bills"];
                  const count = denominations.bills[d] || 0;
                  const lineTotal = count * denom;
                  return (
                    <div key={`bill-${denom}`} className="flex items-center justify-between gap-2">
                      <span className="w-16 font-semibold text-slate-600">{formatMoney(denom)}:</span>
                      <span className="text-slate-400 text-[10px]">x</span>
                      <input
                        type="number"
                        min="0"
                        value={count === 0 ? "" : count}
                        placeholder="0"
                        onChange={(e) => handleBillChange(d, e.target.value)}
                        className="w-16 text-center bg-slate-50 focus:bg-white border border-slate-200 focus:border-cyan-500 rounded px-1.5 py-0.5 text-xs font-bold outline-none"
                      />
                      <span className="text-slate-400 text-[10px]">=</span>
                      <span className="w-20 text-right font-bold text-slate-800">
                        {formatMoney(lineTotal)}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Coins Header */}
              <div className="pt-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider pb-1 border-b border-slate-100 flex justify-between">
                <span>{isEs ? "Monedas Sueltas" : "Coins & Cents"}</span>
                <span>{isEs ? "Subtotal" : "Subtotal"}</span>
              </div>

              {/* Coins List */}
              <div className="space-y-1.5 font-mono text-xs">
                {[
                  { denom: 1, label: "$1 Coin" },
                  { denom: 0.5, label: "$0.50" },
                  { denom: 0.25, label: "$0.25 (Quarter)" },
                  { denom: 0.1, label: "$0.10 (Dime)" },
                  { denom: 0.05, label: "$0.05 (Nickel)" },
                  { denom: 0.01, label: "$0.01 (Penny)" },
                ].map(({ denom, label }) => {
                  const d = denom as keyof DenominationCount["coins"];
                  const coinCount = denominations.coins[d] || 0;
                  const rollCount = showRolls ? (denominations.rolls[d] || 0) : 0;
                  let lineTotal = coinCount * denom;
                  if (denom === 1) lineTotal += rollCount * 25;
                  if (denom === 0.5) lineTotal += rollCount * 10;
                  if (denom === 0.25) lineTotal += rollCount * 10;
                  if (denom === 0.1) lineTotal += rollCount * 5;
                  if (denom === 0.05) lineTotal += rollCount * 2;
                  if (denom === 0.01) lineTotal += rollCount * 0.5;

                  return (
                    <div key={`coin-${denom}`} className="flex items-center justify-between gap-1.5">
                      <span className="w-20 font-semibold text-slate-600 truncate text-[11px]">{label}:</span>
                      <input
                        type="number"
                        min="0"
                        value={coinCount === 0 ? "" : coinCount}
                        placeholder="0"
                        title={isEs ? "Monedas sueltas" : "Loose coins"}
                        onChange={(e) => handleCoinChange(d, e.target.value)}
                        className="w-14 text-center bg-slate-50 focus:bg-white border border-slate-200 focus:border-cyan-500 rounded px-1 py-0.5 text-xs font-bold outline-none"
                      />
                      {showRolls && (
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-slate-400">+R</span>
                          <input
                            type="number"
                            min="0"
                            value={rollCount === 0 ? "" : rollCount}
                            placeholder="0"
                            title={isEs ? "Rollos completos" : "Full rolls"}
                            onChange={(e) => handleRollChange(d, e.target.value)}
                            className="w-12 text-center bg-cyan-50/50 focus:bg-white border border-cyan-200 focus:border-cyan-500 rounded px-1 py-0.5 text-xs font-bold outline-none"
                          />
                        </div>
                      )}
                      <span className="w-18 text-right font-bold text-slate-800">
                        {formatMoney(lineTotal)}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Drawer Cash Summary & Deposit Math */}
              <div className="pt-3 border-t border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between items-center font-bold text-slate-800">
                  <span>{isEs ? "Total Efectivo en Caja:" : "Total Cash Counted:"}</span>
                  <span className="font-mono text-sm text-indigo-700">{formatMoney(totalCashCounted)}</span>
                </div>

                <div className="flex justify-between items-center text-slate-600">
                  <span className="text-[11px] font-medium">{isEs ? "+ Drops a Caja Fuerte:" : "+ Cash Drop to Safe:"}</span>
                  <div className="w-24">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={cashDrop === 0 ? "" : cashDrop}
                      placeholder="0.00"
                      onChange={(e) => setCashDrop(parseFloat(e.target.value) || 0)}
                      className="w-full text-right bg-slate-50 focus:bg-white border border-slate-200 rounded px-2 py-0.5 font-mono text-xs font-bold"
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center text-slate-600">
                  <span className="text-[11px] font-medium">{isEs ? "- Fondo Inicial de Caja:" : "- Beginning Float:"}</span>
                  <div className="w-24">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={beginningFloat === 0 ? "" : beginningFloat}
                      placeholder="0.00"
                      onChange={(e) => setBeginningFloat(parseFloat(e.target.value) || 0)}
                      className="w-full text-right bg-slate-50 focus:bg-white border border-slate-200 rounded px-2 py-0.5 font-mono text-xs font-bold"
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200 flex justify-between items-center font-bold text-emerald-800 text-sm">
                  <span>{isEs ? "= Depósito Total Efectivo:" : "= Total Cash Deposit:"}</span>
                  <span className="font-mono">{formatMoney(totalCashDeposit)}</span>
                </div>
              </div>

              {/* Sync Button */}
              <button
                type="button"
                onClick={syncCashToMatrix}
                className="w-full mt-2 py-2 px-3 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer no-print"
              >
                <ArrowRight className="w-3.5 h-3.5" />
                <span>{isEs ? "Pasar Efectivo a Matriz de Pagos" : "Apply Cash to Payment Matrix"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* ================= CENTER COLUMN: PAYMENT RECONCILIATION MATRIX (5 COLS) ================= */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-cyan-600" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  {isEs ? "Matriz de Conciliación de Pagos" : "Payment Reconciliation"}
                </h2>
              </div>
              <button
                type="button"
                onClick={autoFillNonCashExpected}
                className="text-[10px] font-bold text-cyan-700 bg-cyan-50 hover:bg-cyan-100 px-2 py-1 rounded transition cursor-pointer no-print"
                title={isEs ? "Autocompletar lotes electrónicos desde el sistema" : "Autofill electronic card batches"}
              >
                {isEs ? "Autocompletar Tarjetas" : "Autofill Cards"}
              </button>
            </div>

            {/* Matrix Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-500 font-bold text-[10px] uppercase tracking-wider">
                    <th className="py-2.5 px-3">{isEs ? "Tipo de Pago" : "Payment Type"}</th>
                    <th className="py-2.5 px-2 text-right">{isEs ? "Esperado" : "Expected"}</th>
                    <th className="py-2.5 px-2 text-right">{isEs ? "Contado / Real" : "Payment Amount"}</th>
                    <th className="py-2.5 px-3 text-right">{isEs ? "Diferencia" : "Over/(Short)"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {PAYMENT_ROWS.map((row) => {
                    const expected = Number(reportData?.paymentExpectedTotals?.[row.key] || 0);
                    const actual = Number(paymentAmounts[row.key] || 0);
                    const diff = actual - expected;
                    const hasActivity = expected !== 0 || actual !== 0;

                    return (
                      <tr
                        key={row.key}
                        className={`transition ${
                          row.key === "CASH"
                            ? "bg-amber-50/40 font-semibold"
                            : hasActivity
                            ? "bg-white hover:bg-slate-50"
                            : "bg-white opacity-70 hover:opacity-100"
                        }`}
                      >
                        <td className="py-2 px-3 font-sans font-medium text-slate-800">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate max-w-[130px] sm:max-w-[160px]">{row.label}</span>
                          </div>
                        </td>

                        {/* Expected */}
                        <td className="py-2 px-2 text-right text-slate-600">
                          {formatMoney(expected)}
                        </td>

                        {/* Actual / Counted input */}
                        <td className="py-1 px-2 text-right">
                          <input
                            type="number"
                            step="0.01"
                            value={paymentAmounts[row.key] !== undefined ? paymentAmounts[row.key] : ""}
                            placeholder="0.00"
                            onChange={(e) => {
                              const v = parseFloat(e.target.value) || 0;
                              setPaymentAmounts((prev) => ({
                                ...prev,
                                [row.key]: v,
                              }));
                            }}
                            className={`w-22 text-right px-1.5 py-1 rounded text-xs font-bold outline-none border transition ${
                              row.key === "CASH"
                                ? "bg-amber-100/60 border-amber-300 focus:bg-white focus:border-amber-500"
                                : "bg-slate-50 border-slate-200 focus:bg-white focus:border-cyan-500"
                            }`}
                          />
                        </td>

                        {/* Over / Short Badge */}
                        <td className="py-2 px-3 text-right">
                          <span
                            className={`inline-block px-1.5 py-0.5 rounded text-[11px] font-bold ${
                              Math.abs(diff) < 0.01
                                ? "text-slate-400"
                                : diff > 0
                                ? "bg-cyan-100 text-cyan-800"
                                : "bg-rose-100 text-rose-800 font-extrabold"
                            }`}
                          >
                            {formatMoney(diff)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>

                {/* Table Footer Totals */}
                <tfoot>
                  <tr className="bg-slate-900 text-white font-mono font-bold text-xs border-t-2 border-slate-800">
                    <td className="py-2.5 px-3 font-sans uppercase tracking-wider text-[11px]">
                      {isEs ? "Totales Conciliados:" : "Total Payments:"}
                    </td>
                    <td className="py-2.5 px-2 text-right text-slate-200">
                      {formatMoney(paymentMatrixTotals.totalExpected)}
                    </td>
                    <td className="py-2.5 px-2 text-right text-cyan-300">
                      {formatMoney(paymentMatrixTotals.totalActual)}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <span
                        className={`px-2 py-0.5 rounded ${
                          Math.abs(paymentMatrixTotals.netVariance) < 0.01
                            ? "bg-emerald-500 text-slate-950 font-bold"
                            : paymentMatrixTotals.netVariance > 0
                            ? "bg-cyan-400 text-slate-950 font-bold"
                            : "bg-rose-500 text-white font-bold"
                        }`}
                      >
                        {formatMoney(paymentMatrixTotals.netVariance)}
                      </span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>

        {/* ================= RIGHT COLUMN: FINANCIAL BREAKDOWN & CLOSING (3 COLS) ================= */}
        <div className="lg:col-span-3 space-y-4">
          {/* Financial Breakdown Card */}
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-4 space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <TrendingUp className="w-4 h-4 text-cyan-600" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                {isEs ? "Resumen de Ventas y Márgenes" : "Sales & Margin Audit"}
              </h2>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between text-slate-600">
                <span className="font-sans text-[11px]">{isEs ? "Ventas con Impuesto:" : "Sales w/ Tax:"}</span>
                <span className="font-bold text-slate-900">{formatMoney(expectedSalesWithTax)}</span>
              </div>

              <div className="flex justify-between text-slate-500">
                <span className="font-sans text-[11px]">{isEs ? "Impuesto / ISV (Tax 1):" : "Tax 1 (ISV/Sales):"}</span>
                <span>{formatMoney(tax1)}</span>
              </div>

              <div className="flex justify-between font-bold text-slate-800 pt-1 border-t border-slate-100">
                <span className="font-sans text-[11px]">{isEs ? "Ventas Netas:" : "Total Net Sales:"}</span>
                <span>{formatMoney(netSales)}</span>
              </div>

              <div className="flex justify-between text-slate-500">
                <span className="font-sans text-[11px]">{isEs ? "Descuentos Otorgados:" : "Total Discount:"}</span>
                <span className="text-amber-600">{formatMoney(reportData?.totals?.totalDiscount || 0)}</span>
              </div>

              <div className="flex justify-between text-slate-600 items-center">
                <span className="font-sans text-[11px]">{isEs ? "+ Entradas (Paid In):" : "+ Paid In:"}</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={paidIn === 0 ? "" : paidIn}
                  placeholder="0.00"
                  onChange={(e) => setPaidIn(parseFloat(e.target.value) || 0)}
                  className="w-18 text-right bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-xs font-bold outline-none"
                />
              </div>

              <div className="flex justify-between text-slate-600 items-center">
                <span className="font-sans text-[11px]">{isEs ? "- Salidas (Paid Out):" : "- Paid Out:"}</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={paidOut === 0 ? "" : paidOut}
                  placeholder="0.00"
                  onChange={(e) => setPaidOut(parseFloat(e.target.value) || 0)}
                  className="w-18 text-right bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-xs font-bold outline-none"
                />
              </div>

              <div className="flex justify-between text-slate-500 pt-1 border-t border-slate-100">
                <span className="font-sans text-[11px]">{isEs ? "Costo de Inventario (COGS):" : "Inventory Cost (COGS):"}</span>
                <span>{formatMoney(inventoryCost)}</span>
              </div>

              <div className="flex justify-between font-bold text-emerald-800 pt-1 border-t border-slate-100">
                <span className="font-sans text-[11px]">{isEs ? "Margen Bruto del Día:" : "Gross Profit Margin:"}</span>
                <span>
                  {formatMoney(grossProfit)} ({grossMarginPercent}%)
                </span>
              </div>
            </div>
          </div>

          {/* Memo & Cashier Signoff Card */}
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-4 space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <ShieldCheck className="w-4 h-4 text-cyan-600" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                {isEs ? "Observaciones y Firma" : "Memo & Authorization"}
              </h2>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">
                {isEs ? "Cajero Responsable:" : "Closing Cashier Name:"}
              </label>
              <input
                type="text"
                value={closingCashier}
                onChange={(e) => setClosingCashier(e.target.value)}
                placeholder={isEs ? "Nombre del cajero..." : "Cashier name..."}
                className="w-full bg-slate-50 focus:bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">
                {isEs ? "Notas / Justificación de Descuadre:" : "Memo / Variance Notes:"}
              </label>
              <textarea
                rows={3}
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                placeholder={isEs ? "Detalles de incidentes, sobrantes o justificaciones..." : "Details about discrepancies, notes, or drops..."}
                className="w-full bg-slate-50 focus:bg-white border border-slate-200 rounded-lg p-2 text-xs outline-none focus:border-cyan-500 resize-none"
              />
            </div>

            {/* Audit Stamp */}
            {reportData?.savedClosing?.savedAt && (
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-[10px] text-slate-500 space-y-0.5">
                <div className="font-bold text-slate-700 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-cyan-600" />
                  <span>{isEs ? "Último Cierre Registrado" : "Last Saved Closing"}</span>
                </div>
                <div>
                  {isEs ? "Por:" : "By:"} {reportData.savedClosing.savedBy || reportData.savedClosing.cashier}
                </div>
                <div>{new Date(reportData.savedClosing.savedAt).toLocaleString()}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
