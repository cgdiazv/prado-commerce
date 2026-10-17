"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";
import { useLanguage } from "@/lib/i18n/language-context";

type Address = {
  firstName?: string;
  lastName?: string;
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  phone?: string;
} | null;

function parseAddress(value: unknown): Address {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Exclude<Address, null>)
    : null;
}

function parseOriginContact(origin: unknown) {
  let address = "";
  let phone = "";
  if (origin && typeof origin === "object") {
    const o = origin as Record<string, unknown>;
    if (typeof o.address === "string") address = o.address;
    if (typeof o.phone === "string") phone = o.phone;
  }
  return { address, phone };
}

export type InvoiceOrder = {
  id: string;
  orderNumber: number;
  customerEmail: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "CANCELLED";
  paymentStatus: "UNPAID" | "PAID" | "REFUNDED" | "FAILED";
  paymentMethod: string | null;
  fulfillmentStatus: "UNFULFILLED" | "SHIPPED";
  subtotal: string;
  tax: string;
  shipping: string;
  total: string;
  currency: string;
  shippingAddress: unknown;
  billingAddress: unknown;
  createdAt: string;
  items: Array<{
    id: string;
    title: string;
    price: string;
    quantity: number;
  }>;
  store: {
    name: string;
    currency: string;
    logoUrl?: string | null;
    senderEmail?: string | null;
    shippingOrigin?: unknown;
    customDomain?: string | null;
    slug?: string;
    invoiceFooterText?: string | null;
    invoicePrefix?: string | null;
  };
  customer?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    phone: string | null;
    group?: { name: string } | null;
  } | null;
};

export function InvoiceDocument({
  order,
  autoPrint = false,
}: {
  order: InvoiceOrder;
  autoPrint?: boolean;
}) {
  const { language } = useLanguage();
  const isEs = language === "es";

  useEffect(() => {
    const originalTitle = document.title;
    const handleBeforePrint = () => {
      document.title = "";
    };
    const handleAfterPrint = () => {
      document.title = originalTitle;
    };

    window.addEventListener("beforeprint", handleBeforePrint);
    window.addEventListener("afterprint", handleAfterPrint);

    return () => {
      window.removeEventListener("beforeprint", handleBeforePrint);
      window.removeEventListener("afterprint", handleAfterPrint);
      document.title = originalTitle;
    };
  }, []);

  useEffect(() => {
    if (autoPrint) {
      const timer = setTimeout(() => {
        window.print();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [autoPrint]);

  const formatter = new Intl.NumberFormat(isEs ? "es-HN" : "en-US", {
    style: "currency",
    currency: order.currency || order.store.currency || "USD",
  });

  const parsedBilling = parseAddress(order.billingAddress);
  const parsedShipping = parseAddress(order.shippingAddress);
  const storeContact = parseOriginContact(order.store.shippingOrigin);

  const invoiceNumber = `${(order.store.invoicePrefix || "INV-").trim()}${order.orderNumber}`;
  const orderDate = new Date(order.createdAt).toLocaleDateString(
    isEs ? "es-ES" : "en-US",
    {
      year: "numeric",
      month: "long",
      day: "numeric",
    }
  );

  return (
    <div className="min-h-screen bg-slate-100/90 py-6 px-4 print:bg-white print:p-0 print:m-0">
      {/* Top Floating Control Bar (Hidden when printing) */}
      <div className="mx-auto mb-6 flex max-w-[816px] items-center justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white/95 px-5 py-3 shadow-sm backdrop-blur-md print:hidden">
        <Link
          href={`/dashboard/orders/${order.id}`}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 transition hover:text-slate-950"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>{isEs ? "Volver al Pedido" : "Back to Order"}</span>
        </Link>

        <div className="flex items-center gap-3">
          <span className="hidden sm:inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
            📄 {isEs ? "Formato Carta (8.5 × 11 in)" : "Letter Format (8.5 × 11 in)"}
          </span>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800"
          >
            <Printer className="h-4 w-4" />
            <span>{isEs ? "Imprimir Factura" : "Print Invoice"}</span>
          </button>
        </div>
      </div>

      {/* Standard Letter Page Sheet */}
      <div
        id="invoice-paper"
        className="mx-auto w-full max-w-[816px] min-h-[1056px] rounded-lg border border-slate-200 bg-white p-8 sm:p-12 shadow-xl print:m-0 print:w-full print:max-w-none print:min-h-0 print:rounded-none print:border-none print:p-0 print:shadow-none font-sans text-slate-900"
      >
        {/* Invoice Header */}
        <div className="flex flex-col sm:flex-row items-start justify-between gap-6 border-b-2 border-slate-900 pb-8">
          <div>
            {order.store.logoUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={order.store.logoUrl}
                alt={order.store.name}
                className="h-12 w-auto max-w-[220px] object-contain mb-3"
              />
            ) : (
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-950 uppercase">
                {order.store.name}
              </h1>
            )}

            <div className="mt-2 space-y-0.5 text-xs text-slate-600">
              {storeContact.address && (
                <p className="whitespace-pre-line leading-relaxed">{storeContact.address}</p>
              )}
              {order.store.senderEmail && (
                <p>
                  <span className="font-semibold text-slate-700">Email:</span> {order.store.senderEmail}
                </p>
              )}
              {storeContact.phone && (
                <p>
                  <span className="font-semibold text-slate-700">{isEs ? "Teléfono:" : "Phone:"}</span> {storeContact.phone}
                </p>
              )}
            </div>
          </div>

          <div className="text-left sm:text-right shrink-0">
            <h2 className="text-3xl font-black tracking-wider uppercase text-slate-950">
              {isEs ? "FACTURA" : "INVOICE"}
            </h2>
            <p className="mt-1 text-sm font-bold text-slate-800">
              #{invoiceNumber}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {isEs ? "Fecha de emisión:" : "Date:"} <span className="font-medium text-slate-700">{orderDate}</span>
            </p>
          </div>
        </div>

        {/* Addresses Section */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-8 border-b border-slate-200 pb-8">
          <div>
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              {isEs ? "Facturar a (Cliente):" : "Billed To (Customer):"}
            </h3>
            {parsedBilling && (parsedBilling.line1 || parsedBilling.city || parsedBilling.firstName) ? (
              <div className="text-xs text-slate-700 space-y-1">
                <p className="text-sm font-bold text-slate-900">
                  {[parsedBilling.firstName, parsedBilling.lastName].filter(Boolean).join(" ") ||
                    [order.customer?.firstName, order.customer?.lastName].filter(Boolean).join(" ") ||
                    "Cliente"}
                </p>
                {parsedBilling.line1 && <p>{parsedBilling.line1}</p>}
                {parsedBilling.line2 && <p>{parsedBilling.line2}</p>}
                <p>
                  {[parsedBilling.city, parsedBilling.state, parsedBilling.postalCode]
                    .filter(Boolean)
                    .join(", ")}
                </p>
                {parsedBilling.country && <p>{parsedBilling.country}</p>}
                <p className="text-slate-500 pt-0.5">{order.customerEmail}</p>
                {parsedBilling.phone && <p className="text-slate-500">{parsedBilling.phone}</p>}
              </div>
            ) : (
              <div className="text-xs text-slate-700 space-y-1">
                <p className="text-sm font-bold text-slate-900">
                  {[order.customer?.firstName, order.customer?.lastName].filter(Boolean).join(" ") ||
                    "Cliente"}
                </p>
                <p className="text-slate-600">{order.customerEmail}</p>
                {order.customer?.phone && <p className="text-slate-600">{order.customer.phone}</p>}
                {order.customer?.group?.name && (
                  <p className="text-[10px] text-cyan-700 font-semibold uppercase tracking-wider">
                    {isEs ? "Grupo:" : "Group:"} {order.customer.group.name}
                  </p>
                )}
              </div>
            )}
          </div>

          <div>
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              {isEs ? "Enviar a (Destinatario):" : "Shipped To (Recipient):"}
            </h3>
            {parsedShipping && (parsedShipping.line1 || parsedShipping.city) ? (
              <div className="text-xs text-slate-700 space-y-1">
                <p className="text-sm font-bold text-slate-900">
                  {[parsedShipping.firstName, parsedShipping.lastName].filter(Boolean).join(" ") ||
                    [order.customer?.firstName, order.customer?.lastName].filter(Boolean).join(" ") ||
                    "Destinatario"}
                </p>
                {parsedShipping.line1 && <p>{parsedShipping.line1}</p>}
                {parsedShipping.line2 && <p>{parsedShipping.line2}</p>}
                <p>
                  {[parsedShipping.city, parsedShipping.state, parsedShipping.postalCode]
                    .filter(Boolean)
                    .join(", ")}
                </p>
                {parsedShipping.country && <p>{parsedShipping.country}</p>}
                {parsedShipping.phone && <p className="text-slate-500 pt-0.5">{parsedShipping.phone}</p>}
              </div>
            ) : (
              <div className="text-xs text-slate-500 italic">
                {isEs
                  ? "Misma dirección que facturación o entrega en mostrador / digital."
                  : "Same as billing address or local in-store / digital fulfillment."}
              </div>
            )}
          </div>
        </div>

        {/* Itemized Table */}
        <div className="mt-8">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b-2 border-slate-900 bg-slate-100 text-slate-800 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-3 w-10 text-center">#</th>
                <th className="py-3 px-3">{isEs ? "Descripción del Artículo" : "Item Description"}</th>
                <th className="py-3 px-3 text-center w-20">{isEs ? "Cant." : "Qty"}</th>
                <th className="py-3 px-3 text-right w-28">{isEs ? "Precio Unit." : "Unit Price"}</th>
                <th className="py-3 px-3 text-right w-28">{isEs ? "Importe" : "Amount"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {order.items.map((item, index) => {
                const unitPrice = Number(item.price);
                const lineTotal = unitPrice * item.quantity;
                return (
                  <tr key={item.id} className="text-slate-800">
                    <td className="py-3 px-3 text-center text-slate-500">{index + 1}</td>
                    <td className="py-3 px-3">
                      <p className="font-semibold text-slate-900">{item.title}</p>
                    </td>
                    <td className="py-3 px-3 text-center font-medium text-slate-700">{item.quantity}</td>
                    <td className="py-3 px-3 text-right text-slate-700">{formatter.format(unitPrice)}</td>
                    <td className="py-3 px-3 text-right font-semibold text-slate-900">
                      {formatter.format(lineTotal)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Calculations / Summary */}
        <div className="mt-8 flex justify-end">
          <div className="w-full sm:w-72 space-y-2 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>{isEs ? "Subtotal" : "Subtotal"}</span>
              <span className="font-medium text-slate-800">{formatter.format(Number(order.subtotal))}</span>
            </div>

            {Number(order.shipping) > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>{isEs ? "Envío" : "Shipping"}</span>
                <span className="font-medium text-slate-800">{formatter.format(Number(order.shipping))}</span>
              </div>
            )}

            {Number(order.tax) > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>{isEs ? "Impuestos" : "Tax"}</span>
                <span className="font-medium text-slate-800">{formatter.format(Number(order.tax))}</span>
              </div>
            )}

            <div className="border-t-2 border-slate-900 pt-3 flex justify-between text-sm sm:text-base font-black text-slate-950">
              <span>{isEs ? "TOTAL" : "TOTAL"}</span>
              <span>{formatter.format(Number(order.total))}</span>
            </div>
          </div>
        </div>

        {/* Terms & Footer Note */}
        <div className="mt-14 border-t border-slate-200 pt-6 text-center text-xs text-slate-500">
          {order.store.invoiceFooterText ? (
            <p className="whitespace-pre-line font-medium text-slate-800 leading-relaxed">
              {order.store.invoiceFooterText}
            </p>
          ) : (
            <p className="font-medium text-slate-800">
              {isEs
                ? `¡Gracias por tu compra en ${order.store.name}!`
                : `Thank you for shopping with ${order.store.name}!`}
            </p>
          )}

          <p className="mt-2 text-[11px] text-slate-400">
            {isEs
              ? `Para consultas sobre esta factura, contáctenos en ${order.store.senderEmail || "atención al cliente"}.`
              : `For questions regarding this invoice, please contact ${order.store.senderEmail || "customer support"}.`}
          </p>
        </div>
      </div>

      {/* Embedded CSS for Exact Letter Print Margins and Colors */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @media print {
          @page {
            size: letter portrait;
            margin: 0 !important;
          }
          html, body {
            background-color: #ffffff !important;
            color: #0f172a !important;
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          #invoice-paper {
            border: none !important;
            box-shadow: none !important;
            margin: 0 !important;
            padding: 15mm 18mm !important;
            max-width: 100% !important;
            width: 100% !important;
            box-sizing: border-box !important;
          }
        }
      `,
        }}
      />
    </div>
  );
}
