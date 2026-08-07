"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type StoreOption = {
  id: string;
  name: string;
};

type ExportTable = "categories" | "products" | "customers";
type ExportFormat = "csv" | "json";

export default function ExportTablesPage() {
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState("");
  const [table, setTable] = useState<ExportTable>("products");
  const [format, setFormat] = useState<ExportFormat>("csv");
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    async function loadStores() {
      try {
        const response = await fetch("/api/stores", { cache: "no-store" });
        const payload = await response.json() as Array<{ id: string; name: string }>;

        if (!response.ok) {
          throw new Error("Could not load stores");
        }

        setStores(payload);
        setSelectedStoreId(payload[0]?.id ?? "");
      } catch {
        setError("Could not load stores. Refresh and try again.");
      }
    }

    void loadStores();
  }, []);

  async function handleExport(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!selectedStoreId) {
      setError("Please choose a store.");
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
        throw new Error(payload.error || "Export failed");
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

      setSuccess(`Exported ${table} as ${extension.toUpperCase()}.`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Export failed");
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <section className="space-y-4">
      <div className="w-full">
        <div>
          <p className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
            Tools
          </p>
          <div className="mt-4 flex items-start justify-between gap-4">
            <h1 className="text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">
              Export tables
            </h1>

            <Link
              href="/dashboard/tools"
              className="inline-flex shrink-0 items-center rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              ← Back to tools
            </Link>
          </div>
          <p className="mt-4 text-base leading-7 text-slate-600 sm:max-w-xl sm:text-lg">
            Export categories, products, or customers as CSV or JSON.
          </p>
        </div>
      </div>

      <form onSubmit={handleExport} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid gap-4 md:grid-cols-3">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-slate-700">Store</span>
            <select
              value={selectedStoreId}
              onChange={(event) => setSelectedStoreId(event.target.value)}
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
            <span className="text-sm font-medium text-slate-700">Table</span>
            <select
              value={table}
              onChange={(event) => setTable(event.target.value as ExportTable)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
            >
              <option value="products">Products</option>
              <option value="categories">Categories</option>
              <option value="customers">Customers</option>
            </select>
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-slate-700">Format</span>
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
            {isExporting ? "Exporting..." : "Export now"}
          </button>
        </div>
      </form>
    </section>
  );
}
