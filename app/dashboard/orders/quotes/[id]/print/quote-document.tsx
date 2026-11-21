"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";

type Quote = {
  id: string;
  quoteNumber: number;
  customerEmail: string;
  customer: { firstName: string | null; lastName: string | null; phone: string | null } | null;
  status: string;
  subtotal: string;
  tax: string;
  shipping: string;
  total: string;
  currency: string;
  notes: string | null;
  validUntil: string | null;
  createdAt: string;
  items: Array<{ id: string; title: string; price: string; quantity: number }>;
  store: {
    name: string;
    logoUrl: string | null;
    senderEmail: string | null;
    shippingOrigin: unknown;
    currency: string;
  };
};

export function QuoteDocument({ quote, autoPrint }: { quote: Quote; autoPrint: boolean }) {
  const { language } = useLanguage();
  const isEs = language === "es";
  const formatter = new Intl.NumberFormat(isEs ? "es-HN" : "en-US", {
    style: "currency",
    currency: quote.currency || quote.store.currency || "USD",
  });
  const contact = quote.store.shippingOrigin && typeof quote.store.shippingOrigin === "object"
    ? quote.store.shippingOrigin as { address?: string; phone?: string }
    : {};

  useEffect(() => {
    const originalTitle = document.title;
    const resetTitle = () => { document.title = ""; };
    window.addEventListener("beforeprint", resetTitle);
    window.addEventListener("afterprint", () => { document.title = originalTitle; });
    const timer = autoPrint ? window.setTimeout(() => window.print(), 500) : undefined;
    return () => {
      window.removeEventListener("beforeprint", resetTitle);
      window.clearTimeout(timer);
      document.title = originalTitle;
    };
  }, [autoPrint]);

  return (
    <div className="min-h-screen bg-slate-100 py-6 px-4 print:m-0 print:bg-white print:p-0">
      <div className="mx-auto mb-6 flex max-w-[816px] items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-3 shadow-sm print:hidden">
        <Link href="/dashboard/orders/quotes" className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700">
          <ArrowLeft className="h-4 w-4" />
          {isEs ? "Volver a cotizaciones" : "Back to quotes"}
        </Link>
        <div className="flex items-center gap-3">
          <span className="hidden text-xs text-slate-500 sm:inline">
            {isEs ? "Formato Carta (8.5 × 11 in)" : "Letter Format (8.5 × 11 in)"}
          </span>
          <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-xs font-semibold text-white">
            <Printer className="h-4 w-4" />
            {isEs ? "Imprimir cotización" : "Print quote"}
          </button>
        </div>
      </div>

      <div id="quote-paper" className="mx-auto min-h-[1056px] w-full max-w-[816px] rounded-lg border border-slate-200 bg-white p-8 text-slate-900 shadow-xl sm:p-12 print:m-0 print:min-h-0 print:max-w-none print:rounded-none print:border-none print:p-0 print:shadow-none">
        <header className="flex items-start justify-between gap-8 border-b-2 border-slate-900 pb-8">
          <div>
            {quote.store.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={quote.store.logoUrl} alt={quote.store.name} className="mb-3 h-12 w-auto max-w-[220px] object-contain" />
            ) : <h1 className="text-3xl font-black uppercase tracking-tight">{quote.store.name}</h1>}
            <div className="mt-2 space-y-0.5 text-xs text-slate-600">
              {contact.address ? <p className="whitespace-pre-line">{contact.address}</p> : null}
              {quote.store.senderEmail ? <p>{quote.store.senderEmail}</p> : null}
              {contact.phone ? <p>{contact.phone}</p> : null}
            </div>
          </div>
          <div className="shrink-0 text-right">
            <h2 className="text-3xl font-black tracking-wider">{isEs ? "COTIZACIÓN" : "QUOTE"}</h2>
            <p className="mt-1 text-sm font-bold">#{quote.quoteNumber}</p>
            <p className="mt-2 text-xs text-slate-500">{isEs ? "Fecha" : "Date"}: {new Date(quote.createdAt).toLocaleDateString(isEs ? "es" : "en", { year: "numeric", month: "long", day: "numeric" })}</p>
            {quote.validUntil ? <p className="mt-1 text-xs text-slate-500">{isEs ? "Válida hasta" : "Valid until"}: {new Date(quote.validUntil).toLocaleDateString(isEs ? "es" : "en", { year: "numeric", month: "long", day: "numeric" })}</p> : null}
          </div>
        </header>

        <section className="mt-8 border-b border-slate-200 pb-8">
          <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">{isEs ? "Preparada para" : "Prepared for"}</h3>
          <p className="text-sm font-bold">{[quote.customer?.firstName, quote.customer?.lastName].filter(Boolean).join(" ") || (isEs ? "Cliente" : "Customer")}</p>
          <p className="text-xs text-slate-600">{quote.customerEmail}</p>
          {quote.customer?.phone ? <p className="text-xs text-slate-600">{quote.customer.phone}</p> : null}
        </section>

        <div className="mt-8">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b-2 border-slate-900 bg-slate-100 text-[11px] font-bold uppercase tracking-wider">
                <th className="w-10 px-3 py-3 text-center">#</th>
                <th className="px-3 py-3">{isEs ? "Descripción" : "Description"}</th>
                <th className="w-20 px-3 py-3 text-center">{isEs ? "Cant." : "Qty"}</th>
                <th className="w-28 px-3 py-3 text-right">{isEs ? "Precio" : "Price"}</th>
                <th className="w-28 px-3 py-3 text-right">{isEs ? "Importe" : "Amount"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {quote.items.map((item, index) => (
                <tr key={item.id}>
                  <td className="px-3 py-3 text-center text-slate-500">{index + 1}</td>
                  <td className="px-3 py-3 font-semibold">{item.title}</td>
                  <td className="px-3 py-3 text-center">{item.quantity}</td>
                  <td className="px-3 py-3 text-right">{formatter.format(Number(item.price))}</td>
                  <td className="px-3 py-3 text-right font-semibold">{formatter.format(Number(item.price) * item.quantity)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-8 flex justify-end">
          <div className="w-full space-y-2 text-xs sm:w-72">
            <div className="flex justify-between text-slate-600"><span>Subtotal</span><span>{formatter.format(Number(quote.subtotal))}</span></div>
            {Number(quote.shipping) > 0 ? <div className="flex justify-between text-slate-600"><span>{isEs ? "Envío" : "Shipping"}</span><span>{formatter.format(Number(quote.shipping))}</span></div> : null}
            {Number(quote.tax) > 0 ? <div className="flex justify-between text-slate-600"><span>{isEs ? "Impuestos" : "Tax"}</span><span>{formatter.format(Number(quote.tax))}</span></div> : null}
            <div className="flex justify-between border-t-2 border-slate-900 pt-3 text-base font-black"><span>TOTAL</span><span>{formatter.format(Number(quote.total))}</span></div>
          </div>
        </div>

        {quote.notes ? <div className="mt-10 rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs text-slate-700"><h3 className="mb-2 font-bold uppercase tracking-wider text-slate-500">{isEs ? "Notas" : "Notes"}</h3><p className="whitespace-pre-line">{quote.notes}</p></div> : null}

        <footer className="mt-14 border-t border-slate-200 pt-6 text-center text-xs text-slate-500">
          <p className="font-medium text-slate-700">{isEs ? `Gracias por considerar ${quote.store.name}.` : `Thank you for considering ${quote.store.name}.`}</p>
          <p className="mt-2">{isEs ? "Esta cotización no constituye una venta hasta ser convertida y aceptada." : "This quote is not a sale until it is converted and accepted."}</p>
        </footer>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page { size: letter portrait; margin: 0 !important; }
          html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; print-color-adjust: exact !important; -webkit-print-color-adjust: exact !important; }
          #quote-paper { width: 100% !important; max-width: none !important; min-height: 0 !important; margin: 0 !important; padding: 15mm 18mm !important; box-sizing: border-box !important; }
        }
      ` }} />
    </div>
  );
}
