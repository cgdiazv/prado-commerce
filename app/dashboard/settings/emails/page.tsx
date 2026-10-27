"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useLanguage } from "@/lib/i18n/language-context";

type StoreEmailSettings = {
  id: string;
  name?: string;
  slug?: string;
  mainColor?: string;
  welcomeEmailEnabled?: boolean;
  orderConfirmationEmailEnabled?: boolean;
  invoiceEmailEnabled?: boolean;
  senderName?: string | null;
  senderEmail?: string | null;
  replyToEmail?: string | null;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function EmailSettingsPage() {
  const router = useRouter();
  const { language } = useLanguage();
  const isEs = language === "es";

  const [stores, setStores] = useState<StoreEmailSettings[]>([]);
  const [storeId, setStoreId] = useState("");
  const [storeSlug, setStoreSlug] = useState("");
  const [storeMainColor, setStoreMainColor] = useState("#0f172a");
  const [welcomeEmailEnabled, setWelcomeEmailEnabled] = useState(false);
  const [orderConfirmationEmailEnabled, setOrderConfirmationEmailEnabled] = useState(false);
  const [invoiceEmailEnabled, setInvoiceEmailEnabled] = useState(false);
  const [senderName, setSenderName] = useState("");
  const [senderEmail, setSenderEmail] = useState("");
  const [replyToEmail, setReplyToEmail] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Test Email state
  const [previewTab, setPreviewTab] = useState<"welcome" | "order" | "invoice">("welcome");
  const [testRecipient, setTestRecipient] = useState("cgdiazv@gmail.com");
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  function populateStoreEmailSettings(selected: StoreEmailSettings) {
    setStoreId(selected.id);
    setStoreSlug(selected.slug ?? "");
    setStoreMainColor(selected.mainColor ?? "#0f172a");
    setWelcomeEmailEnabled(Boolean(selected.welcomeEmailEnabled));
    setOrderConfirmationEmailEnabled(Boolean(selected.orderConfirmationEmailEnabled));
    setInvoiceEmailEnabled(Boolean(selected.invoiceEmailEnabled));
    setSenderName(selected.senderName ?? "");
    setSenderEmail(selected.senderEmail ?? "");
    setReplyToEmail(selected.replyToEmail ?? "");
  }

  async function handleSendTestEmail(type: "welcome" | "order_confirmation" | "invoice") {
    if (!storeId) return;
    const cleanEmail = testRecipient.trim().toLowerCase();
    if (!cleanEmail || !EMAIL_REGEX.test(cleanEmail)) {
      setTestResult({
        ok: false,
        message: isEs
          ? "Por favor ingresa un correo de destino válido."
          : "Please enter a valid recipient email address.",
      });
      return;
    }

    setIsSendingTest(true);
    setTestResult(null);

    try {
      const response = await fetch(`/api/stores/${storeId}/email-test`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          testEmail: cleanEmail,
          templateType: type,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || (isEs ? "Error al enviar correo de prueba" : "Failed to send test email"));
      }

      setTestResult({
        ok: true,
        message: isEs
          ? `¡Correo de prueba (${type === "welcome" ? "Bienvenida" : type === "order_confirmation" ? "Confirmación" : "Factura"}) enviado con éxito a ${cleanEmail}! Revisa tu bandeja de entrada.`
          : `Test email (${type === "welcome" ? "Welcome" : type === "order_confirmation" ? "Order" : "Invoice"}) successfully delivered to ${cleanEmail}! Check your inbox.`,
      });
    } catch (testErr: any) {
      setTestResult({
        ok: false,
        message: testErr?.message || (isEs ? "No se pudo enviar el correo de prueba." : "Unable to send test email."),
      });
    } finally {
      setIsSendingTest(false);
    }
  }

  function handleStoreChange(newId: string) {
    const chosen = stores.find((s) => s.id === newId);
    if (!chosen) return;
    setError(null);
    setSuccess(null);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("storeId", newId);
      window.history.replaceState(null, "", url.toString());
    }
    populateStoreEmailSettings(chosen);
  }

  useEffect(() => {
    async function loadStoreSettings() {
      try {
        const response = await fetch("/api/stores", { cache: "no-store" });
        const payload = (await response.json()) as
          | StoreEmailSettings[]
          | { error?: string };

        if (!response.ok) {
          const apiError =
            typeof payload === "object" && payload !== null && "error" in payload
              ? (payload as { error?: string }).error
              : null;

          throw new Error(
            apiError ||
              (isEs
                ? "No se pudo cargar la configuración de correos."
                : "Unable to load email settings.")
          );
        }

        const fetchedStores = Array.isArray(payload) ? (payload as StoreEmailSettings[]) : [];
        setStores(fetchedStores);

        if (fetchedStores.length === 0) {
          throw new Error(
            isEs
              ? "No se encontró ninguna tienda. Crea una tienda primero para administrar los correos."
              : "No store found. Create a store first to manage email settings."
          );
        }

        const urlParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
        const paramId = urlParams?.get("storeId");
        const activeStore = (paramId && fetchedStores.find((s) => s.id === paramId)) || fetchedStores[0];

        populateStoreEmailSettings(activeStore);
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : isEs
            ? "No se pudo cargar la configuración de correos."
            : "Unable to load email settings."
        );
      }
    }

    void loadStoreSettings();
  }, [isEs]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      if (!storeId) {
        throw new Error(
          isEs
            ? "No se encontró ninguna tienda. Crea una tienda primero para administrar los correos."
            : "No store found. Create a store first to manage email settings."
        );
      }

      if (senderEmail.trim() && !EMAIL_REGEX.test(senderEmail.trim())) {
        throw new Error(
          isEs
            ? "El correo de remitente debe tener un formato válido."
            : "Sender email must be a valid email address."
        );
      }

      if (replyToEmail.trim() && !EMAIL_REGEX.test(replyToEmail.trim())) {
        throw new Error(
          isEs
            ? "El correo de respuesta debe tener un formato válido."
            : "Reply-to email must be a valid email address."
        );
      }

      const response = await fetch(`/api/stores/${storeId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          welcomeEmailEnabled,
          orderConfirmationEmailEnabled,
          invoiceEmailEnabled,
          senderName,
          senderEmail,
          replyToEmail,
        }),
      });

      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(
          result.error ||
            (isEs
              ? "No se pudo guardar la configuración de correos."
              : "Unable to save email settings.")
        );
      }

      setStores((prev) =>
        prev.map((s) =>
          s.id === storeId
            ? {
                ...s,
                welcomeEmailEnabled,
                orderConfirmationEmailEnabled,
                invoiceEmailEnabled,
                senderName,
                senderEmail,
                replyToEmail,
              }
            : s
        )
      );

      setSuccess(
        isEs
          ? "Configuración de correos guardada correctamente."
          : "Email settings saved."
      );
      router.refresh();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : isEs
          ? "No se pudo guardar la configuración de correos."
          : "Unable to save email settings."
      );
    } finally {
      setIsSaving(false);
    }
  }

  const previewSenderName = senderName.trim() || (isEs ? "Equipo de tu Tienda" : "Your Store Team");
  const previewSenderEmail = senderEmail.trim() || "notifications@pradocommerce.com";
  const previewReplyTo = replyToEmail.trim() || previewSenderEmail;

  return (
    <section className="space-y-4">
      <div className="w-full">
        <div>
          <div className="flex items-start justify-between gap-4">
            <h1 className="text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">
              {isEs ? "Correos Electrónicos" : "Emails"}
            </h1>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              {stores.length > 1 ? (
                <div className="flex items-center gap-2">
                  <label htmlFor="emails-store-select" className="text-xs font-semibold text-slate-600 hidden sm:inline">
                    {isEs ? "Tienda:" : "Store:"}
                  </label>
                  <select
                    id="emails-store-select"
                    value={storeId}
                    onChange={(e) => handleStoreChange(e.target.value)}
                    className="text-xs font-semibold rounded-full border border-slate-300 bg-white px-3 py-2 text-slate-700 shadow-2xs focus:border-cyan-500 focus:outline-none"
                  >
                    {stores.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name || s.id}
                      </option>
                    ))}
                  </select>
                </div>
              ) : stores.length === 1 ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                  {stores[0].name || stores[0].id}
                </span>
              ) : null}

              <Link
                href="/dashboard/settings"
                className="inline-flex shrink-0 items-center rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                {isEs ? "← Volver a configuración" : "← Back to settings"}
              </Link>
            </div>
          </div>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            {isEs
              ? "Configura correos de bienvenida, confirmaciones de compra y recibos de facturación para tus clientes."
              : "Configure buyer welcome emails, order confirmations, and invoice emails for your storefront."}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="space-y-5">
          {error ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          {success ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {success}
            </div>
          ) : null}

          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {isEs
              ? "Los correos se enviarán desde notifications@pradocommerce.com usando los colores e identidad de tu tienda."
              : "Emails will be sent from notifications@pradocommerce.com using your store branding color."}
          </div>

          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              {isEs ? "Automatización" : "Automation"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {isEs
                ? "Activa o desactiva cada tipo de correo enviado a compradores."
                : "Turn each buyer-facing email on or off."}
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <span className="text-sm font-medium text-slate-800">
                  {isEs ? "Correo de bienvenida" : "Welcome email"}
                </span>
                <input
                  type="checkbox"
                  checked={welcomeEmailEnabled}
                  onChange={(event) => setWelcomeEmailEnabled(event.target.checked)}
                  className="h-4 w-4 accent-slate-900"
                />
              </label>

              <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <span className="text-sm font-medium text-slate-800">
                  {isEs ? "Confirmación de pedido" : "Order confirmation"}
                </span>
                <input
                  type="checkbox"
                  checked={orderConfirmationEmailEnabled}
                  onChange={(event) => setOrderConfirmationEmailEnabled(event.target.checked)}
                  className="h-4 w-4 accent-slate-900"
                />
              </label>

              <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <span className="text-sm font-medium text-slate-800">
                  {isEs ? "Recibo de factura" : "Invoice email"}
                </span>
                <input
                  type="checkbox"
                  checked={invoiceEmailEnabled}
                  onChange={(event) => setInvoiceEmailEnabled(event.target.checked)}
                  className="h-4 w-4 accent-slate-900"
                />
              </label>
            </div>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              {isEs ? "Identidad del remitente" : "Sender identity"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {isEs
                ? "Elige cómo aparecerán estos correos en la bandeja de entrada del comprador."
                : "Choose how these emails will appear in buyer inboxes."}
            </p>
            <div className="mt-3 grid gap-4 sm:grid-cols-3">
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-slate-700">
                  {isEs ? "Nombre del remitente" : "Sender name"}
                </span>
                <input
                  value={senderName}
                  onChange={(event) => setSenderName(event.target.value)}
                  placeholder={isEs ? "Equipo de tu Tienda" : "Your Store Team"}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-slate-700">
                  {isEs ? "Correo del remitente" : "Sender email"}
                </span>
                <input
                  type="email"
                  value={senderEmail}
                  onChange={(event) => setSenderEmail(event.target.value)}
                  placeholder="hola@tutienda.com"
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-slate-700">
                  {isEs ? "Correo de respuesta (Reply-to)" : "Reply-to email"}
                </span>
                <input
                  type="email"
                  value={replyToEmail}
                  onChange={(event) => setReplyToEmail(event.target.value)}
                  placeholder="soporte@tutienda.com"
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
                />
              </label>
            </div>
          </div>

          <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  {isEs ? "Vista previa interactiva del correo" : "Interactive email preview"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {isEs
                    ? "Previsualiza cómo verá un comprador cada tipo de correo con la identidad de tu tienda."
                    : "Preview how each buyer notification appears with your store branding."}
                </p>
              </div>

              {/* Template switcher tabs */}
              <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-1 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setPreviewTab("welcome")}
                  className={`rounded-md px-3 py-1.5 transition ${
                    previewTab === "welcome"
                      ? "bg-white text-slate-950 shadow-2xs font-bold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {isEs ? "👋 Bienvenida" : "👋 Welcome"}
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewTab("order")}
                  className={`rounded-md px-3 py-1.5 transition ${
                    previewTab === "order"
                      ? "bg-white text-slate-950 shadow-2xs font-bold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {isEs ? "📦 Pedido" : "📦 Order"}
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewTab("invoice")}
                  className={`rounded-md px-3 py-1.5 transition ${
                    previewTab === "invoice"
                      ? "bg-white text-slate-950 shadow-2xs font-bold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {isEs ? "🧾 Factura" : "🧾 Invoice"}
                </button>
              </div>
            </div>

            <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 bg-slate-50/50">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block h-3 w-3 rounded-full"
                      style={{ backgroundColor: storeMainColor }}
                    />
                    <p className="text-sm font-semibold text-slate-900">
                      {previewTab === "welcome"
                        ? isEs ? "Correo de bienvenida al comprador" : "Buyer welcome email"
                        : previewTab === "order"
                        ? isEs ? "Confirmación de pedido" : "Order confirmation"
                        : isEs ? "Recibo de factura" : "Invoice receipt"}
                    </p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                    {isEs ? "Vista previa" : "Preview"}
                  </span>
                </div>

                <div className="space-y-1.5 px-4 py-3 text-xs sm:text-sm bg-slate-50/30 border-b border-slate-100">
                  <p className="text-slate-700">
                    <span className="font-semibold text-slate-900">{isEs ? "De:" : "From:"}</span> {previewSenderName} &lt;{previewSenderEmail}&gt;
                  </p>
                  <p className="text-slate-700">
                    <span className="font-semibold text-slate-900">{isEs ? "Responder a:" : "Reply-To:"}</span> {previewReplyTo}
                  </p>
                  <p className="text-slate-700">
                    <span className="font-semibold text-slate-900">{isEs ? "Asunto:" : "Subject:"}</span>{" "}
                    {previewTab === "welcome"
                      ? isEs ? `¡Bienvenido a ${previewSenderName}!` : `Welcome to ${previewSenderName}!`
                      : previewTab === "order"
                      ? isEs ? `Tu pedido con ${previewSenderName} está confirmado (#1024)` : `Your order with ${previewSenderName} is confirmed (#1024)`
                      : isEs ? `Factura de compra #${1024} - ${previewSenderName}` : `Invoice for order #${1024} - ${previewSenderName}`}
                  </p>
                </div>

                {/* Email Body Content */}
                {previewTab === "welcome" ? (
                  <div className="p-6 text-sm text-slate-700">
                    <div className="mb-4 inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider" style={{ backgroundColor: `${storeMainColor}15`, color: storeMainColor }}>
                      {previewSenderName}
                    </div>
                    <h3 className="text-xl font-bold text-slate-950 mb-1">
                      {isEs ? `¡Bienvenido a ${previewSenderName}!` : `Welcome to ${previewSenderName}!`}
                    </h3>
                    <p className="text-xs text-slate-500 mb-4">
                      {isEs ? "Tu cuenta de cliente está lista para usar." : "Your shopper account is ready to explore."}
                    </p>
                    <p className="mb-3">
                      {isEs ? "Hola Carlos," : "Hi Carlos,"}
                    </p>
                    <p className="mb-4 text-slate-600 leading-relaxed">
                      {isEs
                        ? `Gracias por registrarte en ${previewSenderName}. Ahora tienes acceso directo a tu portal de compras, pedidos rápidos y seguimiento en tiempo real.`
                        : `Thank you for creating an account with ${previewSenderName}. You now have full access to your personalized shopping portal, faster checkouts, and seamless order management.`}
                    </p>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 mb-5 space-y-2 text-xs">
                      <div className="flex items-center gap-2 text-slate-800 font-semibold">
                        <span>⚡</span> {isEs ? "Pago rápido en 1 clic" : "Faster 1-Click Checkout"}
                      </div>
                      <div className="flex items-center gap-2 text-slate-800 font-semibold">
                        <span>📦</span> {isEs ? "Seguimiento en vivo de tus envíos" : "Live Real-Time Order Tracking"}
                      </div>
                      <div className="flex items-center gap-2 text-slate-800 font-semibold">
                        <span>🎁</span> {isEs ? "Acceso prioritario a novedades y ofertas" : "Priority Member Perks & Drops"}
                      </div>
                    </div>
                    <button
                      type="button"
                      style={{ backgroundColor: storeMainColor }}
                      className="rounded-full px-6 py-2.5 text-xs font-bold text-white shadow-sm"
                    >
                      {isEs ? `Ir a la tienda ${previewSenderName} →` : `Start Shopping at ${previewSenderName} →`}
                    </button>
                  </div>
                ) : previewTab === "order" ? (
                  <div className="p-6 text-sm text-slate-700">
                    <p className="font-semibold text-slate-900">{isEs ? "Hola Carlos," : "Hi Carlos,"}</p>
                    <p className="mt-2 text-slate-600">
                      {isEs
                        ? "Gracias por tu compra. Hemos recibido tu pedido #PRD-1024 y lo estamos preparando para el envío."
                        : "Thanks for your purchase. We have received your order #PRD-1024 and are getting it ready to ship."}
                    </p>
                    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
                      <div className="flex justify-between font-semibold text-slate-900">
                        <span>Total:</span>
                        <span>USD 89.50</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="mt-4 rounded-full bg-slate-900 px-5 py-2 text-xs font-semibold text-white"
                    >
                      {isEs ? "Ver pedido" : "View order"}
                    </button>
                  </div>
                ) : (
                  <div className="p-6 text-sm text-slate-700">
                    <p className="font-semibold text-slate-900">{isEs ? "Hola Carlos," : "Hi Carlos,"}</p>
                    <p className="mt-2 text-slate-600">
                      {isEs
                        ? "Tu recibo y factura oficial para el pedido #PRD-1024 ya está disponible."
                        : "Your invoice and official receipt for order #PRD-1024 is ready."}
                    </p>
                    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
                      <div className="flex justify-between font-semibold text-slate-900">
                        <span>Total Pagado:</span>
                        <span>USD 89.50</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="mt-4 rounded-full bg-slate-900 px-5 py-2 text-xs font-semibold text-white"
                    >
                      {isEs ? "Descargar factura" : "Download invoice"}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Live Test Email Dispatcher */}
            <div className="mt-4 rounded-xl border border-cyan-200 bg-cyan-50/50 p-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                    <span>📨</span> {isEs ? "Enviar correo de prueba real" : "Send live test email"}
                  </h3>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {isEs
                      ? `Envía un correo de prueba de (${previewTab === "welcome" ? "Bienvenida" : previewTab === "order" ? "Confirmación de pedido" : "Factura"}) a tu bandeja de entrada.`
                      : `Dispatch a live test (${previewTab === "welcome" ? "Welcome" : previewTab === "order" ? "Order Confirmation" : "Invoice"}) email to your inbox.`}
                  </p>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <input
                    type="email"
                    value={testRecipient}
                    onChange={(e) => setTestRecipient(e.target.value)}
                    placeholder="tucorreo@ejemplo.com"
                    className="flex-1 sm:w-64 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-cyan-500 shadow-2xs"
                  />
                  <button
                    type="button"
                    disabled={isSendingTest || !storeId}
                    onClick={() =>
                      handleSendTestEmail(
                        previewTab === "welcome"
                          ? "welcome"
                          : previewTab === "order"
                          ? "order_confirmation"
                          : "invoice"
                      )
                    }
                    className="shrink-0 rounded-xl bg-cyan-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-cyan-700 disabled:opacity-50 shadow-2xs cursor-pointer"
                  >
                    {isSendingTest
                      ? isEs ? "Enviando..." : "Sending..."
                      : isEs ? "Enviar prueba" : "Send test"}
                  </button>
                </div>
              </div>

              {testResult ? (
                <div
                  className={`mt-3 rounded-lg px-3.5 py-2.5 text-xs font-medium ${
                    testResult.ok
                      ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
                      : "border border-rose-200 bg-rose-50 text-rose-800"
                  }`}
                >
                  {testResult.message}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Link
            href="/dashboard/settings"
            className="rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 text-center"
          >
            {isEs ? "Cancelar" : "Cancel"}
          </Link>
          <button
            type="submit"
            disabled={isSaving || !storeId}
            className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSaving
              ? isEs
                ? "Guardando..."
                : "Saving..."
              : isEs
              ? "Guardar configuración"
              : "Save email settings"}
          </button>
        </div>
      </form>
    </section>
  );
}
