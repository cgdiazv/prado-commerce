"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, ExternalLink, Store } from "lucide-react";
import { useLanguage } from "@/lib/i18n/language-context";
import { getPlanLimits, getPlanOrDefault } from "@/lib/subscription";
import { activateStoreTheme } from "./actions";
import HeroImageManager from "./hero-image-manager";
import HeroTextForm from "./hero-text-form";
import CustomCssEditor from "./custom-css-editor";

type ThemeId = "mercado" | "minimal" | "recinto" | "calipso";

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
  customCss?: string | null;
};

interface StoreThemesClientProps {
  store: StoreData;
  activeTheme: ThemeId;
  userPlan?: "STARTER" | "PRO" | "ENTERPRISE";
  stores?: Array<{ id: string; name: string }>;
}

export function StoreThemesClient({ store, activeTheme, userPlan = "STARTER", stores = [] }: StoreThemesClientProps) {
  const router = useRouter();
  const plan = getPlanOrDefault(userPlan);
  const limits = getPlanLimits(plan);
  const isLocked = !limits.allowCustomCss;
  const { language } = useLanguage();
  const isEs = language === "es";

  const themeOptions: Array<{
    id: ThemeId;
    title: string;
    description: string;
    swatch: string;
    thumbnail?: string;
  }> = [
    {
      id: "mercado",
      title: "Mercado",
      description: isEs
        ? "Diseño limpio y contemporáneo, tipografía precisa, catálogo estructurado y compra rápida."
        : "Clean and contemporary layout, precise typography, structured catalog, and rapid purchasing.",
      swatch: "from-[#20201e] via-[#747470] to-[#f6f6f3]",
      thumbnail: "/storefront/mercado/mercado-thumb.png",
    },
    {
      id: "recinto",
      title: "Recinto",
      description: isEs
        ? "Diseño editorial y sereno, tonos naturales cálidos, tipografía refinada y una atmósfera cotidiana acogedora."
        : "Editorial and serene design, warm natural tones, refined typography, and an inviting everyday feel.",
      swatch: "from-[#344e41] via-[#8c9987] to-[#ecede5]",
      thumbnail: "/storefront/recinto/recinto-thumb.png",
    },
    {
      id: "calipso",
      title: "Calipso",
      description: isEs
        ? "Una tienda editorial y luminosa con tonos cálidos, acentos cítricos y hallazgos cuidadosamente seleccionados para todos."
        : "A sunlit editorial storefront with warm tones, citrus accents, and thoughtfully curated finds for everyone.",
      swatch: "from-[#f4d45c] via-[#fff8e9] to-[#a43d1b]",
      thumbnail: "/storefront/calipso-thumb.png",
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
              ? "Selecciona el diseño y estilo visual que tus clientes experimentarán en tu tienda."
              : "Select the visual system customers experience in your storefront."}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {stores.length > 1 ? (
            <div className="relative w-56 shrink-0">
              <Store className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <select
                id="theme-store-select"
                value={store.id}
                onChange={(event) => router.push(`/dashboard/stores/${event.target.value}/themes`)}
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
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-xs transition hover:bg-slate-50"
          >
            <span>{isEs ? "Ver tienda" : "View storefront"}</span>
            <ExternalLink className="h-3.5 w-3.5 text-slate-500" />
          </Link>
          <Link
            href="/dashboard/stores"
            className="rounded-full border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
          >
            {isEs ? "← Volver" : "Back"}
          </Link>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {themeOptions.map((theme) => {
          const isActive =
            theme.id === activeTheme ||
            (theme.id === "mercado" && (activeTheme === "minimal" || activeTheme === "mercado")) ||
            (theme.id === "minimal" && (activeTheme === "minimal" || activeTheme === "mercado"));

          return (
            <article
              key={theme.id}
              className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
            >
              <div className="p-5">
                <div
                  className={`relative aspect-[16/10] overflow-hidden rounded-xl border border-slate-200 bg-gradient-to-br ${theme.swatch} ${
                    theme.thumbnail ? "p-0 bg-slate-100" : "p-3"
                  }`}
                >
                  {theme.thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={theme.thumbnail}
                      alt={`${theme.title} theme preview`}
                      className="h-full w-full object-cover object-top transition duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="h-full w-full rounded-lg border border-white/60 bg-white/70 p-3 backdrop-blur-[1px]">
                      <div className="mb-2 h-2.5 w-14 rounded-full bg-slate-400/70" />
                      <div className="mb-2 h-2 w-2/3 rounded-full bg-slate-300/80" />
                      <div className="grid grid-cols-3 gap-2 pt-2">
                        <span className="h-12 rounded-md bg-white/70" />
                        <span className="h-12 rounded-md bg-white/70" />
                        <span className="h-12 rounded-md bg-white/70" />
                      </div>
                    </div>
                  )}
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

      {activeTheme !== "mercado" && activeTheme !== "minimal" && (
        <HeroImageManager storeId={store.id} initialHeroImageUrl={store.heroImageUrl} />
      )}

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

      <CustomCssEditor
        storeId={store.id}
        storeName={store.name}
        initialCustomCss={store.customCss ?? null}
        isLocked={isLocked}
        userPlan={plan}
      />
    </section>
  );
}
