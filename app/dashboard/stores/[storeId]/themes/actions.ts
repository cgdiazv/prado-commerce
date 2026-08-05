"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { toStorefrontThemeEnum } from "@/lib/storefront-theme";

type ThemeId = "minimal" | "bold" | "classic";

export type HeroContentActionState = {
  error: string | null;
  message: string | null;
};

export async function activateStoreTheme(formData: FormData) {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const storeId = String(formData.get("storeId") ?? "").trim();
  const themeId = String(formData.get("themeId") ?? "").trim() as ThemeId;

  if (!storeId) {
    throw new Error("storeId is required");
  }

  if (!["minimal", "bold", "classic"].includes(themeId)) {
    throw new Error("Invalid theme");
  }

  const store = await prisma.store.findFirst({
    where: {
      id: storeId,
      ownerUserId: user.id,
    },
    select: {
      id: true,
      slug: true,
    },
  });

  if (!store) {
    throw new Error("Store not found");
  }

  await prisma.store.update({
    where: {
      id: store.id,
    },
    data: {
      activeTheme: toStorefrontThemeEnum(themeId),
    },
  });

  revalidatePath(`/dashboard/stores/${storeId}/themes`);
  revalidatePath(`/storefront/${store.slug}`);
  revalidatePath(`/storefront/${store.slug}/account`);
}

export async function saveStoreHeroContent(
  _previousState: HeroContentActionState,
  formData: FormData,
): Promise<HeroContentActionState> {
  const user = await getCurrentUser();

  if (!user) {
    return { error: "Unauthorized", message: null };
  }

  const storeId = String(formData.get("storeId") ?? "").trim();
  const heroEyebrow = String(formData.get("heroEyebrow") ?? "").trim();
  const heroTitle = String(formData.get("heroTitle") ?? "").trim();
  const heroSubtitle = String(formData.get("heroSubtitle") ?? "").trim();
  const heroButtonText = String(formData.get("heroButtonText") ?? "").trim();

  if (!storeId) {
    return { error: "storeId is required", message: null };
  }

  const store = await prisma.store.findFirst({
    where: {
      id: storeId,
      ownerUserId: user.id,
    },
    select: {
      id: true,
      slug: true,
    },
  });

  if (!store) {
    return { error: "Store not found", message: null };
  }

  await prisma.store.update({
    where: { id: store.id },
    data: {
      heroEyebrow: heroEyebrow || null,
      heroTitle: heroTitle || null,
      heroSubtitle: heroSubtitle || null,
      heroButtonText: heroButtonText || null,
    },
  });

  revalidatePath(`/dashboard/stores/${storeId}/themes`);
  revalidatePath(`/storefront/${store.slug}`);
  revalidatePath(`/storefront/${store.slug}/account`);

  return {
    error: null,
    message: "Hero text saved.",
  };
}
