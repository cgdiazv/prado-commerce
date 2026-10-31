export const STOREFRONT_PAGE_KEYS = ["faq", "contact", "terms"] as const;

export type StorefrontPageKey = (typeof STOREFRONT_PAGE_KEYS)[number];

export type FaqItem = {
  question: string;
  answer: string;
};

export type StorefrontPage = {
  enabled: boolean;
  title: string;
  content: string;
  faqItems: FaqItem[];
};

export type StorefrontPages = Record<StorefrontPageKey, StorefrontPage>;

export const STOREFRONT_PAGE_DEFAULT_TITLES: Record<StorefrontPageKey, { en: string; es: string }> = {
  faq: { en: "FAQ", es: "Preguntas frecuentes" },
  terms: { en: "Terms & Returns Policy", es: "Términos y política de devoluciones" },
  contact: { en: "Contact", es: "Contacto" },
};

export const MAX_PAGE_TITLE_LENGTH = 120;
export const MAX_PAGE_CONTENT_LENGTH = 20000;
export const MAX_FAQ_ITEMS = 50;
export const MAX_FAQ_QUESTION_LENGTH = 300;
export const MAX_FAQ_ANSWER_LENGTH = 5000;

export function isStorefrontPageKey(value: string): value is StorefrontPageKey {
  return (STOREFRONT_PAGE_KEYS as readonly string[]).includes(value);
}

function normalizeFaqItems(raw: unknown): FaqItem[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .map((item) => {
      const record = item && typeof item === "object" ? (item as Record<string, unknown>) : {};

      return {
        question: typeof record.question === "string" ? record.question.trim() : "",
        answer: typeof record.answer === "string" ? record.answer.trim() : "",
      };
    })
    .filter((item) => item.question && item.answer);
}

export function normalizeStorefrontPages(raw: unknown): StorefrontPages {
  const source = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};

  return Object.fromEntries(
    STOREFRONT_PAGE_KEYS.map((key) => {
      const entry = source[key];
      const record = entry && typeof entry === "object" ? (entry as Record<string, unknown>) : {};

      return [
        key,
        {
          enabled: record.enabled === true,
          title: typeof record.title === "string" ? record.title : "",
          content: typeof record.content === "string" ? record.content : "",
          faqItems: normalizeFaqItems(record.faqItems),
        },
      ];
    }),
  ) as StorefrontPages;
}

export function getStorefrontPageTitle(key: StorefrontPageKey, page: StorefrontPage, language: string) {
  return page.title.trim() || STOREFRONT_PAGE_DEFAULT_TITLES[key][language === "es" ? "es" : "en"];
}

export function getStorefrontPagePath(basePath: string, key: StorefrontPageKey) {
  return `${basePath}/pages/${key}`;
}

export function hasStorefrontPageContent(key: StorefrontPageKey, page: StorefrontPage) {
  if (key === "contact") return true;
  return key === "faq" ? page.faqItems.length > 0 : page.content.trim().length > 0;
}

// Only pages that are switched on and have content are linked from the storefront.
export function getPublishedStorefrontPageKeys(pages: StorefrontPages): StorefrontPageKey[] {
  return STOREFRONT_PAGE_KEYS.filter((key) => pages[key].enabled && hasStorefrontPageContent(key, pages[key]));
}

export type StorefrontContactInfo = {
  storeId: string;
  storeName: string;
  email: string;
  phone: string;
  address: string;
};

// Mirrors the "Store Contact & Location" fields saved by the edit-store form.
export function getStorefrontContactInfo(store: {
  id: string;
  name: string;
  senderEmail: string | null;
  shippingOrigin: unknown;
}): StorefrontContactInfo {
  const origin = store.shippingOrigin && typeof store.shippingOrigin === "object"
    ? (store.shippingOrigin as Record<string, unknown>)
    : {};
  return {
    storeId: store.id,
    storeName: store.name,
    email: store.senderEmail?.trim() ?? "",
    phone: typeof origin.phone === "string" ? origin.phone.trim() : "",
    address: typeof origin.address === "string" ? origin.address.trim() : "",
  };
}
