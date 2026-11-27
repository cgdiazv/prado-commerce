"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DollarSign,
  ExternalLink,
  Eye,
  Loader2,
  Package,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Store,
  Trash2,
  X,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n/language-context";

export type StoreOption = { id: string; name: string; currency: string };

export type RefundedItemEntry = {
  itemId?: string;
  variantId?: string | null;
  title: string;
  quantity: number;
  price: number;
};

export type RefundRecord = {
  id: string;
  refundNumber: number;
  storeId: string;
  storeName: string;
  orderId: string;
  orderNumber: number;
  customerEmail: string;
  customerName: string | null;
  orderTotal: string;
  orderStatus: string;
  type: "FULL" | "PARTIAL";
  amount: string;
  currency: string;
  restockedUnits: number;
  reason: string | null;
  items: RefundedItemEntry[];
  processedBy: string | null;
  createdAt: string;
};

export type RefundOrderCandidate = {
  id: string;
  storeId: string;
  orderNumber: number;
  customerEmail: string;
  customerName: string | null;
  total: string;
  currency: string;
  status: string;
  paymentStatus: string;
  createdAt: string;
  items: Array<{
    id: string;
    variantId: string | null;
    title: string;
    price: string;
    quantity: number;
  }>;
};

type Props = {
  initialStores: StoreOption[];
  initialRefunds: RefundRecord[];
  initialOrderCandidates: RefundOrderCandidate[];
  selectedStoreId: string | null;
  setupError?: string | null;
};

export function RefundsDashboard({
  initialStores,
  initialRefunds,
  initialOrderCandidates,
  selectedStoreId,
  setupError = null,
}: Props) {
  const router = useRouter();
  const { language } = useLanguage();
  const isEs = language === "es";

  const [refunds, setRefunds] = useState<RefundRecord[]>(initialRefunds);
  const [activeStoreId, setActiveStoreId] = useState<string>(selectedStoreId ?? "ALL");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"ALL" | "FULL" | "PARTIAL">("ALL");
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // View / Edit refund details modal state
  const [selectedRefund, setSelectedRefund] = useState<RefundRecord | null>(null);
  const [editingReasonId, setEditingReasonId] = useState<string | null>(null);
  const [editingReasonValue, setEditingReasonValue] = useState("");
  const [isUpdatingRefund, setIsUpdatingRefund] = useState(false);

  // Create New Refund modal state
  const [isNewRefundOpen, setIsNewRefundOpen] = useState(false);
  const [orderSearchQuery, setOrderSearchQuery] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState<string>("");
  const [restockQuantities, setRestockQuantities] = useState<Record<string, number>>({});
  const [refundAmountInput, setRefundAmountInput] = useState("");
  const [isCustomRefundAmount, setIsCustomRefundAmount] = useState(false);
  const [restockToInventory, setRestockToInventory] = useState(true);
  const [cancelOrderOnRefund, setCancelOrderOnRefund] = useState(true);
  const [newRefundReason, setNewRefundReason] = useState("");
  const [isSubmittingNewRefund, setIsSubmittingNewRefund] = useState(false);

  const defaultCurrency = useMemo(() => {
    if (activeStoreId !== "ALL") {
      const found = initialStores.find((s) => s.id === activeStoreId);
      if (found?.currency) return found.currency;
    }
    return initialStores[0]?.currency || "USD";
  }, [activeStoreId, initialStores]);

  const formatMoney = (amount: number | string, currency = defaultCurrency) => {
    const num = typeof amount === "number" ? amount : Number(amount) || 0;
    return new Intl.NumberFormat(isEs ? "es-ES" : "en-US", {
      style: "currency",
      currency: currency || "USD",
    }).format(num);
  };

  const visibleRefunds = useMemo(() => {
    const query = search.trim().toLowerCase();
    return refunds.filter((refund) => {
      if (activeStoreId !== "ALL" && refund.storeId !== activeStoreId) return false;
      if (typeFilter !== "ALL" && refund.type !== typeFilter) return false;
      if (!query) return true;
      const itemTitles = refund.items.map((i) => i.title).join(" ");
      return [
        `ref-${refund.refundNumber}`,
        String(refund.refundNumber),
        `#${refund.orderNumber}`,
        String(refund.orderNumber),
        refund.customerName ?? "",
        refund.customerEmail,
        refund.reason ?? "",
        refund.storeName,
        itemTitles,
      ].some((val) => val.toLowerCase().includes(query));
    });
  }, [refunds, activeStoreId, typeFilter, search]);

  const summaryStats = useMemo(() => {
    let totalAmount = 0;
    let totalRestockedUnits = 0;
    let fullCount = 0;
    let partialCount = 0;
    for (const r of visibleRefunds) {
      totalAmount += Number(r.amount) || 0;
      totalRestockedUnits += r.restockedUnits || 0;
      if (r.type === "PARTIAL") partialCount += 1;
      else fullCount += 1;
    }
    return {
      totalCount: visibleRefunds.length,
      fullCount,
      partialCount,
      totalAmount,
      totalRestockedUnits,
    };
  }, [visibleRefunds]);

  const selectedOrderCandidate = useMemo(
    () => initialOrderCandidates.find((o) => o.id === selectedOrderId) ?? null,
    [initialOrderCandidates, selectedOrderId],
  );

  const filteredOrderCandidates = useMemo(() => {
    const q = orderSearchQuery.trim().toLowerCase();
    return initialOrderCandidates.filter((o) => {
      if (activeStoreId !== "ALL" && o.storeId !== activeStoreId) return false;
      if (!q) return true;
      return [
        String(o.orderNumber),
        `#${o.orderNumber}`,
        o.customerName ?? "",
        o.customerEmail,
      ].some((v) => v.toLowerCase().includes(q));
    });
  }, [initialOrderCandidates, activeStoreId, orderSearchQuery]);

  function computeSuggestedAmount(
    order: RefundOrderCandidate,
    quantities: Record<string, number>,
  ): string {
    const allFull =
      order.items.length > 0 &&
      order.items.every((item) => (quantities[item.id] ?? 0) >= item.quantity);
    if (allFull) {
      return Number(order.total).toFixed(2);
    }
    const sum = order.items.reduce((acc, item) => {
      const qty = Math.min(Math.max(0, quantities[item.id] ?? 0), item.quantity);
      return acc + qty * Number(item.price);
    }, 0);
    return Math.min(Number(order.total), sum).toFixed(2);
  }

  function handleSelectOrderForNewRefund(order: RefundOrderCandidate) {
    setSelectedOrderId(order.id);
    const qtys: Record<string, number> = {};
    for (const item of order.items) {
      qtys[item.id] = item.quantity;
    }
    setRestockQuantities(qtys);
    setRefundAmountInput(Number(order.total).toFixed(2));
    setIsCustomRefundAmount(false);
    setRestockToInventory(true);
    setCancelOrderOnRefund(true);
  }

  function openNewRefundModal() {
    setOrderSearchQuery("");
    const firstOrder =
      initialOrderCandidates.find(
        (o) => activeStoreId === "ALL" || o.storeId === activeStoreId,
      ) ?? null;
    if (firstOrder) {
      handleSelectOrderForNewRefund(firstOrder);
    } else {
      setSelectedOrderId("");
      setRestockQuantities({});
      setRefundAmountInput("0.00");
    }
    setNewRefundReason("");
    setError(null);
    setIsNewRefundOpen(true);
  }

  function updateCandidateItemQty(itemId: string, maxQty: number, nextQty: number) {
    if (!selectedOrderCandidate) return;
    const clamped = Math.min(Math.max(0, Math.trunc(nextQty) || 0), maxQty);
    setRestockQuantities((prev) => {
      const next = { ...prev, [itemId]: clamped };
      if (!isCustomRefundAmount) {
        setRefundAmountInput(computeSuggestedAmount(selectedOrderCandidate, next));
      }
      const isFull =
        selectedOrderCandidate.items.length > 0 &&
        selectedOrderCandidate.items.every((i) => (next[i.id] ?? 0) >= i.quantity);
      setCancelOrderOnRefund(isFull);
      return next;
    });
  }

  async function handleCreateRefund() {
    if (!selectedOrderCandidate) return;
    setIsSubmittingNewRefund(true);
    setError(null);
    setStatusMessage(null);

    try {
      const maxTotal = Number(selectedOrderCandidate.total);
      const parsedAmount = Math.min(
        Math.max(0, Number.parseFloat(refundAmountInput) || 0),
        maxTotal,
      );
      const restockItems = restockToInventory
        ? selectedOrderCandidate.items
            .map((item) => ({
              itemId: item.id,
              variantId: item.variantId,
              quantity: Math.min(
                Math.max(0, restockQuantities[item.id] ?? 0),
                item.quantity,
              ),
            }))
            .filter((entry) => entry.quantity > 0)
        : [];

      const response = await fetch("/api/refunds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: selectedOrderCandidate.id,
          refundAmount: parsedAmount,
          reason: newRefundReason.trim() || undefined,
          cancelOrder: cancelOrderOnRefund,
          restockItems,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(
          payload.error ||
            (isEs ? "No se pudo registrar el reembolso" : "Could not record refund"),
        );
      }

      setRefunds((current) => [payload as RefundRecord, ...current]);
      setIsNewRefundOpen(false);
      setStatusMessage(
        isEs
          ? `¡Reembolso #REF-${payload.refundNumber} para el pedido #${payload.orderNumber} guardado con éxito!`
          : `Refund #REF-${payload.refundNumber} for Order #${payload.orderNumber} recorded successfully!`,
      );
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : isEs
            ? "Error al registrar el reembolso"
            : "Failed to record refund",
      );
    } finally {
      setIsSubmittingNewRefund(false);
    }
  }

  async function handleSaveReason(refundId: string) {
    setIsUpdatingRefund(true);
    setError(null);
    try {
      const response = await fetch(`/api/refunds/${refundId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: editingReasonValue }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Failed to update refund note");
      }
      setRefunds((current) =>
        current.map((r) => (r.id === refundId ? { ...r, reason: payload.reason } : r)),
      );
      if (selectedRefund?.id === refundId) {
        setSelectedRefund((prev) => (prev ? { ...prev, reason: payload.reason } : null));
      }
      setEditingReasonId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update reason");
    } finally {
      setIsUpdatingRefund(false);
    }
  }

  async function handleDeleteRefund(refund: RefundRecord) {
    const confirmed = window.confirm(
      isEs
        ? `¿Eliminar el registro de reembolso #REF-${refund.refundNumber} del historial?`
        : `Delete refund record #REF-${refund.refundNumber} from history?`,
    );
    if (!confirmed) return;

    setIsUpdatingRefund(true);
    setError(null);
    try {
      const response = await fetch(`/api/refunds/${refund.id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || "Could not delete refund record");
      }
      setRefunds((current) => current.filter((r) => r.id !== refund.id));
      if (selectedRefund?.id === refund.id) {
        setSelectedRefund(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete refund record");
    } finally {
      setIsUpdatingRefund(false);
    }
  }

  return (
    <section className="space-y-6">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {isEs ? "Reembolsos" : "Refunds"}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {isEs
              ? "Lleva el control de todos los reembolsos totales y parciales y las unidades reingresadas al stock."
              : "Track all full and partial order refunds, refunded amounts, and units returned to inventory."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {initialStores.length > 1 ? (
            <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-xs">
              <Store className="h-3.5 w-3.5 text-slate-400" />
              <select
                value={activeStoreId}
                onChange={(e) => setActiveStoreId(e.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-800 outline-none"
              >
                <option value="ALL">
                  {isEs ? "Todas las tiendas" : "All Stores"}
                </option>
                {initialStores.map((store) => (
                  <option key={store.id} value={store.id}>
                    {store.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <button
            type="button"
            onClick={openNewRefundModal}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-slate-800"
          >
            <Plus className="h-4 w-4" />
            {isEs ? "Nuevo reembolso" : "New Refund"}
          </button>
        </div>
      </header>

      {setupError ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {setupError}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {statusMessage ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {statusMessage}
        </div>
      ) : null}

      {/* KPI Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              {isEs ? "Total de reembolsos" : "Total Refunds"}
            </span>
            <div className="rounded-lg bg-slate-100 p-2 text-slate-600">
              <RotateCcw className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {summaryStats.totalCount}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {isEs
              ? `${summaryStats.fullCount} totales • ${summaryStats.partialCount} parciales`
              : `${summaryStats.fullCount} full • ${summaryStats.partialCount} partial`}
          </p>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              {isEs ? "Monto total reembolsado" : "Total Amount Refunded"}
            </span>
            <div className="rounded-lg bg-slate-100 p-2 text-slate-600">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {formatMoney(summaryStats.totalAmount, defaultCurrency)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {isEs
              ? "Suma acumulada de dinero devuelto"
              : "Cumulative money returned to customers"}
          </p>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              {isEs ? "Unidades reingresadas" : "Units Restocked"}
            </span>
            <div className="rounded-lg bg-slate-100 p-2 text-slate-600">
              <Package className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {summaryStats.totalRestockedUnits}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {isEs
              ? "Unidades devueltas al inventario disponible"
              : "Units returned to available variant inventory"}
          </p>
        </article>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              isEs
                ? "Buscar por # de reembolso, # de pedido, cliente, artículo o motivo..."
                : "Search by refund #, order #, customer, item, or reason..."
            }
            className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-sm text-slate-900 outline-none focus:border-purple-500"
          />
        </div>

        <div className="inline-flex items-center rounded-xl border border-slate-200 bg-slate-50 p-1">
          {(
            [
              { id: "ALL", label: isEs ? "Todos" : "All" },
              { id: "FULL", label: isEs ? "Totales" : "Full" },
              { id: "PARTIAL", label: isEs ? "Parciales" : "Partial" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setTypeFilter(tab.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                typeFilter === tab.id
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Refunds Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
        {visibleRefunds.length === 0 ? (
          <div className="p-12 text-center">
            <RotateCcw className="mx-auto h-10 w-10 text-slate-300" />
            <h3 className="mt-3 text-sm font-semibold text-slate-900">
              {isEs ? "No hay reembolsos registrados" : "No refunds recorded yet"}
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              {isEs
                ? "Los reembolsos que proceses desde un pedido o con el botón «Nuevo reembolso» aparecerán aquí."
                : "Refunds processed from an order detail page or via the 'New Refund' button will appear here."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">{isEs ? "Fecha" : "Date"}</th>
                  <th className="px-4 py-3">{isEs ? "Reembolso" : "Refund"}</th>
                  <th className="px-4 py-3">{isEs ? "Pedido" : "Order"}</th>
                  <th className="px-4 py-3">{isEs ? "Tipo" : "Type"}</th>
                  <th className="px-4 py-3">{isEs ? "Motivo / Notas" : "Reason / Notes"}</th>
                  <th className="px-4 py-3 text-right">{isEs ? "Monto" : "Amount"}</th>
                  <th className="px-4 py-3 text-right">{isEs ? "Acciones" : "Actions"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleRefunds.map((refund) => (
                  <tr key={refund.id} className="hover:bg-slate-50/80 transition">
                    <td className="px-4 py-3.5 whitespace-nowrap text-slate-600">
                      {(() => {
                        const d = new Date(refund.createdAt);
                        const mm = String(d.getMonth() + 1).padStart(2, "0");
                        const dd = String(d.getDate()).padStart(2, "0");
                        const yyyy = d.getFullYear();
                        return `${mm}/${dd}/${yyyy}`;
                      })()}
                    </td>

                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="font-bold text-slate-900">
                        #REF-{refund.refundNumber}
                      </div>
                    </td>

                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <Link
                        href={`/dashboard/orders/${refund.orderId}`}
                        className="inline-flex items-center gap-1 font-semibold text-cyan-700 hover:text-cyan-800 hover:underline"
                      >
                        #{refund.orderNumber}
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </td>

                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold ${
                          refund.type === "PARTIAL"
                            ? "border-amber-200 bg-amber-50 text-amber-700"
                            : "border-purple-200 bg-purple-50 text-purple-700"
                        }`}
                      >
                        {refund.type === "PARTIAL"
                          ? isEs
                            ? "Parcial"
                            : "Partial"
                          : isEs
                            ? "Total"
                            : "Full"}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 max-w-[220px]">
                      {editingReasonId === refund.id ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={editingReasonValue}
                            onChange={(e) => setEditingReasonValue(e.target.value)}
                            placeholder={isEs ? "Motivo..." : "Reason..."}
                            className="w-full rounded-lg border border-slate-300 px-2 py-1 text-xs text-slate-900 outline-none focus:border-purple-500"
                          />
                          <button
                            type="button"
                            disabled={isUpdatingRefund}
                            onClick={() => void handleSaveReason(refund.id)}
                            className="rounded-lg bg-slate-900 px-2 py-1 text-xs font-semibold text-white hover:bg-slate-800"
                          >
                            {isEs ? "OK" : "Save"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingReasonId(null)}
                            className="rounded-lg border border-slate-200 px-1.5 py-1 text-xs text-slate-500 hover:bg-slate-100"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 group">
                          <span className="truncate text-xs text-slate-600">
                            {refund.reason || (
                              <span className="italic text-slate-400">
                                {isEs ? "Sin motivo especificado" : "No reason specified"}
                              </span>
                            )}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingReasonId(refund.id);
                              setEditingReasonValue(refund.reason ?? "");
                            }}
                            title={isEs ? "Editar motivo" : "Edit reason"}
                            className="opacity-0 group-hover:opacity-100 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                    </td>

                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                      <div className="font-bold text-slate-900">
                        {formatMoney(refund.amount, refund.currency)}
                      </div>
                      {refund.type === "PARTIAL" ? (
                        <div className="text-xs text-slate-500">
                          {isEs ? "de" : "of"}{" "}
                          {formatMoney(refund.orderTotal, refund.currency)}
                        </div>
                      ) : null}
                    </td>

                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setSelectedRefund(refund)}
                          title={isEs ? "Ver detalles" : "View details"}
                          className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDeleteRefund(refund)}
                          disabled={isUpdatingRefund}
                          title={isEs ? "Eliminar registro" : "Delete record"}
                          className="rounded-lg border border-slate-200 bg-white p-1.5 text-rose-600 hover:bg-rose-50 disabled:opacity-40"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Refund Detail Modal */}
      {selectedRefund ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-xs"
          onClick={() => setSelectedRefund(null)}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-purple-700">
                  {selectedRefund.type === "PARTIAL"
                    ? isEs
                      ? "Reembolso parcial"
                      : "Partial Refund"
                    : isEs
                      ? "Reembolso total"
                      : "Full Refund"}
                </span>
                <h3 className="text-lg font-bold text-slate-950">
                  #REF-{selectedRefund.refundNumber} •{" "}
                  {isEs ? `Pedido #${selectedRefund.orderNumber}` : `Order #${selectedRefund.orderNumber}`}
                </h3>
                <p className="text-xs text-slate-500">
                  {new Date(selectedRefund.createdAt).toLocaleString(
                    isEs ? "es-ES" : "en-US",
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRefund(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div>
                  <span className="text-xs text-slate-500">
                    {isEs ? "Monto reembolsado" : "Refunded Amount"}
                  </span>
                  <p className="text-base font-bold text-slate-950">
                    {formatMoney(selectedRefund.amount, selectedRefund.currency)}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-slate-500">
                    {isEs ? "Total original del pedido" : "Original Order Total"}
                  </span>
                  <p className="text-base font-semibold text-slate-700">
                    {formatMoney(selectedRefund.orderTotal, selectedRefund.currency)}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-slate-500">
                    {isEs ? "Cliente" : "Customer"}
                  </span>
                  <p className="font-semibold text-slate-900">
                    {selectedRefund.customerName || selectedRefund.customerEmail}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-slate-500">
                    {isEs ? "Unidades reingresadas" : "Units Restocked"}
                  </span>
                  <p className="font-semibold text-slate-900">
                    {selectedRefund.restockedUnits}
                  </p>
                </div>
              </div>

              {selectedRefund.items.length > 0 ? (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                    {isEs ? "Artículos reingresados al stock" : "Items Restocked to Inventory"}
                  </h4>
                  <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                    {selectedRefund.items.map((item, idx) => (
                      <div
                        key={`${item.itemId ?? idx}`}
                        className="flex items-center justify-between px-4 py-2.5 text-xs"
                      >
                        <span className="font-semibold text-slate-900">{item.title}</span>
                        <span className="text-slate-600">
                          {item.quantity} × {formatMoney(item.price, selectedRefund.currency)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  {isEs ? "Motivo / Notas" : "Reason / Notes"}
                </h4>
                <p className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-700">
                  {selectedRefund.reason ||
                    (isEs ? "Sin motivo especificado." : "No reason specified.")}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/60 px-6 py-4">
              <Link
                href={`/dashboard/orders/${selectedRefund.orderId}`}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-cyan-700 hover:text-cyan-800"
              >
                {isEs ? "Abrir pedido" : "View Order"} #{selectedRefund.orderNumber}
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
              <button
                type="button"
                onClick={() => setSelectedRefund(null)}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                {isEs ? "Cerrar" : "Close"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Create New Refund Modal */}
      {isNewRefundOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-xs"
          onClick={() => {
            if (!isSubmittingNewRefund) setIsNewRefundOpen(false);
          }}
        >
          <div
            className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-purple-700">
                  <RotateCcw className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-950">
                    {isEs ? "Registrar Reembolso y Retorno al Stock" : "Record Refund & Restock Inventory"}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {isEs
                      ? "Selecciona un pedido y define las cantidades o el monto parcial/total a reembolsar."
                      : "Select an order and choose the item quantities or partial/full money amount to refund."}
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={isSubmittingNewRefund}
                onClick={() => setIsNewRefundOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto px-6 py-5 space-y-5">
              {/* Order Picker */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  {isEs ? "Seleccionar pedido" : "Select Order"}
                </label>
                <input
                  type="text"
                  value={orderSearchQuery}
                  onChange={(e) => setOrderSearchQuery(e.target.value)}
                  placeholder={
                    isEs
                      ? "Filtrar pedido por # o cliente..."
                      : "Filter order by # or customer..."
                  }
                  className="mb-2 w-full rounded-xl border border-slate-200 px-3 py-1.5 text-xs text-slate-900 outline-none focus:border-purple-500"
                />
                <select
                  value={selectedOrderId}
                  onChange={(e) => {
                    const found = initialOrderCandidates.find(
                      (o) => o.id === e.target.value,
                    );
                    if (found) handleSelectOrderForNewRefund(found);
                  }}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-900 outline-none focus:border-purple-500"
                >
                  {filteredOrderCandidates.length === 0 ? (
                    <option value="">
                      {isEs ? "No se encontraron pedidos" : "No orders found"}
                    </option>
                  ) : (
                    filteredOrderCandidates.map((o) => (
                      <option key={o.id} value={o.id}>
                        #{o.orderNumber} — {o.customerName || o.customerEmail} (
                        {formatMoney(o.total, o.currency)})
                      </option>
                    ))
                  )}
                </select>
              </div>

              {selectedOrderCandidate ? (
                <>
                  {/* Per-item quantities */}
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                        {isEs
                          ? "Cantidades por artículo a reingresar"
                          : "Item quantities to restock"}
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleSelectOrderForNewRefund(selectedOrderCandidate)}
                          className="rounded-lg border border-purple-200 bg-purple-50 px-2.5 py-1 text-xs font-semibold text-purple-700 hover:bg-purple-100"
                        >
                          {isEs ? "Todo el pedido" : "Full order"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const zeros: Record<string, number> = {};
                            for (const item of selectedOrderCandidate.items) {
                              zeros[item.id] = 0;
                            }
                            setRestockQuantities(zeros);
                            if (!isCustomRefundAmount) setRefundAmountInput("0.00");
                            setCancelOrderOnRefund(false);
                          }}
                          className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                        >
                          {isEs ? "Poner en 0" : "Clear (0)"}
                        </button>
                      </div>
                    </div>

                    <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-slate-50/50">
                      {selectedOrderCandidate.items.map((item) => {
                        const qty = restockQuantities[item.id] ?? 0;
                        return (
                          <div
                            key={item.id}
                            className="flex items-center justify-between gap-3 px-4 py-2.5"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-slate-900">
                                {item.title}
                              </p>
                              <p className="text-xs text-slate-500">
                                {formatMoney(item.price, selectedOrderCandidate.currency)} ×{" "}
                                {item.quantity}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="inline-flex items-center rounded-lg border border-slate-200 bg-white">
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateCandidateItemQty(item.id, item.quantity, qty - 1)
                                  }
                                  disabled={qty <= 0}
                                  className="px-2.5 py-1 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                                >
                                  −
                                </button>
                                <input
                                  type="number"
                                  min={0}
                                  max={item.quantity}
                                  value={qty}
                                  onChange={(e) =>
                                    updateCandidateItemQty(
                                      item.id,
                                      item.quantity,
                                      Number.parseInt(e.target.value, 10) || 0,
                                    )
                                  }
                                  className="w-12 border-x border-slate-200 py-1 text-center text-sm font-semibold text-slate-900 outline-none"
                                />
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateCandidateItemQty(item.id, item.quantity, qty + 1)
                                  }
                                  disabled={qty >= item.quantity}
                                  className="px-2.5 py-1 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                                >
                                  +
                                </button>
                              </div>
                              <span className="w-10 text-right text-xs text-slate-500">
                                / {item.quantity}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Refund Amount */}
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="flex items-center justify-between gap-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                        {isEs ? "Monto de dinero a reembolsar" : "Money amount to refund"}
                      </label>
                      {(() => {
                        const val = Number.parseFloat(refundAmountInput) || 0;
                        const isPartial =
                          val < Number(selectedOrderCandidate.total) - 0.009;
                        return (
                          <span
                            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold ${
                              isPartial
                                ? "border-amber-200 bg-amber-50 text-amber-700"
                                : "border-purple-200 bg-purple-50 text-purple-700"
                            }`}
                          >
                            {isPartial
                              ? isEs
                                ? "Reembolso parcial"
                                : "Partial refund"
                              : isEs
                                ? "Reembolso total"
                                : "Full refund"}
                          </span>
                        );
                      })()}
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <div className="relative flex-1 min-w-[160px]">
                        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm font-semibold text-slate-500">
                          {selectedOrderCandidate.currency || "USD"}
                        </span>
                        <input
                          type="number"
                          min="0"
                          max={Number(selectedOrderCandidate.total)}
                          step="0.01"
                          value={refundAmountInput}
                          onChange={(e) => {
                            setIsCustomRefundAmount(true);
                            setRefundAmountInput(e.target.value);
                          }}
                          className="w-full rounded-xl border border-slate-300 py-2 pl-14 pr-3 text-sm font-bold text-slate-900 outline-none focus:border-purple-500"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setIsCustomRefundAmount(false);
                          setRefundAmountInput(
                            computeSuggestedAmount(
                              selectedOrderCandidate,
                              restockQuantities,
                            ),
                          );
                        }}
                        className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                      >
                        {isEs ? "Según unidades" : "Match units"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsCustomRefundAmount(true);
                          setRefundAmountInput(
                            Number(selectedOrderCandidate.total).toFixed(2),
                          );
                        }}
                        className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                      >
                        {isEs ? "Total" : "Full"} (
                        {formatMoney(
                          selectedOrderCandidate.total,
                          selectedOrderCandidate.currency,
                        )}
                        )
                      </button>
                    </div>
                  </div>

                  {/* Checkboxes */}
                  <div className="space-y-2.5 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={restockToInventory}
                        onChange={(e) => setRestockToInventory(e.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                      />
                      <span className="text-sm font-semibold text-slate-900">
                        {isEs
                          ? "Reingresar las cantidades seleccionadas al inventario"
                          : "Restock selected quantities back into inventory"}
                      </span>
                    </label>

                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={cancelOrderOnRefund}
                        onChange={(e) => setCancelOrderOnRefund(e.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                      />
                      <span className="text-sm font-semibold text-slate-900">
                        {isEs
                          ? "Marcar estado del pedido como Cancelado"
                          : "Mark order status as Cancelled"}
                      </span>
                    </label>
                  </div>

                  {/* Reason */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                      {isEs
                        ? "Motivo o notas del reembolso (opcional)"
                        : "Refund reason or notes (optional)"}
                    </label>
                    <input
                      type="text"
                      value={newRefundReason}
                      onChange={(e) => setNewRefundReason(e.target.value)}
                      placeholder={
                        isEs
                          ? "Ej. Devolución del cliente, artículo defectuoso..."
                          : "e.g. Customer return, defective item..."
                      }
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-purple-500"
                    />
                  </div>
                </>
              ) : null}
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50/60 px-6 py-4">
              <button
                type="button"
                disabled={isSubmittingNewRefund}
                onClick={() => setIsNewRefundOpen(false)}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                {isEs ? "Cancelar" : "Cancel"}
              </button>
              <button
                type="button"
                disabled={isSubmittingNewRefund || !selectedOrderCandidate}
                onClick={() => void handleCreateRefund()}
                className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-purple-700 disabled:opacity-50"
              >
                {isSubmittingNewRefund ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RotateCcw className="h-3.5 w-3.5" />
                )}
                {isEs ? "Confirmar reembolso" : "Confirm Refund"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
