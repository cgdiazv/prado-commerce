"use client";

import React, { useState, useMemo } from "react";
import {
  Boxes,
  Plus,
  Search,
  Filter,
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Ban,
  Receipt,
  Eye,
  Calendar,
  DollarSign,
  User,
  Trash2,
  Printer,
  X,
  FileText,
  AlertCircle,
  TrendingUp,
  Store,
  ChevronDown,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";

export interface ConsignmentItemData {
  id: string;
  productTitle: string;
  sku: string | null;
  variantId: string | null;
  initialQuantity: number;
  soldQuantity: number;
  returnedQuantity: number;
  agreedCost: string | number;
  suggestedPrice: string | number | null;
}

export interface ConsignmentSettlementData {
  id: string;
  settlementNumber: number;
  date: string;
  totalUnitsSold: number;
  totalAmount: string | number;
  paymentMethod: string;
  reference: string | null;
  notes: string | null;
  settledBy: string | null;
}

export interface ConsignmentData {
  id: string;
  storeId: string;
  type: "RECEIVED" | "GIVEN";
  consignmentNumber: number;
  code: string;
  contactName: string;
  contactEmail: string | null;
  contactPhone: string | null;
  status: "ACTIVE" | "SETTLED" | "CANCELLED";
  startDate: string;
  endDate: string | null;
  notes: string | null;
  totalAgreedAmount: string | number;
  totalSettledAmount: string | number;
  currency: string;
  items: ConsignmentItemData[];
  settlements: ConsignmentSettlementData[];
  store?: {
    id: string;
    name: string;
    currency: string;
  };
}

interface ConsignmentsClientProps {
  initialConsignments: ConsignmentData[];
  stores: Array<{ id: string; name: string; currency: string }>;
  products?: Array<{ id: string; title: string; sku?: string; variants?: Array<{ id: string; title: string; sku?: string; price: number; cost?: number }> }>;
}

export function ConsignmentsClient({
  initialConsignments,
  stores,
  products = [],
}: ConsignmentsClientProps) {
  const { language } = useLanguage();
  const isEs = language === "es";

  const [consignments, setConsignments] = useState<ConsignmentData[]>(initialConsignments);
  const [selectedStoreId, setSelectedStoreId] = useState<string>("ALL");
  const [activeTab, setActiveTab] = useState<"ALL" | "RECEIVED" | "GIVEN">("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState("");

  // Modals state
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [selectedConsignment, setSelectedConsignment] = useState<ConsignmentData | null>(null);
  const [settleConsignment, setSettleConsignment] = useState<ConsignmentData | null>(null);
  const [receiptSettlement, setReceiptSettlement] = useState<{
    consignment: ConsignmentData;
    settlement: ConsignmentSettlementData;
  } | null>(null);

  // New Consignment Form State
  const [newStoreId, setNewStoreId] = useState<string>(stores[0]?.id || "");
  const [newType, setNewType] = useState<"RECEIVED" | "GIVEN">("RECEIVED");
  const [newContactName, setNewContactName] = useState("");
  const [newContactEmail, setNewContactEmail] = useState("");
  const [newContactPhone, setNewContactPhone] = useState("");
  const [newStartDate, setNewStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [newEndDate, setNewEndDate] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [newItems, setNewItems] = useState<
    Array<{
      productTitle: string;
      sku: string;
      variantId?: string;
      initialQuantity: number;
      agreedCost: number;
      suggestedPrice?: number;
    }>
  >([
    { productTitle: "", sku: "", initialQuantity: 1, agreedCost: 0, suggestedPrice: 0 },
  ]);
  const [isSubmittingNew, setIsSubmittingNew] = useState(false);
  const [formError, setFormError] = useState("");

  // Settlement Form State
  const [settlementQuantities, setSettlementQuantities] = useState<
    Record<string, { unitsSold: number; unitsReturned: number }>
  >({});
  const [settlePaymentMethod, setSettlePaymentMethod] = useState("TRANSFERENCIA");
  const [settleReference, setSettleReference] = useState("");
  const [settleNotes, setSettleNotes] = useState("");
  const [isSubmittingSettle, setIsSubmittingSettle] = useState(false);
  const [settleError, setSettleError] = useState("");

  const activeCurrency = stores.find((s) => s.id === selectedStoreId)?.currency || stores[0]?.currency || "USD";

  const formatCurrency = (amount: number | string, curr = activeCurrency) => {
    const num = Number.parseFloat(String(amount)) || 0;
    return new Intl.NumberFormat(isEs ? "es-HN" : "en-US", {
      style: "currency",
      currency: curr,
      minimumFractionDigits: 2,
    }).format(num);
  };

  // Filtered consignments
  const filteredConsignments = useMemo(() => {
    return consignments.filter((c) => {
      if (selectedStoreId && selectedStoreId !== "ALL" && c.storeId !== selectedStoreId) return false;
      if (activeTab !== "ALL" && c.type !== activeTab) return false;
      if (statusFilter !== "ALL" && c.status !== statusFilter) return false;
      if (searchTerm) {
        const query = searchTerm.toLowerCase();
        const matchesCode = c.code.toLowerCase().includes(query);
        const matchesContact = c.contactName.toLowerCase().includes(query);
        const matchesPhone = c.contactPhone?.toLowerCase().includes(query);
        const matchesEmail = c.contactEmail?.toLowerCase().includes(query);
        const matchesItems = c.items.some((i) => i.productTitle.toLowerCase().includes(query) || i.sku?.toLowerCase().includes(query));
        if (!matchesCode && !matchesContact && !matchesPhone && !matchesEmail && !matchesItems) {
          return false;
        }
      }
      return true;
    });
  }, [consignments, selectedStoreId, activeTab, statusFilter, searchTerm]);

  // Overall KPI metrics
  const metrics = useMemo(() => {
    let totalAgreed = 0;
    let totalSettled = 0;
    let activeCount = 0;
    let settledCount = 0;

    for (const c of filteredConsignments) {
      if (c.status === "ACTIVE") activeCount++;
      if (c.status === "SETTLED") settledCount++;
      totalAgreed += Number.parseFloat(String(c.totalAgreedAmount)) || 0;
      totalSettled += Number.parseFloat(String(c.totalSettledAmount)) || 0;
    }

    const pendingBalance = Math.max(0, totalAgreed - totalSettled);

    return {
      activeCount,
      settledCount,
      totalAgreed,
      totalSettled,
      pendingBalance,
    };
  }, [filteredConsignments]);

  // Handle open settlement modal
  const openSettlementModal = (consignment: ConsignmentData) => {
    const initialMap: Record<string, { unitsSold: number; unitsReturned: number }> = {};
    for (const item of consignment.items) {
      initialMap[item.id] = { unitsSold: 0, unitsReturned: 0 };
    }
    setSettlementQuantities(initialMap);
    setSettlePaymentMethod("TRANSFERENCIA");
    setSettleReference("");
    setSettleNotes("");
    setSettleError("");
    setSettleConsignment(consignment);
  };

  // Compute live settlement amount in modal
  const currentSettlementTotal = useMemo(() => {
    if (!settleConsignment) return 0;
    let sum = 0;
    for (const item of settleConsignment.items) {
      const q = settlementQuantities[item.id];
      if (q && q.unitsSold > 0) {
        const cost = Number.parseFloat(String(item.agreedCost)) || 0;
        sum += q.unitsSold * cost;
      }
    }
    return sum;
  }, [settleConsignment, settlementQuantities]);

  // Submit Settlement
  const handleSubmitSettlement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settleConsignment) return;

    const itemsToSubmit = Object.entries(settlementQuantities)
      .filter(([_, q]) => q.unitsSold > 0 || q.unitsReturned > 0)
      .map(([itemId, q]) => ({
        itemId,
        unitsSold: q.unitsSold,
        unitsReturned: q.unitsReturned,
      }));

    if (itemsToSubmit.length === 0) {
      setSettleError(isEs ? "Debe registrar al menos 1 unidad vendida o devuelta." : "Must record at least 1 unit sold or returned.");
      return;
    }

    setIsSubmittingSettle(true);
    setSettleError("");

    try {
      const res = await fetch(`/api/consignments/${settleConsignment.id}/settle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          settledItems: itemsToSubmit,
          paymentMethod: settlePaymentMethod,
          reference: settleReference,
          notes: settleNotes,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to process settlement");
      }

      const { settlement, consignment: updatedConsignment } = await res.json();

      setConsignments((prev) =>
        prev.map((c) => (c.id === updatedConsignment.id ? { ...updatedConsignment, store: c.store } : c))
      );

      setSettleConsignment(null);

      // Open receipt dialog
      setReceiptSettlement({
        consignment: { ...updatedConsignment, store: settleConsignment.store },
        settlement,
      });
    } catch (err: any) {
      setSettleError(err.message || "Error al procesar la liquidación");
    } finally {
      setIsSubmittingSettle(false);
    }
  };

  // Submit New Consignment
  const handleSubmitNewConsignment = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!newContactName.trim()) {
      setFormError(isEs ? "Ingrese el nombre del contacto o tercero." : "Contact name is required.");
      return;
    }

    const validItems = newItems.filter((i) => i.productTitle.trim() && i.initialQuantity > 0);
    if (validItems.length === 0) {
      setFormError(isEs ? "Agregue al menos un producto con título y cantidad mayor a cero." : "Add at least one product with title and quantity > 0.");
      return;
    }

    setIsSubmittingNew(true);

    try {
      const res = await fetch("/api/consignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId: newStoreId,
          type: newType,
          contactName: newContactName,
          contactEmail: newContactEmail || undefined,
          contactPhone: newContactPhone || undefined,
          startDate: newStartDate,
          endDate: newEndDate || undefined,
          notes: newNotes || undefined,
          items: validItems,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create consignment");
      }

      const { consignment } = await res.json();
      const storeObj = stores.find((s) => s.id === newStoreId);
      const withStore = { ...consignment, store: storeObj };

      setConsignments((prev) => [withStore, ...prev]);
      setIsNewModalOpen(false);

      // Reset form
      setNewContactName("");
      setNewContactEmail("");
      setNewContactPhone("");
      setNewNotes("");
      setNewEndDate("");
      setNewItems([{ productTitle: "", sku: "", initialQuantity: 1, agreedCost: 0, suggestedPrice: 0 }]);
    } catch (err: any) {
      setFormError(err.message || "Error al crear la consignación");
    } finally {
      setIsSubmittingNew(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {isEs ? "Consignaciones" : "Consignments"}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {isEs
              ? "Control formal de inventario recibido de proveedores y entregado a terceros con liquidaciones periódicas."
              : "Formal consignment management for goods received from vendors or placed with third parties."}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {stores.length > 1 && (
            <div className="relative shrink-0">
              <Store className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <select
                value={selectedStoreId}
                onChange={(e) => setSelectedStoreId(e.target.value)}
                className="appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-9 text-sm font-medium text-slate-700 shadow-sm focus:border-violet-500 focus:outline-none cursor-pointer hover:bg-slate-50 transition"
              >
                <option value="ALL">{isEs ? "Todas las tiendas" : "All Stores"}</option>
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>
          )}

          <button
            onClick={() => {
              setNewStoreId(selectedStoreId !== "ALL" ? selectedStoreId : stores[0]?.id || "");
              setIsNewModalOpen(true);
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 active:scale-[0.98] transition-all"
          >
            <Plus className="h-4 w-4" />
            {isEs ? "Nueva Consignación" : "New Consignment"}
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Activas */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">
              {isEs ? "Consignaciones Activas" : "Active Consignments"}
            </span>
            <Clock className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">{metrics.activeCount}</div>
          <p className="mt-1 text-xs text-slate-500">
            {metrics.settledCount} {isEs ? "liquidadas en total" : "settled in total"}
          </p>
        </div>

        {/* Card 2: Monto Total Pactado */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">
              {isEs ? "Valor Total Pactado" : "Total Consignment Value"}
            </span>
            <Boxes className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">
            {formatCurrency(metrics.totalAgreed)}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {isEs ? "Mercadería bajo contrato" : "Merchandise under contract"}
          </p>
        </div>

        {/* Card 3: Monto Liquidado */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">
              {isEs ? "Total Liquidado / Pagado" : "Total Settled / Paid"}
            </span>
            <CheckCircle2 className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">
            {formatCurrency(metrics.totalSettled)}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {isEs ? "Ventas liquidadas y registradas" : "Units sold and settled"}
          </p>
        </div>

        {/* Card 4: Saldo Pendiente */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">
              {isEs ? "Saldo Pendiente" : "Pending Balance"}
            </span>
            <DollarSign className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">
            {formatCurrency(metrics.pendingBalance)}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {isEs ? "Por liquidar o devolver" : "To be settled or returned"}
          </p>
        </div>
      </div>

      {/* Tabs & Filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        {/* Type tabs */}
        <div className="inline-flex rounded-xl bg-slate-100 p-1">
          <button
            onClick={() => setActiveTab("ALL")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              activeTab === "ALL"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {isEs ? "Todas" : "All"}
          </button>
          <button
            onClick={() => setActiveTab("RECEIVED")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              activeTab === "RECEIVED"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <ArrowDownLeft className="h-3.5 w-3.5 text-slate-500" />
            {isEs ? "Recibidas (de Proveedor)" : "Received (from Vendor)"}
          </button>
          <button
            onClick={() => setActiveTab("GIVEN")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              activeTab === "GIVEN"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <ArrowUpRight className="h-3.5 w-3.5 text-slate-500" />
            {isEs ? "Entregadas (a Tercero)" : "Given (to Third Party)"}
          </button>
        </div>

        {/* Search & Status filter */}
        <div className="flex flex-1 items-center gap-3 md:justify-end">
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={isEs ? "Buscar código, contacto, producto..." : "Search code, contact, product..."}
              className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs text-slate-800 placeholder-slate-400 shadow-xs focus:border-slate-400 focus:outline-none"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-xs focus:border-slate-400 focus:outline-none"
          >
            <option value="ALL">{isEs ? "Todos los estados" : "All statuses"}</option>
            <option value="ACTIVE">{isEs ? "Activas" : "Active"}</option>
            <option value="SETTLED">{isEs ? "Liquidadas" : "Settled"}</option>
            <option value="CANCELLED">{isEs ? "Canceladas" : "Cancelled"}</option>
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {filteredConsignments.length === 0 ? (
          <div className="py-16 text-center">
            <Boxes className="mx-auto h-12 w-12 text-slate-300" />
            <h3 className="mt-3 text-sm font-semibold text-slate-800">
              {isEs ? "No se encontraron consignaciones" : "No consignments found"}
            </h3>
            <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
              {isEs
                ? "Registra productos recibidos de proveedores o entregados a tiendas aliadas haciendo clic en 'Nueva Consignación'."
                : "Record goods received from vendors or sent to partner retailers by clicking 'New Consignment'."}
            </p>
            <button
              onClick={() => setIsNewModalOpen(true)}
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-slate-800"
            >
              <Plus className="h-4 w-4" />
              {isEs ? "Crear primera consignación" : "Create first consignment"}
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3.5">{isEs ? "Código / Tipo" : "Code / Type"}</th>
                  <th className="px-5 py-3.5">{isEs ? "Contacto / Tercero" : "Contact / Party"}</th>
                  <th className="px-5 py-3.5">{isEs ? "Unidades" : "Units"}</th>
                  <th className="px-5 py-3.5">{isEs ? "Monto Pactado" : "Agreed Amount"}</th>
                  <th className="px-5 py-3.5">{isEs ? "Liquidado" : "Settled"}</th>
                  <th className="px-5 py-3.5">{isEs ? "Estado" : "Status"}</th>
                  <th className="px-5 py-3.5 text-right">{isEs ? "Acciones" : "Actions"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredConsignments.map((consignment) => {
                  const totalInitialUnits = consignment.items.reduce((s, i) => s + i.initialQuantity, 0);
                  const totalSoldUnits = consignment.items.reduce((s, i) => s + i.soldQuantity, 0);
                  const totalReturnedUnits = consignment.items.reduce((s, i) => s + i.returnedQuantity, 0);
                  const remainingUnits = Math.max(0, totalInitialUnits - (totalSoldUnits + totalReturnedUnits));

                  const agreedNum = Number.parseFloat(String(consignment.totalAgreedAmount)) || 0;
                  const settledNum = Number.parseFloat(String(consignment.totalSettledAmount)) || 0;
                  const progress = agreedNum > 0 ? Math.min(100, Math.round((settledNum / agreedNum) * 100)) : 0;

                  return (
                    <tr key={consignment.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Code / Type */}
                      <td className="px-5 py-4">
                        <div className="font-semibold text-slate-900">{consignment.code}</div>
                        <div className="mt-1">
                          {consignment.type === "RECEIVED" ? (
                            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                              <ArrowDownLeft className="h-3 w-3" />
                              {isEs ? "Recibida (Proveedor)" : "Received (Vendor)"}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">
                              <ArrowUpRight className="h-3 w-3" />
                              {isEs ? "Entregada (Tercero)" : "Given (Third Party)"}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="px-5 py-4">
                        <div className="font-medium text-slate-900">{consignment.contactName}</div>
                        <div className="mt-0.5 text-xs text-slate-500">
                          {consignment.contactPhone || consignment.contactEmail || "-"}
                        </div>
                      </td>

                      {/* Units */}
                      <td className="px-5 py-4">
                        <div className="text-xs font-semibold text-slate-900">
                          {remainingUnits} {isEs ? "disponibles" : "remaining"}
                        </div>
                        <div className="mt-0.5 text-[11px] text-slate-500">
                          {totalSoldUnits} {isEs ? "vendidas" : "sold"} · {totalInitialUnits} {isEs ? "iniciales" : "initial"}
                        </div>
                      </td>

                      {/* Agreed Amount */}
                      <td className="px-5 py-4 font-semibold text-slate-900">
                        {formatCurrency(consignment.totalAgreedAmount, consignment.currency)}
                      </td>

                      {/* Settled */}
                      <td className="px-5 py-4">
                        <div className="text-xs font-bold text-slate-900">
                          {formatCurrency(consignment.totalSettledAmount, consignment.currency)}
                        </div>
                        <div className="mt-1.5 flex items-center gap-2">
                          <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full bg-slate-900 rounded-full"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-medium text-slate-500">{progress}%</span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4">
                        {consignment.status === "ACTIVE" && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            {isEs ? "Activa" : "Active"}
                          </span>
                        )}
                        {consignment.status === "SETTLED" && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 border border-slate-200">
                            <CheckCircle2 className="h-3.5 w-3.5 text-slate-500" />
                            {isEs ? "Liquidada" : "Settled"}
                          </span>
                        )}
                        {consignment.status === "CANCELLED" && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 border border-red-200">
                            <Ban className="h-3.5 w-3.5 text-red-500" />
                            {isEs ? "Cancelada" : "Cancelled"}
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => setSelectedConsignment(consignment)}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                            title={isEs ? "Ver detalle de productos y liquidaciones" : "View details"}
                          >
                            <Eye className="h-3.5 w-3.5 text-slate-500" />
                            {isEs ? "Detalle" : "View"}
                          </button>

                          {consignment.status === "ACTIVE" && remainingUnits > 0 && (
                            <button
                              onClick={() => openSettlementModal(consignment)}
                              className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-slate-800 active:scale-[0.98] transition-all"
                            >
                              <Receipt className="h-3.5 w-3.5" />
                              {isEs ? "Liquidar" : "Settle"}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: NUEVA CONSIGNACIÓN */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                  <Boxes className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {isEs ? "Nueva Consignación de Productos" : "New Product Consignment"}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {isEs ? "Registra los bienes recibidos o entregados formalmente" : "Record merchandise received or delivered under consignment"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsNewModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {formError && (
              <div className="mt-4 flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs text-red-700 border border-red-200">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmitNewConsignment} className="mt-4 space-y-4">
              {/* Type & Store */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    {isEs ? "Tipo de Flujo" : "Consignment Flow"}
                  </label>
                  <div className="mt-1 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setNewType("RECEIVED")}
                      className={`flex items-center justify-center gap-1.5 rounded-xl border p-2.5 text-xs font-semibold transition-all ${
                        newType === "RECEIVED"
                          ? "border-emerald-500 bg-emerald-50/60 text-emerald-800 shadow-sm"
                          : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      <ArrowDownLeft className="h-4 w-4 text-emerald-600" />
                      {isEs ? "Recibida (de Proveedor)" : "Received (Vendor)"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewType("GIVEN")}
                      className={`flex items-center justify-center gap-1.5 rounded-xl border p-2.5 text-xs font-semibold transition-all ${
                        newType === "GIVEN"
                          ? "border-blue-500 bg-blue-50/60 text-blue-800 shadow-sm"
                          : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      <ArrowUpRight className="h-4 w-4 text-blue-600" />
                      {isEs ? "Entregada (a Tercero)" : "Given (Third Party)"}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    {isEs ? "Tienda / Sucursal" : "Store / Branch"}
                  </label>
                  <select
                    value={newStoreId}
                    onChange={(e) => setNewStoreId(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-medium text-slate-800 focus:border-violet-500 focus:bg-white focus:outline-none"
                  >
                    {stores.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.currency})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Contact Information */}
              <div className="rounded-2xl border border-slate-100 bg-slate-50/75 p-4 space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  {isEs ? "Información de la Parte / Contacto" : "Third Party / Contact Information"}
                </span>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600">
                      {isEs ? "Nombre del Proveedor / Cliente *" : "Vendor / Client Name *"}
                    </label>
                    <input
                      type="text"
                      required
                      value={newContactName}
                      onChange={(e) => setNewContactName(e.target.value)}
                      placeholder={isEs ? "Ej. Distribuidora Los Andes" : "e.g. Acme Supplies"}
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-violet-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-600">
                      {isEs ? "Teléfono de Contacto" : "Contact Phone"}
                    </label>
                    <input
                      type="text"
                      value={newContactPhone}
                      onChange={(e) => setNewContactPhone(e.target.value)}
                      placeholder="+504 9999-0000"
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-violet-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-600">
                      {isEs ? "Correo Electrónico" : "Email Address"}
                    </label>
                    <input
                      type="email"
                      value={newContactEmail}
                      onChange={(e) => setNewContactEmail(e.target.value)}
                      placeholder="contacto@ejemplo.com"
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-violet-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Dates & Notes */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600">
                    {isEs ? "Fecha de Inicio" : "Start Date"}
                  </label>
                  <input
                    type="date"
                    value={newStartDate}
                    onChange={(e) => setNewStartDate(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-violet-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600">
                    {isEs ? "Fecha Límite / Vencimiento" : "Estimated End Date"}
                  </label>
                  <input
                    type="date"
                    value={newEndDate}
                    onChange={(e) => setNewEndDate(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-violet-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600">
                    {isEs ? "Notas / Términos" : "Notes / Terms"}
                  </label>
                  <input
                    type="text"
                    value={newNotes}
                    onChange={(e) => setNewNotes(e.target.value)}
                    placeholder={isEs ? "Liquidación cada fin de mes" : "Monthly settlements"}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-violet-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Items Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    {isEs ? "Productos en Consignación" : "Consigned Products"}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setNewItems((prev) => [
                        ...prev,
                        { productTitle: "", sku: "", initialQuantity: 1, agreedCost: 0, suggestedPrice: 0 },
                      ])
                    }
                    className="inline-flex items-center gap-1 rounded-lg bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700 hover:bg-violet-100"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    {isEs ? "Agregar Fila" : "Add Row"}
                  </button>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="px-3 py-2.5">{isEs ? "Producto / Título *" : "Product Title *"}</th>
                        <th className="px-3 py-2.5">{isEs ? "SKU" : "SKU"}</th>
                        <th className="px-3 py-2.5 w-24">{isEs ? "Cantidad" : "Qty"}</th>
                        <th className="px-3 py-2.5 w-28">{isEs ? "Costo Pactado" : "Agreed Cost"}</th>
                        <th className="px-3 py-2.5 w-28">{isEs ? "Precio Sugerido" : "Retail Price"}</th>
                        <th className="px-3 py-2.5 w-28">{isEs ? "Subtotal" : "Subtotal"}</th>
                        <th className="px-3 py-2.5 w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {newItems.map((item, idx) => {
                        const subtotal = item.initialQuantity * item.agreedCost;
                        return (
                          <tr key={idx} className="bg-white">
                            <td className="p-2">
                              <input
                                type="text"
                                required
                                value={item.productTitle}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setNewItems((prev) => {
                                    const copy = [...prev];
                                    copy[idx].productTitle = val;
                                    return copy;
                                  });
                                }}
                                placeholder={isEs ? "Nombre del producto" : "Product name"}
                                className="w-full rounded border border-slate-200 px-2 py-1 text-xs focus:border-violet-500 focus:outline-none"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="text"
                                value={item.sku}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setNewItems((prev) => {
                                    const copy = [...prev];
                                    copy[idx].sku = val;
                                    return copy;
                                  });
                                }}
                                placeholder="SKU-123"
                                className="w-full rounded border border-slate-200 px-2 py-1 text-xs focus:border-violet-500 focus:outline-none"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="number"
                                min="1"
                                required
                                value={item.initialQuantity}
                                onChange={(e) => {
                                  const val = Math.max(1, Number.parseInt(e.target.value, 10) || 1);
                                  setNewItems((prev) => {
                                    const copy = [...prev];
                                    copy[idx].initialQuantity = val;
                                    return copy;
                                  });
                                }}
                                className="w-full rounded border border-slate-200 px-2 py-1 text-xs focus:border-violet-500 focus:outline-none"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                required
                                value={item.agreedCost}
                                onChange={(e) => {
                                  const val = Math.max(0, Number.parseFloat(e.target.value) || 0);
                                  setNewItems((prev) => {
                                    const copy = [...prev];
                                    copy[idx].agreedCost = val;
                                    return copy;
                                  });
                                }}
                                className="w-full rounded border border-slate-200 px-2 py-1 text-xs focus:border-violet-500 focus:outline-none"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={item.suggestedPrice || ""}
                                onChange={(e) => {
                                  const val = Math.max(0, Number.parseFloat(e.target.value) || 0);
                                  setNewItems((prev) => {
                                    const copy = [...prev];
                                    copy[idx].suggestedPrice = val;
                                    return copy;
                                  });
                                }}
                                placeholder="0.00"
                                className="w-full rounded border border-slate-200 px-2 py-1 text-xs focus:border-violet-500 focus:outline-none"
                              />
                            </td>
                            <td className="p-2 font-semibold text-slate-900">
                              {formatCurrency(subtotal)}
                            </td>
                            <td className="p-2 text-center">
                              {newItems.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setNewItems((prev) => prev.filter((_, i) => i !== idx))
                                  }
                                  className="text-red-400 hover:text-red-600"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end pt-2">
                  <div className="text-right">
                    <span className="text-xs text-slate-500">{isEs ? "Total Pactado Estimado:" : "Estimated Agreed Total:"}</span>
                    <span className="ml-2 text-base font-bold text-slate-900">
                      {formatCurrency(
                        newItems.reduce((s, i) => s + i.initialQuantity * i.agreedCost, 0)
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  {isEs ? "Cancelar" : "Cancel"}
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingNew}
                  className="rounded-xl bg-slate-900 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-50"
                >
                  {isSubmittingNew
                    ? (isEs ? "Guardando..." : "Saving...")
                    : (isEs ? "Crear Consignación" : "Create Consignment")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DETALLE DE CONSIGNACIÓN */}
      {selectedConsignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                  <Boxes className="h-5 w-5" />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-slate-900">{selectedConsignment.code}</h3>
                    {selectedConsignment.type === "RECEIVED" ? (
                      <span className="rounded bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                        {isEs ? "Recibida (Proveedor)" : "Received (Vendor)"}
                      </span>
                    ) : (
                      <span className="rounded bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                        {isEs ? "Entregada (Tercero)" : "Given (Third Party)"}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">
                    {selectedConsignment.contactName} {selectedConsignment.contactPhone ? `· ${selectedConsignment.contactPhone}` : ""}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedConsignment(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Consignment summary cards */}
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  {isEs ? "Total Pactado" : "Total Agreed"}
                </span>
                <div className="mt-1 text-lg font-bold text-slate-900">
                  {formatCurrency(selectedConsignment.totalAgreedAmount, selectedConsignment.currency)}
                </div>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  {isEs ? "Total Liquidado" : "Total Settled"}
                </span>
                <div className="mt-1 text-lg font-bold text-slate-900">
                  {formatCurrency(selectedConsignment.totalSettledAmount, selectedConsignment.currency)}
                </div>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  {isEs ? "Saldo Pendiente" : "Pending Balance"}
                </span>
                <div className="mt-1 text-lg font-bold text-slate-900">
                  {formatCurrency(
                    Math.max(
                      0,
                      Number.parseFloat(String(selectedConsignment.totalAgreedAmount)) -
                        Number.parseFloat(String(selectedConsignment.totalSettledAmount))
                    ),
                    selectedConsignment.currency
                  )}
                </div>
              </div>
            </div>

            {/* Products breakdown */}
            <div className="mt-5 space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                {isEs ? "Inventario de Productos en Consignación" : "Consigned Products Inventory"}
              </h4>
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-3 py-2.5">{isEs ? "Producto" : "Product"}</th>
                      <th className="px-3 py-2.5 text-center">{isEs ? "Inicial" : "Initial"}</th>
                      <th className="px-3 py-2.5 text-center">{isEs ? "Vendido" : "Sold"}</th>
                      <th className="px-3 py-2.5 text-center">{isEs ? "Devuelto" : "Returned"}</th>
                      <th className="px-3 py-2.5 text-center">{isEs ? "Disponible" : "Available"}</th>
                      <th className="px-3 py-2.5 text-right">{isEs ? "Costo Pactado" : "Agreed Cost"}</th>
                      <th className="px-3 py-2.5 text-right">{isEs ? "Subtotal Vendido" : "Sold Subtotal"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedConsignment.items.map((item) => {
                      const available = Math.max(0, item.initialQuantity - (item.soldQuantity + item.returnedQuantity));
                      const soldSubtotal = item.soldQuantity * Number.parseFloat(String(item.agreedCost));
                      return (
                        <tr key={item.id} className="hover:bg-slate-50/50">
                          <td className="px-3 py-2.5 font-medium text-slate-900">
                            {item.productTitle}
                            {item.sku && <span className="ml-1 text-[10px] text-slate-400">({item.sku})</span>}
                          </td>
                          <td className="px-3 py-2.5 text-center font-medium">{item.initialQuantity}</td>
                          <td className="px-3 py-2.5 text-center font-bold text-slate-900">{item.soldQuantity}</td>
                          <td className="px-3 py-2.5 text-center text-slate-500">{item.returnedQuantity}</td>
                          <td className="px-3 py-2.5 text-center font-semibold text-emerald-700">{available}</td>
                          <td className="px-3 py-2.5 text-right text-slate-600">
                            {formatCurrency(item.agreedCost, selectedConsignment.currency)}
                          </td>
                          <td className="px-3 py-2.5 text-right font-bold text-slate-900">
                            {formatCurrency(soldSubtotal, selectedConsignment.currency)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Settlements History */}
            <div className="mt-5 space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                {isEs ? "Historial de Liquidaciones Registradas" : "Recorded Settlements History"}
              </h4>
              {selectedConsignment.settlements.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400">
                  {isEs ? "No hay liquidaciones registradas para esta consignación aún." : "No settlements recorded for this consignment yet."}
                </p>
              ) : (
                <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                  {selectedConsignment.settlements.map((settlement) => (
                    <div key={settlement.id} className="flex items-center justify-between p-3.5 hover:bg-slate-50">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900">
                            {isEs ? `Liquidación #${settlement.settlementNumber}` : `Settlement #${settlement.settlementNumber}`}
                          </span>
                          <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                            {settlement.paymentMethod}
                          </span>
                          {settlement.reference && (
                            <span className="text-xs text-slate-500">Ref: {settlement.reference}</span>
                          )}
                        </div>
                        <div className="mt-0.5 text-xs text-slate-500">
                          {new Date(settlement.date).toLocaleDateString(isEs ? "es-HN" : "en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}{" "}
                          · {settlement.totalUnitsSold} {isEs ? "unidades liquidadas" : "units settled"}
                          {settlement.settledBy ? ` · Por: ${settlement.settledBy}` : ""}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-violet-700">
                          {formatCurrency(settlement.totalAmount, selectedConsignment.currency)}
                        </span>
                        <button
                          onClick={() => {
                            setReceiptSettlement({
                              consignment: selectedConsignment,
                              settlement,
                            });
                          }}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          <Printer className="h-3 w-3" />
                          {isEs ? "Comprobante" : "Receipt"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-2 border-t border-slate-100 pt-4">
              {selectedConsignment.status === "ACTIVE" && (
                <button
                  onClick={() => {
                    const c = selectedConsignment;
                    setSelectedConsignment(null);
                    openSettlementModal(c);
                  }}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-slate-800"
                >
                  {isEs ? "Liquidar Esta Consignación" : "Settle Consignment"}
                </button>
              )}
              <button
                onClick={() => setSelectedConsignment(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                {isEs ? "Cerrar" : "Close"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: LIQUIDAR CONSIGNACIÓN */}
      {settleConsignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                  <Receipt className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {isEs ? `Liquidar Consignación ${settleConsignment.code}` : `Settle Consignment ${settleConsignment.code}`}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {isEs
                      ? `Registrar unidades vendidas y pago a ${settleConsignment.contactName}`
                      : `Record units sold and payout to ${settleConsignment.contactName}`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSettleConsignment(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {settleError && (
              <div className="mt-4 flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs text-red-700 border border-red-200">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {settleError}
              </div>
            )}

            <form onSubmit={handleSubmitSettlement} className="mt-4 space-y-4">
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-3 py-2.5">{isEs ? "Producto" : "Product"}</th>
                      <th className="px-3 py-2.5 text-center">{isEs ? "Disponible" : "Available"}</th>
                      <th className="px-3 py-2.5 w-24 text-center">{isEs ? "Vender" : "Sell"}</th>
                      <th className="px-3 py-2.5 w-24 text-center">{isEs ? "Devolver" : "Return"}</th>
                      <th className="px-3 py-2.5 text-right">{isEs ? "Costo Pactado" : "Cost"}</th>
                      <th className="px-3 py-2.5 text-right">{isEs ? "Liquidación" : "Payout"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {settleConsignment.items.map((item) => {
                      const available = Math.max(0, item.initialQuantity - (item.soldQuantity + item.returnedQuantity));
                      const currentSold = settlementQuantities[item.id]?.unitsSold || 0;
                      const currentReturned = settlementQuantities[item.id]?.unitsReturned || 0;
                      const cost = Number.parseFloat(String(item.agreedCost)) || 0;
                      const itemPayout = currentSold * cost;

                      return (
                        <tr key={item.id} className="bg-white">
                          <td className="px-3 py-2 font-medium text-slate-900">
                            {item.productTitle}
                          </td>
                          <td className="px-3 py-2 text-center font-bold text-slate-600">
                            {available}
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              min="0"
                              max={available}
                              value={currentSold}
                              onChange={(e) => {
                                const val = Math.max(0, Math.min(available - currentReturned, Number.parseInt(e.target.value, 10) || 0));
                                setSettlementQuantities((prev) => ({
                                  ...prev,
                                  [item.id]: {
                                    ...prev[item.id],
                                    unitsSold: val,
                                  },
                                }));
                              }}
                              className="w-full rounded border border-slate-200 px-2 py-1 text-center font-bold text-violet-700 text-xs focus:border-violet-500 focus:outline-none"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              min="0"
                              max={available}
                              value={currentReturned}
                              onChange={(e) => {
                                const val = Math.max(0, Math.min(available - currentSold, Number.parseInt(e.target.value, 10) || 0));
                                setSettlementQuantities((prev) => ({
                                  ...prev,
                                  [item.id]: {
                                    ...prev[item.id],
                                    unitsReturned: val,
                                  },
                                }));
                              }}
                              className="w-full rounded border border-slate-200 px-2 py-1 text-center text-slate-600 text-xs focus:border-violet-500 focus:outline-none"
                            />
                          </td>
                          <td className="px-3 py-2 text-right text-slate-500">
                            {formatCurrency(cost, settleConsignment.currency)}
                          </td>
                          <td className="px-3 py-2 text-right font-bold text-violet-700">
                            {formatCurrency(itemPayout, settleConsignment.currency)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Settlement summary banner */}
              <div className="flex items-center justify-between rounded-xl bg-slate-50 p-4 border border-slate-200">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  {isEs ? "Monto Total de Liquidación:" : "Total Settlement Amount:"}
                </span>
                <span className="text-xl font-black text-slate-900">
                  {formatCurrency(currentSettlementTotal, settleConsignment.currency)}
                </span>
              </div>

              {/* Payment Details */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold text-slate-600">
                    {isEs ? "Forma de Pago / Liquidación *" : "Payment Method *"}
                  </label>
                  <select
                    value={settlePaymentMethod}
                    onChange={(e) => setSettlePaymentMethod(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-800 focus:border-violet-500 focus:bg-white focus:outline-none"
                  >
                    <option value="TRANSFERENCIA">{isEs ? "Transferencia Bancaria" : "Bank Transfer"}</option>
                    <option value="EFECTIVO">{isEs ? "Efectivo" : "Cash"}</option>
                    <option value="CHEQUE">{isEs ? "Cheque" : "Check"}</option>
                    <option value="TARJETA">{isEs ? "Tarjeta / POS" : "Card / POS"}</option>
                    <option value="CREDITO">{isEs ? "Abono a Cuenta por Cobrar / Pagar" : "Credit Balance"}</option>
                    <option value="OTRO">{isEs ? "Otro / Canje" : "Other"}</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600">
                    {isEs ? "Referencia / No. Comprobante" : "Reference / Receipt No."}
                  </label>
                  <input
                    type="text"
                    value={settleReference}
                    onChange={(e) => setSettleReference(e.target.value)}
                    placeholder={isEs ? "Ej. Transf. #948271" : "e.g. Wire #948271"}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-violet-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600">
                  {isEs ? "Notas de Liquidación" : "Settlement Notes"}
                </label>
                <input
                  type="text"
                  value={settleNotes}
                  onChange={(e) => setSettleNotes(e.target.value)}
                  placeholder={isEs ? "Observaciones sobre el pago o mercadería devuelta" : "Observations regarding payout or returned goods"}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-violet-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setSettleConsignment(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  {isEs ? "Cancelar" : "Cancel"}
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingSettle || currentSettlementTotal <= 0}
                  className="rounded-xl bg-slate-900 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-50"
                >
                  {isSubmittingSettle
                    ? (isEs ? "Procesando..." : "Processing...")
                    : (isEs ? "Registrar Liquidación y Pago" : "Record Settlement & Payout")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: COMPROBANTE DE LIQUIDACIÓN IMPRIMIBLE */}
      {receiptSettlement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-8 shadow-2xl">
            {/* Header with Print action */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                {isEs ? "Comprobante de Liquidación" : "Settlement Voucher"}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
                >
                  <Printer className="h-3.5 w-3.5" />
                  {isEs ? "Imprimir" : "Print"}
                </button>
                <button
                  onClick={() => setReceiptSettlement(null)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Printable Body */}
            <div className="mt-6 space-y-6 text-slate-800">
              <div className="text-center">
                <h2 className="text-xl font-black tracking-tight text-slate-950">
                  {receiptSettlement.consignment.store?.name || "PRADO COMMERCE"}
                </h2>
                <p className="text-xs text-slate-500">
                  {isEs ? "Comprobante de Liquidación de Consignación" : "Consignment Settlement Voucher"}
                </p>
                <div className="mt-2 inline-block rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                  {isEs ? `Liquidación #${receiptSettlement.settlement.settlementNumber}` : `Settlement #${receiptSettlement.settlement.settlementNumber}`}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">{isEs ? "Consignación:" : "Consignment:"}</span>
                  <span className="font-bold">{receiptSettlement.consignment.code}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{isEs ? "Contacto / Tercero:" : "Contact / Party:"}</span>
                  <span className="font-bold">{receiptSettlement.consignment.contactName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{isEs ? "Fecha de Liquidación:" : "Settlement Date:"}</span>
                  <span>{new Date(receiptSettlement.settlement.date).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{isEs ? "Forma de Pago:" : "Payment Method:"}</span>
                  <span className="font-semibold">{receiptSettlement.settlement.paymentMethod}</span>
                </div>
                {receiptSettlement.settlement.reference && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">{isEs ? "Referencia:" : "Reference:"}</span>
                    <span>{receiptSettlement.settlement.reference}</span>
                  </div>
                )}
                {receiptSettlement.settlement.settledBy && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">{isEs ? "Liquidado por:" : "Settled By:"}</span>
                    <span>{receiptSettlement.settlement.settledBy}</span>
                  </div>
                )}
              </div>

              {/* Amount Highlight */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  {isEs ? "Monto Total Liquidado" : "Total Settled Amount"}
                </span>
                <div className="mt-1 text-2xl font-black text-slate-900">
                  {formatCurrency(receiptSettlement.settlement.totalAmount, receiptSettlement.consignment.currency)}
                </div>
                <p className="mt-1 text-[11px] text-slate-500">
                  {receiptSettlement.settlement.totalUnitsSold} {isEs ? "unidades vendidas" : "units sold"}
                </p>
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-2 gap-8 pt-8 text-center text-xs">
                <div className="border-t border-slate-300 pt-2 text-slate-500">
                  {isEs ? "Firma Comercio" : "Store Authorized Signature"}
                </div>
                <div className="border-t border-slate-300 pt-2 text-slate-500">
                  {isEs ? "Firma Recibido Conforme" : "Third Party Acknowledgment"}
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setReceiptSettlement(null)}
                className="w-full rounded-xl bg-slate-900 py-2.5 text-xs font-semibold text-white hover:bg-slate-800"
              >
                {isEs ? "Listo" : "Done"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
