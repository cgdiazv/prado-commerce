"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { toStorefrontThemeEnum } from "@/lib/storefront-theme";

type ThemeId = "minimal" | "bold" | "classic";

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
