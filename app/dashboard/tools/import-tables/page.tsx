"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "@/lib/i18n/language-context";
import { getStoredActiveStoreId, setStoredActiveStoreId } from "@/lib/dashboard-store-selection";

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

const MAX_IMPORT_REQUEST_BYTES = 3 * 1024 * 1024;
const MAX_IMPORT_ROWS_PER_REQUEST = 500;

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
      lookups: "0123456789012;0123456789013",
      price: "49.99",
      cost: "22.50",
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

function chunkImportRows(
  rows: Array<Record<string, unknown>>,
  table: ImportTable,
  storeId: string,
  isEs: boolean,
): Array<Array<Record<string, unknown>>> {
  const encoder = new TextEncoder();
  const emptyPayloadBytes = encoder.encode(JSON.stringify({ table, storeId, rows: [] })).byteLength - 2;
  const chunks: Array<Array<Record<string, unknown>>> = [];
  let chunk: Array<Record<string, unknown>> = [];
  let chunkBytes = emptyPayloadBytes;

  for (const row of rows) {
    const serializedRow = JSON.stringify(row);
    const rowBytes = encoder.encode(serializedRow).byteLength;
    let nextBytes = chunkBytes + (chunk.length ? 1 : 0) + rowBytes;

    if (
      chunk.length &&
      (chunk.length >= MAX_IMPORT_ROWS_PER_REQUEST || nextBytes > MAX_IMPORT_REQUEST_BYTES)
    ) {
      chunks.push(chunk);
      chunk = [];
      chunkBytes = emptyPayloadBytes;
      nextBytes = chunkBytes + rowBytes;
    }

    if (nextBytes > MAX_IMPORT_REQUEST_BYTES) {
      throw new Error(
        isEs
          ? "Una fila es demasiado grande para importar. Reduce el tamaño de sus campos de texto e inténtalo de nuevo."
          : "A row is too large to import. Reduce the size of its text fields and try again.",
      );
    }

    chunk.push(row);
    chunkBytes = nextBytes;
  }

  if (chunk.length) {
    chunks.push(chunk);
  }

  return chunks;
}

export default function ImportTablesPage() {
  const { language } = useLanguage();
  const isEs = language === "es";

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
          throw new Error(isEs ? "No se pudieron cargar las tiendas" : "Could not load stores");
        }

        setStores(payload);
        const stored = getStoredActiveStoreId();
        const matching = stored && stored !== "ALL" && payload.some((s) => s.id === stored) ? stored : payload[0]?.id ?? "";
        setSelectedStoreId(matching);
      } catch {
        setError(isEs ? "No se pudieron cargar las tiendas. Actualiza la página e inténtalo de nuevo." : "Could not load stores. Refresh and try again.");
      }
    }

    void loadStores();
  }, [isEs]);

  const expectedColumns = useMemo(() => {
    const opt = isEs ? "opcional" : "optional";
    if (table === "categories") {
      return `name, slug (${opt}), description (${opt})`;
    }

    if (table === "customers") {
      return `email, firstName (${opt}), lastName (${opt}), phone (${opt}), shippingAddressLine1/City/State/PostalCode/Country (${opt}), billingAddressLine1/City/State/PostalCode/Country (${opt})`;
    }

    return `title, slug (${opt}), description (${opt}), status (${opt}), productType (${opt}), price/sku/lookups/cost/inventory (${opt}; varios códigos separados por ;), category/categorySlug (${opt})`;
  }, [table, isEs]);

  async function handleImport(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setResult(null);

    if (!selectedStoreId) {
      setError(isEs ? "Por favor selecciona una tienda." : "Please choose a store.");
      return;
    }

    if (!file) {
      setError(isEs ? "Por favor selecciona un archivo para importar." : "Please choose a file to import.");
      return;
    }

    setIsImporting(true);
    let submittedRows = 0;
    let totalRows = 0;

    try {
      const text = await file.text();
      const lowerName = file.name.toLowerCase();
      const isJson = file.type.includes("json") || lowerName.endsWith(".json");

      const rows = isJson ? rowsFromJson(text) : rowsFromCsv(text);

      if (!rows.length) {
        throw new Error(
          isEs
            ? "No se encontraron filas de datos. Asegúrate de que el archivo incluya encabezados y filas."
            : "No data rows found. Make sure your file includes headers and rows."
        );
      }

      totalRows = rows.length;
      const chunks = chunkImportRows(rows, table, selectedStoreId, isEs);
      const summary: ImportResult["summary"] = {
        table,
        totalRows: rows.length,
        processed: 0,
        created: 0,
        updated: 0,
        skipped: 0,
        errors: [],
      };

      for (const chunk of chunks) {
        const response = await fetch("/api/tools/import-tables", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            table,
            storeId: selectedStoreId,
            rows: chunk,
          }),
        });
        const responseText = await response.text();
        let payload: (ImportResult & { error?: string }) | null = null;

        try {
          payload = responseText ? JSON.parse(responseText) as ImportResult & { error?: string } : null;
        } catch {
          const message = response.status === 413
            ? isEs
              ? "La solicitud de importación es demasiado grande. Reduce el tamaño de algunas filas e inténtalo de nuevo."
              : "The import request is too large. Reduce the size of some rows and try again."
            : !response.ok && responseText
              ? responseText.slice(0, 200)
              : isEs
                ? "El servidor devolvió una respuesta inesperada."
                : "The server returned an unexpected response.";
          throw new Error(message);
        }

        if (!response.ok) {
          throw new Error(
            payload?.error ||
              (response.status === 413
                ? isEs
                  ? "La solicitud de importación es demasiado grande. Reduce el tamaño de algunas filas e inténtalo de nuevo."
                  : "The import request is too large. Reduce the size of some rows and try again."
                : isEs
                  ? "Error al importar"
                  : "Import failed"),
          );
        }

        if (!payload?.summary) {
          throw new Error(
            isEs ? "El servidor devolvió una respuesta de importación no válida." : "The server returned an invalid import response.",
          );
        }

        summary.processed += payload.summary.processed;
        summary.created += payload.summary.created;
        summary.updated += payload.summary.updated;
        summary.skipped += payload.summary.skipped;
        summary.errors.push(...payload.summary.errors.map((item) => ({
          ...item,
          row: item.row + submittedRows,
        })));
        submittedRows += chunk.length;
      }

      setResult({ summary });
    } catch (submitError) {
      const message = submitError instanceof Error
        ? submitError.message
        : isEs
          ? "Error al importar"
          : "Import failed";
      setError(
        isEs
          ? `${message}${submittedRows > 0 ? ` La importación se detuvo después de enviar ${submittedRows} de ${totalRows} filas; es posible que algunas ya se hayan importado.` : ""}`
          : `${message}${submittedRows > 0 ? ` The import stopped after submitting ${submittedRows} of ${totalRows} rows; some may already have been imported.` : ""}`,
      );
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
          <div className="flex items-start justify-between gap-4">
            <h1 className="text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">
              {isEs ? "Importar tablas" : "Import tables"}
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
              ? "Importa categorías, productos o clientes desde archivos CSV o JSON."
              : "Import categories, products, or customers from CSV or JSON files."}
          </p>
        </div>
      </div>

      <form onSubmit={handleImport} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
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
              onChange={(event) => setTable(event.target.value as ImportTable)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
            >
              <option value="products">{isEs ? "Productos" : "Products"}</option>
              <option value="categories">{isEs ? "Categorías" : "Categories"}</option>
              <option value="customers">{isEs ? "Clientes" : "Customers"}</option>
            </select>
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-slate-700">{isEs ? "Archivo" : "File"}</span>
            <input
              type="file"
              accept=".csv,.json,text/csv,application/json"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-slate-700 hover:file:bg-slate-200"
            />
          </label>
        </div>

        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          {isEs ? "Columnas esperadas: " : "Expected columns: "} {expectedColumns}
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleDownloadTemplate("csv")}
              className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              {isEs ? "Descargar plantilla CSV" : "Download CSV template"}
            </button>
            <button
              type="button"
              onClick={() => handleDownloadTemplate("json")}
              className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              {isEs ? "Descargar plantilla JSON" : "Download JSON template"}
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
            <p className="font-semibold">{isEs ? "Importación completada" : "Import complete"}</p>
            <p className="mt-1">
              {isEs
                ? `Procesadas: ${result.summary.processed} / ${result.summary.totalRows} · Creadas: ${result.summary.created} · Actualizadas: ${result.summary.updated} · Omitidas: ${result.summary.skipped}`
                : `Processed: ${result.summary.processed} / ${result.summary.totalRows} · Created: ${result.summary.created} · Updated: ${result.summary.updated} · Skipped: ${result.summary.skipped}`}
            </p>
            {result.summary.errors.length ? (
              <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900">
                <p className="text-xs font-semibold uppercase tracking-[0.08em]">{isEs ? "Problemas en filas" : "Row issues"}</p>
                <ul className="mt-2 space-y-1 text-sm">
                  {result.summary.errors.slice(0, 10).map((item) => (
                    <li key={`${item.row}-${item.message}`}>
                      {isEs ? `Fila ${item.row}: ${item.message}` : `Row ${item.row}: ${item.message}`}
                    </li>
                  ))}
                </ul>
                {result.summary.errors.length > 10 ? (
                  <p className="mt-2 text-xs">
                    {isEs
                      ? `Mostrando los primeros 10 errores de ${result.summary.errors.length}.`
                      : `Showing first 10 errors of ${result.summary.errors.length}.`}
                  </p>
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
            {isImporting
              ? isEs ? "Importando..." : "Importing..."
              : isEs ? "Ejecutar importación" : "Run import"}
          </button>
        </div>
      </form>
    </section>
  );
}
