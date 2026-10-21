"use client";

import React, { useState, useMemo } from "react";
import {
  Mail,
  Send,
  X,
  Users,
  CheckCircle2,
  AlertTriangle,
  Eye,
  Edit3,
  Sparkles,
  ExternalLink,
  Store,
  Shield,
  Loader2,
  Gift,
  Package,
  Megaphone,
} from "lucide-react";

export type CustomerRecipient = {
  id: string;
  storeId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  groupId: string | null;
};

export type CustomerGroupOption = {
  id: string;
  name: string;
};

export type StoreOption = {
  id: string;
  name: string;
  currency: string;
};

interface BroadcastEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  stores: StoreOption[];
  activeStoreId: string;
  customers: CustomerRecipient[];
  selectedCustomerIds: string[];
  groups: CustomerGroupOption[];
  isEs?: boolean;
}

export function BroadcastEmailModal({
  isOpen,
  onClose,
  stores,
  activeStoreId,
  customers,
  selectedCustomerIds,
  groups,
  isEs = true,
}: BroadcastEmailModalProps) {
  // Store choice for sending
  const [selectedStoreId, setSelectedStoreId] = useState<string>(() => {
    if (activeStoreId && activeStoreId !== "ALL") return activeStoreId;
    return stores[0]?.id || "";
  });

  // Audience scope
  const [audience, setAudience] = useState<"all" | "selected" | "group">(() => {
    if (selectedCustomerIds.length > 0) return "selected";
    return "all";
  });
  const [selectedGroupId, setSelectedGroupId] = useState<string>(groups[0]?.id || "");

  // Email form fields
  const [subject, setSubject] = useState("");
  const [preheader, setPreheader] = useState("");
  const [message, setMessage] = useState("");
  const [includeCta, setIncludeCta] = useState(true);
  const [ctaText, setCtaText] = useState(isEs ? "Visitar Tienda" : "Visit Store");
  const [ctaUrl, setCtaUrl] = useState("");

  // UI state
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");
  const [testEmail, setTestEmail] = useState("");
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testSuccess, setTestSuccess] = useState<string | null>(null);
  const [testError, setTestError] = useState<string | null>(null);

  // Sending broadcast
  const [isSendingBroadcast, setIsSendingBroadcast] = useState(false);
  const [sendResult, setSendResult] = useState<{
    totalRecipients: number;
    sentCount: number;
    failedCount: number;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filter recipients based on store and audience
  const targetRecipients = useMemo(() => {
    const storeCustomers = customers.filter((c) => {
      if (selectedStoreId && c.storeId !== selectedStoreId) return false;
      return Boolean(c.email && c.email.includes("@"));
    });

    if (audience === "selected") {
      const selectedSet = new Set(selectedCustomerIds);
      return storeCustomers.filter((c) => selectedSet.has(c.id));
    }

    if (audience === "group") {
      return storeCustomers.filter((c) => c.groupId === selectedGroupId);
    }

    return storeCustomers;
  }, [customers, selectedStoreId, audience, selectedCustomerIds, selectedGroupId]);

  const activeStore = stores.find((s) => s.id === selectedStoreId) || stores[0];

  // Templates
  const handleApplyTemplate = (type: "promo" | "new_arrivals" | "notice") => {
    if (type === "promo") {
      setSubject(
        isEs
          ? `¡Promoción especial para ti en ${activeStore?.name || "nuestra tienda"}!`
          : `Special promotion for you at ${activeStore?.name || "our store"}!`
      );
      setPreheader(isEs ? "Descuentos exclusivos por tiempo limitado." : "Exclusive limited-time discounts.");
      setMessage(
        isEs
          ? `Queremos agradecerte por ser parte de nuestra comunidad.\n\nDurante los próximos días disfruta de descuentos y beneficios especiales en todo nuestro catálogo. Explora nuestras novedades y aprovecha esta oportunidad.\n\n¡Gracias por tu preferencia!`
          : `We want to thank you for being a valued part of our store community.\n\nEnjoy special discounts and exclusive benefits across our entire catalog this week. Check out what is new today!\n\nThank you for choosing us!`
      );
      setCtaText(isEs ? "Aprovechar Descuento" : "Shop the Sale");
    } else if (type === "new_arrivals") {
      setSubject(
        isEs
          ? `¡Nuevos productos disponibles en ${activeStore?.name || "nuestra tienda"}!`
          : `New arrivals now in stock at ${activeStore?.name || "our store"}!`
      );
      setPreheader(isEs ? "Descubre lo último en nuestro catálogo." : "Discover our latest additions.");
      setMessage(
        isEs
          ? `Acabamos de renovar nuestro inventario con artículos recién llegados.\n\nSé el primero en conocer nuestra nueva colección antes de que se agoten las existencias. Haz clic en el botón de abajo para explorar el catálogo completo.`
          : `We just refreshed our inventory with brand new arrivals.\n\nBe the first to browse our new collection while supplies last. Click below to view the latest products.`
      );
      setCtaText(isEs ? "Ver Novedades" : "Explore New Arrivals");
    } else if (type === "notice") {
      setSubject(
        isEs
          ? `Aviso importante de ${activeStore?.name || "nuestra tienda"}`
          : `Important update from ${activeStore?.name || "our store"}`
      );
      setPreheader(isEs ? "Información relevante sobre tus pedidos y servicios." : "Relevant information regarding your service.");
      setMessage(
        isEs
          ? `Estimado cliente,\n\nQueremos informarte sobre actualizaciones importantes en nuestros horarios, entregas y catálogo de productos para brindarte un mejor servicio.\n\nSi tienes cualquier pregunta, puedes responder directamente a este correo.`
          : `Dear customer,\n\nWe wanted to share an important update regarding our store hours, deliveries, and catalog to better serve you.\n\nIf you have any questions, feel free to reply directly to this email.`
      );
      setCtaText(isEs ? "Visitar Tienda" : "Visit Store");
    }
  };

  // Send test email
  const handleSendTest = async () => {
    if (!testEmail || !testEmail.includes("@")) {
      setTestError(isEs ? "Ingresa un correo electrónico de prueba válido." : "Enter a valid test email address.");
      return;
    }
    if (!subject.trim()) {
      setTestError(isEs ? "Ingresa un asunto antes de probar." : "Enter a subject before testing.");
      return;
    }
    if (!message.trim()) {
      setTestError(isEs ? "Ingresa un mensaje antes de probar." : "Enter a message before testing.");
      return;
    }

    setIsSendingTest(true);
    setTestError(null);
    setTestSuccess(null);

    try {
      const res = await fetch("/api/customers/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId: selectedStoreId,
          testEmail: testEmail.trim(),
          subject,
          preheader,
          message,
          ctaText: includeCta ? ctaText : undefined,
          ctaUrl: includeCta && ctaUrl ? ctaUrl : undefined,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setTestSuccess(
          isEs
            ? `✓ Correo de prueba enviado con éxito a ${testEmail}.`
            : `✓ Test email successfully sent to ${testEmail}.`
        );
      } else {
        setTestError(data.error || (isEs ? "Error al enviar correo de prueba." : "Error sending test email."));
      }
    } catch {
      setTestError(isEs ? "Error de conexión al enviar prueba." : "Connection error sending test.");
    } finally {
      setIsSendingTest(false);
    }
  };

  // Send mass broadcast
  const handleSendBroadcast = async () => {
    if (targetRecipients.length === 0) {
      setErrorMessage(isEs ? "No hay destinatarios válidos para enviar." : "No valid recipients to send to.");
      return;
    }
    if (!subject.trim()) {
      setErrorMessage(isEs ? "El asunto del correo es obligatorio." : "Email subject is required.");
      return;
    }
    if (!message.trim()) {
      setErrorMessage(isEs ? "El mensaje del correo es obligatorio." : "Email message content is required.");
      return;
    }

    const confirmPrompt = isEs
      ? `¿Estás seguro de enviar esta difusión a ${targetRecipients.length} clientes?`
      : `Are you sure you want to broadcast this email to ${targetRecipients.length} customers?`;

    if (!window.confirm(confirmPrompt)) {
      return;
    }

    setIsSendingBroadcast(true);
    setErrorMessage(null);
    setSendResult(null);

    try {
      const res = await fetch("/api/customers/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId: selectedStoreId,
          recipientFilter: audience,
          groupId: audience === "group" ? selectedGroupId : undefined,
          customerIds: audience === "selected" ? targetRecipients.map((r) => r.id) : undefined,
          subject,
          preheader,
          message,
          ctaText: includeCta ? ctaText : undefined,
          ctaUrl: includeCta && ctaUrl ? ctaUrl : undefined,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSendResult({
          totalRecipients: data.totalRecipients,
          sentCount: data.sentCount,
          failedCount: data.failedCount,
        });
      } else {
        setErrorMessage(data.error || (isEs ? "Error al procesar la difusión." : "Failed to process broadcast."));
      }
    } catch {
      setErrorMessage(isEs ? "Error de conexión al enviar la difusión." : "Connection error sending broadcast.");
    } finally {
      setIsSendingBroadcast(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl max-h-[92vh] flex flex-col rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-600 text-white shadow-xs">
              <Mail className="h-4.5 w-4.5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                {isEs ? "Difusión Masiva de Correos" : "Mass Email Broadcast"}
              </h2>
              <p className="text-xs text-slate-500">
                {isEs
                  ? "Envía comunicados, ofertas y novedades por correo a tus clientes."
                  : "Send announcements, promotions, and updates to your shoppers."}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition cursor-pointer"
            aria-label={isEs ? "Cerrar" : "Close"}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {/* Success banner if broadcast sent */}
          {sendResult ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-6 text-center space-y-3 animate-in zoom-in-95 duration-200">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-emerald-950">
                {isEs ? "¡Difusión enviada con éxito!" : "Broadcast successfully sent!"}
              </h3>
              <p className="text-sm text-emerald-800 max-w-md mx-auto">
                {isEs
                  ? `Se enviaron ${sendResult.sentCount} correos electrónicos exitosamente de un total de ${sendResult.totalRecipients} destinatarios.`
                  : `Successfully sent ${sendResult.sentCount} emails out of ${sendResult.totalRecipients} recipients.`}
                {sendResult.failedCount > 0 && (
                  <span className="block mt-1 text-xs text-rose-700 font-semibold">
                    {isEs
                      ? `(${sendResult.failedCount} correos no pudieron ser entregados).`
                      : `(${sendResult.failedCount} emails could not be delivered).`}
                  </span>
                )}
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs shadow-xs transition"
                >
                  {isEs ? "Entendido y Cerrar" : "Done & Close"}
                </button>
              </div>
            </div>
          ) : (
            <>
              {errorMessage && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-800 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* 1. Target Audience & Store Selector */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                    <Users className="h-4 w-4 text-cyan-600" />
                    {isEs ? "Destinatarios y Segmento" : "Target Recipients"}
                  </span>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-100/70 border border-cyan-300 text-cyan-800 text-xs font-bold">
                    <span>{targetRecipients.length}</span>
                    <span>
                      {targetRecipients.length === 1
                        ? isEs
                          ? "cliente con correo válido"
                          : "client with valid email"
                        : isEs
                        ? "clientes con correo válido"
                        : "clients with valid email"}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {/* Option 1: All in store */}
                  <button
                    type="button"
                    onClick={() => setAudience("all")}
                    className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                      audience === "all"
                        ? "border-cyan-600 bg-white shadow-xs ring-2 ring-cyan-600/10"
                        : "border-slate-200 bg-white/60 hover:bg-white text-slate-700"
                    }`}
                  >
                    <div className="text-xs font-bold text-slate-900">{isEs ? "Toda la Tienda" : "All Customers"}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {isEs ? "Todos los registrados" : "All registered shoppers"}
                    </div>
                  </button>

                  {/* Option 2: Selected Checkboxes */}
                  <button
                    type="button"
                    disabled={selectedCustomerIds.length === 0}
                    onClick={() => setAudience("selected")}
                    className={`p-3 rounded-xl border text-left transition ${
                      selectedCustomerIds.length === 0
                        ? "opacity-50 cursor-not-allowed border-slate-200 bg-slate-100"
                        : audience === "selected"
                        ? "border-cyan-600 bg-white shadow-xs ring-2 ring-cyan-600/10 cursor-pointer"
                        : "border-slate-200 bg-white/60 hover:bg-white text-slate-700 cursor-pointer"
                    }`}
                  >
                    <div className="text-xs font-bold text-slate-900">
                      {isEs ? "Seleccionados en Tabla" : "Checked Customers"}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {selectedCustomerIds.length}{" "}
                      {selectedCustomerIds.length === 1
                        ? isEs
                          ? "marcado"
                          : "selected"
                        : isEs
                        ? "marcados"
                        : "selected"}
                    </div>
                  </button>

                  {/* Option 3: By Customer Group */}
                  <button
                    type="button"
                    disabled={groups.length === 0}
                    onClick={() => setAudience("group")}
                    className={`p-3 rounded-xl border text-left transition ${
                      groups.length === 0
                        ? "opacity-50 cursor-not-allowed border-slate-200 bg-slate-100"
                        : audience === "group"
                        ? "border-cyan-600 bg-white shadow-xs ring-2 ring-cyan-600/10 cursor-pointer"
                        : "border-slate-200 bg-white/60 hover:bg-white text-slate-700 cursor-pointer"
                    }`}
                  >
                    <div className="text-xs font-bold text-slate-900">{isEs ? "Por Grupo" : "By Group"}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {groups.length} {isEs ? "grupos configurados" : "groups available"}
                    </div>
                  </button>
                </div>

                {/* Sub-selectors */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {/* Store select */}
                  {stores.length > 1 && (
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        {isEs ? "Tienda Remitente:" : "Sending Store:"}
                      </label>
                      <select
                        value={selectedStoreId}
                        onChange={(e) => setSelectedStoreId(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold outline-none focus:border-cyan-500 cursor-pointer"
                      >
                        {stores.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} ({s.currency})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Group select if audience === "group" */}
                  {audience === "group" && (
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        {isEs ? "Seleccionar Grupo:" : "Select Group:"}
                      </label>
                      <select
                        value={selectedGroupId}
                        onChange={(e) => setSelectedGroupId(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold outline-none focus:border-cyan-500 cursor-pointer"
                      >
                        {groups.map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Template Inspirations */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                  {isEs ? "Plantillas rápidas:" : "Quick templates:"}
                </span>
                <button
                  type="button"
                  onClick={() => handleApplyTemplate("promo")}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-100 hover:bg-cyan-50 hover:text-cyan-700 text-slate-700 transition cursor-pointer border border-slate-200 hover:border-cyan-300"
                >
                  <Gift className="h-3.5 w-3.5 text-cyan-600" />
                  <span>{isEs ? "Promoción / Descuento" : "Promotion / Discount"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyTemplate("new_arrivals")}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-100 hover:bg-cyan-50 hover:text-cyan-700 text-slate-700 transition cursor-pointer border border-slate-200 hover:border-cyan-300"
                >
                  <Package className="h-3.5 w-3.5 text-cyan-600" />
                  <span>{isEs ? "Nuevos Productos" : "New Arrivals"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyTemplate("notice")}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-100 hover:bg-cyan-50 hover:text-cyan-700 text-slate-700 transition cursor-pointer border border-slate-200 hover:border-cyan-300"
                >
                  <Megaphone className="h-3.5 w-3.5 text-cyan-600" />
                  <span>{isEs ? "Aviso Importante" : "Store Notice"}</span>
                </button>
              </div>

              {/* Edit / Preview Tabs */}
              <div className="border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => setActiveTab("edit")}
                    className={`pb-2.5 text-xs font-bold transition flex items-center gap-1.5 border-b-2 cursor-pointer ${
                      activeTab === "edit"
                        ? "border-cyan-600 text-cyan-700"
                        : "border-transparent text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                    <span>{isEs ? "Redactar Contenido" : "Compose Content"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("preview")}
                    className={`pb-2.5 text-xs font-bold transition flex items-center gap-1.5 border-b-2 cursor-pointer ${
                      activeTab === "preview"
                        ? "border-cyan-600 text-cyan-700"
                        : "border-transparent text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <Eye className="h-3.5 w-3.5" />
                    <span>{isEs ? "Vista Previa de Correo" : "Live Email Preview"}</span>
                  </button>
                </div>
              </div>

              {/* Tab 1: Edit Mode */}
              {activeTab === "edit" ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {isEs ? "Asunto del Correo" : "Email Subject"} <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder={
                        isEs
                          ? "Ej: ¡Nueva colección de temporada y descuentos exclusivos!"
                          : "E.g., Exclusive seasonal discounts are now live!"
                      }
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-semibold text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {isEs ? "Pre-encabezado / Subtítulo breve" : "Preheader Snippet"}{" "}
                      <span className="text-slate-400 font-normal">
                        ({isEs ? "Texto visible en la bandeja antes de abrir" : "Preview text shown in inbox"})
                      </span>
                    </label>
                    <input
                      type="text"
                      value={preheader}
                      onChange={(e) => setPreheader(e.target.value)}
                      placeholder={
                        isEs
                          ? "Ej: Aprovecha hasta un 20% de descuento en artículos seleccionados..."
                          : "E.g., Save up to 20% off selected items today..."
                      }
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-700 outline-none transition focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {isEs ? "Mensaje / Cuerpo del Correo" : "Email Body Message"}{" "}
                      <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      rows={6}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder={
                        isEs
                          ? "Escribe tu mensaje aquí...\n\nCada cliente recibirá automáticamente un saludo personalizado con su nombre."
                          : "Type your message here...\n\nEach customer will automatically receive a personalized greeting."
                      }
                      className="w-full rounded-xl border border-slate-200 p-3.5 text-sm text-slate-800 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 resize-y"
                    />
                  </div>

                  {/* Call to Action configuration */}
                  <div className="rounded-xl border border-slate-200 p-3.5 bg-slate-50/50 space-y-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="include-cta-check"
                        checked={includeCta}
                        onChange={(e) => setIncludeCta(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                      />
                      <label htmlFor="include-cta-check" className="text-xs font-bold text-slate-800 cursor-pointer">
                        {isEs ? "Incluir botón de acción (Call To Action)" : "Include Call To Action button"}
                      </label>
                    </div>

                    {includeCta && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                            {isEs ? "Texto del Botón:" : "Button Label:"}
                          </label>
                          <input
                            type="text"
                            value={ctaText}
                            onChange={(e) => setCtaText(e.target.value)}
                            placeholder={isEs ? "Ej: Comprar Ahora" : "E.g., Shop Now"}
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold outline-none focus:border-cyan-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                            {isEs ? "Enlace de Destino:" : "Destination URL:"}{" "}
                            <span className="text-slate-400 font-normal">({isEs ? "Opcional" : "Optional"})</span>
                          </label>
                          <input
                            type="url"
                            value={ctaUrl}
                            onChange={(e) => setCtaUrl(e.target.value)}
                            placeholder={isEs ? "Por defecto: Enlace de la tienda" : "Defaults to store link"}
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs outline-none focus:border-cyan-500"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* Tab 2: Preview Mode */
                <div className="rounded-xl border border-slate-200 bg-slate-100 p-4 sm:p-6 overflow-hidden">
                  <div className="max-w-[540px] mx-auto bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden text-slate-800">
                    {/* Preview Header */}
                    <div className="p-5 border-b border-slate-100">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        {activeStore?.name || "PRADO COMMERCE"}
                      </p>
                      <h4 className="text-lg font-bold text-slate-900 mt-1 leading-snug">
                        {subject.trim() || (isEs ? "(Sin asunto configurado)" : "(No subject set)")}
                      </h4>
                    </div>

                    {/* Preview Body */}
                    <div className="p-5 text-sm text-slate-700 space-y-3 leading-relaxed">
                      <p className="font-semibold text-slate-900">
                        {isEs ? "Hola [Nombre del Cliente]," : "Hi [Customer Name],"}
                      </p>
                      <div className="whitespace-pre-wrap text-slate-700">
                        {message.trim() ||
                          (isEs
                            ? "Aquí se mostrará el contenido de tu mensaje redactado..."
                            : "Your written message will appear here...")}
                      </div>

                      {includeCta && ctaText && (
                        <div className="pt-3">
                          <span className="inline-block px-5 py-2.5 rounded-lg bg-slate-950 text-white font-bold text-xs shadow-xs">
                            {ctaText}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Preview Footer */}
                    <div className="p-4 bg-slate-50 border-t border-slate-100 text-[10px] text-slate-400 leading-normal text-center">
                      <p>
                        {isEs
                          ? `Has recibido esta comunicación oficial porque eres cliente registrado de ${activeStore?.name}.`
                          : `You received this message because you are a registered customer of ${activeStore?.name}.`}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Test Email Section */}
              <div className="rounded-xl border border-dashed border-slate-300 p-3.5 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="text-xs">
                  <span className="font-bold text-slate-800 block">
                    {isEs ? "¿Deseas probar antes de enviar?" : "Want to test before blasting?"}
                  </span>
                  <span className="text-slate-500 text-[11px]">
                    {isEs
                      ? "Envía una copia de prueba a tu propio correo para validar el diseño."
                      : "Send a test copy to your email to verify layout and copy."}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="email"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    placeholder={isEs ? "tu-correo@ejemplo.com" : "your-email@example.com"}
                    className="w-48 sm:w-56 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-cyan-500"
                  />
                  <button
                    type="button"
                    onClick={handleSendTest}
                    disabled={isSendingTest || !testEmail}
                    className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs transition cursor-pointer disabled:opacity-50 shrink-0"
                  >
                    {isSendingTest ? (isEs ? "Enviando..." : "Sending...") : (isEs ? "Probar" : "Test")}
                  </button>
                </div>
              </div>

              {testSuccess && (
                <div className="rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-3 py-2 font-medium">
                  {testSuccess}
                </div>
              )}
              {testError && (
                <div className="rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs px-3 py-2 font-medium">
                  {testError}
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        {!sendResult && (
          <div className="px-5 py-4 border-t border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
            <div className="text-xs text-slate-500 font-medium text-center sm:text-left">
              {targetRecipients.length > 0 ? (
                <span>
                  {isEs ? "Listo para enviar a" : "Ready to send to"}{" "}
                  <strong className="text-slate-900">{targetRecipients.length}</strong>{" "}
                  {isEs ? "clientes seleccionados" : "selected clients"}
                </span>
              ) : (
                <span className="text-amber-600 font-semibold">
                  {isEs ? "Selecciona al menos 1 destinatario con email" : "Select at least 1 client with email"}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <button
                type="button"
                onClick={onClose}
                disabled={isSendingBroadcast}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition cursor-pointer"
              >
                {isEs ? "Cancelar" : "Cancel"}
              </button>

              <button
                type="button"
                onClick={handleSendBroadcast}
                disabled={isSendingBroadcast || targetRecipients.length === 0 || !subject.trim() || !message.trim()}
                className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSendingBroadcast ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>{isEs ? "Enviando Difusión..." : "Broadcasting..."}</span>
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    <span>
                      {isEs
                        ? `Enviar Difusión (${targetRecipients.length})`
                        : `Send Broadcast (${targetRecipients.length})`}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
