"use client";

import { useActionState } from "react";
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
  const [state, formAction, isPending] = useActionState(saveStoreHeroContent, initialState);

  return (
    <form action={formAction} className="mt-5 space-y-4">
      <input type="hidden" name="storeId" value={storeId} />

      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-slate-700">Eyebrow text</span>
          <input
            name="heroEyebrow"
            defaultValue={heroEyebrow ?? ""}
            placeholder="Shop online"
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-slate-700">Button text</span>
          <input
            name="heroButtonText"
            defaultValue={heroButtonText ?? ""}
            placeholder="Start shopping"
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
          />
        </label>
      </div>

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-slate-700">Hero title</span>
        <input
          name="heroTitle"
          defaultValue={heroTitle ?? ""}
          placeholder={`Explore ${storeName}`}
          className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
        />
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-slate-700">Hero text</span>
        <textarea
          name="heroSubtitle"
          defaultValue={heroSubtitle ?? ""}
          placeholder="Describe your storefront in one short sentence."
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
        {isPending ? "Saving..." : "Save hero text"}
      </button>
    </form>
  );
}