import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { normalizeStorefrontTheme } from "@/lib/storefront-theme";
import { activateStoreTheme } from "./actions";
import HeroImageManager from "./hero-image-manager";
import HeroTextForm from "./hero-text-form";

type ThemeId = "minimal" | "bold" | "classic";

type ThemeOption = {
  id: ThemeId;
  title: string;
  description: string;
  swatch: string;
};

type ThemesPageProps = {
  params: Promise<{
    storeId: string;
  }>;
};

const THEME_OPTIONS: ThemeOption[] = [
  {
    id: "minimal",
    title: "Minimal",
    description: "Clean spacing, calm typography, and lightweight product-first layouts.",
    swatch: "from-slate-200 via-white to-slate-100",
  },
  {
    id: "bold",
    title: "Bold",
    description: "High-contrast panels, louder calls-to-action, and energetic visual rhythm.",
    swatch: "from-cyan-300 via-blue-200 to-slate-900",
  },
  {
    id: "classic",
    title: "Classic",
    description: "Balanced structure with timeless spacing and refined storefront hierarchy.",
    swatch: "from-amber-200 via-stone-100 to-slate-300",
  },
];

export default async function StoreThemesPage({ params }: ThemesPageProps) {
  const { storeId } = await params;
  const user = await getCurrentUser();

  if (!user) {
    return (
      <section className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        Could not verify your session. Please sign in again.
      </section>
    );
  }

  const store = await prisma.store.findFirst({
    where: {
      id: storeId,
      ownerUserId: user.id,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      activeTheme: true,
      heroImageUrl: true,
      heroEyebrow: true,
      heroTitle: true,
      heroSubtitle: true,
      heroButtonText: true,
    },
  });

  if (!store) {
    notFound();
  }

  const activeTheme = normalizeStorefrontTheme(store.activeTheme);

  return (
    <section className="space-y-6">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <p className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
            Store Theme
          </p>
          <h1 className="mt-4 text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">
            Choose Your Storefront Theme
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
            Select the visual system customers experience in your storefront for {store.name}.
          </p>
        </div>

        <Link
          href="/dashboard/stores"
          className="rounded-full border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
        >
          Back
        </Link>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {THEME_OPTIONS.map((theme) => {
          const isActive = theme.id === activeTheme;

          return (
            <article
              key={theme.id}
              className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
            >
              <div className="p-5">
                <div className={`aspect-[16/10] rounded-xl border border-slate-200 bg-gradient-to-br ${theme.swatch} p-3`}>
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
                    {isActive ? "Active" : "Activate"}
                  </button>
                </form>
              </div>
            </article>
          );
        })}
      </div>

      <HeroImageManager storeId={store.id} initialHeroImageUrl={store.heroImageUrl} />

      <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">Hero text</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Customize the text shown in the storefront hero section for {store.name}.
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
