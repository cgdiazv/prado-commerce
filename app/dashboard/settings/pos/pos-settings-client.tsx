"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import {
  POS_ACCESS_MODULES,
  type PosAccessModule,
  type PosRole,
  type PosStoreSettings,
  type PosTerminal,
  type PosCashier,
} from "@/types/dashboard";
import {
  Store,
  Users,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Lock,
  Save,
  X,
} from "lucide-react";

type StoreItem = {
  id: string;
  name: string;
  currency: string;
  customDomain?: string | null;
  logoUrl?: string | null;
};

interface PosSettingsClientProps {
  stores: StoreItem[];
  initialStoreId: string | null;
  initialSettings?: PosStoreSettings;
  userName?: string | null;
  userEmail?: string | null;
}

export function PosSettingsClient({
  stores,
  initialStoreId,
  initialSettings,
}: PosSettingsClientProps) {
  const router = useRouter();
  const { language } = useLanguage();
  const isEs = language === "es";

  const [activeStoreId, setActiveStoreId] = useState<string>(
    initialStoreId || stores[0]?.id || ""
  );

  const [activeTab, setActiveTab] = useState<"terminals" | "cashiers" | "access" | "generalSales" | "preferences">("terminals");
  const [loading, setLoading] = useState(!initialSettings && Boolean(activeStoreId));
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [settings, setSettings] = useState<PosStoreSettings>(() => {
    if (initialSettings) return initialSettings;
    return {
      terminals: [],
      cashiers: [],
      requireCashierPin: false,
      defaultTerminalId: null,
      receiptFooterText: "",
      allowManualDiscounts: true,
      allowCustomCashierName: true,
      allowZeroInventorySales: false,
    };
  });

  // Track if initial load was already satisfied by initialSettings
  const hasLoadedInitial = React.useRef(Boolean(initialSettings));

  // Terminal modal state
  const [editingTerminal, setEditingTerminal] = useState<PosTerminal | null>(null);
  const [isTerminalModalOpen, setIsTerminalModalOpen] = useState(false);
  const [terminalForm, setTerminalForm] = useState({
    name: "",
    code: "",
    location: "",
    receiptPrefix: "",
    notes: "",
    status: "ACTIVE" as "ACTIVE" | "INACTIVE",
  });

  // Cashier modal state
  const [editingCashier, setEditingCashier] = useState<PosCashier | null>(null);
  const [isCashierModalOpen, setIsCashierModalOpen] = useState(false);
  const [cashierForm, setCashierForm] = useState({
    name: "",
    email: "",
    phone: "",
    pin: "",
    role: "CASHIER" as "CASHIER" | "SUPERVISOR" | "MANAGER",
    assignedTerminalId: "",
    status: "ACTIVE" as "ACTIVE" | "INACTIVE",
  });

  const [editingRoleAccess, setEditingRoleAccess] = useState<PosRole | null>(null);
  const [selectedRoleModules, setSelectedRoleModules] = useState<PosAccessModule[]>([]);

  // Delete confirmation modal state
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "terminal" | "cashier";
    id: string;
    name: string;
  } | null>(null);

  // Fetch settings from API
  const fetchSettings = useCallback(async (storeId: string) => {
    if (!storeId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/pos/settings?storeId=${storeId}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.error || (isEs ? "Error al cargar la configuración del POS" : "Failed to load POS settings"));
      }
      const data = await res.json();
      if (data.settings) {
        setSettings(data.settings);
      }
    } catch (err: any) {
      setErrorMessage(err.message || (isEs ? "Error al cargar la configuración del POS" : "Failed to load POS settings"));
    } finally {
      setLoading(false);
    }
  }, [isEs]);

  useEffect(() => {
    if (!activeStoreId) return;

    // Skip the very first fetch if server already provided initialSettings for this store
    if (hasLoadedInitial.current) {
      hasLoadedInitial.current = false;
      return;
    }

    fetchSettings(activeStoreId);
  }, [activeStoreId, fetchSettings]);

  // Save settings to API
  const handleSaveSettings = async (updatedSettings: PosStoreSettings) => {
    if (!activeStoreId) return;
    setSaving(true);
    setErrorMessage(null);
    setSaveSuccess(false);

    try {
      const res = await fetch("/api/pos/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId: activeStoreId,
          settings: updatedSettings,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to save settings");
      }

      const data = await res.json();
      if (data.settings) {
        setSettings(data.settings);
        try {
          localStorage.setItem(
            `prado_pos_roster_${activeStoreId}`,
            JSON.stringify(data.settings)
          );
        } catch {}
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to save POS settings");
    } finally {
      setSaving(false);
    }
  };

  // --- TERMINAL HANDLERS ---
  const handleOpenAddTerminal = () => {
    const nextIndex = settings.terminals.length + 1;
    setEditingTerminal(null);
    setTerminalForm({
      name: isEs ? `Caja ${String(nextIndex).padStart(2, "0")} - Mostrador` : `Register ${String(nextIndex).padStart(2, "0")} - Counter`,
      code: `REG-${String(nextIndex).padStart(2, "0")}`,
      location: "",
      receiptPrefix: `T${nextIndex}-`,
      notes: "",
      status: "ACTIVE",
    });
    setIsTerminalModalOpen(true);
  };

  const handleOpenEditTerminal = (terminal: PosTerminal) => {
    setEditingTerminal(terminal);
    setTerminalForm({
      name: terminal.name,
      code: terminal.code,
      location: terminal.location || "",
      receiptPrefix: terminal.receiptPrefix || "",
      notes: terminal.notes || "",
      status: terminal.status,
    });
    setIsTerminalModalOpen(true);
  };

  const handleSaveTerminal = () => {
    if (!terminalForm.name.trim()) return;

    let updatedTerminals: PosTerminal[];
    if (editingTerminal) {
      updatedTerminals = settings.terminals.map((t) =>
        t.id === editingTerminal.id
          ? {
              ...t,
              name: terminalForm.name.trim(),
              code: terminalForm.code.trim().toUpperCase() || t.code,
              location: terminalForm.location.trim() || null,
              receiptPrefix: terminalForm.receiptPrefix.trim().toUpperCase() || null,
              notes: terminalForm.notes.trim() || null,
              status: terminalForm.status,
              updatedAt: new Date().toISOString(),
            }
          : t
      );
    } else {
      const newTerminal: PosTerminal = {
        id: `term-${Date.now()}`,
        name: terminalForm.name.trim(),
        code: terminalForm.code.trim().toUpperCase() || `REG-${String(settings.terminals.length + 1).padStart(2, "0")}`,
        location: terminalForm.location.trim() || null,
        receiptPrefix: terminalForm.receiptPrefix.trim().toUpperCase() || null,
        notes: terminalForm.notes.trim() || null,
        status: terminalForm.status,
        createdAt: new Date().toISOString(),
      };
      updatedTerminals = [...settings.terminals, newTerminal];
    }

    const newSettings = { ...settings, terminals: updatedTerminals };
    setSettings(newSettings);
    setIsTerminalModalOpen(false);
    handleSaveSettings(newSettings);
  };

  const handleToggleTerminalStatus = (id: string) => {
    const updatedTerminals = settings.terminals.map((t) =>
      t.id === id ? { ...t, status: (t.status === "ACTIVE" ? "INACTIVE" : "ACTIVE") as "ACTIVE" | "INACTIVE" } : t
    );
    const newSettings = { ...settings, terminals: updatedTerminals };
    setSettings(newSettings);
    handleSaveSettings(newSettings);
  };

  const handleDeleteTerminal = (id: string) => {
    const updatedTerminals = settings.terminals.filter((t) => t.id !== id);
    const newSettings = { ...settings, terminals: updatedTerminals };
    setSettings(newSettings);
    setDeleteTarget(null);
    handleSaveSettings(newSettings);
  };

  // --- CASHIER HANDLERS ---
  const handleOpenAddCashier = () => {
    setEditingCashier(null);
    setCashierForm({
      name: "",
      email: "",
      phone: "",
      pin: "",
      role: "CASHIER",
      assignedTerminalId: "",
      status: "ACTIVE",
    });
    setIsCashierModalOpen(true);
  };

  const handleOpenEditCashier = (cashier: PosCashier) => {
    setEditingCashier(cashier);
    setCashierForm({
      name: cashier.name,
      email: cashier.email || "",
      phone: cashier.phone || "",
      pin: cashier.pin || "",
      role: cashier.role,
      assignedTerminalId: cashier.assignedTerminalId || "",
      status: cashier.status,
    });
    setIsCashierModalOpen(true);
  };

  const handleSaveCashier = () => {
    if (!cashierForm.name.trim()) return;

    let updatedCashiers: PosCashier[];
    if (editingCashier) {
      updatedCashiers = settings.cashiers.map((c) =>
        c.id === editingCashier.id
          ? {
              ...c,
              name: cashierForm.name.trim(),
              email: cashierForm.email.trim() || null,
              phone: cashierForm.phone.trim() || null,
              pin: cashierForm.pin.trim() || null,
              role: cashierForm.role,
              assignedTerminalId: cashierForm.assignedTerminalId || null,
              status: cashierForm.status,
              updatedAt: new Date().toISOString(),
            }
          : c
      );
    } else {
      const newCashier: PosCashier = {
        id: `csh-${Date.now()}`,
        name: cashierForm.name.trim(),
        email: cashierForm.email.trim() || null,
        phone: cashierForm.phone.trim() || null,
        pin: cashierForm.pin.trim() || null,
        role: cashierForm.role,
        assignedTerminalId: cashierForm.assignedTerminalId || null,
        status: cashierForm.status,
        createdAt: new Date().toISOString(),
      };
      updatedCashiers = [...settings.cashiers, newCashier];
    }

    const newSettings = { ...settings, cashiers: updatedCashiers };
    setSettings(newSettings);
    setIsCashierModalOpen(false);
    handleSaveSettings(newSettings);
  };

  const handleToggleCashierStatus = (id: string) => {
    const updatedCashiers = settings.cashiers.map((c) =>
      c.id === id ? { ...c, status: (c.status === "ACTIVE" ? "INACTIVE" : "ACTIVE") as "ACTIVE" | "INACTIVE" } : c
    );
    const newSettings = { ...settings, cashiers: updatedCashiers };
    setSettings(newSettings);
    handleSaveSettings(newSettings);
  };

  const handleDeleteCashier = (id: string) => {
    const updatedCashiers = settings.cashiers.filter((c) => c.id !== id);
    const newSettings = { ...settings, cashiers: updatedCashiers };
    setSettings(newSettings);
    setDeleteTarget(null);
    handleSaveSettings(newSettings);
  };

  const handleOpenRoleAccess = (role: PosRole) => {
    setEditingRoleAccess(role);
    setSelectedRoleModules(settings.roleModules?.[role] ?? [...POS_ACCESS_MODULES]);
  };

  const handleSaveRoleAccess = () => {
    if (!editingRoleAccess) return;

    const newSettings: PosStoreSettings = {
      ...settings,
      roleModules: {
        ...settings.roleModules,
        [editingRoleAccess]: selectedRoleModules,
      },
    };
    setSettings(newSettings);
    setEditingRoleAccess(null);
    handleSaveSettings(newSettings);
  };

  const getModuleLabel = (module: PosAccessModule) => {
    const labels: Record<PosAccessModule, { en: string; es: string }> = {
      dashboard: { en: "Dashboard", es: "Panel principal" },
      orders: { en: "Orders & POS", es: "Pedidos y POS" },
      products: { en: "Products", es: "Productos" },
      procurement: { en: "Procurement", es: "Abastecimiento" },
      customers: { en: "Customers", es: "Clientes" },
      stores: { en: "Stores", es: "Tiendas" },
      reports: { en: "Reports", es: "Informes" },
      tools: { en: "Tools", es: "Herramientas" },
      settings: { en: "Settings", es: "Configuración" },
    };

    return isEs ? labels[module].es : labels[module].en;
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="w-full">
        <div>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">
                {isEs ? "Punto de Venta (POS)" : "Point of Sale (POS)"}
              </h1>
              <p className="mt-1 max-w-xl text-sm text-slate-500">
                {isEs
                  ? "Administra las terminales físicas, cajas registradoras, cajeros autorizados y códigos PIN de seguridad."
                  : "Manage physical registers, checkouts, authorized cashiers, and security PINs."}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              {stores.length > 1 && (
                <div className="flex items-center gap-2">
                  <label htmlFor="pos-store-select" className="text-xs font-semibold text-slate-600 hidden sm:inline">
                    {isEs ? "Tienda:" : "Store:"}
                  </label>
                  <select
                    id="pos-store-select"
                    value={activeStoreId}
                    onChange={(e) => {
                      const newId = e.target.value;
                      setActiveStoreId(newId);
                      router.push(`/dashboard/settings/pos?storeId=${newId}`);
                    }}
                    className="text-xs font-semibold rounded-full border border-slate-300 bg-white px-3 py-2 text-slate-700 shadow-2xs focus:border-cyan-500 focus:outline-none"
                  >
                    {stores.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <Link
                href="/dashboard/settings"
                className="inline-flex shrink-0 items-center rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                {isEs ? "← Volver a configuración" : "← Back to settings"}
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Save feedback banner */}
      {saveSuccess && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs font-semibold text-emerald-800 animate-in fade-in">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{isEs ? "Configuración guardada exitosamente y sincronizada con el POS." : "POS settings saved and synchronized successfully."}</span>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-semibold text-rose-800">
          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main Tabs Container */}
      <div className="flex flex-col overflow-hidden rounded-[8px] border border-slate-200 bg-white shadow-xs">
        {/* Horizontal Navigation Tabs */}
        <nav aria-label={isEs ? "Configuración del POS" : "POS settings"} className="flex min-w-0 shrink-0 flex-row overflow-x-auto border-b border-slate-200 bg-slate-50/70">
          <button
            type="button"
            onClick={() => setActiveTab("terminals")}
            className={`flex shrink-0 items-center gap-2 border-b-4 px-4 py-3 text-left text-xs font-bold transition cursor-pointer ${
              activeTab === "terminals"
                ? "border-cyan-600 bg-white text-cyan-700"
                : "border-transparent text-slate-500 hover:bg-white/70 hover:text-slate-800"
            }`}
          >
            <span>{isEs ? "Cajas y Terminales" : "Registers & Terminals"}</span>
            <span className="rounded-full bg-slate-200/80 px-2 py-0.5 text-[10px] text-slate-700">
              {settings.terminals.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("cashiers")}
            className={`flex shrink-0 items-center gap-2 border-b-4 px-4 py-3 text-left text-xs font-bold transition cursor-pointer ${
              activeTab === "cashiers"
                ? "border-cyan-600 bg-white text-cyan-700"
                : "border-transparent text-slate-500 hover:bg-white/70 hover:text-slate-800"
            }`}
          >
            <span>{isEs ? "Usuarios y equipo" : "Users & Team"}</span>
            <span className="rounded-full bg-slate-200/80 px-2 py-0.5 text-[10px] text-slate-700">
              {settings.cashiers.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("access")}
            className={`flex shrink-0 items-center gap-2 border-b-4 px-4 py-3 text-left text-xs font-bold transition cursor-pointer ${
              activeTab === "access"
                ? "border-cyan-600 bg-white text-cyan-700"
                : "border-transparent text-slate-500 hover:bg-white/70 hover:text-slate-800"
            }`}
          >
            <span>{isEs ? "Acceso a módulos" : "Module Access"}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("generalSales")}
            className={`flex shrink-0 items-center gap-2 border-b-4 px-4 py-3 text-left text-xs font-bold transition cursor-pointer ${
              activeTab === "generalSales"
                ? "border-cyan-600 bg-white text-cyan-700"
                : "border-transparent text-slate-500 hover:bg-white/70 hover:text-slate-800"
            }`}
          >
            <span>{isEs ? "Configuración general de ventas" : "General Sales Settings"}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("preferences")}
            className={`flex shrink-0 items-center gap-2 border-b-4 px-4 py-3 text-left text-xs font-bold transition cursor-pointer ${
              activeTab === "preferences"
                ? "border-cyan-600 bg-white text-cyan-700"
                : "border-transparent text-slate-500 hover:bg-white/70 hover:text-slate-800"
            }`}
          >
            <span>{isEs ? "Preferencias y Seguridad" : "Preferences & Security"}</span>
          </button>
        </nav>

        {/* Tab Body */}
        <div className="min-w-0 flex-1 p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <Loader2 className="h-8 w-8 animate-spin text-cyan-600 mb-3" />
              <p className="text-xs font-medium">{isEs ? "Cargando configuración..." : "Loading POS configuration..."}</p>
            </div>
          ) : (
            <>
              {/* TAB 1: TERMINALS & REGISTERS */}
              {activeTab === "terminals" && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        {isEs ? "Terminales y Puntos de Cobro" : "Physical Registers & Checkouts"}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {isEs
                          ? "Cada terminal representa un equipo, mostrador o iPad donde se registran cobros en tienda."
                          : "Each terminal represents a physical register, counter, tablet, or kiosk station."}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleOpenAddTerminal}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-cyan-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-cyan-700 cursor-pointer"
                    >
                      <Plus className="h-4 w-4" />
                      <span>{isEs ? "Nueva Terminal / Caja" : "Add Terminal"}</span>
                    </button>
                  </div>

                  {settings.terminals.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center">
                      <Store className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                      <p className="text-xs font-bold text-slate-700">{isEs ? "No hay terminales configuradas" : "No registers configured"}</p>
                      <p className="text-xs text-slate-400 mt-1 mb-4">{isEs ? "Agrega tu primera terminal de mostrador." : "Create your first checkout terminal."}</p>
                      <button
                        type="button"
                        onClick={handleOpenAddTerminal}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-cyan-600 px-4 py-2 text-xs font-bold text-white hover:bg-cyan-700"
                      >
                        <Plus className="h-4 w-4" />
                        <span>{isEs ? "Agregar Terminal" : "Add Register"}</span>
                      </button>
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold text-[10px]">
                          <tr>
                            <th className="w-28 px-4 py-3">{isEs ? "Código" : "Code"}</th>
                            <th className="px-4 py-3">{isEs ? "Nombre de Terminal" : "Terminal Name"}</th>
                            <th className="px-4 py-3">{isEs ? "Ubicación / Notas" : "Location / Notes"}</th>
                            <th className="px-4 py-3">{isEs ? "Prefijo Recibo" : "Receipt Prefix"}</th>
                            <th className="px-4 py-3">{isEs ? "Estado" : "Status"}</th>
                            <th className="px-4 py-3 text-right">{isEs ? "Acciones" : "Actions"}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {settings.terminals.map((t) => {
                            return (
                              <tr key={t.id} className="hover:bg-slate-50/80 transition">
                                <td className="w-28 px-4 py-3.5 font-mono font-bold text-slate-800 whitespace-nowrap">
                                  {t.code}
                                </td>
                                <td className="px-4 py-3.5 font-bold text-slate-900">
                                  <span>{t.name}</span>
                                </td>
                                <td className="px-4 py-3.5 text-slate-600">
                                  {t.location || t.notes ? (
                                    <span>{[t.location, t.notes].filter(Boolean).join(" • ")}</span>
                                  ) : (
                                    <span className="text-slate-300 italic">{isEs ? "Sin ubicación" : "No location"}</span>
                                  )}
                                </td>
                                <td className="px-4 py-3.5 font-mono text-slate-600">
                                  {t.receiptPrefix || <span className="text-slate-300">-</span>}
                                </td>
                                <td className="px-4 py-3.5">
                                  <button
                                    type="button"
                                    onClick={() => handleToggleTerminalStatus(t.id)}
                                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold cursor-pointer transition ${
                                      t.status === "ACTIVE"
                                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                                        : "bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200"
                                    }`}
                                  >
                                    <span className={`h-1.5 w-1.5 rounded-full ${t.status === "ACTIVE" ? "bg-emerald-500" : "bg-slate-400"}`} />
                                    <span>{t.status === "ACTIVE" ? (isEs ? "Activa" : "Active") : (isEs ? "Inactiva" : "Inactive")}</span>
                                  </button>
                                </td>
                                <td className="px-4 py-3.5 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => handleOpenEditTerminal(t)}
                                      className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-cyan-600 transition cursor-pointer"
                                      title={isEs ? "Editar Terminal" : "Edit Terminal"}
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setDeleteTarget({ type: "terminal", id: t.id, name: t.name })}
                                      className="p-1.5 rounded-lg text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition cursor-pointer"
                                      title={isEs ? "Eliminar Terminal" : "Delete Terminal"}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
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
              )}

              {/* TAB 2: CASHIERS & OPERATORS */}
              {activeTab === "cashiers" && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        {isEs ? "Cajeros y Operadores Autorizados" : "Authorized Cashiers & Operators"}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {isEs
                          ? "Personal autorizado para operar el punto de venta, abrir turnos y firmar recibos."
                          : "Staff authorized to operate the POS terminal, initiate shifts, and sign tickets."}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleOpenAddCashier}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-cyan-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-cyan-700 cursor-pointer"
                    >
                      <Plus className="h-4 w-4" />
                      <span>{isEs ? "Nuevo usuario" : "Add User"}</span>
                    </button>
                  </div>

                  {settings.cashiers.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center">
                      <Users className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                      <p className="text-xs font-bold text-slate-700">{isEs ? "No hay cajeros registrados" : "No cashiers registered"}</p>
                      <p className="text-xs text-slate-400 mt-1 mb-4">{isEs ? "Agrega el primer operador de caja." : "Add your first cashier staff member."}</p>
                      <button
                        type="button"
                        onClick={handleOpenAddCashier}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-cyan-600 px-4 py-2 text-xs font-bold text-white hover:bg-cyan-700"
                      >
                        <Plus className="h-4 w-4" />
                        <span>{isEs ? "Agregar usuario" : "Add User"}</span>
                      </button>
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold text-[10px]">
                          <tr>
                            <th className="px-4 py-3">{isEs ? "Operador" : "Operator"}</th>
                            <th className="px-4 py-3">{isEs ? "Rol" : "Role"}</th>
                            <th className="px-4 py-3">{isEs ? "PIN Seguridad" : "PIN Code"}</th>
                            <th className="px-4 py-3">{isEs ? "Terminal Asignada" : "Assigned Terminal"}</th>
                            <th className="px-4 py-3">{isEs ? "Estado" : "Status"}</th>
                            <th className="px-4 py-3 text-right">{isEs ? "Acciones" : "Actions"}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {settings.cashiers.map((c) => {
                            const assignedTerm = settings.terminals.find((t) => t.id === c.assignedTerminalId);
                            const initial = c.name.trim().charAt(0).toUpperCase() || "C";

                            return (
                              <tr key={c.id} className="hover:bg-slate-50/80 transition">
                                <td className="px-4 py-3.5">
                                  <div className="flex items-center gap-3">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-600 font-bold text-white text-xs shadow-2xs">
                                      {initial}
                                    </div>
                                    <div>
                                      <div className="font-bold text-slate-900">{c.name}</div>
                                      {(c.email || c.phone) && (
                                        <div className="text-[11px] text-slate-400">
                                          {[c.email, c.phone].filter(Boolean).join(" • ")}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-3.5">
                                  <span
                                    className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                      c.role === "MANAGER"
                                        ? "bg-purple-50 text-purple-700 border border-purple-200"
                                        : c.role === "SUPERVISOR"
                                        ? "bg-amber-50 text-amber-700 border border-amber-200"
                                        : "bg-blue-50 text-blue-700 border border-blue-200"
                                    }`}
                                  >
                                    {c.role}
                                  </span>
                                </td>
                                <td className="px-4 py-3.5 font-mono text-slate-700">
                                  {c.pin ? (
                                    <div className="flex items-center gap-1.5 text-emerald-700 font-semibold text-xs">
                                      <Lock className="h-3 w-3 text-emerald-600" />
                                      <span>•••• ({c.pin.length} digits)</span>
                                    </div>
                                  ) : (
                                    <span className="text-slate-300 italic">{isEs ? "Sin PIN" : "No PIN set"}</span>
                                  )}
                                </td>
                                <td className="px-4 py-3.5 text-slate-600">
                                  {assignedTerm ? (
                                    <span className="font-semibold text-cyan-800">{assignedTerm.name}</span>
                                  ) : (
                                    <span className="text-slate-400 italic">{isEs ? "Cualquier terminal" : "Any terminal"}</span>
                                  )}
                                </td>
                                <td className="px-4 py-3.5">
                                  <button
                                    type="button"
                                    onClick={() => handleToggleCashierStatus(c.id)}
                                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold cursor-pointer transition ${
                                      c.status === "ACTIVE"
                                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                                        : "bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200"
                                    }`}
                                  >
                                    <span className={`h-1.5 w-1.5 rounded-full ${c.status === "ACTIVE" ? "bg-emerald-500" : "bg-slate-400"}`} />
                                    <span>{c.status === "ACTIVE" ? (isEs ? "Activo" : "Active") : (isEs ? "Inactivo" : "Inactive")}</span>
                                  </button>
                                </td>
                                <td className="px-4 py-3.5 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => handleOpenEditCashier(c)}
                                      className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-cyan-600 transition cursor-pointer"
                                      title={isEs ? "Editar Cajero" : "Edit Cashier"}
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setDeleteTarget({ type: "cashier", id: c.id, name: c.name })}
                                      className="p-1.5 rounded-lg text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition cursor-pointer"
                                      title={isEs ? "Eliminar Cajero" : "Delete Cashier"}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
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
              )}

              {activeTab === "access" && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      {isEs ? "Acceso a módulos por rol" : "Module access by role"}
                    </h3>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {isEs
                        ? "Elige a qué módulos puede acceder cada rol."
                        : "Choose which modules each role can access."}
                    </p>
                  </div>

                  <div className="overflow-hidden rounded-xl border border-slate-200">
                    <div className="divide-y divide-slate-100">
                      {(["MANAGER", "SUPERVISOR", "CASHIER"] as const).map((role) => {
                        const modules = settings.roleModules?.[role] ?? [...POS_ACCESS_MODULES];
                        const assignedCount = settings.cashiers.filter((cashier) => cashier.role === role).length;

                        return (
                          <div key={role} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="rounded-full border border-cyan-200 bg-cyan-50 px-2 py-0.5 text-[10px] font-bold text-cyan-800">
                                  {role}
                                </span>
                                <span className="text-[11px] text-slate-500">
                                  {isEs
                                    ? `${assignedCount} usuario${assignedCount === 1 ? "" : "s"}`
                                    : `${assignedCount} user${assignedCount === 1 ? "" : "s"}`}
                                </span>
                              </div>
                              <p className="mt-1 text-xs text-slate-600">
                                {modules.length === POS_ACCESS_MODULES.length &&
                                POS_ACCESS_MODULES.every((module) => modules.includes(module))
                                  ? (isEs ? "Todos los módulos" : "All modules")
                                  : modules.length === 0
                                    ? (isEs ? "Sin módulos" : "No modules")
                                    : modules.map(getModuleLabel).join(", ")}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleOpenRoleAccess(role)}
                              aria-label={isEs ? `Editar acceso de ${role}` : `Edit ${role} access`}
                              title={isEs ? "Editar acceso" : "Edit access"}
                              className="inline-flex shrink-0 items-center justify-center rounded-lg p-1.5 text-slate-500 transition hover:bg-cyan-50 hover:text-cyan-700"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "generalSales" && (
                <div className="max-w-2xl space-y-6">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      {isEs ? "Configuración general de ventas" : "General Sales Settings"}
                    </h3>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {isEs
                        ? "Define cómo el POS maneja las ventas y el inventario de esta tienda."
                        : "Configure how POS sales handle inventory for this store."}
                    </p>
                  </div>

                  <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/50 p-5">
                    <label className="flex cursor-pointer items-start justify-between gap-4">
                      <div>
                        <div className="text-xs font-bold text-slate-800">
                          {isEs ? "Permitir vender productos sin inventario" : "Allow selling products with zero inventory"}
                        </div>
                        <div className="mt-0.5 text-[11px] text-slate-500">
                          {isEs
                            ? "Permite facturar productos con inventario en cero. El inventario no se reducirá por debajo de cero."
                            : "Allow POS invoices for products with zero inventory. Inventory will not be reduced below zero."}
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.allowZeroInventorySales === true}
                        onChange={(event) => {
                          setSettings({ ...settings, allowZeroInventorySales: event.target.checked });
                        }}
                        className="mt-1 h-4 w-4 cursor-pointer rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                      />
                    </label>
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => handleSaveSettings(settings)}
                      disabled={saving}
                      className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-cyan-600 px-5 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-cyan-700 disabled:opacity-50"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>{isEs ? "Guardando..." : "Saving..."}</span>
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4" />
                          <span>{isEs ? "Guardar configuración" : "Save Settings"}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* TAB: PREFERENCES & SECURITY */}
              {activeTab === "preferences" && (
                <div className="space-y-6 max-w-2xl">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      {isEs ? "Seguridad y Comportamiento del POS" : "POS Security & Operational Rules"}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {isEs
                        ? "Ajusta las políticas de acceso de cajeros, descuentos y formato de recibos."
                        : "Fine-tune cashier shift policies, discount controls, and receipt footers."}
                    </p>
                  </div>

                  <div className="space-y-4 rounded-xl border border-slate-200 p-5 bg-slate-50/50">
                    {/* Toggle: Require Cashier PIN */}
                    <label className="flex items-start justify-between gap-4 cursor-pointer">
                      <div>
                        <div className="text-xs font-bold text-slate-800">
                          {isEs ? "Requerir PIN de 4 dígitos al cambiar cajero" : "Require 4-digit PIN to switch cashiers"}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {isEs
                            ? "Los operadores deberán introducir su PIN secreto para desbloquear la sesión de cobro."
                            : "Operators must enter their security PIN before taking over an active sales register."}
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.requireCashierPin ?? false}
                        onChange={(e) => {
                          const updated = { ...settings, requireCashierPin: e.target.checked };
                          setSettings(updated);
                        }}
                        className="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500 mt-1 cursor-pointer"
                      />
                    </label>

                    <div className="border-t border-slate-200" />


                    {/* Toggle: Allow Manual Discounts */}
                    <label className="flex items-start justify-between gap-4 cursor-pointer">
                      <div>
                        <div className="text-xs font-bold text-slate-800">
                          {isEs ? "Permitir descuentos manuales en caja" : "Allow manual discounts at register"}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {isEs
                            ? "Permite a los cajeros aplicar porcentajes de descuento por línea de producto."
                            : "Allows cashiers to modify line-item discount percentages on the fly."}
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.allowManualDiscounts !== false}
                        onChange={(e) => {
                          const updated = { ...settings, allowManualDiscounts: e.target.checked };
                          setSettings(updated);
                        }}
                        className="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500 mt-1 cursor-pointer"
                      />
                    </label>
                  </div>

                  {/* Default Register Selector */}
                  <div className="space-y-1.5">
                    <label htmlFor="default-terminal-select" className="block text-xs font-bold text-slate-700">
                      {isEs ? "Terminal Predeterminada para Nuevas Sesiones" : "Default Terminal for New Devices"}
                    </label>
                    <select
                      id="default-terminal-select"
                      value={settings.defaultTerminalId || ""}
                      onChange={(e) => {
                        const updated = { ...settings, defaultTerminalId: e.target.value || null };
                        setSettings(updated);
                      }}
                      className="w-full text-xs rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-800 focus:border-cyan-500 focus:outline-none"
                    >
                      <option value="">{isEs ? "Ninguna (preguntar en inicio)" : "None (prompt on startup)"}</option>
                      {settings.terminals.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.code} - {t.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* POS Default Tax Rate */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label htmlFor="default-tax-rate-input" className="block text-xs font-bold text-slate-700">
                        {isEs ? "Tasa de Impuesto del POS (%)" : "POS Tax Rate (%)"}
                      </label>
                      <Link
                        href="/dashboard/settings/tax"
                        className="text-[11px] font-semibold text-cyan-600 hover:text-cyan-700 transition"
                      >
                        {isEs ? "Ajustes Generales de Impuestos →" : "General Tax Settings →"}
                      </Link>
                    </div>
                    <input
                      id="default-tax-rate-input"
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={settings.defaultTaxRate !== undefined && settings.defaultTaxRate !== null ? settings.defaultTaxRate : ""}
                      onChange={(e) => {
                        const val = e.target.value === "" ? null : parseFloat(e.target.value);
                        setSettings({ ...settings, defaultTaxRate: isNaN(val as number) ? null : val });
                      }}
                      placeholder={isEs ? "Dejar vacío para usar Ajustes de Impuestos (o 15% estándar)" : "Leave blank to use Tax Settings (or 15% standard)"}
                      className="w-full text-xs rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-800 focus:border-cyan-500 focus:outline-none"
                    />
                    <p className="text-[11px] text-slate-400">
                      {isEs
                        ? "Porcentaje de impuesto aplicado a las ventas del Punto de Venta (ej. 15, 8.25, 7, etc.). Si está vacío, tomará automáticamente la tasa configurada en Ajustes > Impuestos."
                        : "Tax percentage applied to Point of Sale sales (e.g., 15, 8.25, 7, etc.). If blank, it automatically uses your Tax Settings."}
                    </p>
                  </div>

                  {/* Hold / En Espera Duration */}
                  <div className="space-y-1.5">
                    <label htmlFor="hold-duration-select" className="block text-xs font-bold text-slate-700">
                      {isEs ? "Duración de Tickets en Espera (Hold)" : "Parked Ticket Hold Duration"}
                    </label>
                    <select
                      id="hold-duration-select"
                      value={settings.holdDurationMinutes !== undefined && settings.holdDurationMinutes !== null ? String(settings.holdDurationMinutes) : "60"}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        setSettings({ ...settings, holdDurationMinutes: isNaN(val) ? 60 : val });
                      }}
                      className="w-full text-xs rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-800 focus:border-cyan-500 focus:outline-none"
                    >
                      <option value="15">{isEs ? "15 minutos" : "15 minutes"}</option>
                      <option value="30">{isEs ? "30 minutos" : "30 minutes"}</option>
                      <option value="60">{isEs ? "1 hora (Predeterminado)" : "1 hour (Default)"}</option>
                      <option value="120">{isEs ? "2 horas" : "2 hours"}</option>
                      <option value="1440">{isEs ? "24 horas (1 día)" : "24 hours (1 day)"}</option>
                      <option value="0">{isEs ? "Sin expiración automática" : "No auto-expiration"}</option>
                    </select>
                    <p className="text-[11px] text-slate-400">
                      {isEs
                        ? "Tiempo durante el cual un carrito pausado permanecerá activo antes de ser marcado como vencido en el POS."
                        : "How long a parked cart remains active before being flagged as expired in POS."}
                    </p>
                  </div>

                  {/* POS Card Surcharge */}
                  <div className="space-y-3 rounded-xl border border-slate-200 p-4 bg-slate-50/70">
                    <label className="flex items-start justify-between gap-4 cursor-pointer">
                      <div>
                        <div className="text-xs font-bold text-slate-800">
                          {isEs ? "Recargo por pago con Tarjeta de Crédito (T/C)" : "Credit Card Surcharge at Register"}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {isEs
                            ? "Aplica automáticamente una comisión porcentual al total cuando el cajero selecciona el método 'Tarjeta'."
                            : "Automatically applies a surcharge percentage when cashier tenders with 'Tarjeta'."}
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.cardFeeEnabled ?? false}
                        onChange={(e) => {
                          setSettings({ ...settings, cardFeeEnabled: e.target.checked });
                        }}
                        className="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500 mt-1 cursor-pointer"
                      />
                    </label>

                    {settings.cardFeeEnabled && (
                      <div className="pt-2 border-t border-slate-200">
                        <label htmlFor="pos-card-fee-input" className="block text-xs font-medium text-slate-700 mb-1">
                          {isEs ? "Porcentaje de comisión en POS (%)" : "POS Surcharge Percentage (%)"}
                        </label>
                        <div className="relative max-w-xs">
                          <input
                            id="pos-card-fee-input"
                            type="number"
                            step="0.01"
                            min="0"
                            max="30"
                            value={settings.cardFeePercentage !== undefined && settings.cardFeePercentage !== null ? String(settings.cardFeePercentage) : ""}
                            onChange={(e) => {
                              const val = e.target.value === "" ? 0 : parseFloat(e.target.value);
                              setSettings({ ...settings, cardFeePercentage: isNaN(val) ? 0 : val });
                            }}
                            placeholder="Ej: 3.50"
                            className="w-full text-xs rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-cyan-500 focus:outline-none"
                          />
                          <span className="absolute right-3 top-2 text-xs font-bold text-slate-400">%</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Receipt Footer Message */}
                  <div className="space-y-1.5">
                    <label htmlFor="receipt-footer-textarea" className="block text-xs font-bold text-slate-700">
                      {isEs ? "Mensaje al Pie del Recibo Térmico" : "Thermal Receipt Footer Text / Policy"}
                    </label>
                    <textarea
                      id="receipt-footer-textarea"
                      rows={3}
                      value={settings.receiptFooterText || ""}
                      onChange={(e) => {
                        const updated = { ...settings, receiptFooterText: e.target.value };
                        setSettings(updated);
                      }}
                      placeholder={isEs ? "Gracias por su compra. Conserve este comprobante para cambios o devoluciones." : "Thank you for your purchase. Please retain ticket for returns or exchanges."}
                      className="w-full text-xs rounded-xl border border-slate-300 bg-white p-3 text-slate-800 focus:border-cyan-500 focus:outline-none"
                    />
                  </div>

                  {/* Save button for preferences */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => handleSaveSettings(settings)}
                      disabled={saving}
                      className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-5 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-cyan-700 disabled:opacity-50 cursor-pointer"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>{isEs ? "Guardando..." : "Saving..."}</span>
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4" />
                          <span>{isEs ? "Guardar Preferencias" : "Save Preferences"}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* --- MODAL: ADD / EDIT TERMINAL --- */}
      {isTerminalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/45 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">
                {editingTerminal
                  ? (isEs ? "Editar Terminal / Caja" : "Edit Terminal")
                  : (isEs ? "Nueva Terminal / Caja" : "Add New Terminal")}
              </h3>
              <button
                type="button"
                onClick={() => setIsTerminalModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isEs ? "Nombre de la Terminal *" : "Terminal Name *"}
                </label>
                <input
                  type="text"
                  value={terminalForm.name}
                  onChange={(e) => setTerminalForm({ ...terminalForm, name: e.target.value })}
                  placeholder={isEs ? "Ej. Caja 01 - Mostrador Principal" : "e.g. Register 01 - Main Counter"}
                  className="w-full text-xs rounded-xl border border-slate-300 bg-slate-50/50 px-3 py-2 text-slate-800 focus:bg-white focus:border-cyan-500 focus:outline-none"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isEs ? "Código / ID *" : "Terminal Code *"}
                  </label>
                  <input
                    type="text"
                    value={terminalForm.code}
                    onChange={(e) => setTerminalForm({ ...terminalForm, code: e.target.value.toUpperCase() })}
                    placeholder="REG-01"
                    className="w-full text-xs font-mono rounded-xl border border-slate-300 bg-slate-50/50 px-3 py-2 text-slate-800 focus:bg-white focus:border-cyan-500 focus:outline-none uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isEs ? "Prefijo Recibo" : "Receipt Prefix"}
                  </label>
                  <input
                    type="text"
                    value={terminalForm.receiptPrefix}
                    onChange={(e) => setTerminalForm({ ...terminalForm, receiptPrefix: e.target.value.toUpperCase() })}
                    placeholder="T1-"
                    className="w-full text-xs font-mono rounded-xl border border-slate-300 bg-slate-50/50 px-3 py-2 text-slate-800 focus:bg-white focus:border-cyan-500 focus:outline-none uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isEs ? "Ubicación Física" : "Physical Location"}
                </label>
                <input
                  type="text"
                  value={terminalForm.location}
                  onChange={(e) => setTerminalForm({ ...terminalForm, location: e.target.value })}
                  placeholder={isEs ? "Ej. Planta baja, mostrador izquierdo..." : "e.g. Ground floor, west entrance..."}
                  className="w-full text-xs rounded-xl border border-slate-300 bg-slate-50/50 px-3 py-2 text-slate-800 focus:bg-white focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isEs ? "Notas Internas" : "Notes"}
                </label>
                <input
                  type="text"
                  value={terminalForm.notes}
                  onChange={(e) => setTerminalForm({ ...terminalForm, notes: e.target.value })}
                  placeholder={isEs ? "Ej. iPad Pro 12 pulg, impresora bluetooth..." : "e.g. iPad Pro with Bluetooth thermal printer"}
                  className="w-full text-xs rounded-xl border border-slate-300 bg-slate-50/50 px-3 py-2 text-slate-800 focus:bg-white focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isEs ? "Estado" : "Status"}
                </label>
                <select
                  value={terminalForm.status}
                  onChange={(e) => setTerminalForm({ ...terminalForm, status: e.target.value as "ACTIVE" | "INACTIVE" })}
                  className="w-full text-xs rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-800 focus:border-cyan-500 focus:outline-none"
                >
                  <option value="ACTIVE">{isEs ? "Activa (Disponible para ventas)" : "Active (Available for checkout)"}</option>
                  <option value="INACTIVE">{isEs ? "Inactiva (Fuera de servicio)" : "Inactive (Out of service)"}</option>
                </select>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setIsTerminalModalOpen(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                {isEs ? "Cancelar" : "Cancel"}
              </button>
              <button
                type="button"
                onClick={handleSaveTerminal}
                disabled={!terminalForm.name.trim()}
                className="rounded-xl bg-cyan-600 px-4 py-2 text-xs font-bold text-white hover:bg-cyan-700 disabled:opacity-50"
              >
                {editingTerminal ? (isEs ? "Actualizar" : "Update") : (isEs ? "Crear Terminal" : "Create Terminal")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL: ADD / EDIT CASHIER --- */}
      {isCashierModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/45 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">
                {editingCashier
                  ? (isEs ? "Editar Cajero / Operador" : "Edit Cashier")
                  : (isEs ? "Nuevo Cajero / Operador" : "Add New Cashier")}
              </h3>
              <button
                type="button"
                onClick={() => setIsCashierModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isEs ? "Nombre Completo *" : "Full Name *"}
                </label>
                <input
                  type="text"
                  value={cashierForm.name}
                  onChange={(e) => setCashierForm({ ...cashierForm, name: e.target.value })}
                  placeholder={isEs ? "Ej. María Gómez" : "e.g. Sarah Miller"}
                  className="w-full text-xs rounded-xl border border-slate-300 bg-slate-50/50 px-3 py-2 text-slate-800 focus:bg-white focus:border-cyan-500 focus:outline-none"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isEs ? "Rol en Tienda" : "Role"}
                  </label>
                  <select
                    value={cashierForm.role}
                    onChange={(e) => setCashierForm({ ...cashierForm, role: e.target.value as any })}
                    className="w-full text-xs rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-800 focus:border-cyan-500 focus:outline-none"
                  >
                    <option value="CASHIER">{isEs ? "Cajero / Operador" : "Cashier"}</option>
                    <option value="SUPERVISOR">{isEs ? "Supervisor" : "Supervisor"}</option>
                    <option value="MANAGER">{isEs ? "Gerente / Encargado" : "Manager"}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isEs ? "PIN Seguridad (4 dígitos)" : "4-Digit PIN"}
                  </label>
                  <input
                    type="password"
                    maxLength={6}
                    value={cashierForm.pin}
                    onChange={(e) => setCashierForm({ ...cashierForm, pin: e.target.value.replace(/\D/g, "") })}
                    placeholder="1234"
                    className="w-full text-xs font-mono rounded-xl border border-slate-300 bg-slate-50/50 px-3 py-2 text-slate-800 focus:bg-white focus:border-cyan-500 focus:outline-none tracking-widest"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isEs ? "Correo Electrónico (Acceso a POS desde /login con PIN)" : "Email Address (POS login from /login using PIN)"}
                </label>
                <input
                  type="email"
                  value={cashierForm.email}
                  onChange={(e) => setCashierForm({ ...cashierForm, email: e.target.value })}
                  placeholder="cajero@mitienda.com"
                  className="w-full text-xs rounded-xl border border-slate-300 bg-slate-50/50 px-3 py-2 text-slate-800 focus:bg-white focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isEs ? "Teléfono (Opcional)" : "Phone Number (Optional)"}
                </label>
                <input
                  type="tel"
                  value={cashierForm.phone}
                  onChange={(e) => setCashierForm({ ...cashierForm, phone: e.target.value })}
                  placeholder="+1 (555) 000-0000"
                  className="w-full text-xs rounded-xl border border-slate-300 bg-slate-50/50 px-3 py-2 text-slate-800 focus:bg-white focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isEs ? "Terminal Asignada" : "Assigned Terminal"}
                </label>
                <select
                  value={cashierForm.assignedTerminalId}
                  onChange={(e) => setCashierForm({ ...cashierForm, assignedTerminalId: e.target.value })}
                  className="w-full text-xs rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-800 focus:border-cyan-500 focus:outline-none"
                >
                  <option value="">{isEs ? "Cualquier terminal (Sin restricción)" : "Any terminal (Floating cashier)"}</option>
                  {settings.terminals.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.code} - {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isEs ? "Estado" : "Status"}
                </label>
                <select
                  value={cashierForm.status}
                  onChange={(e) => setCashierForm({ ...cashierForm, status: e.target.value as "ACTIVE" | "INACTIVE" })}
                  className="w-full text-xs rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-800 focus:border-cyan-500 focus:outline-none"
                >
                  <option value="ACTIVE">{isEs ? "Activo (Habilitado para cobrar)" : "Active (Enabled for POS checkout)"}</option>
                  <option value="INACTIVE">{isEs ? "Inactivo (Deshabilitado)" : "Inactive (Disabled)"}</option>
                </select>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setIsCashierModalOpen(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                {isEs ? "Cancelar" : "Cancel"}
              </button>
              <button
                type="button"
                onClick={handleSaveCashier}
                disabled={!cashierForm.name.trim()}
                className="rounded-xl bg-cyan-600 px-4 py-2 text-xs font-bold text-white hover:bg-cyan-700 disabled:opacity-50"
              >
                {editingCashier ? (isEs ? "Actualizar" : "Update") : (isEs ? "Crear Cajero" : "Create Cashier")}
              </button>
            </div>
          </div>
        </div>
      )}

      {editingRoleAccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-xs">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="role-access-modal-title"
            className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl animate-in zoom-in-95"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 id="role-access-modal-title" className="text-sm font-bold text-slate-900">
                  {isEs ? "Acceso a módulos" : "Module access"}
                </h3>
                <p className="mt-1 text-xs text-slate-500">{editingRoleAccess}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingRoleAccess(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label={isEs ? "Cerrar" : "Close"}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {POS_ACCESS_MODULES.map((module) => (
                <label
                  key={module}
                  className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-slate-200 px-3 py-2.5 text-xs font-medium text-slate-700 transition hover:border-cyan-300 hover:bg-cyan-50/50"
                >
                  <input
                    type="checkbox"
                    checked={selectedRoleModules.includes(module)}
                    onChange={(event) => {
                      setSelectedRoleModules((current) =>
                        event.target.checked
                          ? [...current, module]
                          : current.filter((selected) => selected !== module)
                      );
                    }}
                    className="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                  />
                  {getModuleLabel(module)}
                </label>
              ))}
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingRoleAccess(null)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                {isEs ? "Cancelar" : "Cancel"}
              </button>
              <button
                type="button"
                onClick={handleSaveRoleAccess}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {isEs ? "Guardar acceso" : "Save access"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL: CONFIRM DELETE --- */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/45 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-50 text-rose-600 mb-3">
              <Trash2 className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">
              {isEs ? "¿Confirmar eliminación?" : "Confirm deletion"}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {isEs
                ? `¿Estás seguro de que deseas eliminar "${deleteTarget.name}"? Esta acción no se puede deshacer.`
                : `Are you sure you want to delete "${deleteTarget.name}"? This action cannot be undone.`}
            </p>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                {isEs ? "Cancelar" : "Cancel"}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (deleteTarget.type === "terminal") {
                    handleDeleteTerminal(deleteTarget.id);
                  } else {
                    handleDeleteCashier(deleteTarget.id);
                  }
                }}
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700"
              >
                {isEs ? "Eliminar" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
