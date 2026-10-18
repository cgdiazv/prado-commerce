"use client";

import Link from "next/link";
import { useLanguage } from "@/lib/i18n/language-context";
import { activateStoreTheme } from "./actions";
import HeroImageManager from "./hero-image-manager";
import HeroTextForm from "./hero-text-form";

type ThemeId = "minimal" | "bold" | "classic";

type StoreData = {
  id: string;
  name: string;
  slug: string;
  activeTheme: string | null;
  heroImageUrl: string | null;
  heroEyebrow: string | null;
  heroTitle: string | null;
  heroSubtitle: string | null;
  heroButtonText: string | null;
};

interface StoreThemesClientProps {
  store: StoreData;
  activeTheme: ThemeId;
}

export function StoreThemesClient({ store, activeTheme }: StoreThemesClientProps) {
  const { language } = useLanguage();
  const isEs = language === "es";

  const themeOptions: Array<{
    id: ThemeId;
    title: string;
    description: string;
    swatch: string;
  }> = [
    {
      id: "minimal",
      title: isEs ? "Minimalista" : "Minimal",
      description: isEs
        ? "Espaciado limpio, tipografía serena y diseños ligeros centrados en el producto."
        : "Clean spacing, calm typography, and lightweight product-first layouts.",
      swatch: "from-slate-200 via-white to-slate-100",
    },
    {
      id: "bold",
      title: isEs ? "Audaz / Bold" : "Bold",
      description: isEs
        ? "Paneles de alto contraste, llamados a la acción llamativos y ritmo visual enérgico."
        : "High-contrast panels, louder calls-to-action, and energetic visual rhythm.",
      swatch: "from-cyan-300 via-blue-200 to-slate-900",
    },
    {
      id: "classic",
      title: isEs ? "Clásico" : "Classic",
      description: isEs
        ? "Estructura equilibrada con espaciado atemporal y jerarquía de tienda refinada."
        : "Balanced structure with timeless spacing and refined storefront hierarchy.",
      swatch: "from-amber-200 via-stone-100 to-slate-300",
    },
  ];

  return (
    <section className="space-y-6">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">
            {isEs ? "Elige el Tema de tu Tienda" : "Choose Your Storefront Theme"}
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            {isEs
              ? `Selecciona el diseño y estilo visual que tus clientes experimentarán en ${store.name}.`
              : `Select the visual system customers experience in your storefront for ${store.name}.`}
          </p>
        </div>

        <Link
          href="/dashboard/stores"
          className="rounded-full border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
        >
          {isEs ? "← Volver" : "Back"}
        </Link>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {themeOptions.map((theme) => {
          const isActive = theme.id === activeTheme;

          return (
            <article
              key={theme.id}
              className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
            >
              <div className="p-5">
                <div
                  className={`aspect-[16/10] rounded-xl border border-slate-200 bg-gradient-to-br ${theme.swatch} p-3`}
                >
                  <div className="h-full w-full rounded-lg border border-white/60 bg-white/70 p-3 backdrop-blur-[1px]">
                    <div className="mb-2 h-2.5 w-14 rounded-full bg-slate-400/70" />
                    <div className="mb-2 h-2 w-2/3 rounded-full bg-slate-300/80" />
                    <div className="grid grid-cols-3 gap-2 pt-2">
                      <span className="h-12 rounded-md bg-white/70" />
                      <span className="h-12 rounded-md bg-white/70" />
                      <span className="h-12 rounded-md bg-white/70" />
                    </div>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <h2 className="text-base font-semibold text-slate-900">{theme.title}</h2>
                  <p className="text-sm leading-6 text-slate-600">{theme.description}</p>
                </div>

                <form action={activateStoreTheme} className="mt-5 flex justify-end">
                  <input type="hidden" name="storeId" value={store.id} />
                  <input type="hidden" name="themeId" value={theme.id} />
                  <button
                    type="submit"
                    disabled={isActive}
                    aria-disabled={isActive}
                    className={`inline-flex items-center justify-center rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                      isActive
                        ? "cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-500"
                        : "bg-slate-900 text-white hover:bg-slate-800"
                    }`}
                  >
                    {isActive
                      ? isEs
                        ? "Activo"
                        : "Active"
                      : isEs
                      ? "Activar"
                      : "Activate"}
                  </button>
                </form>
              </div>
            </article>
          );
        })}
      </div>

      <HeroImageManager storeId={store.id} initialHeroImageUrl={store.heroImageUrl} />

      <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">
          {isEs ? "Texto principal (Hero)" : "Hero text"}
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          {isEs
            ? `Personaliza el texto de portada que se muestra en la tienda ${store.name}.`
            : `Customize the text shown in the storefront hero section for ${store.name}.`}
        </p>

        <HeroTextForm
          storeId={store.id}
          storeName={store.name}
          heroEyebrow={store.heroEyebrow}
          heroTitle={store.heroTitle}
          heroSubtitle={store.heroSubtitle}
          heroButtonText={store.heroButtonText}
        />
      </article>
    </section>
  );
}
