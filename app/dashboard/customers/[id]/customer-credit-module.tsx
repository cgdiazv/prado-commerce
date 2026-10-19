"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  CreditCard,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Plus,
  RefreshCw,
  Printer,
  X,
  Receipt,
  ArrowDownCircle,
  FileText,
  ShieldAlert,
  Percent,
} from "lucide-react";
import type { CustomerCreditSummary, CustomerCreditInvoice, CustomerPayment } from "@/types/dashboard";

type CustomerCreditModuleProps = {
  customerId: string;
  storeId: string;
  customerName: string;
  customerEmail: string;
  currencySymbol: string;
  isEs: boolean;
  initialAllowCredit?: boolean;
  initialCreditLimit?: number;
  initialCreditDays?: number;
  initialCreditInterestRate?: number;
  onCreditConfigUpdated?: () => void;
};

export function CustomerCreditModule({
  customerId,
  storeId,
  customerName,
  customerEmail,
  currencySymbol,
  isEs,
  initialAllowCredit = false,
  initialCreditLimit = 0,
  initialCreditDays = 30,
  initialCreditInterestRate = 0,
  onCreditConfigUpdated,
}: CustomerCreditModuleProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<CustomerCreditSummary | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Payment Modal State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string>("");
  const [paymentAmount, setPaymentAmount] = useState<string>("");
  const [interestAmount, setInterestAmount] = useState<string>("0");
  const [paymentMethod, setPaymentMethod] = useState<string>("CASH");
  const [reference, setReference] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState<string | null>(null);

  // Receipt Modal State
  const [receiptPayment, setReceiptPayment] = useState<CustomerPayment | null>(null);

  const fetchCreditData = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await fetch(`/api/customers/${customerId}/credit`, { cache: "no-store" });
      if (!res.ok) {
        throw new Error(isEs ? "Error al obtener estado de cuenta" : "Failed to fetch credit account");
      }
      const json = await res.json();
      setData(json);
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  }, [customerId, isEs]);

  useEffect(() => {
    void fetchCreditData();
  }, [fetchCreditData]);

  // Open payment modal pre-targeted to a specific invoice
  const handleOpenPaymentForInvoice = (invoice: CustomerCreditInvoice) => {
    setSelectedOrderId(invoice.orderId);
    setPaymentAmount(invoice.balance > 0 ? String(invoice.balance) : "");
    setInterestAmount(invoice.interestDue > 0 ? String(invoice.interestDue) : "0");
    setPaymentError(null);
    setPaymentSuccess(null);
    setIsPaymentModalOpen(true);
  };

  const handleOpenGeneralPayment = () => {
    setSelectedOrderId("");
    setPaymentAmount("");
    setInterestAmount("0");
    setPaymentError(null);
    setPaymentSuccess(null);
    setIsPaymentModalOpen(true);
  };

  // Submit payment
  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setPaymentError(null);
    setPaymentSuccess(null);

    const amountNum = parseFloat(paymentAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setPaymentError(isEs ? "Ingresa un monto de abono válido mayor a 0." : "Enter a valid payment amount greater than 0.");
      return;
    }

    const interestNum = parseFloat(interestAmount) || 0;
    if (interestNum < 0) {
      setPaymentError(isEs ? "El monto de interés no puede ser negativo." : "Interest amount cannot be negative.");
      return;
    }

    setSubmittingPayment(true);
    try {
      const res = await fetch(`/api/customers/${customerId}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: amountNum,
          interestAmount: interestNum,
          paymentMethod,
          reference: reference.trim() || null,
          notes: notes.trim() || null,
          orderId: selectedOrderId || null,
        }),
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || (isEs ? "Error al registrar el abono." : "Failed to record payment."));
      }

      setPaymentSuccess(isEs ? "¡Abono registrado con éxito!" : "Payment successfully recorded!");
      setPaymentAmount("");
      setInterestAmount("0");
      setReference("");
      setNotes("");

      // Refresh credit overview
      await fetchCreditData();
      if (onCreditConfigUpdated) {
        onCreditConfigUpdated();
      }

      setTimeout(() => {
        setIsPaymentModalOpen(false);
        setPaymentSuccess(null);
      }, 1200);
    } catch (err) {
      setPaymentError(err instanceof Error ? err.message : "Error");
    } finally {
      setSubmittingPayment(false);
    }
  };

  // Calculations
  const creditLimit = data ? data.creditLimit : initialCreditLimit;
  const allowCredit = data ? data.allowCredit : initialAllowCredit;
  const totalDebt = data ? data.totalDebt : 0;
  const totalInterestDue = data ? data.totalInterestDue : 0;
  const availableCredit = data ? data.availableCredit : Math.max(0, creditLimit - totalDebt);
  const overdueCount = data ? data.overdueInvoicesCount : 0;

  const usagePercent = creditLimit > 0 ? Math.min(100, Math.round((totalDebt / creditLimit) * 100)) : 0;

  // Selected invoice for modal helper
  const activeSelectedInvoice = useMemo(() => {
    if (!selectedOrderId || !data) return null;
    return data.invoices.find((inv) => inv.orderId === selectedOrderId) || null;
  }, [selectedOrderId, data]);

  return (
    <div className="space-y-6">
      {/* Header and Status Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-indigo-600" />
              {isEs ? "Línea de Crédito y Cuentas por Cobrar (CxC)" : "Credit Line & Accounts Receivable"}
            </h2>
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                allowCredit
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-slate-100 text-slate-600 border border-slate-200"
              }`}
            >
              {allowCredit ? (isEs ? "Crédito Habilitado" : "Credit Enabled") : (isEs ? "Solo Contado" : "Cash Only")}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {isEs
              ? "Control de límite de crédito, saldo pendiente, abonos parciales y cálculo automático de mora después de 30 días."
              : "Credit limits, receivable balances, partial payments, and automatic late interest calculation after 30 days."}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => void fetchCreditData()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition"
            title={isEs ? "Actualizar saldo" : "Refresh balance"}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-indigo-600" : "text-slate-500"}`} />
            {isEs ? "Actualizar" : "Refresh"}
          </button>

          <button
            type="button"
            onClick={handleOpenGeneralPayment}
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 transition"
          >
            <Plus className="w-4 h-4" />
            {isEs ? "Registrar Abono" : "Record Payment"}
          </button>
        </div>
      </div>

      {fetchError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{fetchError}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Límite de Crédito */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>{isEs ? "Límite de Crédito" : "Credit Limit"}</span>
            <DollarSign className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">
            ${creditLimit.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            <span className="text-xs font-normal text-slate-500 ml-1">{currencySymbol}</span>
          </p>
          <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
            <span>{isEs ? "Plazo otorgado:" : "Terms:"}</span>
            <span className="font-semibold text-slate-700">
              {data ? data.creditDays : initialCreditDays} {isEs ? "días" : "days"}
            </span>
          </div>
        </div>

        {/* Saldo Pendiente (Deuda Actual) */}
        <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-xs font-medium text-amber-800">
            <span>{isEs ? "Saldo Pendiente (CxC)" : "Outstanding Balance"}</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-black text-amber-950 mt-2">
            ${totalDebt.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            <span className="text-xs font-normal text-amber-700 ml-1">{currencySymbol}</span>
          </p>
          <div className="mt-3 flex items-center justify-between text-[11px]">
            <span className="text-amber-800">{isEs ? "Uso de línea:" : "Credit usage:"}</span>
            <span className="font-bold text-amber-900">{usagePercent}%</span>
          </div>
          <div className="mt-1 h-1.5 w-full rounded-full bg-amber-200 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                usagePercent > 90 ? "bg-rose-500" : usagePercent > 70 ? "bg-amber-500" : "bg-emerald-500"
              }`}
              style={{ width: `${usagePercent}%` }}
            />
          </div>
        </div>

        {/* Crédito Disponible */}
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-xs font-medium text-emerald-800">
            <span>{isEs ? "Crédito Disponible" : "Available Credit"}</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-950 mt-2">
            ${availableCredit.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            <span className="text-xs font-normal text-emerald-700 ml-1">{currencySymbol}</span>
          </p>
          <div className="mt-3 text-[11px] text-emerald-800 flex items-center justify-between">
            <span>{isEs ? "Capacidad libre:" : "Free capacity:"}</span>
            <span className="font-bold text-emerald-900">{100 - usagePercent}%</span>
          </div>
        </div>

        {/* Intereses por Mora (> 30 días) */}
        <div
          className={`rounded-2xl border p-4 shadow-sm relative overflow-hidden ${
            totalInterestDue > 0
              ? "border-rose-300 bg-rose-50/70 text-rose-950"
              : "border-slate-200 bg-white text-slate-900"
          }`}
        >
          <div className="flex items-center justify-between text-xs font-medium">
            <span className={totalInterestDue > 0 ? "text-rose-800 font-semibold" : "text-slate-500"}>
              {isEs ? "Mora (>30 días)" : "Late Fee / Interest"}
            </span>
            <Percent className={`w-4 h-4 ${totalInterestDue > 0 ? "text-rose-600" : "text-slate-400"}`} />
          </div>
          <p className="text-2xl font-black mt-2">
            ${totalInterestDue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            <span className="text-xs font-normal opacity-70 ml-1">{currencySymbol}</span>
          </p>
          <div className="mt-3 flex items-center justify-between text-[11px]">
            <span className={totalInterestDue > 0 ? "text-rose-800" : "text-slate-500"}>
              {isEs ? "Tasa mensual:" : "Monthly rate:"}
            </span>
            <span className="font-bold">
              {data && data.creditInterestRate > 0
                ? `${data.creditInterestRate}% (Específica)`
                : (data?.storeDefaultLateRate ?? 0) > 0
                ? `${data?.storeDefaultLateRate}% (Tienda)`
                : `${initialCreditInterestRate}%`}
            </span>
          </div>
        </div>
      </div>

      {/* Alerta de Facturas Vencidas si aplica */}
      {overdueCount > 0 && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 flex items-start gap-3 text-xs text-rose-800">
          <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold text-sm text-rose-900">
              {isEs
                ? `Atención: Este cliente tiene ${overdueCount} factura(s) con más de 30 días vencida(s)`
                : `Attention: This customer has ${overdueCount} overdue invoice(s) past 30 days`}
            </p>
            <p className="mt-0.5 text-rose-700">
              {isEs
                ? "Se ha aplicado el cálculo automático de intereses por mora mensual sobre el saldo vencido. Te recomendamos gestionar el cobro antes de autorizar nuevas ventas a crédito."
                : "Automatic monthly late interest has accrued on the overdue balance. It is recommended to collect payment before approving further credit sales."}
            </p>
          </div>
        </div>
      )}

      {/* Tabla de Facturas Pendientes / Cuentas por Cobrar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-600" />
            {isEs ? "Facturas a Crédito y Pendientes de Pago" : "Credit Invoices & Pending Receivables"}
          </h3>
          <span className="text-xs text-slate-500">
            {data?.invoices?.filter((inv) => inv.balance > 0).length || 0} {isEs ? "pendientes" : "pending"}
          </span>
        </div>

        {(!data || data.invoices.filter((inv) => inv.balance > 0).length === 0) ? (
          <div className="text-center py-8 rounded-xl border border-dashed border-slate-200 text-xs text-slate-400">
            {isEs ? "Este cliente no tiene facturas con saldo pendiente." : "This customer has no invoices with pending balances."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold">
                <tr>
                  <th className="px-3 py-2.5 text-left">{isEs ? "Factura" : "Invoice"}</th>
                  <th className="px-3 py-2.5 text-left">{isEs ? "Fecha Emisión" : "Issue Date"}</th>
                  <th className="px-3 py-2.5 text-left">{isEs ? "Vencimiento" : "Due Date"}</th>
                  <th className="px-3 py-2.5 text-left">{isEs ? "Estado / Plazo" : "Status / Days"}</th>
                  <th className="px-3 py-2.5 text-right">{isEs ? "Total" : "Total"}</th>
                  <th className="px-3 py-2.5 text-right">{isEs ? "Abonado" : "Paid"}</th>
                  <th className="px-3 py-2.5 text-right font-bold text-slate-900">{isEs ? "Saldo Capital" : "Principal Balance"}</th>
                  <th className="px-3 py-2.5 text-right font-bold text-rose-700">{isEs ? "Mora Devengada" : "Late Interest"}</th>
                  <th className="px-3 py-2.5 text-right font-bold text-indigo-900">{isEs ? "Total Exigible" : "Total Due"}</th>
                  <th className="px-3 py-2.5 text-center">{isEs ? "Acción" : "Action"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.invoices
                  .filter((inv) => inv.balance > 0)
                  .map((inv) => (
                    <tr key={inv.orderId} className={`hover:bg-slate-50 transition ${inv.isOverdue ? "bg-rose-50/30" : ""}`}>
                      <td className="px-3 py-2.5 font-bold text-indigo-700">
                        #{inv.orderNumber}
                      </td>
                      <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap">
                        {new Date(inv.issueDate).toLocaleDateString(isEs ? "es-ES" : "en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </td>
                      <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap">
                        {new Date(inv.dueDate).toLocaleDateString(isEs ? "es-ES" : "en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        {inv.isOverdue ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                            <Clock className="w-3 h-3" />
                            {isEs ? `Vencida (${inv.daysOverdue} d)` : `Overdue (${inv.daysOverdue} d)`}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {isEs ? "Al día" : "Current"}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right text-slate-600 font-mono">
                        ${inv.total.toFixed(2)}
                      </td>
                      <td className="px-3 py-2.5 text-right text-emerald-700 font-mono">
                        ${inv.totalPaid.toFixed(2)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono font-bold text-slate-900">
                        ${inv.balance.toFixed(2)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono font-bold text-rose-600">
                        {inv.interestDue > 0 ? `+$${inv.interestDue.toFixed(2)}` : "$0.00"}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono font-bold text-indigo-950 bg-indigo-50/50">
                        ${inv.totalDue.toFixed(2)}
                      </td>
                      <td className="px-3 py-2.5 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleOpenPaymentForInvoice(inv)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs transition"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          {isEs ? "Abonar" : "Pay"}
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Historial de Abonos / Pagos Realizados */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Receipt className="w-4 h-4 text-emerald-600" />
            {isEs ? "Historial de Abonos y Pagos Registrados" : "Payments & Abonos History"}
          </h3>
          <span className="text-xs text-slate-500">
            {data?.payments?.length || 0} {isEs ? "pagos" : "records"}
          </span>
        </div>

        {(!data || data.payments.length === 0) ? (
          <div className="text-center py-8 rounded-xl border border-dashed border-slate-200 text-xs text-slate-400">
            {isEs ? "No se han registrado abonos aún para este cliente." : "No payment records found for this customer."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold">
                <tr>
                  <th className="px-3 py-2.5 text-left">{isEs ? "Fecha y Hora" : "Date & Time"}</th>
                  <th className="px-3 py-2.5 text-left">{isEs ? "Aplicado a" : "Applied to"}</th>
                  <th className="px-3 py-2.5 text-left">{isEs ? "Método" : "Method"}</th>
                  <th className="px-3 py-2.5 text-left">{isEs ? "Referencia" : "Reference"}</th>
                  <th className="px-3 py-2.5 text-right font-bold text-emerald-700">{isEs ? "Abono Capital" : "Principal"}</th>
                  <th className="px-3 py-2.5 text-right font-bold text-rose-700">{isEs ? "Interés Mora" : "Interest"}</th>
                  <th className="px-3 py-2.5 text-right font-bold text-slate-900">{isEs ? "Total Pagado" : "Total Paid"}</th>
                  <th className="px-3 py-2.5 text-left">{isEs ? "Recibido por" : "Received by"}</th>
                  <th className="px-3 py-2.5 text-center">{isEs ? "Recibo" : "Receipt"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.payments.map((p) => {
                  const totalPaid = p.amount + p.interestAmount;
                  return (
                    <tr key={p.id} className="hover:bg-slate-50 transition">
                      <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap">
                        {new Date(p.paidAt).toLocaleDateString(isEs ? "es-ES" : "en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-3 py-2.5 font-medium">
                        {p.orderNumber ? (
                          <span className="font-bold text-indigo-700">#{p.orderNumber}</span>
                        ) : (
                          <span className="text-slate-500 italic">{isEs ? "Abono general a cuenta" : "General account payment"}</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-slate-700">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                          {p.paymentMethod}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-slate-500 font-mono">
                        {p.reference || "—"}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono font-bold text-emerald-700">
                        ${p.amount.toFixed(2)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-rose-600 font-medium">
                        ${p.interestAmount.toFixed(2)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono font-bold text-slate-900">
                        ${totalPaid.toFixed(2)}
                      </td>
                      <td className="px-3 py-2.5 text-slate-600">
                        {p.receivedBy || "—"}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => setReceiptPayment(p)}
                          className="inline-flex items-center gap-1 p-1 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition"
                          title={isEs ? "Ver/Imprimir Comprobante" : "Print receipt"}
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: Registrar Abono */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
            <button
              type="button"
              onClick={() => setIsPaymentModalOpen(false)}
              className="absolute top-4 right-4 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-slate-100 pb-3 mb-4">
              <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900">
                  {isEs ? "Registrar Abono / Pago a Cuenta" : "Record Customer Payment / Abono"}
                </h3>
                <p className="text-xs text-slate-500">
                  {customerName} • {customerEmail}
                </p>
              </div>
            </div>

            {paymentError && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 mb-4 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{paymentError}</span>
              </div>
            )}

            {paymentSuccess && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700 mb-4 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{paymentSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSubmitPayment} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {isEs ? "¿A qué factura deseas aplicar el pago?" : "Target Invoice"}
                </label>
                <select
                  value={selectedOrderId}
                  onChange={(e) => {
                    const ordId = e.target.value;
                    setSelectedOrderId(ordId);
                    if (ordId && data) {
                      const match = data.invoices.find((i) => i.orderId === ordId);
                      if (match) {
                        setPaymentAmount(String(match.balance));
                        setInterestAmount(String(match.interestDue));
                      }
                    } else {
                      setPaymentAmount("");
                      setInterestAmount("0");
                    }
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-indigo-500"
                >
                  <option value="">
                    {isEs
                      ? "Abono general a cuenta (Aplicar a facturas más antiguas - FIFO)"
                      : "General Account Payment (Apply FIFO to oldest invoices)"}
                  </option>
                  {data?.invoices
                    ?.filter((inv) => inv.balance > 0)
                    .map((inv) => (
                      <option key={inv.orderId} value={inv.orderId}>
                        Factura #{inv.orderNumber} - Saldo: ${inv.balance.toFixed(2)}
                        {inv.interestDue > 0 ? ` (+Mora: $${inv.interestDue.toFixed(2)})` : ""}
                      </option>
                    ))}
                </select>
                {activeSelectedInvoice && (
                  <p className="mt-1 text-[11px] text-indigo-700 font-medium">
                    {isEs
                      ? `Factura #${activeSelectedInvoice.orderNumber} • Saldo: $${activeSelectedInvoice.balance.toFixed(2)} ${activeSelectedInvoice.interestDue > 0 ? `• Mora devengada: $${activeSelectedInvoice.interestDue.toFixed(2)}` : ""}`
                      : `Invoice #${activeSelectedInvoice.orderNumber} • Balance: $${activeSelectedInvoice.balance.toFixed(2)}`}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {isEs ? "Abono a Capital ($)" : "Principal Amount ($)"} *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-7 pr-3 text-sm font-bold font-mono outline-none transition focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {isEs ? "Pago a Interés por Mora ($)" : "Late Interest ($)"}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={interestAmount}
                      onChange={(e) => setInterestAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-7 pr-3 text-sm font-bold font-mono text-rose-700 outline-none transition focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {isEs ? "Método de Pago" : "Payment Method"}
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-indigo-500"
                  >
                    <option value="CASH">{isEs ? "Efectivo" : "Cash"}</option>
                    <option value="CARD">{isEs ? "Tarjeta de Crédito / Débito" : "Credit/Debit Card"}</option>
                    <option value="TRANSFER">{isEs ? "Transferencia Bancaria" : "Bank Transfer"}</option>
                    <option value="CHECK">{isEs ? "Cheque" : "Check"}</option>
                    <option value="OTHER">{isEs ? "Otro" : "Other"}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {isEs ? "Referencia / No. Comprobante" : "Reference #"}
                  </label>
                  <input
                    type="text"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    placeholder={isEs ? "Ej. Depósito #9842" : "e.g. Deposit #9842"}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {isEs ? "Notas / Observaciones" : "Notes"}
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={isEs ? "Detalles adicionales del abono..." : "Additional details..."}
                  className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs outline-none transition focus:border-indigo-500"
                />
              </div>

              {/* Total preview */}
              <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-3 flex items-center justify-between text-xs">
                <span className="font-semibold text-indigo-950">
                  {isEs ? "Total a Cobrar / Recibir:" : "Total to Receive:"}
                </span>
                <span className="font-mono text-base font-black text-indigo-900">
                  ${((parseFloat(paymentAmount) || 0) + (parseFloat(interestAmount) || 0)).toFixed(2)}{" "}
                  <span className="text-xs font-normal text-indigo-700">{currencySymbol}</span>
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  disabled={submittingPayment}
                  className="rounded-xl border border-slate-300 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  {isEs ? "Cancelar" : "Cancel"}
                </button>
                <button
                  type="submit"
                  disabled={submittingPayment}
                  className="rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 transition disabled:opacity-50"
                >
                  {submittingPayment ? (isEs ? "Registrando..." : "Recording...") : isEs ? "Confirmar Abono" : "Confirm Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Comprobante de Abono Imprimible */}
      {receiptPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setReceiptPayment(null)}
              className="absolute top-4 right-4 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition print:hidden"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center pb-4 border-b border-slate-200">
              <Receipt className="w-8 h-8 text-indigo-600 mx-auto mb-1" />
              <h3 className="font-black text-lg text-slate-900 uppercase tracking-wider">
                {isEs ? "Comprobante de Abono" : "Payment Receipt"}
              </h3>
              <p className="text-xs text-slate-500 font-mono mt-0.5">ID: {receiptPayment.id}</p>
            </div>

            <div className="py-4 space-y-2.5 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">{isEs ? "Cliente:" : "Customer:"}</span>
                <span className="font-bold text-slate-900">{customerName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">{isEs ? "Fecha y Hora:" : "Date:"}</span>
                <span className="font-mono text-slate-800">
                  {new Date(receiptPayment.paidAt).toLocaleString(isEs ? "es-ES" : "en-US")}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">{isEs ? "Concepto:" : "Concept:"}</span>
                <span className="font-semibold text-slate-800">
                  {receiptPayment.orderNumber
                    ? `${isEs ? "Abono a Factura" : "Payment on Invoice"} #${receiptPayment.orderNumber}`
                    : (isEs ? "Abono general a cuenta" : "General account payment")}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">{isEs ? "Método de Pago:" : "Payment Method:"}</span>
                <span className="font-bold text-slate-800">{receiptPayment.paymentMethod}</span>
              </div>
              {receiptPayment.reference && (
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">{isEs ? "No. Referencia:" : "Reference #:"}</span>
                  <span className="font-mono font-bold text-slate-800">{receiptPayment.reference}</span>
                </div>
              )}
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">{isEs ? "Abono a Capital:" : "Principal:"}</span>
                <span className="font-mono font-bold text-emerald-700">${receiptPayment.amount.toFixed(2)}</span>
              </div>
              {receiptPayment.interestAmount > 0 && (
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">{isEs ? "Interés por Mora:" : "Late Fee:"}</span>
                  <span className="font-mono font-bold text-rose-700">+${receiptPayment.interestAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between py-2 bg-slate-50 px-2 rounded-lg font-bold text-sm">
                <span className="text-slate-900">{isEs ? "Total Recibido:" : "Total Paid:"}</span>
                <span className="font-mono text-indigo-900">
                  ${(receiptPayment.amount + receiptPayment.interestAmount).toFixed(2)} {currencySymbol}
                </span>
              </div>
              {receiptPayment.receivedBy && (
                <div className="flex justify-between py-1 text-slate-500">
                  <span>{isEs ? "Atendido por:" : "Received by:"}</span>
                  <span className="font-medium text-slate-700">{receiptPayment.receivedBy}</span>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2 print:hidden">
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white hover:bg-slate-800 transition"
              >
                <Printer className="w-4 h-4" />
                {isEs ? "Imprimir Recibo" : "Print Receipt"}
              </button>
              <button
                type="button"
                onClick={() => setReceiptPayment(null)}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                {isEs ? "Cerrar" : "Close"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
