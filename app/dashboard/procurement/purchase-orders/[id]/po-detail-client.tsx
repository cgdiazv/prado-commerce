"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Printer, PackageCheck, Clock, Send } from "lucide-react";
import { useLanguage } from "@/lib/i18n/language-context";

type POVariantInfo = {
  id: string;
  sku: string | null;
  title: string;
  inventory: number;
  product: { id: string; title: string };
};

type POItem = {
  id: string;
  productId: string | null;
  variantId: string | null;
  title: string;
  sku: string | null;
  qtyOrdered: number;
  qtyReceived: number;
  unitCost: string;
  totalCost: string;
  variant: POVariantInfo | null;
};

type ReceiptItem = {
  id: string;
  poItemId: string;
  qtyReceived: number;
  poItem: POItem;
};

type Receipt = {
  id: string;
  receivedAt: string;
  receivedBy: string | null;
  notes: string | null;
  items: ReceiptItem[];
};

type Vendor = {
  id: string;
  name: string;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  address: string | null;
  notes: string | null;
};

type Store = {
  id: string;
  name: string;
  currency: string;
  logoUrl: string | null;
  senderEmail: string | null;
  shippingOrigin: { address?: string | null; phone?: string | null } | null;
};

type PurchaseOrder = {
  id: string;
  storeId: string;
  vendorId: string;
  poNumber: string;
  status: "DRAFT" | "SENT" | "PARTIAL" | "RECEIVED" | "CANCELLED";
  issueDate: string;
  expectedDate: string | null;
  notes: string | null;
  subtotal: string;
  tax: string;
  shipping: string;
  total: string;
  createdAt: string;
  store: Store;
  vendor: Vendor;
  items: POItem[];
  receipts: Receipt[];
};

type PODetailClientProps = {
  initialPO: any;
  currentUser: { name?: string | null; email?: string | null };
};

const statusBadgeStyle: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-700 border-slate-200",
  SENT: "bg-blue-50 text-blue-700 border-blue-200",
  PARTIAL: "bg-amber-50 text-amber-700 border-amber-200",
  RECEIVED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  CANCELLED: "bg-red-50 text-red-700 border-red-200",
};

export default function PODetailClient({ initialPO, currentUser }: PODetailClientProps) {
  const { language } = useLanguage();
  const isEs = language === "es";

  const [po, setPo] = useState<PurchaseOrder>(initialPO);
  const [isReceivingModalOpen, setIsReceivingModalOpen] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Receiving Modal Form State
  const [receivedBy, setReceivedBy] = useState(currentUser.name || currentUser.email || "");
  const [receiveNotes, setReceiveNotes] = useState("");
  const [receiveQuantities, setReceiveQuantities] = useState<Record<string, number>>({});
  const [isSubmittingReceipt, setIsSubmittingReceipt] = useState(false);
  const [receiptError, setReceiptError] = useState<string | null>(null);

  const formatter = new Intl.NumberFormat(isEs ? "es-ES" : "en-US", {
    style: "currency",
    currency: po.store?.currency || "USD",
  });

  const totalOrdered = po.items?.reduce((sum, item) => sum + item.qtyOrdered, 0) || 0;
  const totalReceived = po.items?.reduce((sum, item) => sum + item.qtyReceived, 0) || 0;
  const progressPct = totalOrdered > 0 ? Math.min(100, Math.round((totalReceived / totalOrdered) * 100)) : 0;

  const openReceivingModal = () => {
    const initialQtyState: Record<string, number> = {};
    for (const item of po.items || []) {
      const remaining = Math.max(0, item.qtyOrdered - item.qtyReceived);
      initialQtyState[item.id] = remaining;
    }
    setReceiveQuantities(initialQtyState);
    setReceiptError(null);
    setIsReceivingModalOpen(true);
  };

  const handleUpdateStatus = async (newStatus: "SENT" | "CANCELLED") => {
    setIsUpdatingStatus(true);
    try {
      const response = await fetch(`/api/procurement/purchase-orders/${po.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || (isEs ? "Error al actualizar el estado de la OC" : "Failed to update PO status"));
      }

      setPo((prev) => ({ ...prev, status: data.purchaseOrder.status }));
    } catch (err) {
      alert(err instanceof Error ? err.message : isEs ? "Error al actualizar el estado" : "Failed to update status");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleProcessReceipt = async (e: React.FormEvent) => {
    e.preventDefault();

    const itemsToSubmit = Object.entries(receiveQuantities)
      .filter(([_, qty]) => typeof qty === "number" && qty > 0)
      .map(([poItemId, qtyReceived]) => ({ poItemId, qtyReceived }));

    if (itemsToSubmit.length === 0) {
      setReceiptError(
        isEs
          ? "Por favor ingresa una cantidad recibida de al menos 1 para al menos un artículo."
          : "Please enter a received quantity of at least 1 for at least one item.",
      );
      return;
    }

    setIsSubmittingReceipt(true);
    setReceiptError(null);

    try {
      const response = await fetch(`/api/procurement/purchase-orders/${po.id}/receive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receivedBy: receivedBy.trim() || undefined,
          notes: receiveNotes.trim() || undefined,
          items: itemsToSubmit,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || (isEs ? "Error al procesar la recepción." : "Failed to process receipt."));
      }

      setPo(data.purchaseOrder);
      setIsReceivingModalOpen(false);
      setReceiveNotes("");
    } catch (err) {
      setReceiptError(
        err instanceof Error
          ? err.message
          : isEs
            ? "Error al procesar la recepción del envío."
            : "Failed to process shipment receipt.",
      );
    } finally {
      setIsSubmittingReceipt(false);
    }
  };

  return (
    <section className="min-w-0 space-y-6">
      {/* Top Header Actions (hidden on print) */}
      <div className="print:hidden flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href="/dashboard/procurement/purchase-orders"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {isEs ? "Volver a órdenes de compra" : "Back to Purchase Orders"}
          </Link>
          <div className="mt-1 flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-950">
              {isEs ? "Orden de compra" : "Purchase Order"} {po.poNumber}
            </h1>
            <span className={`inline-flex rounded-full border px-3 py-0.5 text-xs font-bold ${statusBadgeStyle[po.status] || "bg-slate-100 text-slate-700"}`}>
              {po.status === "DRAFT" ? (isEs ? "BORRADOR" : "DRAFT") :
               po.status === "SENT" ? (isEs ? "ENVIADA" : "SENT") :
               po.status === "PARTIAL" ? (isEs ? "PARCIAL" : "PARTIAL") :
               po.status === "RECEIVED" ? (isEs ? "RECIBIDA" : "RECEIVED") :
               po.status === "CANCELLED" ? (isEs ? "CANCELADA" : "CANCELLED") : po.status}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {po.status === "DRAFT" && (
            <button
              type="button"
              disabled={isUpdatingStatus}
              onClick={() => handleUpdateStatus("SENT")}
              className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100"
            >
              <Send className="h-3.5 w-3.5" />
              {isEs ? "Marcar como enviada" : "Mark as Sent"}
            </button>
          )}

          {po.status !== "RECEIVED" && po.status !== "CANCELLED" && (
            <button
              type="button"
              onClick={openReceivingModal}
              className="inline-flex items-center gap-1.5 rounded-full bg-slate-950 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 shadow-sm"
            >
              <PackageCheck className="h-4 w-4 text-emerald-400" />
              {isEs ? "Recibir artículos (Muelle de carga)" : "Receive Items (Shipment Dock)"}
            </button>
          )}

          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 shadow-sm"
          >
            <Printer className="h-3.5 w-3.5" />
            {isEs ? "Imprimir orden" : "Print PO"}
          </button>
        </div>
      </div>

      {/* Progress & Summary Banner */}
      <div className="print:hidden rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between text-xs font-medium text-slate-600">
          <span>
            {isEs
              ? `Cumplimiento general de inventario: ${totalReceived} de ${totalOrdered} unidades recibidas`
              : `Overall Inventory Fulfillment: ${totalReceived} of ${totalOrdered} units received`}
          </span>
          <span className="font-bold text-slate-900">
            {progressPct}% {isEs ? "Completado" : "Complete"}
          </span>
        </div>
        <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${
              progressPct === 100 ? "bg-emerald-500" : progressPct > 0 ? "bg-amber-500" : "bg-slate-300"
            }`}
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Main PO Document (Visible on screen and on print) */}
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm space-y-8 print:border-none print:p-0 print:shadow-none">
        {/* Document Header */}
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between border-b border-slate-100 pb-6">
          <div className="space-y-2">
            {po.store?.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={po.store.logoUrl} alt={po.store.name} className="h-10 object-contain max-w-[180px]" />
            ) : (
              <h2 className="text-xl font-bold tracking-tight text-slate-900">{po.store?.name}</h2>
            )}
            <div className="text-xs text-slate-500 space-y-0.5">
              {po.store?.senderEmail && <p>{isEs ? "Correo: " : "Email: "}{po.store.senderEmail}</p>}
              {po.store?.shippingOrigin?.address && <p>{po.store.shippingOrigin.address}</p>}
            </div>
          </div>

          <div className="text-right space-y-1">
            <h2 className="text-2xl font-black uppercase tracking-wider text-slate-900">
              {isEs ? "Orden de compra" : "Purchase Order"}
            </h2>
            <p className="text-lg font-mono font-bold text-slate-800">#{po.poNumber}</p>
            <div className="text-xs text-slate-500 space-y-0.5">
              <p>{isEs ? "Fecha de emisión: " : "Issue Date: "}{po.issueDate ? new Date(po.issueDate).toLocaleDateString(isEs ? "es-ES" : "en-US") : ""}</p>
              {po.expectedDate && (
                <p>{isEs ? "Llegada estimada: " : "Expected Arrival: "}{new Date(po.expectedDate).toLocaleDateString(isEs ? "es-ES" : "en-US")}</p>
              )}
            </div>
          </div>
        </div>

        {/* Vendor & Delivery Address Grid */}
        <div className="grid gap-6 sm:grid-cols-2 text-xs">
          <div className="rounded-xl bg-slate-50 p-4 space-y-1.5 border border-slate-100">
            <h3 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] text-slate-500">
              {isEs ? "Proveedor / Fabricante" : "Vendor / Supplier"}
            </h3>
            <p className="text-sm font-bold text-slate-950">{po.vendor?.name}</p>
            {po.vendor?.contactName && <p>{isEs ? "A la atención de: " : "Attn: "}{po.vendor.contactName}</p>}
            {po.vendor?.contactEmail && <p>{isEs ? "Correo: " : "Email: "}{po.vendor.contactEmail}</p>}
            {po.vendor?.contactPhone && <p>{isEs ? "Teléfono: " : "Phone: "}{po.vendor.contactPhone}</p>}
            {po.vendor?.address && <p className="whitespace-pre-line text-slate-600">{po.vendor.address}</p>}
          </div>

          <div className="rounded-xl bg-slate-50 p-4 space-y-1.5 border border-slate-100">
            <h3 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] text-slate-500">
              {isEs ? "Dirección de entrega / Almacén" : "Ship To / Warehouse Address"}
            </h3>
            <p className="text-sm font-bold text-slate-950">{po.store?.name}</p>
            {po.store?.shippingOrigin?.phone && <p>{isEs ? "Teléfono: " : "Phone: "}{po.store.shippingOrigin.phone}</p>}
            {po.store?.shippingOrigin?.address ? (
              <p className="whitespace-pre-line text-slate-600">{po.store.shippingOrigin.address}</p>
            ) : (
              <p className="text-slate-400 italic">
                {isEs ? "Instalación de recepción predeterminada del comerciante" : "Merchant Default Receiving Facility"}
              </p>
            )}
          </div>
        </div>

        {/* Line Items Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 font-semibold uppercase tracking-wider text-slate-600">
              <tr>
                <th className="px-4 py-3">{isEs ? "Artículo / SKU" : "Line Item / SKU"}</th>
                <th className="px-4 py-3 text-center">{isEs ? "Pedido" : "Ordered"}</th>
                <th className="px-4 py-3 text-center">{isEs ? "Recibido" : "Received"}</th>
                <th className="px-4 py-3 text-center">{isEs ? "Restante" : "Remaining"}</th>
                <th className="px-4 py-3 text-right">{isEs ? "Costo unitario" : "Unit Cost"}</th>
                <th className="px-4 py-3 text-right">{isEs ? "Total línea" : "Line Total"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {po.items?.map((item) => {
                const remaining = Math.max(0, item.qtyOrdered - item.qtyReceived);
                return (
                  <tr key={item.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-slate-900 text-sm">{item.title}</div>
                      {item.sku && <p className="font-mono text-slate-500">SKU: {item.sku}</p>}
                      {item.variant && (
                        <p className="text-[11px] text-slate-400">
                          {isEs ? "Stock actual en tienda: " : "Current Stock in Store: "}
                          {item.variant.inventory} {isEs ? "unidades" : "units"}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-center font-semibold text-slate-900">{item.qtyOrdered}</td>
                    <td className="px-4 py-3.5 text-center font-semibold text-emerald-700">{item.qtyReceived}</td>
                    <td className={`px-4 py-3.5 text-center font-semibold ${remaining > 0 ? "text-amber-700" : "text-slate-400"}`}>
                      {remaining}
                    </td>
                    <td className="px-4 py-3.5 text-right text-slate-700">{formatter.format(Number(item.unitCost))}</td>
                    <td className="px-4 py-3.5 text-right font-bold text-slate-900">
                      {formatter.format(Number(item.totalCost))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Totals & Notes Section */}
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between border-t border-slate-100 pt-6 text-xs">
          <div className="max-w-md space-y-2">
            {po.notes && (
              <div>
                <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] text-slate-500">
                  {isEs ? "Notas e instrucciones especiales" : "Notes & Special Instructions"}
                </h4>
                <p className="mt-1 whitespace-pre-line text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  {po.notes}
                </p>
              </div>
            )}
          </div>

          <div className="w-full max-w-xs space-y-2 text-slate-700">
            <div className="flex justify-between">
              <span>{isEs ? "Subtotal:" : "Subtotal:"}</span>
              <span className="font-semibold text-slate-900">{formatter.format(Number(po.subtotal))}</span>
            </div>
            <div className="flex justify-between">
              <span>{isEs ? "Impuesto:" : "Tax:"}</span>
              <span className="font-semibold text-slate-900">{formatter.format(Number(po.tax))}</span>
            </div>
            <div className="flex justify-between">
              <span>{isEs ? "Flete / Envío:" : "Freight / Shipping:"}</span>
              <span className="font-semibold text-slate-900">{formatter.format(Number(po.shipping))}</span>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-2 text-sm font-bold text-slate-950">
              <span>{isEs ? "Costo total de la orden:" : "Total PO Cost:"}</span>
              <span>{formatter.format(Number(po.total))}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Immutable Receipt History Log (Hidden on print) */}
      <div className="print:hidden rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Clock className="h-4 w-4 text-slate-500" />
          {isEs ? "Historial de recepción de envíos" : "Shipment Arrival & Receiving Audit History"} ({po.receipts?.length || 0})
        </h3>

        {!po.receipts || po.receipts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-xs text-slate-500">
            {isEs
              ? "Aún no se han registrado recepciones. Haz clic en Recibir artículos cuando lleguen las entregas a tu muelle de recepción."
              : "No shipment receipts logged yet. Click Receive Items when deliveries arrive at your receiving dock."}
          </div>
        ) : (
          <div className="space-y-3">
            {po.receipts.map((receipt) => (
              <div key={receipt.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/60 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">
                      {isEs ? "Recibo #" : "Receipt #"}{receipt.id.slice(-6).toUpperCase()}
                    </span>
                    <span className="text-slate-500">
                      {isEs ? "Recibido el " : "Received at "}
                      {new Date(receipt.receivedAt).toLocaleString(isEs ? "es-ES" : "en-US")}
                    </span>
                  </div>
                  <div className="text-slate-600">
                    {isEs ? "Recibido por: " : "Received by: "}
                    <strong className="text-slate-900">{receipt.receivedBy || (isEs ? "Personal" : "Staff Member")}</strong>
                  </div>
                </div>

                {receipt.notes && (
                  <p className="italic text-slate-600">{isEs ? "Nota: " : "Note: "}{receipt.notes}</p>
                )}

                <div className="pt-1">
                  <span className="font-semibold text-slate-700">
                    {isEs ? "Artículos ingresados al inventario:" : "Items Processed into Inventory:"}
                  </span>
                  <ul className="mt-1 space-y-1 pl-3 list-disc text-slate-600">
                    {receipt.items?.map((rItem) => (
                      <li key={rItem.id}>
                        <strong className="text-emerald-700">
                          {isEs ? `+${rItem.qtyReceived} unidades de ` : `+${rItem.qtyReceived} units of `}
                        </strong>
                        {rItem.poItem?.title} {rItem.poItem?.sku ? `(SKU: ${rItem.poItem.sku})` : ""}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Receiving Dock Shipment Modal */}
      {isReceivingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 print:hidden">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {isEs ? "Muelle de recepción de inventario" : "Inventory Receiving Dock"}
                </h2>
                <p className="text-xs text-slate-500">
                  {isEs
                    ? "Registra las cantidades recibidas del envío. El inventario se incrementará automáticamente al guardar."
                    : "Log incoming shipment quantities. Inventory will be automatically incremented upon saving."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsReceivingModalOpen(false)}
                className="text-xs font-semibold text-slate-500 hover:text-slate-900"
              >
                {isEs ? "Cerrar" : "Cancel"}
              </button>
            </div>

            {receiptError && (
              <div className="mt-3 rounded-lg bg-red-50 p-3 text-xs text-red-700">{receiptError}</div>
            )}

            <form onSubmit={handleProcessReceipt} className="mt-4 space-y-4 flex-1 overflow-y-auto">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    {isEs ? "Recibido por (Nombre del personal)" : "Received By (Staff Name)"}
                  </label>
                  <input
                    type="text"
                    required
                    value={receivedBy}
                    onChange={(e) => setReceivedBy(e.target.value)}
                    placeholder={isEs ? "Nombre del personal" : "Warehouse Staff Name"}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-sm outline-none focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    {isEs ? "Nota de envío / N.º de guía" : "Shipment Note / Tracking #"}
                  </label>
                  <input
                    type="text"
                    value={receiveNotes}
                    onChange={(e) => setReceiveNotes(e.target.value)}
                    placeholder={isEs ? "p. ej. Caja 1 de 2 vía Servientrega, Guía #9102" : "e.g. Box 1 of 2 via FedEx, BOL #9102"}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-sm outline-none focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider text-slate-500 mb-2">
                  {isEs ? "Artículos recibidos del envío" : "Line Items Shipment Grid"}
                </h4>

                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
                      <tr>
                        <th className="px-3 py-2.5">{isEs ? "Artículo / SKU" : "Item / SKU"}</th>
                        <th className="px-3 py-2.5 text-center">{isEs ? "Pedido" : "Ordered"}</th>
                        <th className="px-3 py-2.5 text-center">{isEs ? "Recibido prev." : "Prev. Received"}</th>
                        <th className="px-3 py-2.5 text-center">{isEs ? "Restante" : "Remaining"}</th>
                        <th className="px-3 py-2.5 w-32 text-center">{isEs ? "Recibir ahora" : "Receive Now"}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {po.items?.map((item) => {
                        const remaining = Math.max(0, item.qtyOrdered - item.qtyReceived);
                        return (
                          <tr key={item.id} className="hover:bg-slate-50/50">
                            <td className="px-3 py-2.5">
                              <div className="font-semibold text-slate-900">{item.title}</div>
                              {item.sku && <p className="font-mono text-slate-400">SKU: {item.sku}</p>}
                            </td>
                            <td className="px-3 py-2.5 text-center font-medium text-slate-700">{item.qtyOrdered}</td>
                            <td className="px-3 py-2.5 text-center font-medium text-emerald-700">{item.qtyReceived}</td>
                            <td className="px-3 py-2.5 text-center font-semibold text-amber-700">{remaining}</td>
                            <td className="px-3 py-2.5">
                              <input
                                type="number"
                                min={0}
                                max={remaining * 2} // allow over-shipment if vendor shipped extra
                                value={receiveQuantities[item.id] ?? 0}
                                onChange={(e) =>
                                  setReceiveQuantities({
                                    ...receiveQuantities,
                                    [item.id]: Math.max(0, Number.parseInt(e.target.value, 10) || 0),
                                  })
                                }
                                className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-center text-sm font-bold text-slate-900 outline-none focus:border-slate-950"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setIsReceivingModalOpen(false)}
                  className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  {isEs ? "Cancelar" : "Cancel"}
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReceipt}
                  className="rounded-full bg-slate-950 px-5 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  {isSubmittingReceipt
                    ? isEs
                      ? "Procesando recepción..."
                      : "Processing Receipt..."
                    : isEs
                      ? "Guardar recibo e incrementar stock"
                      : "Save Receipt & Increment Stock"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
