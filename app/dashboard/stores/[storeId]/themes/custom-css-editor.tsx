"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Lock, Check, Code } from "lucide-react";
import { useLanguage } from "@/lib/i18n/language-context";
import { saveStoreCustomCss, type CustomCssActionState } from "./actions";

interface CustomCssEditorProps {
  storeId: string;
  storeName: string;
  initialCustomCss: string | null;
  isLocked: boolean;
  userPlan: string;
}

const initialState: CustomCssActionState = {
  error: null,
  message: null,
};

export default function CustomCssEditor({
  storeId,
  storeName,
  initialCustomCss,
  isLocked,
  userPlan,
}: CustomCssEditorProps) {
  const { language } = useLanguage();
  const isEs = language === "es";
  const [cssCode, setCssCode] = useState(initialCustomCss ?? "");

  const [state, formAction, isPending] = useActionState(saveStoreCustomCss, initialState);

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white">
              <Code className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-slate-900">
                  {isEs ? "Inyector de CSS Personalizado" : "Custom CSS Injector"}
                </h2>
                <span className="inline-flex items-center rounded-full bg-cyan-100 px-2.5 py-0.5 text-xs font-semibold text-cyan-800">
                  Pro &amp; Enterprise
                </span>
              </div>
              <p className="mt-0.5 text-xs text-slate-500">
                {isEs
                  ? `Inyecta reglas CSS directamente en el storefront y checkout de ${storeName}.`
                  : `Inject styling rules directly into the storefront and checkout of ${storeName}.`}
              </p>
            </div>
          </div>

          {isLocked ? (
            <Link
              href="/pricing"
              className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800"
            >
              {isEs ? "Actualizar a Pro" : "Upgrade to Pro"}
            </Link>
          ) : null}
        </div>
      </div>

      <div className="p-5">
        {isLocked ? (
          <div className="relative rounded-xl border border-dashed border-slate-300 bg-slate-50/80 p-6 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-200 text-slate-700">
              <Lock className="h-6 w-6" />
            </div>
            <h3 className="mt-3 text-sm font-semibold text-slate-900">
              {isEs
                ? "Función bloqueada para el plan Starter"
                : "Locked on the Starter plan"}
            </h3>
            <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-slate-500">
              {isEs
                ? "El inyector de CSS te permite anular estilos, fuentes, bordes y márgenes tanto en la tienda virtual como en la página de checkout. Disponible exclusivamente en planes Pro y Enterprise."
                : "The CSS injector allows you to override styles, typography, borders, and spacing in both storefront and checkout pages. Available exclusively on Pro and Enterprise tiers."}
            </p>
            <div className="mt-4">
              <Link
                href="/pricing"
                className="inline-flex items-center gap-1.5 rounded-full bg-cyan-700 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-cyan-800"
              >
                {isEs ? "Desbloquear en Pro ($39/mes)" : "Unlock with Pro ($39/mo)"}
              </Link>
            </div>
          </div>
        ) : (
          <form action={formAction} className="space-y-4">
            <input type="hidden" name="storeId" value={storeId} />

            {state.error ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-medium text-rose-700">
                {state.error}
              </div>
            ) : null}

            {state.message ? (
              <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-medium text-emerald-700">
                <Check className="h-4 w-4 shrink-0" />
                {state.message}
              </div>
            ) : null}

            <div>
              <label
                htmlFor="customCss"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-500"
              >
                CSS Rules
              </label>
              <p className="mt-0.5 text-xs text-slate-500">
                {isEs
                  ? "Escribe selectores CSS estándar. Se aplicarán sobre el tema seleccionado."
                  : "Write standard CSS selectors. They will be applied over the active storefront theme."}
              </p>
              <div className="mt-2 overflow-hidden rounded-xl border border-slate-300 bg-slate-950 shadow-inner">
                <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900 px-3 py-1.5 text-[11px] text-slate-400 font-mono">
                  <span>storefront-styles.css</span>
                  <span>{cssCode.length} chars</span>
                </div>
                <textarea
                  id="customCss"
                  name="customCss"
                  rows={8}
                  value={cssCode}
                  onChange={(e) => setCssCode(e.target.value)}
                  placeholder={`/* Example custom CSS */\n.storefront-product-card {\n  border-radius: 8px;\n  box-shadow: 0 4px 12px rgba(0,0,0,0.05);\n}\n\nbutton.storefront-btn {\n  letter-spacing: 0.05em;\n}`}
                  className="w-full bg-slate-950 p-3.5 font-mono text-xs leading-5 text-slate-100 outline-none placeholder:text-slate-600 focus:ring-1 focus:ring-cyan-500"
                  spellCheck={false}
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <span className="text-[11px] text-slate-500">
                {isEs
                  ? "Los cambios se reflejarán de inmediato en la tienda."
                  : "Changes will take effect immediately on your live storefront."}
              </span>
              <div className="flex items-center gap-2">
                {cssCode ? (
                  <button
                    type="button"
                    onClick={() => setCssCode("")}
                    className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
                  >
                    {isEs ? "Limpiar" : "Clear"}
                  </button>
                ) : null}
                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex items-center gap-1.5 rounded-full bg-slate-950 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
                >
                  {isPending
                    ? isEs ? "Guardando..." : "Saving..."
                    : isEs ? "Guardar CSS" : "Save CSS"}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </article>
  );
}
