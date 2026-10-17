"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useLanguage } from "@/lib/i18n/language-context";

type StoreEmailSettings = {
  id: string;
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

  const [storeId, setStoreId] = useState("");
  const [welcomeEmailEnabled, setWelcomeEmailEnabled] = useState(false);
  const [orderConfirmationEmailEnabled, setOrderConfirmationEmailEnabled] = useState(false);
  const [invoiceEmailEnabled, setInvoiceEmailEnabled] = useState(false);
  const [senderName, setSenderName] = useState("");
  const [senderEmail, setSenderEmail] = useState("");
  const [replyToEmail, setReplyToEmail] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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

        const stores = payload as StoreEmailSettings[];
        const activeStore = Array.isArray(stores) ? stores[0] : null;

        if (!activeStore?.id) {
          throw new Error(
            isEs
              ? "No se encontró ninguna tienda. Crea una tienda primero para administrar los correos."
              : "No store found. Create a store first to manage email settings."
          );
        }

        setStoreId(activeStore.id);
        setWelcomeEmailEnabled(Boolean(activeStore.welcomeEmailEnabled));
        setOrderConfirmationEmailEnabled(Boolean(activeStore.orderConfirmationEmailEnabled));
        setInvoiceEmailEnabled(Boolean(activeStore.invoiceEmailEnabled));
        setSenderName(activeStore.senderName ?? "");
        setSenderEmail(activeStore.senderEmail ?? "");
        setReplyToEmail(activeStore.replyToEmail ?? "");
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
          <p className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
            {isEs ? "Configuración" : "Settings"}
          </p>
          <div className="mt-1 flex items-start justify-between gap-4">
            <h1 className="text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">
              {isEs ? "Correos Electrónicos" : "Emails"}
            </h1>

            <Link
              href="/dashboard/settings"
              className="inline-flex shrink-0 items-center rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              {isEs ? "← Volver a configuración" : "← Back to settings"}
            </Link>
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
            <h2 className="text-sm font-semibold text-slate-900">
              {isEs ? "Vista previa del correo al comprador" : "Buyer email preview"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {isEs
                ? "Previsualiza cómo verá un comprador la confirmación de su pedido."
                : "Preview how your order confirmation email appears in a customer inbox."}
            </p>

            <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                  <p className="text-sm font-semibold text-slate-900">
                    {isEs ? "Confirmación de pedido" : "Order confirmation"}
                  </p>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                    {isEs ? "Vista previa" : "Preview"}
                  </span>
                </div>

                <div className="space-y-2 px-4 py-4 text-sm">
                  <p className="text-slate-700">
                    <span className="font-medium text-slate-900">{isEs ? "De:" : "From:"}</span> {previewSenderName} &lt;{previewSenderEmail}&gt;
                  </p>
                  <p className="text-slate-700">
                    <span className="font-medium text-slate-900">{isEs ? "Responder a:" : "Reply-To:"}</span> {previewReplyTo}
                  </p>
                  <p className="text-slate-700">
                    <span className="font-medium text-slate-900">{isEs ? "Asunto:" : "Subject:"}</span> {isEs ? `Tu pedido con ${previewSenderName} está confirmado` : `Your order with ${previewSenderName} is confirmed`}
                  </p>
                </div>

                <div className="border-t border-slate-200 px-4 py-4 text-sm leading-6 text-slate-700">
                  <p>{isEs ? "Hola Alex," : "Hi Alex,"}</p>
                  <p className="mt-2">
                    {isEs
                      ? "Gracias por tu compra. Hemos recibido tu pedido #PRD-1024 y lo estamos preparando para el envío."
                      : "Thanks for your purchase. We have received your order #PRD-1024 and are getting it ready to ship."}
                  </p>
                  <p className="mt-2">
                    {isEs
                      ? "Puedes responder directamente a este correo si tienes alguna consulta."
                      : "You can reply directly to this email if you have any questions."}
                  </p>
                  <button
                    type="button"
                    className="mt-4 rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white"
                  >
                    {isEs ? "Ver pedido" : "View order"}
                  </button>
                </div>
              </div>
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
