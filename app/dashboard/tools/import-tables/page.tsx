"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type StoreOption = {
  id: string;
  name: string;
};

type ImportTable = "categories" | "products" | "customers";

type ImportResult = {
  summary: {
    table: ImportTable;
    totalRows: number;
    processed: number;
    created: number;
    updated: number;
    skipped: number;
    errors: Array<{
      row: number;
      message: string;
    }>;
  };
};

function escapeCsvCell(value: unknown) {
  const text = value === null || value === undefined ? "" : String(value);

  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

function toCsv(rows: Array<Record<string, unknown>>) {
  if (!rows.length) {
    return "";
  }

  const headers = Object.keys(rows[0]);
  const headerLine = headers.map(escapeCsvCell).join(",");
  const bodyLines = rows.map((row) => headers.map((header) => escapeCsvCell(row[header])).join(","));

  return [headerLine, ...bodyLines].join("\n");
}

function getTemplateRows(table: ImportTable): Array<Record<string, unknown>> {
  if (table === "categories") {
    return [
      {
        name: "Accessories",
        slug: "accessories",
        description: "Product accessories and add-ons",
      },
    ];
  }

  if (table === "customers") {
    return [
      {
        email: "buyer@example.com",
        firstName: "Alex",
        lastName: "Rivera",
        phone: "5551234567",
        shippingAddressLine1: "123 Main St",
        shippingAddressLine2: "Apt 5B",
        shippingAddressCity: "Miami",
        shippingAddressState: "FL",
        shippingAddressPostalCode: "33101",
        shippingAddressCountry: "US",
        billingAddressLine1: "123 Main St",
        billingAddressLine2: "Apt 5B",
        billingAddressCity: "Miami",
        billingAddressState: "FL",
        billingAddressPostalCode: "33101",
        billingAddressCountry: "US",
      },
    ];
  }

  return [
    {
      title: "Classic Hoodie",
      slug: "classic-hoodie",
      description: "Midweight cotton hoodie",
      dimension: "10 x 5 x 2 in",
      weight: "1.5 lbs",
      manufacturer: "Acme Apparel",
      condition: "NEW",
      conditionNotes: "Brand new in factory packaging",
      imageUrl: "https://example.com/images/hoodie.jpg",
      status: "ACTIVE",
      productType: "PHYSICAL",
      featured: "false",
      category: "Apparel",
      categorySlug: "apparel",
      variantTitle: "Default",
      sku: "HD-001",
      price: "49.99",
      compareAtPrice: "59.99",
      inventory: "25",
    },
  ];
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];

    if (char === "\"") {
      const next = text[i + 1];

      if (inQuotes && next === "\"") {
        value += "\"";
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && char === ",") {
      row.push(value.trim());
      value = "";
      continue;
    }

    if (!inQuotes && (char === "\n" || char === "\r")) {
      if (char === "\r" && text[i + 1] === "\n") {
        i += 1;
      }

      row.push(value.trim());
      value = "";

      if (row.some((cell) => cell !== "")) {
        rows.push(row);
      }

      row = [];
      continue;
    }

    value += char;
  }

  row.push(value.trim());

  if (row.some((cell) => cell !== "")) {
    rows.push(row);
  }

  return rows;
}

function rowsFromCsv(text: string): Array<Record<string, string>> {
  const parsed = parseCsv(text);

  if (parsed.length < 2) {
    return [];
  }

  const headers = parsed[0].map((header) => header.trim());
  const dataRows = parsed.slice(1);

  return dataRows.map((row) => {
    const entry: Record<string, string> = {};
    headers.forEach((header, index) => {
      entry[header] = row[index] ?? "";
    });
    return entry;
  });
}

function rowsFromJson(text: string): Array<Record<string, unknown>> {
  const parsed = JSON.parse(text) as unknown;

  if (Array.isArray(parsed)) {
    return parsed.filter((item) => item && typeof item === "object") as Array<Record<string, unknown>>;
  }

  if (parsed && typeof parsed === "object" && Array.isArray((parsed as { rows?: unknown }).rows)) {
    return ((parsed as { rows: unknown[] }).rows).filter(
      (item) => item && typeof item === "object",
    ) as Array<Record<string, unknown>>;
  }

  return [];
}

export default function ImportTablesPage() {
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState("");
  const [table, setTable] = useState<ImportTable>("products");
  const [file, setFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

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

  const expectedColumns = useMemo(() => {
    if (table === "categories") {
      return "name, slug (optional), description (optional)";
    }

    if (table === "customers") {
      return "email, firstName (optional), lastName (optional), phone (optional), shippingAddressLine1/City/State/PostalCode/Country (optional), billingAddressLine1/City/State/PostalCode/Country (optional)";
    }

    return "title, slug (optional), description (optional), status (optional), productType (optional), price/sku/inventory (optional), category/categorySlug (optional)";
  }, [table]);

  async function handleImport(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setResult(null);

    if (!selectedStoreId) {
      setError("Please choose a store.");
      return;
    }

    if (!file) {
      setError("Please choose a file to import.");
      return;
    }

    setIsImporting(true);

    try {
      const text = await file.text();
      const lowerName = file.name.toLowerCase();
      const isJson = file.type.includes("json") || lowerName.endsWith(".json");

      const rows = isJson ? rowsFromJson(text) : rowsFromCsv(text);

      if (!rows.length) {
        throw new Error("No data rows found. Make sure your file includes headers and rows.");
      }

      const response = await fetch("/api/tools/import-tables", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          table,
          storeId: selectedStoreId,
          rows,
        }),
      });

      const payload = await response.json() as ImportResult & { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || "Import failed");
      }

      setResult(payload);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Import failed");
    } finally {
      setIsImporting(false);
    }
  }

  function handleDownloadTemplate(format: "csv" | "json") {
    const rows = getTemplateRows(table);
    const content = format === "csv" ? toCsv(rows) : JSON.stringify(rows, null, 2);
    const mimeType = format === "csv" ? "text/csv;charset=utf-8" : "application/json;charset=utf-8";
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${table}-import-template.${format}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
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
              Import tables
            </h1>

            <Link
              href="/dashboard/tools"
              className="inline-flex shrink-0 items-center rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              ← Back to tools
            </Link>
          </div>
          <p className="mt-4 text-base leading-7 text-slate-600 sm:max-w-xl sm:text-lg">
            Import categories, products, or customers from CSV or JSON files.
          </p>
        </div>
      </div>

      <form onSubmit={handleImport} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
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
              onChange={(event) => setTable(event.target.value as ImportTable)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
            >
              <option value="products">Products</option>
              <option value="categories">Categories</option>
              <option value="customers">Customers</option>
            </select>
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-slate-700">File</span>
            <input
              type="file"
              accept=".csv,.json,text/csv,application/json"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-slate-700 hover:file:bg-slate-200"
            />
          </label>
        </div>

        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          Expected columns: {expectedColumns}
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleDownloadTemplate("csv")}
              className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              Download CSV template
            </button>
            <button
              type="button"
              onClick={() => handleDownloadTemplate("json")}
              className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              Download JSON template
            </button>
          </div>
        </div>

        {error ? (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        {result ? (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            <p className="font-semibold">Import complete</p>
            <p className="mt-1">
              Processed: {result.summary.processed} / {result.summary.totalRows} · Created: {result.summary.created} · Updated: {result.summary.updated} · Skipped: {result.summary.skipped}
            </p>
            {result.summary.errors.length ? (
              <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900">
                <p className="text-xs font-semibold uppercase tracking-[0.08em]">Row issues</p>
                <ul className="mt-2 space-y-1 text-sm">
                  {result.summary.errors.slice(0, 10).map((item) => (
                    <li key={`${item.row}-${item.message}`}>Row {item.row}: {item.message}</li>
                  ))}
                </ul>
                {result.summary.errors.length > 10 ? (
                  <p className="mt-2 text-xs">Showing first 10 errors of {result.summary.errors.length}.</p>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="mt-6 flex justify-end">
          <button
            type="submit"
            disabled={isImporting}
            className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isImporting ? "Importing..." : "Run import"}
          </button>
        </div>
      </form>
    </section>
  );
}
