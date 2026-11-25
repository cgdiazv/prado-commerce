"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRightLeft, FileText, Mail, MoreVertical, Pencil, Plus, Printer, Search, Store, Trash2 } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";

type StoreOption = { id: string; name: string; currency: string };
type Quote = {
  id: string;
  storeId: string;
  quoteNumber: number;
  customerEmail: string;
  customerName: string | null;
  status: "DRAFT" | "SENT" | "ACCEPTED" | "REJECTED" | "EXPIRED" | "CONVERTED";
  total: string;
  currency: string;
  validUntil: string | null;
  createdAt: string;
};

type Props = {
  initialStores: StoreOption[];
  initialQuotes: Quote[];
  selectedStoreId: string | null;
  setupError?: string | null;
};

export function QuotesDashboard({
  initialStores,
  initialQuotes,
  selectedStoreId,
  setupError = null,
}: Props) {
  const router = useRouter();
  const { language } = useLanguage();
  const isEs = language === "es";
  const [quotes, setQuotes] = useState(initialQuotes);
  const [activeStoreId, setActiveStoreId] = useState(selectedStoreId ?? "ALL");
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);

  const visibleQuotes = useMemo(() => {
    const query = search.trim().toLowerCase();
    return quotes.filter(
      (quote) =>
        (activeStoreId === "ALL" || quote.storeId === activeStoreId) &&
        (!query ||
          [String(quote.quoteNumber), quote.customerName ?? "", quote.customerEmail, quote.status]
            .some((value) => value.toLowerCase().includes(query))),
    );
  }, [quotes, activeStoreId, search]);

  async function updateStatus(quote: Quote, status: Quote["status"]) {
    setWorkingId(quote.id);
    setError(null);
    try {
      const response = await fetch(`/api/quotes/${quote.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error || "Could not update quote");
      setQuotes((current) => current.map((item) => item.id === quote.id ? { ...item, status } : item));
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Could not update quote");
    } finally {
      setWorkingId(null);
    }
  }

  async function convertQuote(quote: Quote) {
    if (!window.confirm(isEs
      ? "¿Convertir esta cotización en un pedido no pagado? Se descontará el inventario de los productos incluidos."
      : "Convert this quote into an unpaid order? Inventory will be deducted for the included products.")) return;
    setWorkingId(quote.id);
    setError(null);
    try {
      const response = await fetch(`/api/quotes/${quote.id}/convert`, { method: "POST" });
      const result = (await response.json()) as { id?: string; error?: string };
      if (!response.ok || !result.id) throw new Error(result.error || "Could not convert quote");
      router.push(`/dashboard/orders/${result.id}`);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Could not convert quote");
    } finally {
      setWorkingId(null);
    }
  }

  async function sendQuote(quote: Quote) {
    setWorkingId(quote.id);
    setError(null);
    try {
      const response = await fetch(`/api/quotes/${quote.id}/send`, { method: "POST" });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error || "Could not send quote");
      setQuotes((current) =>
        current.map((item) => item.id === quote.id ? { ...item, status: "SENT" } : item),
      );
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Could not send quote");
    } finally {
      setWorkingId(null);
    }
  }

  async function deleteQuote(quote: Quote) {
    if (!window.confirm(isEs ? "¿Eliminar esta cotización?" : "Delete this quote?")) return;
    setWorkingId(quote.id);
    try {
      const response = await fetch(`/api/quotes/${quote.id}`, { method: "DELETE" });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error || "Could not delete quote");
      setQuotes((current) => current.filter((item) => item.id !== quote.id));
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Could not delete quote");
    } finally {
      setWorkingId(null);
    }
  }

  return (
    <section className="min-w-0 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">{isEs ? "Cotizaciones" : "Quotes"}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {isEs ? "Prepara precios y conviértelos en pedidos cuando el cliente acepte." : "Prepare pricing and convert quotes to orders when customers accept."}
          </p>
        </div>
        <Link
          href={`/dashboard/orders/quotes/new${activeStoreId && activeStoreId !== "ALL" ? `?storeId=${encodeURIComponent(activeStoreId)}` : ""}`}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 sm:w-auto"
        >
          <Plus className="h-4 w-4" />
          {isEs ? "Nueva cotización" : "New quote"}
        </Link>
      </div>

      {setupError || error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{setupError || error}</div>
      ) : null}

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row">
          <label className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={isEs ? "Buscar cotización o cliente..." : "Search quote or customer..."}
              className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-slate-400"
            />
          </label>
          <label className="relative sm:w-64">
            <Store className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <select
              value={activeStoreId}
              onChange={(event) => setActiveStoreId(event.target.value)}
              className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-slate-400"
            >
              <option value="ALL">{isEs ? "Todas las tiendas" : "All stores"}</option>
              {initialStores.map((store) => <option key={store.id} value={store.id}>{store.name}</option>)}
            </select>
          </label>
        </div>
      </div>

      <div className="overflow-x-auto overflow-y-visible rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[840px] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">{isEs ? "Cotización" : "Quote"}</th>
              <th className="px-4 py-3">{isEs ? "Cliente" : "Customer"}</th>
              <th className="px-4 py-3">{isEs ? "Tienda" : "Store"}</th>
              <th className="px-4 py-3">{isEs ? "Válida hasta" : "Valid until"}</th>
              <th className="px-4 py-3">{isEs ? "Estado" : "Status"}</th>
              <th className="px-4 py-3 text-right">{isEs ? "Total" : "Total"}</th>
              <th className="px-4 py-3 text-right">{isEs ? "Acciones" : "Actions"}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {visibleQuotes.map((quote) => {
              const store = initialStores.find((item) => item.id === quote.storeId);
              const quoteHref = `/dashboard/orders/quotes/${quote.id}`;
              return (
                <tr
                  key={quote.id}
                  onClick={() => router.push(quoteHref)}
                  className="cursor-pointer transition hover:bg-slate-50/70"
                >
                  <td className="px-4 py-3 font-semibold text-slate-900">
                    <Link
                      href={quoteHref}
                      onClick={(event) => event.stopPropagation()}
                      className="hover:text-cyan-700 hover:underline"
                    >
                      #{quote.quoteNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{quote.customerName || quote.customerEmail}</p>
                    {quote.customerName ? <p className="text-xs text-slate-500">{quote.customerEmail}</p> : null}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{store?.name ?? quote.storeId}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {quote.validUntil ? new Date(quote.validUntil).toLocaleDateString(isEs ? "es" : "en") : "—"}
                  </td>
                  <td className="px-4 py-3" onClick={(event) => event.stopPropagation()}>
                    {quote.status === "CONVERTED" ? (
                      <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">{isEs ? "Convertida" : "Converted"}</span>
                    ) : (
                      <select
                        value={quote.status}
                        disabled={workingId === quote.id}
                        onChange={(event) => updateStatus(quote, event.target.value as Quote["status"])}
                        className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs outline-none"
                      >
                        <option value="DRAFT">{isEs ? "Borrador" : "Draft"}</option>
                        <option value="SENT">{isEs ? "Enviada" : "Sent"}</option>
                        <option value="ACCEPTED">{isEs ? "Aceptada" : "Accepted"}</option>
                        <option value="REJECTED">{isEs ? "Rechazada" : "Rejected"}</option>
                        <option value="EXPIRED">{isEs ? "Vencida" : "Expired"}</option>
                      </select>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-900">{quote.currency} {Number(quote.total).toFixed(2)}</td>
                  <td className="px-4 py-3 text-right" onClick={(event) => event.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      {quote.status !== "CONVERTED" ? (
                        <>
                          <button
                            disabled={workingId === quote.id}
                            onClick={() => sendQuote(quote)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50 hover:text-cyan-700 disabled:opacity-50"
                            aria-label={
                              quote.status === "DRAFT"
                                ? isEs ? "Enviar cotización" : "Send quote"
                                : isEs ? "Reenviar cotización" : "Resend quote"
                            }
                            title={
                              quote.status === "DRAFT"
                                ? isEs ? "Enviar cotización" : "Send quote"
                                : isEs ? "Reenviar cotización" : "Resend quote"
                            }
                          >
                            <Mail className="h-4 w-4" />
                          </button>
                          <div
                            className="relative"
                            onBlur={(event) => {
                              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                                setOpenMenuId((current) => current === quote.id ? null : current);
                              }
                            }}
                          >
                            <button
                              type="button"
                              disabled={workingId === quote.id}
                              onClick={(event) => {
                                const rect = event.currentTarget.getBoundingClientRect();
                                setMenuPosition({
                                  top: rect.bottom + 4,
                                  left: Math.max(8, rect.right - 176),
                                });
                                setOpenMenuId((current) => current === quote.id ? null : quote.id);
                              }}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50"
                              aria-label={isEs ? "Más acciones" : "More actions"}
                              aria-expanded={openMenuId === quote.id}
                              aria-haspopup="menu"
                              title={isEs ? "Más acciones" : "More actions"}
                            >
                              <MoreVertical className="h-4 w-4" />
                            </button>
                            {openMenuId === quote.id ? (
                              <div
                                role="menu"
                                style={{
                                  top: menuPosition?.top,
                                  left: menuPosition?.left,
                                }}
                                className="fixed z-[100] mt-1 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 text-left shadow-xl"
                              >
                                <button
                                  type="button"
                                  role="menuitem"
                                  onMouseDown={(event) => event.preventDefault()}
                                  onClick={() => {
                                    setOpenMenuId(null);
                                    router.push(quoteHref);
                                  }}
                                  className="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                                >
                                  <Pencil className="h-4 w-4 text-slate-500" />
                                  {isEs ? "Editar cotización" : "Edit quote"}
                                </button>
                                <button
                                  type="button"
                                  role="menuitem"
                                  onMouseDown={(event) => event.preventDefault()}
                                  onClick={() => {
                                    setOpenMenuId(null);
                                    window.open(`/dashboard/orders/quotes/${quote.id}/print?autoPrint=true`, "_blank", "noopener,noreferrer");
                                  }}
                                  className="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                                >
                                  <Printer className="h-4 w-4 text-slate-500" />
                                  {isEs ? "Imprimir cotización" : "Print quote"}
                                </button>
                                <button
                                  type="button"
                                  role="menuitem"
                                  disabled={workingId === quote.id}
                                  onMouseDown={(event) => event.preventDefault()}
                                  onClick={() => {
                                    setOpenMenuId(null);
                                    void convertQuote(quote);
                                  }}
                                  className="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                                >
                                  <ArrowRightLeft className="h-4 w-4 text-cyan-600" />
                                  {isEs ? "Convertir en pedido" : "Convert to order"}
                                </button>
                                <button
                                  type="button"
                                  role="menuitem"
                                  disabled={workingId === quote.id}
                                  onMouseDown={(event) => event.preventDefault()}
                                  onClick={() => {
                                    setOpenMenuId(null);
                                    void deleteQuote(quote);
                                  }}
                                  className="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                  {isEs ? "Eliminar cotización" : "Delete quote"}
                                </button>
                              </div>
                            ) : null}
                          </div>
                        </>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
            {visibleQuotes.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center">
                  <FileText className="mx-auto h-8 w-8 text-slate-300" />
                  <p className="mt-2 text-sm text-slate-500">{isEs ? "No hay cotizaciones." : "No quotes found."}</p>
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
