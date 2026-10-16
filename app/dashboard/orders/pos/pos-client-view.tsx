"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import POSModule from "@/components/pos/POSModule";
import { InventoryItem, Customer, SalesRep, CompanySettings, PosStoreSettings } from "@/types/dashboard";
import { Loader2, ArrowLeft, Store, RefreshCw, AlertCircle, Settings, LogOut } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { offlineSync } from "@/lib/offline-sync";
import type { CashierSessionData } from "@/lib/session";
import {
  getLocalInventory,
  getLocalCustomers,
  getLocalSalesReps,
  getLocalMeta,
} from "@/lib/offline-db";

type StoreItem = {
  id: string;
  name: string;
  currency: string;
  customDomain?: string | null;
  logoUrl?: string | null;
  senderEmail?: string | null;
  replyToEmail?: string | null;
  shippingOrigin?: any;
};

interface PosClientViewProps {
  stores: StoreItem[];
  initialStoreId: string | null;
  userName?: string | null;
  userEmail?: string | null;
  isCashier?: boolean;
  cashierData?: CashierSessionData | null;
}

export function PosClientView({
  stores,
  initialStoreId,
  userName,
  userEmail,
  isCashier = false,
  cashierData,
}: PosClientViewProps) {
  const router = useRouter();
  const { language } = useLanguage();
  const isEs = language === "es";

  const [activeStoreId, setActiveStoreId] = useState<string>(
    initialStoreId || stores[0]?.id || ""
  );
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [salesReps, setSalesReps] = useState<SalesRep[]>([]);
  const [posSettings, setPosSettings] = useState<PosStoreSettings | undefined>(undefined);
  const [companySettings, setCompanySettings] = useState<CompanySettings | undefined>(undefined);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const activeStore = stores.find((s) => s.id === activeStoreId) || stores[0];

  const loadData = useCallback(async (storeId: string) => {
    if (!storeId) {
      setLoading(false);
      return;
    }

    setError(null);
    try {
      // 1. Fetch products, customers and POS settings from active store API
      const [productsRes, customersRes, posSettingsRes] = await Promise.all([
        fetch(`/api/products?storeId=${storeId}`, { cache: "no-store" })
          .then((r) => (r.ok ? r.json() : []))
          .catch(() => null),
        fetch(`/api/customers?storeId=${storeId}`, { cache: "no-store" })
          .then((r) => (r.ok ? r.json() : []))
          .catch(() => null),
        fetch(`/api/pos/settings?storeId=${storeId}`, { cache: "no-store" })
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null),
      ]);

      let finalInventory: InventoryItem[] | null = null;
      let finalCustomers: Customer[] | null = null;

      if (Array.isArray(productsRes)) {
        const flattenedItems: InventoryItem[] = [];
        for (const product of productsRes) {
          if (Array.isArray(product.variants) && product.variants.length > 0) {
            for (const variant of product.variants) {
              const variantTitle =
                product.variants.length > 1
                  ? `${product.title} (${variant.title})`
                  : product.title;
              const isProductTaxable = !(product.taxable === false || product.taxable === "false" || product.taxable === 0 || product.taxable === "0");
              flattenedItems.push({
                id: variant.id,
                sku: variant.sku || product.slug || variant.id.slice(-6).toUpperCase(),
                description: variantTitle,
                quantity: Number(variant.inventory ?? 0),
                cost: 0,
                price: Number(variant.price || 0),
                price2: variant.compareAtPrice ? Number(variant.compareAtPrice) : null,
                price3: variant.price3 ? Number(variant.price3) : null,
                category: product.categoryName || product.category?.name || "General",
                imageUrl: product.images?.[0] || null,
                trackingType: "NONE",
                taxable: isProductTaxable,
              });
            }
          } else {
            const isProductTaxable = !(product.taxable === false || product.taxable === "false" || product.taxable === 0 || product.taxable === "0");
            flattenedItems.push({
              id: product.id,
              sku: product.slug || product.id.slice(-6).toUpperCase(),
              description: product.title,
              quantity: 999,
              cost: 0,
              price: 0,
              category: product.categoryName || product.category?.name || "General",
              imageUrl: product.images?.[0] || null,
              trackingType: "NONE",
              taxable: isProductTaxable,
            });
          }
        }
        finalInventory = flattenedItems;
      }

      if (Array.isArray(customersRes)) {
        finalCustomers = customersRes.map((c: any) => ({
          id: c.id,
          macolaCode: null,
          rtn: "",
          name: [c.firstName, c.lastName].filter(Boolean).join(" ") || c.email || "Cliente",
          email: c.email || null,
          phone: c.phone || null,
          address: c.shippingAddress ? (typeof c.shippingAddress === "string" ? c.shippingAddress : JSON.stringify(c.shippingAddress)) : null,
          currency: activeStore?.currency || "USD",
        }));
      }

      // 2. Offline fallback if network is unavailable
      if (!finalInventory || finalInventory.length === 0) {
        const localInv = await getLocalInventory();
        if (localInv && localInv.length > 0) {
          finalInventory = localInv;
        }
      }

      if (!finalCustomers || finalCustomers.length === 0) {
        const localCust = await getLocalCustomers();
        if (localCust && localCust.length > 0) {
          finalCustomers = localCust;
        }
      }

      // POS Settings & Cashiers
      let finalPosSettings: PosStoreSettings | undefined = undefined;
      if (posSettingsRes && posSettingsRes.settings) {
        finalPosSettings = posSettingsRes.settings;
        setPosSettings(finalPosSettings);
      }

      // Default sales reps / cashiers
      const defaultReps: SalesRep[] = [
        {
          id: "rep-1",
          code: "001",
          name: userName || (isEs ? "Cajero Principal" : "Main Cashier"),
          email: userEmail || null,
          phone: null,
          zone: isEs ? "Mostrador" : "Counter",
          commissionRate: 0,
          commissionType: "PERCENT",
          monthlyTarget: 0,
          status: "ACTIVE",
        },
        {
          id: "rep-2",
          code: "002",
          name: isEs ? "Cajero Turno Tarde" : "Evening Cashier",
          email: null,
          phone: null,
          zone: isEs ? "Mostrador" : "Counter",
          commissionRate: 0,
          commissionType: "PERCENT",
          monthlyTarget: 0,
          status: "ACTIVE",
        },
      ];

      let effectiveReps = defaultReps;
      if (finalPosSettings && Array.isArray(finalPosSettings.cashiers) && finalPosSettings.cashiers.length > 0) {
        const activeCashiers = finalPosSettings.cashiers.filter((c) => c.status !== "INACTIVE");
        if (activeCashiers.length > 0) {
          effectiveReps = activeCashiers.map((c) => ({
            id: c.id,
            code: c.pin || "000",
            name: c.name,
            email: c.email || null,
            phone: c.phone || null,
            zone: c.role || (isEs ? "Mostrador" : "Counter"),
            commissionRate: 0,
            commissionType: "PERCENT",
            monthlyTarget: 0,
            status: c.status,
          }));
        }
      }

      const settings: CompanySettings = {
        nombre: activeStore?.name || "Prado Commerce Store",
        direccion: (activeStore?.shippingOrigin as any)?.address || (isEs ? "Tienda Física" : "Physical Store"),
        email: activeStore?.senderEmail || activeStore?.replyToEmail || userEmail || "",
        telefono: (activeStore?.shippingOrigin as any)?.phone || "",
        sitioWeb: activeStore?.customDomain || "",
      };

      if (finalInventory) setInventory(finalInventory);
      if (finalCustomers) setCustomers(finalCustomers);
      setSalesReps(effectiveReps);
      setCompanySettings(settings);

      // Cache locally for offline resilience
      try {
        if (finalPosSettings) {
          localStorage.setItem(`prado_pos_settings_${storeId}`, JSON.stringify(finalPosSettings));
        }
      } catch {}

      await offlineSync.cacheCatalogs({
        inventory: finalInventory || [],
        customers: finalCustomers || [],
        salesReps: effectiveReps,
        companySettings: settings,
      });
    } catch (err) {
      console.error("Error loading POS data:", err);
      setError(isEs ? "No se pudieron sincronizar todos los datos del catálogo." : "Could not synchronize all catalog data.");

      try {
        const [localInv, localCust, localReps, localComp] = await Promise.all([
          getLocalInventory(),
          getLocalCustomers(),
          getLocalSalesReps(),
          getLocalMeta("companySettings"),
        ]);
        if (localInv && localInv.length > 0) setInventory(localInv);
        if (localCust && localCust.length > 0) setCustomers(localCust);
        if (localReps && localReps.length > 0) setSalesReps(localReps);
        if (localComp) setCompanySettings(localComp);

        const cachedSettings = localStorage.getItem(`prado_pos_settings_${storeId}`);
        if (cachedSettings) {
          try {
            setPosSettings(JSON.parse(cachedSettings));
          } catch {}
        }
      } catch (localErr) {
        console.error("IndexedDB fallback error:", localErr);
      }
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [activeStore, isEs, userEmail, userName]);

  useEffect(() => {
    if (activeStoreId) {
      setLoading(true);
      void loadData(activeStoreId);
    } else {
      setLoading(false);
    }
  }, [activeStoreId, loadData]);

  const handleRefresh = async () => {
    if (!activeStoreId) return;
    setIsRefreshing(true);
    await loadData(activeStoreId);
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (err) {
      console.error("Logout error:", err);
    }
    window.location.href = "/login";
  };

  useEffect(() => {
    if (cashierData?.cashierName) {
      try {
        const existing = localStorage.getItem("prado_pos_active_shift");
        const parsed = existing ? JSON.parse(existing) : {};
        localStorage.setItem(
          "prado_pos_active_shift",
          JSON.stringify({
            registerName: parsed.registerName || (isEs ? "Caja 01 - Principal" : "Register 01 - Main"),
            cashierName: cashierData.cashierName,
          })
        );
      } catch {}
    }
  }, [cashierData?.cashierName, isEs]);

  if (!stores || stores.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center bg-white rounded-lg shadow-sm border border-slate-200 my-8">
        <Store className="w-12 h-12 text-slate-400 mb-3" />
        <h2 className="text-lg font-bold text-slate-800">
          {isEs ? "No se encontraron tiendas activas" : "No active stores found"}
        </h2>
        <p className="text-sm text-slate-500 max-w-md mt-1 mb-6">
          {isEs
            ? "Para operar el Punto de Venta (POS), primero debes crear o tener una tienda asignada en tu cuenta."
            : "To operate the Point of Sale (POS), you must first create or have a store assigned to your account."}
        </p>
        <button
          onClick={() => router.push("/dashboard/stores/new")}
          className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-medium rounded-md text-sm transition"
        >
          {isEs ? "Crear una Tienda" : "Create a Store"}
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-[500px] flex flex-col items-center justify-center text-slate-600 p-8">
        <Loader2 className="w-10 h-10 animate-spin text-cyan-600 mb-4" />
        <h2 className="font-bold text-lg text-slate-800">
          {isEs ? "Iniciando Terminal Punto de Venta..." : "Starting Point of Sale Terminal..."}
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          {isEs
            ? "Cargando catálogo de productos y configuración de caja"
            : "Loading product catalog and register settings"}
        </p>
      </div>
    );
  }

  const currencySymbol = activeStore?.currency === "HNL" ? "L" : "$";

  return (
    <div className="space-y-4">
      {/* Top Bar Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 sm:px-4 rounded-lg border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          {isCashier ? (
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-md transition shadow-2xs cursor-pointer"
              title={isEs ? "Cerrar sesión de cajero" : "Log out"}
            >
              <LogOut className="w-3.5 h-3.5 text-rose-600" />
              <span>{isEs ? "Cerrar Sesión" : "Log Out"}</span>
            </button>
          ) : (
            <button
              onClick={() => router.push("/dashboard/orders")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-md transition cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{isEs ? "Volver a Pedidos" : "Back to Orders"}</span>
            </button>
          )}

          {/* Store Switcher or Cashier Store Indicator */}
          {isCashier ? (
            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600 bg-slate-50 px-2.5 py-1.5 rounded-md border border-slate-200">
              <Store className="w-3.5 h-3.5 text-cyan-600" />
              <span className="font-semibold text-slate-800">{activeStore?.name}</span>
            </div>
          ) : stores.length > 1 ? (
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-500 hidden sm:inline">
                {isEs ? "Tienda:" : "Store:"}
              </span>
              <select
                value={activeStoreId}
                onChange={(e) => setActiveStoreId(e.target.value)}
                className="text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-300 rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.currency})
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </div>

        <div className="flex items-center gap-2.5">
          {(!isCashier || cashierData?.cashierRole === "MANAGER") && (
            <Link
              href={`/dashboard/settings/pos?storeId=${activeStoreId}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-cyan-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-md shadow-2xs transition"
            >
              <Settings className="w-3.5 h-3.5 text-cyan-600" />
              <span>{isEs ? "Configurar Cajas y Cajeros" : "POS Settings"}</span>
            </Link>
          )}

          {error && (
            <span className="text-xs text-amber-600 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              {error}
            </span>
          )}

          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md transition disabled:opacity-50 cursor-pointer"
            title={isEs ? "Recargar productos e inventario" : "Reload products and inventory"}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-cyan-600" : ""}`} />
            <span className="hidden xs:inline">{isEs ? "Sincronizar" : "Sync"}</span>
          </button>
        </div>
      </div>

      {/* Embedded POS Terminal */}
      <div className="rounded-lg overflow-hidden border border-slate-300 shadow-md">
        <POSModule
          inventory={inventory}
          setInventory={setInventory}
          customers={customers}
          salesReps={salesReps}
          posSettings={posSettings}
          companySettings={companySettings}
          companyLogo={activeStore?.logoUrl || null}
          storeId={activeStore?.id}
          language={language as "es" | "en"}
          formatCurrency={(val: number) =>
            `${currencySymbol} ${Number(val || 0).toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`
          }
          onRefreshData={handleRefresh}
          onNavigateBack={isCashier ? handleLogout : () => router.push("/dashboard/orders")}
          isStandalone={false}
          activeCashierName={cashierData?.cashierName}
          isCashier={isCashier}
        />
      </div>
    </div>
  );
}
