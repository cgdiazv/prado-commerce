"use client";

import Link from "next/link";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useState, type FormEvent } from "react";
import {
  getStorefrontPageTitle,
  type StorefrontContactInfo,
  type StorefrontPage,
  type StorefrontPageKey,
} from "@/lib/storefront-pages";

type StorefrontPageContentProps = {
  pageKey: StorefrontPageKey;
  page: StorefrontPage;
  homeHref: string;
  contact?: StorefrontContactInfo;
};

function ContactSection({ contact, isEs }: { contact: StorefrontContactInfo; isEs: boolean }) {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const hasDetails = Boolean(contact.email || contact.phone || contact.address);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setStatus("sending");
    setErrorMessage("");

    try {
      const response = await fetch("/api/storefront/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId: contact.storeId,
          name: data.get("name"),
          email: data.get("email"),
          phone: data.get("phone"),
          message: data.get("message"),
          website: data.get("website"),
        }),
      });
      const result = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        setErrorMessage(result.error ?? "");
        setStatus("error");
        return;
      }

      form.reset();
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  }

  const inputClass =
    "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500";

  return (
    <div className="grid gap-8 md:grid-cols-[1fr_1.4fr]">
      {hasDetails ? (
        <div className="space-y-4 text-sm text-slate-700">
          {contact.email ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Email</p>
              <a href={`mailto:${contact.email}`} className="break-all hover:underline">{contact.email}</a>
            </div>
          ) : null}
          {contact.phone ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{isEs ? "Teléfono" : "Phone"}</p>
              <a href={`tel:${contact.phone.replace(/[^\d+]/g, "")}`} className="hover:underline">{contact.phone}</a>
            </div>
          ) : null}
          {contact.address ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{isEs ? "Dirección" : "Address"}</p>
              <p className="whitespace-pre-wrap break-words">{contact.address}</p>
            </div>
          ) : null}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className={`space-y-3 ${hasDetails ? "" : "md:col-span-2"}`}>
        <h2 className="text-lg font-semibold text-slate-900">{isEs ? "Envíanos un mensaje" : "Send us a message"}</h2>
        <input name="name" required maxLength={120} placeholder={isEs ? "Nombre" : "Name"} className={inputClass} />
        <input name="email" type="email" required maxLength={254} placeholder="Email" className={inputClass} />
        <input name="phone" maxLength={40} placeholder={isEs ? "Teléfono (opcional)" : "Phone (optional)"} className={inputClass} />
        <textarea
          name="message"
          required
          rows={5}
          maxLength={5000}
          placeholder={isEs ? "Mensaje" : "Message"}
          className={inputClass}
        />
        <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
        <button
          type="submit"
          disabled={status === "sending"}
          className="rounded-lg bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-60"
        >
          {status === "sending" ? (isEs ? "Enviando..." : "Sending...") : isEs ? "Enviar mensaje" : "Send message"}
        </button>
        {status === "sent" ? (
          <p className="text-sm text-emerald-700">
            {isEs ? "¡Mensaje enviado! Te responderemos pronto." : "Message sent! We'll get back to you soon."}
          </p>
        ) : null}
        {status === "error" ? (
          <p className="text-sm text-red-600">
            {errorMessage || (isEs ? "No se pudo enviar el mensaje. Intenta de nuevo." : "Could not send your message. Please try again.")}
          </p>
        ) : null}
      </form>
    </div>
  );
}

export default function StorefrontPageContent({ pageKey, page, homeHref, contact }: StorefrontPageContentProps) {
  const { language } = useLanguage();
  const isEs = language === "es";

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
      <Link href={homeHref} className="text-xs font-medium text-slate-500 transition hover:text-slate-900">
        ← {isEs ? "Volver a la tienda" : "Back to store"}
      </Link>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">
        {getStorefrontPageTitle(pageKey, page, language)}
      </h1>
      <div className="mt-6 space-y-3">
        {pageKey === "contact" && contact ? (
          <ContactSection contact={contact} isEs={isEs} />
        ) : pageKey === "faq" ? (
          page.faqItems.map((item, index) => (
            <details key={index} className="group rounded-xl border border-slate-200 bg-white px-4 py-3" open={index === 0}>
              <summary className="cursor-pointer list-none text-sm font-semibold text-slate-900 marker:hidden">
                {item.question}
              </summary>
              <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7 text-slate-600">{item.answer}</p>
            </details>
          ))
        ) : (
          <div className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-700">{page.content}</div>
        )}
      </div>
    </main>
  );
}
