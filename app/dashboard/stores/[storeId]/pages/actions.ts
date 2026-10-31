"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import {
  MAX_FAQ_ANSWER_LENGTH,
  MAX_FAQ_ITEMS,
  MAX_FAQ_QUESTION_LENGTH,
  MAX_PAGE_CONTENT_LENGTH,
  MAX_PAGE_TITLE_LENGTH,
  STOREFRONT_PAGE_KEYS,
  normalizeStorefrontPages,
  type FaqItem,
  type StorefrontPages,
} from "@/lib/storefront-pages";

export type StorefrontPagesActionState = {
  error: string | null;
  message: string | null;
};

export async function saveStorefrontPages(
  _previousState: StorefrontPagesActionState,
  formData: FormData,
): Promise<StorefrontPagesActionState> {
  const user = await getCurrentUser();

  if (!user) {
    return { error: "Unauthorized", message: null };
  }

  const storeId = String(formData.get("storeId") ?? "").trim();

  if (!storeId) {
    return { error: "storeId is required", message: null };
  }

  const store = await prisma.store.findFirst({
    where: { id: storeId, ownerUserId: user.id },
    select: { id: true, slug: true, customDomain: true },
  });

  if (!store) {
    return { error: "Store not found", message: null };
  }

  const pages = normalizeStorefrontPages(null);

  for (const key of STOREFRONT_PAGE_KEYS) {
    const title = String(formData.get(`${key}:title`) ?? "").trim();
    const content = String(formData.get(`${key}:content`) ?? "").trim();

    if (title.length > MAX_PAGE_TITLE_LENGTH || content.length > MAX_PAGE_CONTENT_LENGTH) {
      return { error: "A page title or content is too long.", message: null };
    }

    let faqItems: FaqItem[] = [];

    if (key === "faq") {
      const questions = formData.getAll("faq:question").map(String);
      const answers = formData.getAll("faq:answer").map(String);

      faqItems = questions
        .map((question, index) => ({ question: question.trim(), answer: (answers[index] ?? "").trim() }))
        .filter((item) => item.question && item.answer);

      if (
        faqItems.length > MAX_FAQ_ITEMS ||
        faqItems.some(
          (item) => item.question.length > MAX_FAQ_QUESTION_LENGTH || item.answer.length > MAX_FAQ_ANSWER_LENGTH,
        )
      ) {
        return { error: "A FAQ question or answer is too long, or there are too many entries.", message: null };
      }
    }

    pages[key] = {
      enabled: formData.get(`${key}:enabled`) === "on",
      title,
      content: key === "faq" ? "" : content,
      faqItems,
    };
  }

  await prisma.store.update({
    where: { id: store.id },
    data: { storefrontPages: pages satisfies StorefrontPages },
  });

  revalidatePath(`/dashboard/stores/${storeId}/pages`);
  revalidatePath(`/storefront/${store.slug}`, "layout");
  if (store.customDomain) {
    revalidatePath(`/storefront/domain/${store.customDomain}`, "layout");
  }

  return { error: null, message: "Pages saved." };
}
