"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { getStoredActiveStoreId, setStoredActiveStoreId } from "@/lib/dashboard-store-selection";

type StoreOption = {
  id: string;
  name: string;
};

type ExportTable = "categories" | "products" | "customers";
type ExportFormat = "csv" | "json";

export default function ExportTablesPage() {
  const { language } = useLanguage();
  const isEs = language === "es";
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState("");
  const [table, setTable] = useState<ExportTable>("products");
  const [format, setFormat] = useState<ExportFormat>("csv");
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [userPlan, setUserPlan] = useState<string>("STARTER");

  useEffect(() => {
    async function loadData() {
      try {
        const [storesRes, userRes] = await Promise.all([
          fetch("/api/stores", { cache: "no-store" }),
          fetch("/api/auth/me", { cache: "no-store" }),
        ]);

        const payload = (await storesRes.json()) as Array<{ id: string; name: string }>;
        if (storesRes.ok) {
          setStores(payload);
          const stored = getStoredActiveStoreId();
          const matching = stored && stored !== "ALL" && payload.some((s) => s.id === stored) ? stored : payload[0]?.id ?? "";
          setSelectedStoreId(matching);
        }

        if (userRes.ok) {
          const userData = (await userRes.json()) as { user?: { plan?: string } };
          if (userData?.user?.plan) {
            setUserPlan(userData.user.plan);
          }
        }
      } catch {
        setError(
          isEs
            ? "No se pudieron cargar las tiendas. Actualiza e inténtalo de nuevo."
            : "Could not load stores. Refresh and try again."
        );
      }
    }

    void loadData();
  }, [isEs]);

  async function handleExport(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!selectedStoreId) {
      setError(isEs ? "Por favor selecciona una tienda." : "Please choose a store.");
      return;
    }

    setIsExporting(true);

    try {
      const params = new URLSearchParams({
        storeId: selectedStoreId,
        table,
        format,
      });

      const response = await fetch(`/api/tools/export-tables?${params.toString()}`, {
        method: "GET",
      });

      if (!response.ok) {
        const payload = await response.json() as { error?: string };
        throw new Error(payload.error || (isEs ? "Error al exportar" : "Export failed"));
      }

      const blob = await response.blob();
      const date = new Date().toISOString().slice(0, 10);
      const extension = format === "json" ? "json" : "csv";
      const fileName = `${table}-${date}.${extension}`;
      const downloadUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = downloadUrl;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(downloadUrl);

      const tableNames: Record<string, string> = {
        products: isEs ? "productos" : "products",
        categories: isEs ? "categorías" : "categories",
        customers: isEs ? "clientes" : "customers",
      };

      setSuccess(
        isEs
          ? `Se exportaron los ${tableNames[table]} en formato ${extension.toUpperCase()}.`
          : `Exported ${table} as ${extension.toUpperCase()}.`,
      );
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : (isEs ? "Error al exportar" : "Export failed"));
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <section className="space-y-4">
      <div className="w-full">
        <div>
          <div className="flex items-start justify-between gap-4">
            <h1 className="text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">
              {isEs ? "Exportar tablas" : "Export tables"}
            </h1>

            <Link
              href="/dashboard/tools"
              className="inline-flex shrink-0 items-center rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              {isEs ? "← Volver a herramientas" : "← Back to tools"}
            </Link>
          </div>
          <p className="mt-1 max-w-xl text-sm text-slate-500">
            {isEs
              ? "Exporta categorías, productos o clientes en formato CSV o JSON."
              : "Export categories, products, or customers as CSV or JSON."}
          </p>
        </div>
      </div>

      {userPlan === "STARTER" ? (
        <div className="rounded-xl border border-cyan-200 bg-cyan-50 p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-cyan-950">
                {isEs ? "Exportación CSV/JSON exclusiva de Pro & Enterprise" : "CSV/JSON Export is a Pro & Enterprise feature"}
              </p>
              <p className="mt-1 text-xs text-cyan-800 leading-relaxed">
                {isEs
                  ? "Estás en el plan Starter. La descarga y sincronización de catálogos y clientes en CSV/JSON está reservada para comerciantes Pro y Enterprise."
                  : "You are on the Starter plan. Downloading and synchronizing catalogs and customers in CSV/JSON is reserved for Pro and Enterprise merchants."}
              </p>
            </div>
            <Link
              href="/dashboard/settings/manage-plan-panel"
              className="inline-flex shrink-0 items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800"
            >
              {isEs ? "Actualizar a Pro" : "Upgrade to Pro"}
            </Link>
          </div>
        </div>
      ) : null}

      <form onSubmit={handleExport} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid gap-4 md:grid-cols-3">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-slate-700">{isEs ? "Tienda" : "Store"}</span>
            <select
              value={selectedStoreId}
              onChange={(event) => {
                const newId = event.target.value;
                setSelectedStoreId(newId);
                setStoredActiveStoreId(newId);
              }}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
            >
              {stores.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-slate-700">{isEs ? "Tabla" : "Table"}</span>
            <select
              value={table}
              onChange={(event) => setTable(event.target.value as ExportTable)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
            >
              <option value="products">{isEs ? "Productos" : "Products"}</option>
              <option value="categories">{isEs ? "Categorías" : "Categories"}</option>
              <option value="customers">{isEs ? "Clientes" : "Customers"}</option>
            </select>
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-slate-700">{isEs ? "Formato" : "Format"}</span>
            <select
              value={format}
              onChange={(event) => setFormat(event.target.value as ExportFormat)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
            >
              <option value="csv">CSV</option>
              <option value="json">JSON</option>
            </select>
          </label>
        </div>

        {error ? (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        {success ? (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {success}
          </div>
        ) : null}

        <div className="mt-6 flex justify-end">
          <button
            type="submit"
            disabled={isExporting}
            className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isExporting
              ? (isEs ? "Exportando..." : "Exporting...")
              : (isEs ? "Exportar ahora" : "Export now")}
          </button>
        </div>
      </form>
    </section>
  );
}
