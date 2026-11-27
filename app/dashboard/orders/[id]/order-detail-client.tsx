"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, CreditCard, Mail, Phone, MapPin, Package, Truck, Printer, RotateCcw, Pencil, Plus, Trash2, Search, Check, X, ChevronDown, Download, Send, Loader2 } from "lucide-react";
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
    ? value as Exclude<Address, null>
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

type OrderItem = {
  id: string;
  variantId?: string | null;
  title: string;
  price: string;
  quantity: number;
};

type EditableOrderItem = {
  id?: string;
  variantId: string | null;
  title: string;
  price: string;
  quantity: string;
  query: string;
  isSearchOpen: boolean;
};

type CatalogProductOption = {
  variantId: string;
  title: string;
  sku: string | null;
  barcode: string | null;
  price: number;
};

type AddressFormState = {
  firstName: string;
  lastName: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone: string;
};

function toAddressFormState(addr: Address): AddressFormState {
  return {
    firstName: addr?.firstName ?? "",
    lastName: addr?.lastName ?? "",
    line1: addr?.line1 ?? "",
    line2: addr?.line2 ?? "",
    city: addr?.city ?? "",
    state: addr?.state ?? "",
    postalCode: addr?.postalCode ?? "",
    country: addr?.country ?? "",
    phone: addr?.phone ?? "",
  };
}

function serializeAddressForm(form: AddressFormState): Exclude<Address, null> | null {
  const cleaned = {
    firstName: form.firstName.trim() || undefined,
    lastName: form.lastName.trim() || undefined,
    line1: form.line1.trim() || undefined,
    line2: form.line2.trim() || undefined,
    city: form.city.trim() || undefined,
    state: form.state.trim() || undefined,
    postalCode: form.postalCode.trim() || undefined,
    country: form.country.trim() || undefined,
    phone: form.phone.trim() || undefined,
  };
  const hasAny = Object.values(cleaned).some(Boolean);
  return hasAny ? cleaned : null;
}

type Order = {
  id: string;
  storeId?: string;
  orderNumber: number;
  customerEmail: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "CANCELLED";
  paymentStatus: "UNPAID" | "PAID" | "REFUNDED" | "FAILED";
  fulfillmentStatus: "UNFULFILLED" | "SHIPPED";
  paymentProvider?: string | null;
  stripeSessionId?: string | null;
  stripePaymentId?: string | null;
  gatewayTransactionId?: string | null;
  trackingNumber: string | null;
  trackingCarrier: string | null;
  trackingUrl: string | null;
  shippedAt: string | null;
  shipStationOrderId: string | null;
  shipStationSyncedAt: string | null;
  shipStationSyncError: string | null;
  subtotal: string;
  tax: string;
  shipping: string;
  total: string;
  currency: string;
  shippingAddress: unknown;
  billingAddress: unknown;
  createdAt: string;
  items: OrderItem[];
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
};

type OrderDetailClientProps = {
  initialOrder: Order;
};

const statusColors: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-700 border-amber-200",
  PROCESSING: "bg-blue-50 text-blue-700 border-blue-200",
  COMPLETED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  CANCELLED: "bg-rose-50 text-rose-700 border-rose-200",
};

const paymentStatusColors: Record<string, string> = {
  UNPAID: "bg-amber-50 text-amber-700 border-amber-200",
  PAID: "bg-emerald-50 text-emerald-700 border-emerald-200",
  REFUNDED: "bg-purple-50 text-purple-700 border-purple-200",
  FAILED: "bg-rose-50 text-rose-700 border-rose-200",
};

export default function OrderDetailClient({ initialOrder }: OrderDetailClientProps) {
  const router = useRouter();
  const { language } = useLanguage();
  const isEs = language === "es";

  const [order, setOrder] = useState<Order>(initialOrder);
  const [status, setStatus] = useState(initialOrder.status);
  const [paymentStatus, setPaymentStatus] = useState(initialOrder.paymentStatus);
  const [fulfillmentStatus, setFulfillmentStatus] = useState(
    initialOrder.fulfillmentStatus === "SHIPPED" || initialOrder.status === "COMPLETED"
      ? "SHIPPED"
      : initialOrder.fulfillmentStatus
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [restockInventory, setRestockInventory] = useState(false);

  const isEditableOrder =
    order.paymentProvider !== "pos" &&
    order.paymentProvider !== "stripe" &&
    order.paymentProvider !== "authorize_net" &&
    !order.stripeSessionId &&
    !order.stripePaymentId &&
    !order.gatewayTransactionId;

  const [isEditingOrder, setIsEditingOrder] = useState(false);
  const [isSavingOrderEdits, setIsSavingOrderEdits] = useState(false);
  const [isActionsMenuOpen, setIsActionsMenuOpen] = useState(false);
  const [isSendingInvoice, setIsSendingInvoice] = useState(false);
  const [catalogProducts, setCatalogProducts] = useState<CatalogProductOption[]>([]);
  const [editItems, setEditItems] = useState<EditableOrderItem[]>(() =>
    initialOrder.items.map((item) => ({
      id: item.id,
      variantId: item.variantId ?? null,
      title: item.title,
      price: Number(item.price).toFixed(2),
      quantity: String(item.quantity),
      query: item.title,
      isSearchOpen: false,
    })),
  );
  const [editShippingCost, setEditShippingCost] = useState(() => Number(initialOrder.shipping).toFixed(2));
  const [editTaxCost, setEditTaxCost] = useState(() => Number(initialOrder.tax).toFixed(2));
  const [editShippingAddr, setEditShippingAddr] = useState<AddressFormState>(() =>
    toAddressFormState(parseAddress(initialOrder.shippingAddress)),
  );
  const [editBillingAddr, setEditBillingAddr] = useState<AddressFormState>(() =>
    toAddressFormState(parseAddress(initialOrder.billingAddress)),
  );

  useEffect(() => {
    if (!isEditingOrder || !order.storeId) return;
    const controller = new AbortController();
    fetch(`/api/products?storeId=${encodeURIComponent(order.storeId)}&status=ACTIVE`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (res) => {
        if (!res.ok) return;
        const products = (await res.json()) as Array<{
          title: string;
          variants: Array<{
            id: string;
            title: string;
            sku: string | null;
            barcode: string | null;
            price: string | number;
          }>;
        }>;
        setCatalogProducts(
          products.flatMap((product) =>
            product.variants.map((variant) => ({
              variantId: variant.id,
              title: product.variants.length > 1 ? `${product.title} (${variant.title})` : product.title,
              sku: variant.sku,
              barcode: variant.barcode,
              price: Number(variant.price),
            })),
          ),
        );
      })
      .catch(() => {});
    return () => controller.abort();
  }, [isEditingOrder, order.storeId]);

  function startEditingOrder() {
    setEditItems(
      order.items.map((item) => ({
        id: item.id,
        variantId: item.variantId ?? null,
        title: item.title,
        price: Number(item.price).toFixed(2),
        quantity: String(item.quantity),
        query: item.title,
        isSearchOpen: false,
      })),
    );
    setEditShippingCost(Number(order.shipping).toFixed(2));
    setEditTaxCost(Number(order.tax).toFixed(2));
    setEditShippingAddr(toAddressFormState(parseAddress(order.shippingAddress)));
    setEditBillingAddr(toAddressFormState(parseAddress(order.billingAddress)));
    setSaveStatus(null);
    setIsEditingOrder(true);
  }

  function updateEditItem(index: number, patch: Partial<EditableOrderItem>) {
    setEditItems((current) =>
      current.map((item, idx) => (idx === index ? { ...item, ...patch } : item)),
    );
  }

  const editSubtotal = useMemo(() => {
    return editItems.reduce((sum, item) => {
      const price = Number.parseFloat(item.price);
      const qty = Number.parseInt(item.quantity, 10);
      return Number.isFinite(price) && price >= 0 && Number.isFinite(qty) && qty >= 1
        ? sum + price * qty
        : sum;
    }, 0);
  }, [editItems]);

  const editTotal = useMemo(() => {
    return editSubtotal + (Number.parseFloat(editShippingCost) || 0) + (Number.parseFloat(editTaxCost) || 0);
  }, [editSubtotal, editShippingCost, editTaxCost]);

  async function handleSaveOrderDetails() {
    if (editItems.length === 0 || editItems.some((item) => !item.title.trim() || (Number.parseInt(item.quantity, 10) || 0) < 1)) {
      setSaveStatus(
        isEs
          ? "Cada artículo debe tener un nombre y una cantidad de al menos 1."
          : "Each item must have a title and a quantity of at least 1.",
      );
      return;
    }

    setIsSavingOrderEdits(true);
    setSaveStatus(null);

    try {
      const response = await fetch(`/api/orders/${order.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          items: editItems.map((item) => ({
            variantId: item.variantId,
            title: item.title.trim(),
            price: Number.parseFloat(item.price) || 0,
            quantity: Math.max(1, Number.parseInt(item.quantity, 10) || 1),
          })),
          shipping: Number.parseFloat(editShippingCost) || 0,
          tax: Number.parseFloat(editTaxCost) || 0,
          shippingAddress: serializeAddressForm(editShippingAddr),
          billingAddress: serializeAddressForm(editBillingAddr),
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || (isEs ? "No se pudo actualizar el pedido" : "Failed to update order"));
      }

      setOrder((current) => ({
        ...current,
        subtotal: payload.order.subtotal ?? current.subtotal,
        tax: payload.order.tax ?? current.tax,
        shipping: payload.order.shipping ?? current.shipping,
        total: payload.order.total ?? current.total,
        shippingAddress: payload.order.shippingAddress,
        billingAddress: payload.order.billingAddress,
        items: payload.order.items ?? current.items,
      }));
      setIsEditingOrder(false);
      setSaveStatus(
        isEs
          ? "¡Detalles del pedido actualizados con éxito!"
          : "Order details updated successfully!",
      );
      router.refresh();
    } catch (error) {
      setSaveStatus(
        error instanceof Error
          ? error.message
          : isEs
            ? "Error al guardar los cambios del pedido"
            : "Failed to save order changes",
      );
    } finally {
      setIsSavingOrderEdits(false);
    }
  }

  const getStatusLabel = (s: string) => {
    if (!isEs) return s;
    switch (s) {
      case "PENDING": return "Pendiente";
      case "PROCESSING": return "En proceso";
      case "COMPLETED": return "Completado";
      case "CANCELLED": return "Cancelado";
      default: return s;
    }
  };

  const getPaymentStatusLabel = (s: string) => {
    if (!isEs) return s;
    switch (s) {
      case "UNPAID": return "No pagado";
      case "PAID": return "Pagado";
      case "REFUNDED": return "Reembolsado";
      case "FAILED": return "Fallido";
      default: return s;
    }
  };

  const getFulfillmentLabel = (s: string) => {
    if (!isEs) return s === "SHIPPED" ? "Shipped" : "Unfulfilled";
    return s === "SHIPPED" ? "Enviado" : "No preparado";
  };

  const formatter = new Intl.NumberFormat(isEs ? "es-ES" : "en-US", {
    style: "currency",
    currency: order.currency || "USD",
  });

  const parsedShipping = parseAddress(order.shippingAddress);
  const parsedBilling = parseAddress(order.billingAddress);

  async function handleSaveChanges() {
    setIsSaving(true);
    setSaveStatus(null);

    try {
      const response = await fetch(`/api/orders/${order.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          status,
          paymentStatus,
          fulfillmentStatus,
          restock: restockInventory,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || (isEs ? "Error al actualizar el pedido" : "Failed to update order"));
      }

      setOrder((current) => ({
        ...current,
        status: payload.order.status,
        paymentStatus: payload.order.paymentStatus,
        fulfillmentStatus: payload.order.fulfillmentStatus,
      }));
      setFulfillmentStatus(payload.order.fulfillmentStatus);
      if (payload.restocked) {
        setSaveStatus(
          isEs
            ? `¡Cambios guardados y ${payload.restockedCount ?? ""} unidades reingresadas al inventario!`
            : `Changes saved and ${payload.restockedCount ?? ""} units restocked to inventory!`
        );
      } else {
        setSaveStatus(isEs ? "¡Cambios guardados con éxito!" : "Changes saved successfully!");
      }
      setRestockInventory(false);
      router.refresh();
    } catch (error) {
      setSaveStatus(
        error instanceof Error
          ? error.message
          : isEs
            ? "Error al guardar los cambios"
            : "Failed to save changes"
      );
    } finally {
      setIsSaving(false);
    }
  }

  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [restockQuantities, setRestockQuantities] = useState<Record<string, number>>({});
  const [refundAmountInput, setRefundAmountInput] = useState("");
  const [isCustomRefundAmount, setIsCustomRefundAmount] = useState(false);
  const [restockToInventory, setRestockToInventory] = useState(true);
  const [cancelOrderOnRefund, setCancelOrderOnRefund] = useState(true);
  const [refundReasonInput, setRefundReasonInput] = useState("");

  function computeSuggestedRefundAmount(quantities: Record<string, number>): string {
    const allFull =
      order.items.length > 0 &&
      order.items.every((item) => (quantities[item.id] ?? 0) >= item.quantity);
    if (allFull) {
      return Number(order.total).toFixed(2);
    }
    const itemsSum = order.items.reduce((sum, item) => {
      const qty = Math.min(Math.max(0, quantities[item.id] ?? 0), item.quantity);
      return sum + qty * Number(item.price);
    }, 0);
    return Math.min(Number(order.total), itemsSum).toFixed(2);
  }

  function openRefundModal() {
    const initialQtys: Record<string, number> = {};
    for (const item of order.items) {
      initialQtys[item.id] = item.quantity;
    }
    setRestockQuantities(initialQtys);
    setRefundAmountInput(Number(order.total).toFixed(2));
    setIsCustomRefundAmount(false);
    setRestockToInventory(true);
    setCancelOrderOnRefund(true);
    setRefundReasonInput("");
    setIsRefundModalOpen(true);
  }

  function updateItemRestockQty(itemId: string, maxQty: number, nextQty: number) {
    const clamped = Math.min(Math.max(0, Math.trunc(nextQty) || 0), maxQty);
    setRestockQuantities((prev) => {
      const next = { ...prev, [itemId]: clamped };
      if (!isCustomRefundAmount) {
        setRefundAmountInput(computeSuggestedRefundAmount(next));
      }
      const isFullOrder =
        order.items.length > 0 &&
        order.items.every((item) => (next[item.id] ?? 0) >= item.quantity);
      setCancelOrderOnRefund(isFullOrder);
      return next;
    });
  }

  function selectAllRefundQuantities() {
    const allQtys: Record<string, number> = {};
    for (const item of order.items) {
      allQtys[item.id] = item.quantity;
    }
    setRestockQuantities(allQtys);
    setIsCustomRefundAmount(false);
    setRefundAmountInput(Number(order.total).toFixed(2));
    setCancelOrderOnRefund(true);
  }

  function clearAllRefundQuantities() {
    const zeroQtys: Record<string, number> = {};
    for (const item of order.items) {
      zeroQtys[item.id] = 0;
    }
    setRestockQuantities(zeroQtys);
    if (!isCustomRefundAmount) {
      setRefundAmountInput("0.00");
    }
    setCancelOrderOnRefund(false);
  }

  async function handleConfirmRefundAndRestock() {
    const totalOrderAmount = Number(order.total);
    const parsedRefundAmount = Math.min(
      Math.max(0, Number.parseFloat(refundAmountInput) || 0),
      totalOrderAmount,
    );
    const selectedItemsToRestock = restockToInventory
      ? order.items
          .map((item) => ({
            itemId: item.id,
            variantId: item.variantId ?? null,
            quantity: Math.min(Math.max(0, restockQuantities[item.id] ?? 0), item.quantity),
          }))
          .filter((entry) => entry.quantity > 0)
      : [];
    const selectedUnitsCount = selectedItemsToRestock.reduce((sum, entry) => sum + entry.quantity, 0);
    const isPartialRefund =
      parsedRefundAmount < totalOrderAmount - 0.009 ||
      order.items.some((item) => (restockQuantities[item.id] ?? 0) < item.quantity);

    setIsSaving(true);
    setSaveStatus(null);
    try {
      const nextStatus = cancelOrderOnRefund ? "CANCELLED" : order.status;
      const response = await fetch(`/api/orders/${order.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          paymentStatus: "REFUNDED",
          status: nextStatus,
          restockItems: selectedItemsToRestock,
          refundAmount: parsedRefundAmount,
          refundReason: refundReasonInput.trim() || undefined,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || (isEs ? "Error al procesar la devolución" : "Failed to process refund"));
      }

      setOrder((current) => ({
        ...current,
        status: payload.order?.status ?? nextStatus,
        paymentStatus: payload.order?.paymentStatus ?? "REFUNDED",
      }));
      setStatus((payload.order?.status as Order["status"]) ?? nextStatus);
      setPaymentStatus("REFUNDED");
      setRestockInventory(false);
      setIsRefundModalOpen(false);

      const formattedAmount = formatter.format(parsedRefundAmount);
      const restockedUnits = payload.restockedCount ?? selectedUnitsCount;
      setSaveStatus(
        isEs
          ? `¡${isPartialRefund ? "Reembolso parcial" : "Reembolso total"} de ${formattedAmount} procesado con éxito!${restockedUnits > 0 ? ` Se reingresaron ${restockedUnits} unidades al inventario.` : ""}`
          : `${isPartialRefund ? "Partial refund" : "Full refund"} of ${formattedAmount} processed successfully!${restockedUnits > 0 ? ` ${restockedUnits} units were restocked into inventory.` : ""}`,
      );
      router.refresh();
    } catch (error) {
      setSaveStatus(
        error instanceof Error
          ? error.message
          : isEs
            ? "Error al procesar la devolución"
            : "Failed to process refund",
      );
    } finally {
      setIsSaving(false);
    }
  }

  const storeContact = parseOriginContact(order.store.shippingOrigin);

  async function handleSendInvoiceEmail() {
    setIsActionsMenuOpen(false);
    setIsSendingInvoice(true);
    setSaveStatus(null);
    try {
      const response = await fetch(`/api/orders/${order.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sendInvoice: true }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(
          payload.error ||
            (isEs ? "No se pudo enviar la factura por correo" : "Failed to send invoice email"),
        );
      }
      setSaveStatus(
        isEs
          ? `¡Factura enviada con éxito a ${order.customerEmail}!`
          : `Invoice sent successfully to ${order.customerEmail}!`,
      );
    } catch (error) {
      setSaveStatus(
        error instanceof Error
          ? error.message
          : isEs
            ? "Error al enviar la factura por correo"
            : "Failed to send invoice email",
      );
    } finally {
      setIsSendingInvoice(false);
    }
  }

  function handleDownloadInvoicePdf() {
    setIsActionsMenuOpen(false);
    const invoiceNum = `${(order.store.invoicePrefix || "INV-").trim()}${order.orderNumber}`;
    const toLatin1 = (text: string) =>
      text
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^\x20-\x7E]/g, " ")
        .replace(/\\/g, "\\\\")
        .replace(/\(/g, "\\(")
        .replace(/\)/g, "\\)");

    const cmds: string[] = [];
    const drawText = (x: number, y: number, size: number, bold: boolean, text: string) => {
      cmds.push(`BT /${bold ? "F2" : "F1"} ${size} Tf 1 0 0 1 ${x} ${y} Tm (${toLatin1(text)}) Tj ET`);
    };
    const drawLine = (x1: number, y1: number, x2: number, y2: number, width = 0.75) => {
      cmds.push(`${width} w ${x1} ${y1} m ${x2} ${y2} l S`);
    };

    // Header
    drawText(50, 740, 18, true, order.store.name.toUpperCase());
    if (order.store.senderEmail) drawText(50, 722, 9, false, `Email: ${order.store.senderEmail}`);
    if (storeContact.phone) drawText(50, 710, 9, false, `Tel: ${storeContact.phone}`);

    drawText(450, 740, 18, true, isEs ? "FACTURA" : "INVOICE");
    drawText(450, 722, 11, true, `#${invoiceNum}`);
    drawText(450, 708, 9, false, `${isEs ? "Fecha" : "Date"}: ${new Date(order.createdAt).toLocaleDateString()}`);

    drawLine(50, 692, 562, 692, 1.5);

    // Addresses
    drawText(50, 672, 9, true, isEs ? "FACTURAR A:" : "BILLED TO:");
    const billName =
      [parsedBilling?.firstName, parsedBilling?.lastName].filter(Boolean).join(" ") ||
      [parsedShipping?.firstName, parsedShipping?.lastName].filter(Boolean).join(" ") ||
      order.customerEmail;
    drawText(50, 658, 10, true, billName);
    drawText(50, 645, 9, false, order.customerEmail);
    if (parsedBilling?.line1) drawText(50, 632, 9, false, parsedBilling.line1);
    if (parsedBilling?.city || parsedBilling?.state) {
      drawText(
        50,
        619,
        9,
        false,
        [parsedBilling?.city, parsedBilling?.state, parsedBilling?.postalCode, parsedBilling?.country]
          .filter(Boolean)
          .join(", "),
      );
    }

    drawText(310, 672, 9, true, isEs ? "ENVIAR A:" : "SHIPPED TO:");
    if (parsedShipping && (parsedShipping.line1 || parsedShipping.city)) {
      const shipName =
        [parsedShipping.firstName, parsedShipping.lastName].filter(Boolean).join(" ") || billName;
      drawText(310, 658, 10, true, shipName);
      if (parsedShipping.line1) drawText(310, 645, 9, false, parsedShipping.line1);
      drawText(
        310,
        632,
        9,
        false,
        [parsedShipping.city, parsedShipping.state, parsedShipping.postalCode, parsedShipping.country]
          .filter(Boolean)
          .join(", "),
      );
      if (parsedShipping.phone) drawText(310, 619, 9, false, `Tel: ${parsedShipping.phone}`);
    } else {
      drawText(310, 658, 9, false, isEs ? "Igual que facturacion" : "Same as billing address");
    }

    drawLine(50, 600, 562, 600, 0.75);

    // Items Table Header
    let y = 580;
    drawText(50, y, 9, true, isEs ? "ARTICULO" : "ITEM DESCRIPTION");
    drawText(360, y, 9, true, isEs ? "CANT." : "QTY");
    drawText(420, y, 9, true, isEs ? "PRECIO" : "UNIT PRICE");
    drawText(500, y, 9, true, isEs ? "TOTAL" : "AMOUNT");
    drawLine(50, y - 8, 562, y - 8, 1);

    y -= 24;
    for (const item of order.items.slice(0, 18)) {
      const unitPrice = Number(item.price);
      const lineTotal = unitPrice * item.quantity;
      drawText(50, y, 9.5, false, item.title.slice(0, 52));
      drawText(365, y, 9.5, false, String(item.quantity));
      drawText(420, y, 9.5, false, `${order.currency} ${unitPrice.toFixed(2)}`);
      drawText(500, y, 9.5, true, `${order.currency} ${lineTotal.toFixed(2)}`);
      drawLine(50, y - 7, 562, y - 7, 0.3);
      y -= 20;
    }

    // Bottom-anchored Totals Block (above footer)
    let totalsY = Math.min(y - 14, 182);
    drawLine(375, totalsY + 14, 562, totalsY + 14, 0.5);
    drawText(390, totalsY, 10, false, "Subtotal:");
    drawText(485, totalsY, 10, false, `${order.currency} ${Number(order.subtotal).toFixed(2)}`);
    totalsY -= 16;
    drawText(390, totalsY, 10, false, isEs ? "Envio:" : "Shipping:");
    drawText(485, totalsY, 10, false, `${order.currency} ${Number(order.shipping).toFixed(2)}`);
    totalsY -= 16;
    drawText(390, totalsY, 10, false, isEs ? "Impuestos:" : "Tax:");
    drawText(485, totalsY, 10, false, `${order.currency} ${Number(order.tax).toFixed(2)}`);
    totalsY -= 8;
    drawLine(390, totalsY, 562, totalsY, 1.2);
    totalsY -= 16;
    drawText(390, totalsY, 11, true, "TOTAL:");
    drawText(485, totalsY, 11, true, `${order.currency} ${Number(order.total).toFixed(2)}`);

    // Bottom Footer with Store / Business Details & Credits
    drawLine(50, 96, 562, 96, 0.75);
    const footerNote = order.store.invoiceFooterText
      ? order.store.invoiceFooterText.replace(/\r?\n/g, " · ").slice(0, 95)
      : isEs
        ? "Gracias por su preferencia!"
        : "Thank you for your business!";
    drawText(50, 80, 9.5, true, footerNote);

    const businessDetails = [
      order.store.name,
      storeContact.address ? storeContact.address.replace(/\r?\n/g, ", ") : "",
      order.store.senderEmail ? `Email: ${order.store.senderEmail}` : "",
      storeContact.phone ? `Tel: ${storeContact.phone}` : "",
    ]
      .filter(Boolean)
      .join("  |  ")
      .slice(0, 110);
    drawText(50, 65, 8.5, false, businessDetails);

    cmds.push("0.58 0.64 0.72 rg");
    drawText(50, 50, 7.5, false, "Powered by Prado Commerce");
    cmds.push("0 0 0 rg");

    const stream = cmds.join("\n");
    const objects = [
      "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
      "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
      "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>\nendobj\n",
      "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj\n",
      "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>\nendobj\n",
      `6 0 obj\n<< /Length ${stream.length} >>\nstream\n${stream}\nendstream\nendobj\n`,
    ];

    let pdf = "%PDF-1.4\n";
    const offsets: number[] = [0];
    for (const obj of objects) {
      offsets.push(pdf.length);
      pdf += obj;
    }
    const xrefStart = pdf.length;
    pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    for (let i = 1; i <= objects.length; i++) {
      pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
    }
    pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

    const blob = new Blob([pdf], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${invoiceNum}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <section className="min-w-0 space-y-6 print:hidden">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-5">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">
                {isEs ? "Pedido #" : "Order #"}{(order.store.invoicePrefix || "INV-").trim()}{order.orderNumber}
              </h1>
              <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusColors[order.status]}`}>
                {getStatusLabel(order.status)}
              </span>
              <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${paymentStatusColors[order.paymentStatus]}`}>
                {getPaymentStatusLabel(order.paymentStatus)}
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              {isEs
                ? `Realizado el ${new Date(order.createdAt).toLocaleString("es-ES")} en ${order.store.name}`
                : `Placed on ${new Date(order.createdAt).toLocaleString("en-US")} at ${order.store.name}`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
            {isEditableOrder && isEditingOrder ? (
              <>
                <button
                  type="button"
                  onClick={() => void handleSaveOrderDetails()}
                  disabled={isSavingOrderEdits}
                  className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  <Check className="h-4 w-4" />
                  {isSavingOrderEdits
                    ? isEs ? "Guardando..." : "Saving..."
                    : isEs ? "Guardar Pedido" : "Save Order"}
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingOrder(false)}
                  disabled={isSavingOrderEdits}
                  className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 cursor-pointer"
                >
                  <X className="h-4 w-4 text-slate-500" />
                  {isEs ? "Cancelar edición" : "Cancel edit"}
                </button>
              </>
            ) : null}
            <div
              className="relative"
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                  setIsActionsMenuOpen(false);
                }
              }}
            >
              <button
                type="button"
                disabled={isSendingInvoice}
                onClick={() => setIsActionsMenuOpen((open) => !open)}
                aria-expanded={isActionsMenuOpen}
                aria-haspopup="menu"
                className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 shadow-sm cursor-pointer disabled:opacity-50"
              >
                {isSendingInvoice ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
                    <span>{isEs ? "Enviando..." : "Sending..."}</span>
                  </>
                ) : (
                  <>
                    <span>{isEs ? "Acciones" : "Actions"}</span>
                    <ChevronDown
                      className={`h-4 w-4 text-slate-500 transition-transform ${
                        isActionsMenuOpen ? "rotate-180" : ""
                      }`}
                    />
                  </>
                )}
              </button>

              {isActionsMenuOpen ? (
                <div
                  role="menu"
                  className="absolute right-0 top-full z-40 mt-1.5 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl"
                >
                  {isEditableOrder ? (
                    <button
                      type="button"
                      role="menuitem"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setIsActionsMenuOpen(false);
                        startEditingOrder();
                      }}
                      className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-xs font-semibold text-slate-700 transition hover:bg-slate-50 cursor-pointer"
                    >
                      <Pencil className="h-4 w-4 text-cyan-600" />
                      <span>{isEs ? "Editar Pedido" : "Edit Order"}</span>
                    </button>
                  ) : null}
                  <button
                    type="button"
                    role="menuitem"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setIsActionsMenuOpen(false);
                      window.open(`/dashboard/orders/${order.id}/invoice?autoPrint=true`, "_blank");
                    }}
                    className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-xs font-semibold text-slate-700 transition hover:bg-slate-50 cursor-pointer"
                  >
                    <Printer className="h-4 w-4 text-slate-500" />
                    <span>{isEs ? "Imprimir" : "Print"}</span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={handleDownloadInvoicePdf}
                    className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-xs font-semibold text-slate-700 transition hover:bg-slate-50 cursor-pointer"
                  >
                    <Download className="h-4 w-4 text-slate-500" />
                    <span>{isEs ? "Descargar PDF" : "Download PDF"}</span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    disabled={isSendingInvoice}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => void handleSendInvoiceEmail()}
                    className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-xs font-semibold text-slate-700 transition hover:bg-slate-50 cursor-pointer disabled:opacity-50"
                  >
                    <Send className="h-4 w-4 text-cyan-600" />
                    <span>{isEs ? "Enviar" : "Send"}</span>
                  </button>
                </div>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => router.back()}
              className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              {isEs ? "Volver" : "Back"}
            </button>
          </div>
        </div>

      {saveStatus && (
        <div className={`rounded-xl border px-4 py-3 text-sm ${saveStatus.includes("éxito") || saveStatus.includes("success") ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}>
          {saveStatus}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        {/* Left Side Details */}
        <div className="space-y-6">
          {/* Items Purchased */}
          <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                <Package className="h-4 w-4 text-slate-400" /> {isEs ? "Artículos comprados" : "Items purchased"}
              </h2>
              {isEditableOrder && !isEditingOrder ? (
                <button
                  type="button"
                  onClick={startEditingOrder}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-700 hover:text-cyan-800 cursor-pointer"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  {isEs ? "Editar productos / precios" : "Edit products / prices"}
                </button>
              ) : isEditingOrder ? (
                <button
                  type="button"
                  onClick={() =>
                    setEditItems((current) => [
                      ...current,
                      {
                        variantId: null,
                        title: "",
                        price: "0.00",
                        quantity: "1",
                        query: "",
                        isSearchOpen: true,
                      },
                    ])
                  }
                  className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  {isEs ? "Agregar producto" : "Add product"}
                </button>
              ) : null}
            </div>

            {isEditingOrder ? (
              <div className="mt-4 space-y-3">
                <div className="hidden sm:grid sm:grid-cols-12 sm:gap-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-1">
                  <span className="col-span-6">{isEs ? "Producto" : "Product"}</span>
                  <span className="col-span-3">{isEs ? "Precio Unit." : "Unit Price"}</span>
                  <span className="col-span-2">{isEs ? "Cant." : "Qty"}</span>
                  <span className="col-span-1" />
                </div>
                {editItems.map((item, index) => {
                  const q = item.query.trim().toLowerCase();
                  const matches = catalogProducts
                    .filter((p) =>
                      [p.title, p.sku, p.barcode]
                        .filter(Boolean)
                        .some((v) => v?.toLowerCase().includes(q)),
                    )
                    .slice(0, 8);

                  return (
                    <div key={item.id ?? `new-${index}`} className="grid grid-cols-12 gap-2 items-start">
                      <div
                        className="relative col-span-12 sm:col-span-6"
                        onBlur={(e) => {
                          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                            updateEditItem(index, { isSearchOpen: false });
                          }
                        }}
                      >
                        <div className="relative">
                          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                          <input
                            type="text"
                            value={item.title}
                            onChange={(e) =>
                              updateEditItem(index, {
                                title: e.target.value,
                                query: e.target.value,
                                isSearchOpen: true,
                              })
                            }
                            onFocus={() => updateEditItem(index, { isSearchOpen: true })}
                            placeholder={isEs ? "Buscar o escribir producto..." : "Search or enter product..."}
                            className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-8 pr-3 text-sm outline-none focus:border-slate-400"
                          />
                        </div>
                        {item.isSearchOpen && matches.length > 0 ? (
                          <div className="absolute inset-x-0 top-full z-30 mt-1 max-h-52 overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
                            {matches.map((product) => (
                              <button
                                key={product.variantId}
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() =>
                                  updateEditItem(index, {
                                    variantId: product.variantId,
                                    title: product.title,
                                    query: product.title,
                                    price: product.price.toFixed(2),
                                    isSearchOpen: false,
                                  })
                                }
                                className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs hover:bg-slate-50"
                              >
                                <span className="min-w-0">
                                  <span className="block truncate font-semibold text-slate-900">
                                    {product.title}
                                  </span>
                                  {product.sku ? (
                                    <span className="block truncate text-[11px] text-slate-500">
                                      SKU: {product.sku}
                                    </span>
                                  ) : null}
                                </span>
                                <span className="shrink-0 font-semibold text-slate-900">
                                  {formatter.format(product.price)}
                                </span>
                              </button>
                            ))}
                          </div>
                        ) : null}
                      </div>

                      <div className="col-span-6 sm:col-span-3">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.price}
                          onChange={(e) => updateEditItem(index, { price: e.target.value })}
                          placeholder={isEs ? "Precio" : "Price"}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
                        />
                      </div>

                      <div className="col-span-4 sm:col-span-2">
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={item.quantity}
                          onChange={(e) => updateEditItem(index, { quantity: e.target.value })}
                          placeholder={isEs ? "Cant." : "Qty"}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
                        />
                      </div>

                      <div className="col-span-2 sm:col-span-1 flex justify-end">
                        <button
                          type="button"
                          disabled={editItems.length <= 1}
                          onClick={() =>
                            setEditItems((current) => current.filter((_, idx) => idx !== index))
                          }
                          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-rose-200 text-rose-600 transition hover:bg-rose-50 disabled:opacity-40"
                          aria-label={isEs ? "Eliminar artículo" : "Remove item"}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="mt-4 divide-y divide-slate-100">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between py-3">
                    <div>
                      <p className="font-semibold text-slate-900">{item.title}</p>
                      <p className="text-xs text-slate-500">
                        {formatter.format(Number(item.price))} × {item.quantity}
                      </p>
                    </div>
                    <p className="font-semibold text-slate-900">
                      {formatter.format(Number(item.price) * item.quantity)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </article>

          {/* Customer Details */}
          <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
              <Mail className="h-4 w-4 text-slate-400" /> {isEs ? "Detalles del cliente" : "Customer details"}
            </h2>
            <div className="mt-4 space-y-3">
              <div className="flex items-center gap-2 text-sm text-slate-700">
                <Mail className="h-4 w-4 text-slate-400" />
                <span>{order.customerEmail}</span>
              </div>
              {parsedShipping?.phone && (
                <div className="flex items-center gap-2 text-sm text-slate-700">
                  <Phone className="h-4 w-4 text-slate-400" />
                  <span>{parsedShipping.phone}</span>
                </div>
              )}
            </div>
          </article>

          {/* Shipping and Billing addresses */}
          <div className="grid gap-6 md:grid-cols-2">
            <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                  <MapPin className="h-4 w-4 text-slate-400" /> {isEs ? "Dirección de envío" : "Shipping address"}
                </h2>
                {isEditableOrder && !isEditingOrder ? (
                  <button
                    type="button"
                    onClick={startEditingOrder}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-700 hover:text-cyan-800 cursor-pointer"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    {isEs ? "Editar" : "Edit"}
                  </button>
                ) : null}
              </div>
              {isEditingOrder ? (
                <div className="mt-4 grid grid-cols-2 gap-2.5 text-xs">
                  <input
                    type="text"
                    value={editShippingAddr.firstName}
                    onChange={(e) => setEditShippingAddr((s) => ({ ...s, firstName: e.target.value }))}
                    placeholder={isEs ? "Nombre" : "First name"}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-slate-400"
                  />
                  <input
                    type="text"
                    value={editShippingAddr.lastName}
                    onChange={(e) => setEditShippingAddr((s) => ({ ...s, lastName: e.target.value }))}
                    placeholder={isEs ? "Apellido" : "Last name"}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-slate-400"
                  />
                  <input
                    type="text"
                    value={editShippingAddr.line1}
                    onChange={(e) => setEditShippingAddr((s) => ({ ...s, line1: e.target.value }))}
                    placeholder={isEs ? "Dirección (calle y número)" : "Street address (Line 1)"}
                    className="col-span-2 rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-slate-400"
                  />
                  <input
                    type="text"
                    value={editShippingAddr.line2}
                    onChange={(e) => setEditShippingAddr((s) => ({ ...s, line2: e.target.value }))}
                    placeholder={isEs ? "Apto, local, referencia (opcional)" : "Apt, suite, etc. (Line 2)"}
                    className="col-span-2 rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-slate-400"
                  />
                  <input
                    type="text"
                    value={editShippingAddr.city}
                    onChange={(e) => setEditShippingAddr((s) => ({ ...s, city: e.target.value }))}
                    placeholder={isEs ? "Ciudad" : "City"}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-slate-400"
                  />
                  <input
                    type="text"
                    value={editShippingAddr.state}
                    onChange={(e) => setEditShippingAddr((s) => ({ ...s, state: e.target.value }))}
                    placeholder={isEs ? "Estado / Depto." : "State / Province"}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-slate-400"
                  />
                  <input
                    type="text"
                    value={editShippingAddr.postalCode}
                    onChange={(e) => setEditShippingAddr((s) => ({ ...s, postalCode: e.target.value }))}
                    placeholder={isEs ? "Código postal" : "Postal code"}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-slate-400"
                  />
                  <input
                    type="text"
                    value={editShippingAddr.country}
                    onChange={(e) => setEditShippingAddr((s) => ({ ...s, country: e.target.value }))}
                    placeholder={isEs ? "País (ej. HN, US)" : "Country (e.g. US, HN)"}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-slate-400"
                  />
                  <input
                    type="tel"
                    value={editShippingAddr.phone}
                    onChange={(e) => setEditShippingAddr((s) => ({ ...s, phone: e.target.value }))}
                    placeholder={isEs ? "Teléfono de contacto" : "Phone number"}
                    className="col-span-2 rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-slate-400"
                  />
                </div>
              ) : parsedShipping && (parsedShipping.line1 || parsedShipping.city) ? (
                <div className="mt-4 text-sm text-slate-700 space-y-1">
                  <p className="font-medium text-slate-950">
                    {[parsedShipping.firstName, parsedShipping.lastName].filter(Boolean).join(" ") || (isEs ? "Cliente" : "Customer")}
                  </p>
                  <p>{parsedShipping.line1}</p>
                  {parsedShipping.line2 && <p>{parsedShipping.line2}</p>}
                  <p>
                    {[parsedShipping.city, parsedShipping.state, parsedShipping.postalCode].filter(Boolean).join(", ")}
                  </p>
                  <p>{parsedShipping.country}</p>
                </div>
              ) : (
                <p className="mt-4 text-sm text-slate-500 italic">
                  {isEs ? "No se proporcionó dirección de envío" : "No shipping address provided"}
                </p>
              )}
            </article>

            <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                  <CreditCard className="h-4 w-4 text-slate-400" /> {isEs ? "Dirección de facturación" : "Billing address"}
                </h2>
                {isEditableOrder && !isEditingOrder ? (
                  <button
                    type="button"
                    onClick={startEditingOrder}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-700 hover:text-cyan-800 cursor-pointer"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    {isEs ? "Editar" : "Edit"}
                  </button>
                ) : isEditingOrder ? (
                  <button
                    type="button"
                    onClick={() => setEditBillingAddr({ ...editShippingAddr })}
                    className="text-xs font-semibold text-cyan-700 hover:underline"
                  >
                    {isEs ? "Copiar de envío" : "Copy shipping"}
                  </button>
                ) : null}
              </div>
              {isEditingOrder ? (
                <div className="mt-4 grid grid-cols-2 gap-2.5 text-xs">
                  <input
                    type="text"
                    value={editBillingAddr.firstName}
                    onChange={(e) => setEditBillingAddr((s) => ({ ...s, firstName: e.target.value }))}
                    placeholder={isEs ? "Nombre" : "First name"}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-slate-400"
                  />
                  <input
                    type="text"
                    value={editBillingAddr.lastName}
                    onChange={(e) => setEditBillingAddr((s) => ({ ...s, lastName: e.target.value }))}
                    placeholder={isEs ? "Apellido" : "Last name"}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-slate-400"
                  />
                  <input
                    type="text"
                    value={editBillingAddr.line1}
                    onChange={(e) => setEditBillingAddr((s) => ({ ...s, line1: e.target.value }))}
                    placeholder={isEs ? "Dirección (calle y número)" : "Street address (Line 1)"}
                    className="col-span-2 rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-slate-400"
                  />
                  <input
                    type="text"
                    value={editBillingAddr.line2}
                    onChange={(e) => setEditBillingAddr((s) => ({ ...s, line2: e.target.value }))}
                    placeholder={isEs ? "Apto, local, referencia (opcional)" : "Apt, suite, etc. (Line 2)"}
                    className="col-span-2 rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-slate-400"
                  />
                  <input
                    type="text"
                    value={editBillingAddr.city}
                    onChange={(e) => setEditBillingAddr((s) => ({ ...s, city: e.target.value }))}
                    placeholder={isEs ? "Ciudad" : "City"}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-slate-400"
                  />
                  <input
                    type="text"
                    value={editBillingAddr.state}
                    onChange={(e) => setEditBillingAddr((s) => ({ ...s, state: e.target.value }))}
                    placeholder={isEs ? "Estado / Depto." : "State / Province"}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-slate-400"
                  />
                  <input
                    type="text"
                    value={editBillingAddr.postalCode}
                    onChange={(e) => setEditBillingAddr((s) => ({ ...s, postalCode: e.target.value }))}
                    placeholder={isEs ? "Código postal" : "Postal code"}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-slate-400"
                  />
                  <input
                    type="text"
                    value={editBillingAddr.country}
                    onChange={(e) => setEditBillingAddr((s) => ({ ...s, country: e.target.value }))}
                    placeholder={isEs ? "País (ej. HN, US)" : "Country (e.g. US, HN)"}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-slate-400"
                  />
                  <input
                    type="tel"
                    value={editBillingAddr.phone}
                    onChange={(e) => setEditBillingAddr((s) => ({ ...s, phone: e.target.value }))}
                    placeholder={isEs ? "Teléfono de contacto" : "Phone number"}
                    className="col-span-2 rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-slate-400"
                  />
                </div>
              ) : parsedBilling && (parsedBilling.line1 || parsedBilling.city) ? (
                <div className="mt-4 text-sm text-slate-700 space-y-1">
                  <p className="font-medium text-slate-950">
                    {[parsedBilling.firstName, parsedBilling.lastName].filter(Boolean).join(" ") || (isEs ? "Cliente" : "Customer")}
                  </p>
                  <p>{parsedBilling.line1}</p>
                  {parsedBilling.line2 && <p>{parsedBilling.line2}</p>}
                  <p>
                    {[parsedBilling.city, parsedBilling.state, parsedBilling.postalCode].filter(Boolean).join(", ")}
                  </p>
                  <p>{parsedBilling.country}</p>
                </div>
              ) : (
                <p className="mt-4 text-sm text-slate-500 italic">
                  {isEs ? "No se proporcionó dirección de facturación" : "No billing address provided"}
                </p>
              )}
            </article>
          </div>
        </div>

        {/* Right Side Process Card */}
        <div className="space-y-6">
          <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
              <Truck className="h-4 w-4 text-slate-400" /> {isEs ? "Preparación y Envío" : "Fulfillment"}
            </h2>
            <div className="mt-4 space-y-2 text-sm text-slate-700">
              <div className="flex justify-between gap-4">
                <span>{isEs ? "Estado" : "Status"}</span>
                <span className="font-semibold text-slate-950">
                  {getFulfillmentLabel(order.fulfillmentStatus === "SHIPPED" || order.status === "COMPLETED" || fulfillmentStatus === "SHIPPED" ? "SHIPPED" : "UNFULFILLED")}
                </span>
              </div>
              {order.shipStationOrderId ? (
                <div className="flex justify-between gap-4">
                  <span>{isEs ? "Pedido ShipStation" : "ShipStation order"}</span>
                  <span className="font-medium text-slate-950">{order.shipStationOrderId}</span>
                </div>
              ) : null}
              {order.trackingNumber ? (
                <div className="flex justify-between gap-4">
                  <span>{isEs ? "Seguimiento" : "Tracking"}</span>
                  {order.trackingUrl ? (
                    <a href={order.trackingUrl} target="_blank" rel="noreferrer" className="font-medium text-cyan-700 hover:underline">
                      {order.trackingNumber}
                    </a>
                  ) : (
                    <span className="font-medium text-slate-950">{order.trackingNumber}</span>
                  )}
                </div>
              ) : null}
              {order.trackingCarrier ? (
                <div className="flex justify-between gap-4">
                  <span>{isEs ? "Transportista" : "Carrier"}</span>
                  <span className="font-medium text-slate-950">{order.trackingCarrier}</span>
                </div>
              ) : null}
              {order.shippedAt ? (
                <div className="flex justify-between gap-4">
                  <span>{isEs ? "Enviado el" : "Shipped"}</span>
                  <span>{new Date(order.shippedAt).toLocaleDateString(isEs ? "es-ES" : "en-US")}</span>
                </div>
              ) : null}
              {order.shipStationSyncError ? (
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-800">
                  {isEs ? "Sincronización ShipStation: " : "ShipStation sync: "} {order.shipStationSyncError}
                </p>
              ) : null}
              {!order.shipStationSyncError && order.shipStationSyncedAt ? (
                <p className="text-xs text-slate-500">
                  {isEs ? "Sincronizado el " : "Synced "} {new Date(order.shipStationSyncedAt).toLocaleString(isEs ? "es-ES" : "en-US")}
                </p>
              ) : null}
            </div>
          </article>

          {/* Order Processing Actions */}
          <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
              <Clock className="h-4 w-4 text-slate-400" /> {isEs ? "Procesar pedido" : "Process order"}
            </h2>
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  {isEs ? "Estado del Pedido" : "Order Status"}
                </label>
                <select
                  value={status}
                  onChange={(event) => {
                    const newStatus = event.target.value as Order["status"];
                    setStatus(newStatus);
                    if (newStatus === "COMPLETED" && fulfillmentStatus === "UNFULFILLED") {
                      setFulfillmentStatus("SHIPPED");
                    }
                    if (newStatus === "CANCELLED" && order.status !== "CANCELLED") {
                      setRestockInventory(true);
                    }
                  }}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                >
                  <option value="PENDING">{isEs ? "Pendiente" : "Pending"}</option>
                  <option value="PROCESSING">{isEs ? "En proceso" : "Processing"}</option>
                  <option value="COMPLETED">{isEs ? "Completado" : "Completed"}</option>
                  <option value="CANCELLED">{isEs ? "Cancelado" : "Cancelled"}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">
                  {isEs ? "Estado del Pago" : "Payment Status"}
                </label>
                <select
                  value={paymentStatus}
                  onChange={(event) => {
                    const newPaymentStatus = event.target.value as Order["paymentStatus"];
                    setPaymentStatus(newPaymentStatus);
                    if (newPaymentStatus === "REFUNDED" && order.paymentStatus !== "REFUNDED") {
                      setRestockInventory(true);
                    }
                  }}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                >
                  <option value="UNPAID">{isEs ? "No pagado" : "Unpaid"}</option>
                  <option value="PAID">{isEs ? "Pagado" : "Paid"}</option>
                  <option value="REFUNDED">{isEs ? "Reembolsado" : "Refunded"}</option>
                  <option value="FAILED">{isEs ? "Fallido" : "Failed"}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">
                  {isEs ? "Estado de Preparación" : "Fulfillment Status"}
                </label>
                <select
                  value={fulfillmentStatus}
                  onChange={(event) => setFulfillmentStatus(event.target.value as Order["fulfillmentStatus"])}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                >
                  <option value="UNFULFILLED">{isEs ? "No preparado" : "Unfulfilled"}</option>
                  <option value="SHIPPED">{isEs ? "Enviado" : "Shipped"}</option>
                </select>
              </div>

              {(status === "CANCELLED" || paymentStatus === "REFUNDED" || order.status === "CANCELLED" || order.paymentStatus === "REFUNDED") && (
                <div className="rounded-xl border border-sky-200 bg-sky-50/70 p-3.5">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={restockInventory}
                      onChange={(e) => setRestockInventory(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                    />
                    <div>
                      <span className="text-sm font-semibold text-slate-900">
                        {isEs ? "Reingresar artículos al inventario" : "Restock items to inventory"}
                      </span>
                      <p className="text-xs text-slate-600 mt-0.5">
                        {isEs
                          ? "Devolverá automáticamente las unidades de esta orden al inventario disponible de cada variante."
                          : "Automatically returns item quantities in this order back into available inventory."}
                      </p>
                    </div>
                  </label>
                </div>
              )}

              {/* Refund & Restock Action Card */}
              <div className="rounded-xl border border-purple-200 bg-purple-50/70 p-4">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-purple-100 p-2 text-purple-700">
                    <RotateCcw className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-bold text-purple-950">
                      {isEs ? "Devolución con Retorno al Stock" : "Refund & Restock Inventory"}
                    </h3>
                    <p className="mt-0.5 text-xs text-purple-800">
                      {isEs
                        ? "Selecciona las cantidades a reingresar al inventario o el monto a devolver para realizar reembolsos parciales o totales."
                        : "Select the item quantities to restock or the money amount to refund for partial or full order refunds."}
                    </p>
                    <button
                      type="button"
                      onClick={openRefundModal}
                      disabled={isSaving}
                      className="mt-3 inline-flex items-center gap-2 rounded-full bg-purple-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:bg-purple-300"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      {order.paymentStatus === "REFUNDED"
                        ? (isEs ? "Reembolsar / Reingresar más unidades" : "Refund / Restock Additional Units")
                        : (isEs ? "Reembolsar y Reingresar Unidades al Stock" : "Refund & Restock Units to Stock")}
                    </button>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSaveChanges}
                disabled={isSaving}
                className="w-full rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-75"
              >
                {isSaving
                  ? isEs ? "Guardando cambios..." : "Saving changes..."
                  : isEs ? "Guardar cambios" : "Save changes"}
              </button>
            </div>
          </article>

          {/* Financial Summary */}
          <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                {isEs ? "Resumen financiero" : "Financial summary"}
              </h2>
              {isEditableOrder && !isEditingOrder ? (
                <button
                  type="button"
                  onClick={startEditingOrder}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-700 hover:text-cyan-800 cursor-pointer"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  {isEs ? "Editar" : "Edit"}
                </button>
              ) : null}
            </div>
            {isEditingOrder ? (
              <div className="mt-4 space-y-3 text-sm text-slate-700">
                <div className="flex items-center justify-between">
                  <span>{isEs ? "Subtotal" : "Subtotal"}</span>
                  <span className="font-semibold text-slate-900">{formatter.format(editSubtotal)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>{isEs ? "Envío" : "Shipping"}</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editShippingCost}
                    onChange={(e) => setEditShippingCost(e.target.value)}
                    className="w-28 rounded-xl border border-slate-200 px-3 py-1.5 text-right text-sm outline-none focus:border-slate-400"
                  />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>{isEs ? "Impuestos" : "Tax"}</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editTaxCost}
                    onChange={(e) => setEditTaxCost(e.target.value)}
                    className="w-28 rounded-xl border border-slate-200 px-3 py-1.5 text-right text-sm outline-none focus:border-slate-400"
                  />
                </div>
                <div className="flex justify-between border-t border-slate-100 pt-2.5 font-bold text-slate-950 text-base">
                  <span>{isEs ? "Total" : "Total"}</span>
                  <span>{formatter.format(editTotal)}</span>
                </div>
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    disabled={isSavingOrderEdits}
                    onClick={() => setIsEditingOrder(false)}
                    className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    {isEs ? "Cancelar" : "Cancel"}
                  </button>
                  <button
                    type="button"
                    disabled={isSavingOrderEdits}
                    onClick={() => void handleSaveOrderDetails()}
                    className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                  >
                    {isSavingOrderEdits
                      ? isEs ? "Guardando..." : "Saving..."
                      : isEs ? "Guardar cambios del pedido" : "Save order edits"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-4 space-y-2.5 text-sm text-slate-700">
                <div className="flex justify-between">
                  <span>{isEs ? "Subtotal" : "Subtotal"}</span>
                  <span>{formatter.format(Number(order.subtotal))}</span>
                </div>
                <div className="flex justify-between">
                  <span>{isEs ? "Envío" : "Shipping"}</span>
                  <span>{formatter.format(Number(order.shipping))}</span>
                </div>
                <div className="flex justify-between">
                  <span>{isEs ? "Impuestos" : "Tax"}</span>
                  <span>{formatter.format(Number(order.tax))}</span>
                </div>
                <div className="flex justify-between border-t border-slate-100 pt-2.5 font-bold text-slate-950 text-base">
                  <span>{isEs ? "Total" : "Total"}</span>
                  <span>{formatter.format(Number(order.total))}</span>
                </div>
              </div>
            )}
          </article>
        </div>
      </div>

      {isRefundModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-xs"
          onClick={() => {
            if (!isSaving) setIsRefundModalOpen(false);
          }}
        >
          <div
            className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-purple-700">
                  <RotateCcw className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-950">
                    {isEs ? "Reembolso y Retorno al Inventario" : "Refund & Restock Inventory"}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {isEs
                      ? `Pedido #${order.orderNumber} • Total del pedido: ${formatter.format(Number(order.total))}`
                      : `Order #${order.orderNumber} • Order total: ${formatter.format(Number(order.total))}`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={isSaving}
                onClick={() => setIsRefundModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="max-h-[70vh] overflow-y-auto px-6 py-5 space-y-5">
              {/* Items & Quantities to Restock */}
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    {isEs ? "Cantidades por artículo a devolver / reingresar" : "Item quantities to refund / restock"}
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={selectAllRefundQuantities}
                      className="rounded-lg border border-purple-200 bg-purple-50 px-2.5 py-1 text-xs font-semibold text-purple-700 transition hover:bg-purple-100"
                    >
                      {isEs ? "Todo el pedido" : "Full order"}
                    </button>
                    <button
                      type="button"
                      onClick={clearAllRefundQuantities}
                      className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
                    >
                      {isEs ? "Poner en 0" : "Clear (0)"}
                    </button>
                  </div>
                </div>

                <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-slate-50/50">
                  {order.items.map((item) => {
                    const selectedQty = restockQuantities[item.id] ?? 0;
                    const unitPrice = Number(item.price);
                    return (
                      <div key={item.id} className="flex items-center justify-between gap-3 px-4 py-3">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-slate-900">{item.title}</p>
                          <p className="text-xs text-slate-500">
                            {formatter.format(unitPrice)} × {item.quantity}{" "}
                            {isEs ? "comprados" : "ordered"}
                            {!item.variantId ? (
                              <span className="ml-2 text-amber-600">
                                ({isEs ? "Artículo personalizado" : "Custom item"})
                              </span>
                            ) : null}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="inline-flex items-center rounded-lg border border-slate-200 bg-white">
                            <button
                              type="button"
                              onClick={() => updateItemRestockQty(item.id, item.quantity, selectedQty - 1)}
                              disabled={selectedQty <= 0}
                              className="px-2.5 py-1 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                            >
                              −
                            </button>
                            <input
                              type="number"
                              min={0}
                              max={item.quantity}
                              value={selectedQty}
                              onChange={(e) =>
                                updateItemRestockQty(item.id, item.quantity, Number.parseInt(e.target.value, 10) || 0)
                              }
                              className="w-12 border-x border-slate-200 py-1 text-center text-sm font-semibold text-slate-900 outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => updateItemRestockQty(item.id, item.quantity, selectedQty + 1)}
                              disabled={selectedQty >= item.quantity}
                              className="px-2.5 py-1 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                            >
                              +
                            </button>
                          </div>
                          <span className="w-12 text-right text-xs font-medium text-slate-500">
                            / {item.quantity}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Refund Money Amount Input */}
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                      {isEs ? "Monto de dinero a reembolsar" : "Money amount to refund"}
                    </label>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {isEs
                        ? "Puedes reembolsar el total, el valor de las unidades seleccionadas o un monto parcial personalizado."
                        : "Refund the full total, the value of selected units, or enter a custom partial refund amount."}
                    </p>
                  </div>
                  {(() => {
                    const currentVal = Number.parseFloat(refundAmountInput) || 0;
                    const maxTotal = Number(order.total);
                    const isPartial = currentVal < maxTotal - 0.009;
                    return (
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${
                          isPartial
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : "bg-purple-50 text-purple-700 border border-purple-200"
                        }`}
                      >
                        {isPartial
                          ? (isEs ? "Reembolso parcial" : "Partial refund")
                          : (isEs ? "Reembolso total" : "Full refund")}
                      </span>
                    );
                  })()}
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <div className="relative flex-1 min-w-[160px]">
                    <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm font-semibold text-slate-500">
                      {order.currency || "USD"}
                    </span>
                    <input
                      type="number"
                      min="0"
                      max={Number(order.total)}
                      step="0.01"
                      value={refundAmountInput}
                      onChange={(e) => {
                        setIsCustomRefundAmount(true);
                        setRefundAmountInput(e.target.value);
                      }}
                      className="w-full rounded-xl border border-slate-300 py-2 pl-14 pr-3 text-sm font-bold text-slate-900 outline-none focus:border-purple-500"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomRefundAmount(false);
                      setRefundAmountInput(computeSuggestedRefundAmount(restockQuantities));
                    }}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    {isEs ? "Según unidades" : "Match selected units"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomRefundAmount(true);
                      setRefundAmountInput(Number(order.total).toFixed(2));
                    }}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    {isEs ? `Total (${formatter.format(Number(order.total))})` : `Full (${formatter.format(Number(order.total))})`}
                  </button>
                </div>
              </div>

              {/* Options Checkboxes */}
              <div className="space-y-2.5 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={restockToInventory}
                    onChange={(e) => setRestockToInventory(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                  />
                  <div>
                    <span className="text-sm font-semibold text-slate-900">
                      {isEs
                        ? "Reingresar las cantidades seleccionadas al inventario"
                        : "Restock selected quantities back into inventory"}
                    </span>
                    <p className="text-xs text-slate-500">
                      {isEs
                        ? `Se sumarán ${Object.entries(restockQuantities).reduce((sum, [id, qty]) => {
                            const item = order.items.find((i) => i.id === id);
                            return item?.variantId ? sum + qty : sum;
                          }, 0)} unidades al stock disponible.`
                        : `${Object.entries(restockQuantities).reduce((sum, [id, qty]) => {
                            const item = order.items.find((i) => i.id === id);
                            return item?.variantId ? sum + qty : sum;
                          }, 0)} units will be added back to available variant stock.`}
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-3 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={cancelOrderOnRefund}
                    onChange={(e) => setCancelOrderOnRefund(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                  />
                  <div>
                    <span className="text-sm font-semibold text-slate-900">
                      {isEs ? "Marcar estado del pedido como Cancelado" : "Mark order status as Cancelled"}
                    </span>
                    <p className="text-xs text-slate-500">
                      {isEs
                        ? "Desmarca esta opción si es un reembolso parcial y el resto del pedido sigue activo."
                        : "Uncheck this for partial refunds when the remainder of the order is still active."}
                    </p>
                  </div>
                </label>
              </div>

              {/* Refund Reason / Notes */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  {isEs ? "Motivo o notas del reembolso (opcional)" : "Refund reason or notes (optional)"}
                </label>
                <input
                  type="text"
                  value={refundReasonInput}
                  onChange={(e) => setRefundReasonInput(e.target.value)}
                  placeholder={
                    isEs
                      ? "Ej. Devolución del cliente, artículo dañado, ajuste de precio..."
                      : "e.g. Customer return, damaged item, price adjustment..."
                  }
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-purple-500"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50/60 px-6 py-4">
              <button
                type="button"
                disabled={isSaving}
                onClick={() => setIsRefundModalOpen(false)}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                {isEs ? "Cancelar" : "Cancel"}
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={() => void handleConfirmRefundAndRestock()}
                className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RotateCcw className="h-3.5 w-3.5" />
                )}
                {isSaving
                  ? (isEs ? "Procesando..." : "Processing...")
                  : (isEs
                      ? `Confirmar reembolso (${formatter.format(Math.min(Math.max(0, Number.parseFloat(refundAmountInput) || 0), Number(order.total)))})`
                      : `Confirm refund (${formatter.format(Math.min(Math.max(0, Number.parseFloat(refundAmountInput) || 0), Number(order.total)))})`)}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>


    {/* Printable Invoice Document (Visible only during print) */}
    <div className="hidden print:block font-sans text-slate-900 bg-white print:p-12 print:max-w-none print:w-full">
      {/* Invoice Header */}
      <div className="flex items-start justify-between border-b border-slate-300 pb-6">
        <div>
          {order.store.logoUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={order.store.logoUrl} alt={order.store.name} className="h-12 w-auto max-w-[200px] object-contain mb-2" />
          ) : (
            <h1 className="text-2xl font-bold tracking-tight text-slate-950">{order.store.name}</h1>
          )}
          {storeContact.address && <p className="text-xs text-slate-600 whitespace-pre-line mt-1">{storeContact.address}</p>}
          {order.store.senderEmail && <p className="text-xs text-slate-600 mt-0.5">Email: {order.store.senderEmail}</p>}
          {storeContact.phone && <p className="text-xs text-slate-600 mt-0.5">Phone: {storeContact.phone}</p>}
        </div>
        <div className="text-right">
          <h2 className="text-2xl font-extrabold tracking-wider uppercase text-slate-900">INVOICE</h2>
          <p className="mt-1 text-sm font-semibold text-slate-700">#{(order.store.invoicePrefix || "INV-").trim()}{order.orderNumber}</p>
          <p className="mt-1 text-xs text-slate-500">Date: {new Date(order.createdAt).toLocaleDateString()}</p>
        </div>
      </div>

      {/* Customer Addresses */}
      <div className="mt-6 grid grid-cols-2 gap-6 border-b border-slate-200 pb-6">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Billed To</h3>
          {parsedBilling && (parsedBilling.line1 || parsedBilling.city) ? (
            <div className="text-sm text-slate-800 space-y-0.5">
              <p className="font-semibold text-slate-950">
                {[parsedBilling.firstName, parsedBilling.lastName].filter(Boolean).join(" ") || "Customer"}
              </p>
              <p>{parsedBilling.line1}</p>
              {parsedBilling.line2 && <p>{parsedBilling.line2}</p>}
              <p>{[parsedBilling.city, parsedBilling.state, parsedBilling.postalCode].filter(Boolean).join(", ")}</p>
              <p>{parsedBilling.country}</p>
              <p className="text-xs text-slate-500 mt-1">{order.customerEmail}</p>
            </div>
          ) : (
            <div className="text-sm text-slate-800">
              <p className="font-semibold text-slate-950">{order.customerEmail}</p>
            </div>
          )}
        </div>

        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Shipped To</h3>
          {parsedShipping && (parsedShipping.line1 || parsedShipping.city) ? (
            <div className="text-sm text-slate-800 space-y-0.5">
              <p className="font-semibold text-slate-950">
                {[parsedShipping.firstName, parsedShipping.lastName].filter(Boolean).join(" ") || "Customer"}
              </p>
              <p>{parsedShipping.line1}</p>
              {parsedShipping.line2 && <p>{parsedShipping.line2}</p>}
              <p>{[parsedShipping.city, parsedShipping.state, parsedShipping.postalCode].filter(Boolean).join(", ")}</p>
              <p>{parsedShipping.country}</p>
              {parsedShipping.phone && <p className="text-xs text-slate-500 mt-1">Phone: {parsedShipping.phone}</p>}
            </div>
          ) : (
            <div className="text-sm text-slate-500 italic">Same as billing / Digital fulfillment</div>
          )}
        </div>
      </div>

      {/* Itemized Table */}
      <div className="mt-6">
        <table className="w-full text-left text-sm divide-y divide-slate-300">
          <thead>
            <tr className="border-b border-slate-300 bg-slate-50 text-slate-600 font-semibold text-xs uppercase tracking-wider">
              <th className="py-2.5 px-3">Item Description</th>
              <th className="py-2.5 px-3 text-center">Qty</th>
              <th className="py-2.5 px-3 text-right">Unit Price</th>
              <th className="py-2.5 px-3 text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {order.items.map((item) => (
              <tr key={item.id}>
                <td className="py-3 px-3 font-medium text-slate-900">{item.title}</td>
                <td className="py-3 px-3 text-center text-slate-700">{item.quantity}</td>
                <td className="py-3 px-3 text-right text-slate-700">{formatter.format(Number(item.price))}</td>
                <td className="py-3 px-3 text-right font-semibold text-slate-900">
                  {formatter.format(Number(item.price) * item.quantity)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Bottom-Anchored Financial Totals & Business Footer */}
      <div className="mt-auto pt-10">
        <div className="flex justify-end border-t border-slate-300 pt-4">
          <div className="w-64 space-y-2 text-sm text-slate-700">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span className="font-medium text-slate-900">{formatter.format(Number(order.subtotal))}</span>
            </div>
            <div className="flex justify-between">
              <span>Shipping:</span>
              <span className="font-medium text-slate-900">{formatter.format(Number(order.shipping))}</span>
            </div>
            <div className="flex justify-between">
              <span>Tax:</span>
              <span className="font-medium text-slate-900">{formatter.format(Number(order.tax))}</span>
            </div>
            <div className="flex justify-between border-t border-slate-400 pt-2 text-base font-bold text-slate-950">
              <span>Total:</span>
              <span>{formatter.format(Number(order.total))}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 border-t border-slate-200 pt-5 text-center text-xs text-slate-500 space-y-1.5">
          {order.store.invoiceFooterText ? (
            <p className="whitespace-pre-line font-semibold text-slate-800">{order.store.invoiceFooterText}</p>
          ) : (
            <p className="font-semibold text-slate-800">Thank you for your business!</p>
          )}
          <p className="text-[11px] text-slate-600">
            {[
              order.store.name,
              storeContact.address ? storeContact.address.replace(/\r?\n/g, ", ") : null,
              order.store.senderEmail ? `Email: ${order.store.senderEmail}` : null,
              storeContact.phone ? `Tel: ${storeContact.phone}` : null,
            ]
              .filter(Boolean)
              .join("  •  ")}
          </p>
          <p className="text-left text-[10px] font-normal text-slate-400/80">
            Powered by Prado Commerce
          </p>
        </div>
      </div>
    </div>

    {/* Print Page Styles - @page margin: 0 removes browser native headers (timestamp, title) & footers (URL) */}
    <style dangerouslySetInnerHTML={{ __html: `
      @media print {
        @page {
          margin: 0;
          size: auto;
        }
        html, body {
          background-color: #ffffff !important;
          color: #0f172a !important;
          margin: 0 !important;
          padding: 0 !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
      }
    ` }} />
    </>
  );
}
