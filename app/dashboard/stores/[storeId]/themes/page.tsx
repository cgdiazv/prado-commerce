import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { normalizeStorefrontTheme } from "@/lib/storefront-theme";
import { StoreThemesClient } from "./store-themes-client";

type ThemesPageProps = {
  params: Promise<{
    storeId: string;
  }>;
};

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

  let store;
  try {
    store = await prisma.store.findFirst({
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
        customCss: true,
      },
    });
  } catch (error) {
    console.error("[STORE_THEMES_PAGE_DB_ERROR]", error);
    return (
      <section className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        Could not load store theme settings. Please check database connectivity and refresh.
      </section>
    );
  }

  if (!store) {
    notFound();
  }

  const activeTheme = normalizeStorefrontTheme(store.activeTheme);

  return <StoreThemesClient store={store} activeTheme={activeTheme} userPlan={user.plan} />;
}
