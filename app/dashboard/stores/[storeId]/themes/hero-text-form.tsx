"use client";

import { useActionState } from "react";
import { useLanguage } from "@/lib/i18n/language-context";
import { saveStoreHeroContent, type HeroContentActionState } from "./actions";

type HeroTextFormProps = {
  storeId: string;
  storeName: string;
  heroEyebrow: string | null;
  heroTitle: string | null;
  heroSubtitle: string | null;
  heroButtonText: string | null;
};

const initialState: HeroContentActionState = {
  error: null,
  message: null,
};

export default function HeroTextForm({
  storeId,
  storeName,
  heroEyebrow,
  heroTitle,
  heroSubtitle,
  heroButtonText,
}: HeroTextFormProps) {
  const { language } = useLanguage();
  const isEs = language === "es";
  const [state, formAction, isPending] = useActionState(saveStoreHeroContent, initialState);

  return (
    <form action={formAction} className="mt-5 space-y-4">
      <input type="hidden" name="storeId" value={storeId} />

      <div className="grid gap-4 lg:grid-cols-3">
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-slate-700">
            {isEs ? "Texto secundario / Antetítulo" : "Eyebrow text"}
          </span>
          <input
            name="heroEyebrow"
            defaultValue={heroEyebrow ?? ""}
            placeholder={isEs ? "Comprar online" : "Shop online"}
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-slate-700">
            {isEs ? "Título principal" : "Hero title"}
          </span>
          <input
            name="heroTitle"
            defaultValue={heroTitle ?? ""}
            placeholder={isEs ? `Explorar ${storeName}` : `Explore ${storeName}`}
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-slate-700">
            {isEs ? "Texto del botón" : "Button text"}
          </span>
          <input
            name="heroButtonText"
            defaultValue={heroButtonText ?? ""}
            placeholder={isEs ? "Comenzar a comprar" : "Start shopping"}
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
          />
        </label>
      </div>

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-slate-700">
          {isEs ? "Descripción / Subtítulo" : "Hero text"}
        </span>
        <textarea
          name="heroSubtitle"
          defaultValue={heroSubtitle ?? ""}
          placeholder={
            isEs
              ? "Describe tu tienda en una breve frase llamativa."
              : "Describe your storefront in one short sentence."
          }
          rows={4}
          className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
        />
      </label>

      {state.error ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{state.error}</p>
      ) : null}

      {state.message ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {state.message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex items-center justify-center rounded-full bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending
          ? (isEs ? "Guardando..." : "Saving...")
          : (isEs ? "Guardar texto principal" : "Save hero text")}
      </button>
    </form>
  );
}