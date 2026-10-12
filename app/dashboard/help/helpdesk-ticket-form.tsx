"use client";

import { useEffect, useState } from "react";
import { Send, CheckCircle2, AlertCircle, LifeBuoy } from "lucide-react";
import { useLanguage } from "@/lib/i18n/language-context";

export function HelpdeskTicketForm() {
  const { language } = useLanguage();
  const isEs = language === "es";

  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("General Support");
  const [priority, setPriority] = useState("NORMAL");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function prefillUser() {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const user = await res.json();
          if (user?.email) setEmail(user.email);
          if (user?.name) setName(user.name);
        }
      } catch {
        // Ignored fallback
      }
    }
    void prefillUser();
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      if (!subject.trim()) {
        throw new Error(isEs ? "Por favor ingresa un asunto para el ticket." : "Please enter a ticket subject.");
      }
      if (!email.trim()) {
        throw new Error(isEs ? "Por favor ingresa tu correo de contacto." : "Please enter your contact email.");
      }
      if (!message.trim()) {
        throw new Error(isEs ? "Por favor ingresa una descripción del mensaje." : "Please enter a message description.");
      }

      const response = await fetch("/api/support/ticket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: subject.trim(),
          category,
          priority,
          email: email.trim(),
          name: name.trim(),
          message: message.trim(),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || (isEs ? "Error al enviar el ticket." : "Failed to send helpdesk ticket."));
      }

      setSuccessMessage(
        isEs
          ? "¡Ticket de soporte enviado con éxito! Nuestro equipo en support@pradocommerce.com ha recibido tu solicitud y responderá en breve."
          : "Helpdesk ticket submitted successfully! Our support team at support@pradocommerce.com has received your request and will respond shortly.",
      );
      setSubject("");
      setMessage("");
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : isEs
            ? "Error al enviar el ticket."
            : "Failed to submit ticket.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
          <LifeBuoy className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-base font-bold text-slate-950">
            {isEs ? "Abrir un Ticket de Soporte" : "Open a Helpdesk Ticket"}
          </h2>
          <p className="text-xs text-slate-500">
            {isEs ? "Envía un ticket directamente a " : "Send a support ticket directly to "}
            <span className="font-semibold text-slate-700">support@pradocommerce.com</span>
          </p>
        </div>
      </div>

      {successMessage ? (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
          <p>{successMessage}</p>
        </div>
      ) : null}

      {errorMessage ? (
        <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          <AlertCircle className="h-5 w-5 shrink-0 text-rose-600" />
          <p>{errorMessage}</p>
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 sm:col-span-2">
            <span className="text-xs font-semibold text-slate-700">{isEs ? "Asunto" : "Subject"}</span>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={isEs ? "Ej. Problema conectando pasarela Authorize.net" : "e.g. Issue connecting Authorize.net gateway"}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
              required
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-slate-700">{isEs ? "Categoría" : "Category"}</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-slate-400"
            >
              <option value="General Support">{isEs ? "Soporte General" : "General Support"}</option>
              <option value="Technical Issue">{isEs ? "Problema Técnico" : "Technical Issue"}</option>
              <option value="Orders & Shipping">{isEs ? "Pedidos y Envíos" : "Orders & Shipping"}</option>
              <option value="Payments & Billing">{isEs ? "Pagos y Facturación" : "Payments & Billing"}</option>
              <option value="Account & Security">{isEs ? "Cuenta y Seguridad" : "Account & Security"}</option>
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-slate-700">{isEs ? "Prioridad" : "Priority"}</span>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-slate-400"
            >
              <option value="NORMAL">{isEs ? "Normal" : "Normal"}</option>
              <option value="LOW">{isEs ? "Baja" : "Low"}</option>
              <option value="HIGH">{isEs ? "Alta" : "High"}</option>
              <option value="URGENT">{isEs ? "Urgente" : "Urgent"}</option>
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-slate-700">{isEs ? "Tu Correo" : "Your Email"}</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="comercio@ejemplo.com"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
              required
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-slate-700">{isEs ? "Tu Nombre (opcional)" : "Your Name (optional)"}</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Juan Pérez"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
            />
          </label>

          <label className="flex flex-col gap-1.5 sm:col-span-2">
            <span className="text-xs font-semibold text-slate-700">{isEs ? "Descripción del Mensaje" : "Message Description"}</span>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={isEs ? "Proporciona tantos detalles como sea posible sobre tu pregunta o incidencia..." : "Provide as much detail as possible about your question or issue..."}
              rows={4}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
              required
            />
          </label>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Send className="h-4 w-4" />
            {isSubmitting
              ? isEs ? "Enviando ticket..." : "Submitting ticket..."
              : isEs ? "Enviar Ticket" : "Submit Ticket"}
          </button>
        </div>
      </form>
    </section>
  );
}

