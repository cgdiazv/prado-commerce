"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, ExternalLink, Plus, Store, Trash2 } from "lucide-react";
import { useLanguage } from "@/lib/i18n/language-context";
import {
  MAX_FAQ_ANSWER_LENGTH,
  MAX_FAQ_ITEMS,
  MAX_FAQ_QUESTION_LENGTH,
  MAX_PAGE_CONTENT_LENGTH,
  MAX_PAGE_TITLE_LENGTH,
  STOREFRONT_PAGE_DEFAULT_TITLES,
  STOREFRONT_PAGE_KEYS,
  type FaqItem,
  type StorefrontPageKey,
  type StorefrontPages,
} from "@/lib/storefront-pages";
import { saveStorefrontPages, type StorefrontPagesActionState } from "./actions";

type StorePagesClientProps = {
  store: { id: string; name: string; slug: string };
  initialPages: StorefrontPages;
  stores?: Array<{ id: string; name: string }>;
};

const initialState: StorefrontPagesActionState = { error: null, message: null };

const PAGE_HINTS: Record<StorefrontPageKey, { en: string; es: string }> = {
  faq: {
    en: "Answers to the questions your customers ask most.",
    es: "Respuestas a las preguntas más comunes de tus clientes.",
  },
  terms: {
    en: "Your terms of service plus return, refund and exchange policy.",
    es: "Tus términos de servicio y política de devoluciones, reembolsos y cambios.",
  },
  contact: {
    en: "Shows your store email, phone and address, plus a message form.",
    es: "Muestra el correo, teléfono y dirección de tu tienda, y un formulario de mensaje.",
  },
};

type FaqRow = { id: number; question: string; answer: string };

function FaqItemsEditor({ initialItems, isEs }: { initialItems: FaqItem[]; isEs: boolean }) {
  const [nextId, setNextId] = useState(initialItems.length + 1);
  const [rows, setRows] = useState<FaqRow[]>(() =>
    initialItems.length > 0
      ? initialItems.map((item, index) => ({ id: index, ...item }))
      : [{ id: 0, question: "", answer: "" }],
  );

  function updateRow(id: number, patch: Partial<FaqRow>) {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  function addRow() {
    setRows((current) => [...current, { id: nextId, question: "", answer: "" }]);
    setNextId((current) => current + 1);
  }

  function removeRow(id: number) {
    setRows((current) => current.filter((row) => row.id !== id));
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
        {isEs ? "Preguntas y respuestas" : "Questions & answers"}
      </p>

      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 px-4 py-6 text-center text-xs text-slate-500">
          {isEs ? "Aún no hay preguntas." : "No questions yet."}
        </p>
      ) : null}

      {rows.map((row, index) => (
        <div key={row.id} className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-500">#{index + 1}</span>
            <button
              type="button"
              onClick={() => removeRow(row.id)}
              aria-label={isEs ? "Eliminar pregunta" : "Remove question"}
              className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium text-rose-600 transition hover:bg-rose-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              {isEs ? "Eliminar" : "Remove"}
            </button>
          </div>
          <input
            name="faq:question"
            value={row.question}
            onChange={(event) => updateRow(row.id, { question: event.target.value })}
            maxLength={MAX_FAQ_QUESTION_LENGTH}
            placeholder={isEs ? "Pregunta" : "Question"}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium outline-none focus:border-cyan-600"
          />
          <textarea
            name="faq:answer"
            value={row.answer}
            onChange={(event) => updateRow(row.id, { answer: event.target.value })}
            maxLength={MAX_FAQ_ANSWER_LENGTH}
            rows={3}
            placeholder={isEs ? "Respuesta" : "Answer"}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm leading-6 outline-none focus:border-cyan-600"
          />
        </div>
      ))}

      {rows.length < MAX_FAQ_ITEMS ? (
        <button
          type="button"
          onClick={addRow}
          className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 px-3.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          <Plus className="h-3.5 w-3.5" />
          {isEs ? "Agregar pregunta" : "Add question"}
        </button>
      ) : null}
      <p className="text-[11px] text-slate-400">
        {isEs
          ? "Las filas sin pregunta o sin respuesta no se guardan."
          : "Rows missing a question or an answer are not saved."}
      </p>
    </div>
  );
}

export function StorePagesClient({ store, initialPages, stores = [] }: StorePagesClientProps) {
  const router = useRouter();
  const { language } = useLanguage();
  const isEs = language === "es";
  const [state, formAction, isPending] = useActionState(saveStorefrontPages, initialState);
  const lang = isEs ? "es" : "en";
  const [activeKey, setActiveKey] = useState<StorefrontPageKey>(STOREFRONT_PAGE_KEYS[0]);

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">
            {isEs ? "Páginas de la Tienda" : "Storefront Pages"}
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            {isEs
              ? `Administra las páginas enlazadas en el pie de página de ${store.name}.`
              : `Manage the pages linked from the ${store.name} storefront footer.`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {stores.length > 1 ? (
            <div className="relative w-56 shrink-0">
              <Store className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <select
                value={store.id}
                onChange={(event) => router.push(`/dashboard/stores/${event.target.value}/pages`)}
                aria-label={isEs ? "Seleccionar tienda" : "Select store"}
                className="w-full cursor-pointer appearance-none rounded-full border border-slate-200 bg-white py-2 pl-9 pr-9 text-sm font-medium text-slate-700 shadow-2xs outline-none transition hover:bg-slate-50 focus:border-slate-400"
              >
                {stores.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>
          ) : null}
          <Link
            href={`/storefront/${store.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <span>{isEs ? "Ver tienda" : "View storefront"}</span>
            <ExternalLink className="h-3.5 w-3.5 text-slate-500" />
          </Link>
          <Link
            href="/dashboard/stores"
            className="rounded-full border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
          >
            {isEs ? "Volver" : "Back"}
          </Link>
        </div>
      </div>

      <form action={formAction} className="space-y-4">
        <input type="hidden" name="storeId" value={store.id} />

        {state.error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-medium text-rose-700">
            {state.error}
          </div>
        ) : null}

        {state.message ? (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-medium text-emerald-700">
            <Check className="h-4 w-4 shrink-0" />
            {isEs ? "Páginas guardadas." : state.message}
          </div>
        ) : null}

        <div role="tablist" className="flex flex-wrap gap-1 border-b border-slate-200">
          {STOREFRONT_PAGE_KEYS.map((key) => {
            const isActive = key === activeKey;

            return (
              <button
                key={key}
                type="button"
                role="tab"
                id={`tab-${key}`}
                aria-selected={isActive}
                aria-controls={`panel-${key}`}
                onClick={() => setActiveKey(key)}
                className={`-mb-px inline-flex shrink-0 items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition ${
                  isActive
                    ? "border-cyan-600 text-cyan-700"
                    : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
                }`}
              >
                {STOREFRONT_PAGE_DEFAULT_TITLES[key][lang]}
                {initialPages[key].enabled ? (
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
                ) : null}
              </button>
            );
          })}
        </div>

        {STOREFRONT_PAGE_KEYS.map((key) => {
          const page = initialPages[key];
          const defaultTitle = STOREFRONT_PAGE_DEFAULT_TITLES[key][lang];

          return (
            // Inactive panels stay mounted (hidden) so every page is submitted on save.
            <article
              key={key}
              role="tabpanel"
              id={`panel-${key}`}
              aria-labelledby={`tab-${key}`}
              hidden={key !== activeKey}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5">
                <div>
                  <h2 className="text-base font-semibold text-slate-900">{defaultTitle}</h2>
                  <p className="mt-0.5 text-xs text-slate-500">{PAGE_HINTS[key][lang]}</p>
                  <p className="mt-0.5 font-mono text-[11px] text-slate-400">/pages/{key}</p>
                </div>
                <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    name={`${key}:enabled`}
                    defaultChecked={page.enabled}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  {isEs ? "Mostrar en el pie de página" : "Show in footer"}
                </label>
              </div>

              <div className="space-y-4 p-5">
                {key === "contact" ? (
                  <p className="text-sm leading-6 text-slate-600">
                    {isEs
                      ? "Esta página se genera automáticamente con el correo, teléfono y dirección de la sección \"Contacto y ubicación de la tienda\" de la configuración de la tienda, e incluye un formulario para que los compradores te envíen un mensaje por correo."
                      : "This page is generated automatically from the email, phone and address in the \"Store Contact & Location\" section of your store settings, and includes a form so buyers can email you."}
                  </p>
                ) : (
                <div>
                  <label
                    htmlFor={`${key}-title`}
                    className="block text-xs font-semibold uppercase tracking-wider text-slate-500"
                  >
                    {isEs ? "Título" : "Title"}
                  </label>
                  <input
                    id={`${key}-title`}
                    name={`${key}:title`}
                    defaultValue={page.title}
                    maxLength={MAX_PAGE_TITLE_LENGTH}
                    placeholder={defaultTitle}
                    className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-600"
                  />
                </div>
                )}
                {key === "contact" ? null : key === "faq" ? (
                  <FaqItemsEditor initialItems={page.faqItems} isEs={isEs} />
                ) : (
                  <div>
                    <label
                      htmlFor={`${key}-content`}
                      className="block text-xs font-semibold uppercase tracking-wider text-slate-500"
                    >
                      {isEs ? "Contenido" : "Content"}
                    </label>
                    <textarea
                      id={`${key}-content`}
                      name={`${key}:content`}
                      defaultValue={page.content}
                      maxLength={MAX_PAGE_CONTENT_LENGTH}
                      rows={7}
                      className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm leading-6 outline-none focus:border-cyan-600"
                    />
                  </div>
                )}
              </div>
            </article>
          );
        })}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center gap-1.5 rounded-full bg-slate-950 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
          >
            {isPending ? (isEs ? "Guardando..." : "Saving...") : isEs ? "Guardar páginas" : "Save pages"}
          </button>
        </div>
      </form>
    </section>
  );
}
