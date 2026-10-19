import type { StorefrontTheme } from "@prisma/client";

export type StorefrontThemeId = "minimal" | "recinto" | "classic";

export function normalizeStorefrontTheme(
  value: StorefrontTheme | "recinto" | "minimal" | "classic" | null | undefined,
): StorefrontThemeId {
  if (value === "RECINTO" || value === "recinto") {
    return "recinto";
  }

  if (value === "CLASSIC" || value === "classic") {
    return "classic";
  }

  return "minimal";
}

export function toStorefrontThemeEnum(value: StorefrontThemeId): StorefrontTheme {
  if (value === "recinto") {
    return "RECINTO";
  }

  if (value === "classic") {
    return "CLASSIC";
  }

  return "MINIMAL";
}

export function getStorefrontThemeClasses(theme: StorefrontThemeId) {
  if (theme === "recinto") {
    return {
      shell: "bg-[#ffffff] text-[#252b27] selection:bg-[#344e41] selection:text-white",
      panel: "border-[#e3e5de] bg-[#ffffff] shadow-none",
      mutedPanel: "border-[#e3e5de] bg-[#f3f3ee]",
      productCard: "border-[#e3e5de] bg-[#ffffff] hover:border-[#344e41]/30 transition-all duration-200",
      hero: "border-transparent bg-[#ecede5] text-[#252b27]",
      featuredWrap: "border-[#e3e5de] bg-[#f3f3ee]",
    };
  }

  if (theme === "classic") {
    return {
      shell: "bg-[#f8f3e8] text-slate-900",
      panel: "border-amber-200 bg-[#fffdf8] shadow-sm",
      mutedPanel: "border-amber-200 bg-amber-50/50",
      productCard: "border-amber-200 bg-[#fffdf8] shadow-sm hover:shadow-md",
      hero: "border-amber-200 bg-[linear-gradient(160deg,_#fffdf8,_#f8edd2)] text-slate-900 shadow-sm",
      featuredWrap: "border-amber-200 bg-[#fffdf8]",
    };
  }

  return {
    shell: "bg-slate-50 text-slate-900",
    panel: "border-slate-200 bg-white shadow-sm",
    mutedPanel: "border-slate-200 bg-slate-50",
    productCard: "border-slate-200 bg-white shadow-sm hover:shadow-md",
    hero: "border-slate-200 bg-white text-slate-900 shadow-sm",
    featuredWrap: "border-slate-200 bg-white",
  };
}

export function getStorefrontThemeHeroContent(theme: StorefrontThemeId, storeName: string) {
  return getStorefrontThemeHeroContentWithOverrides(theme, storeName, {});
}

export function getStorefrontThemeHeroContentWithOverrides(
  theme: StorefrontThemeId,
  storeName: string,
  overrides: {
    eyebrow?: string | null;
    title?: string | null;
    subtitle?: string | null;
    buttonText?: string | null;
  },
  lang: "es" | "en" = "es",
) {
  const isEs = lang === "es";
  const defaults =
    theme === "recinto"
      ? {
          eyebrow: isEs ? "COLECCIÓN COTIDIANA" : "THE EVERYDAY COLLECTION",
          title: isEs ? `Cosas buenas para días comunes en ${storeName}` : `Good things for ordinary days at ${storeName}`,
          subtitle: isEs
            ? "Piezas pensadas para la vida diaria. Descubre un lado más cálido de lo esencial."
            : "Thoughtful pieces for the way you live. Discover a softer side of everyday essentials.",
          buttonText: isEs ? "Explorar colección" : "Shop the collection",
        }
      : theme === "classic"
        ? {
            eyebrow: isEs ? "Colección curada" : "Curated collection",
            title: isEs ? `Bienvenido a ${storeName}` : `Welcome to ${storeName}`,
            subtitle: isEs
              ? "Un catálogo atemporal que resalta la calidad y productos destacados."
              : "A timeless catalog layout that highlights quality picks and featured products first.",
            buttonText: isEs ? "Ver productos destacados" : "View featured products",
          }
        : {
            eyebrow: isEs ? "Tienda en línea" : "Shop online",
            title: isEs ? `Explora ${storeName}` : `Explore ${storeName}`,
            subtitle: isEs
              ? "Una experiencia de navegación limpia con búsqueda, categorías y compra rápida."
              : "A clean browsing experience with search, categories, and quick add-to-cart actions.",
            buttonText: isEs ? "Comenzar a comprar" : "Start shopping",
          };

  return {
    eyebrow: overrides.eyebrow?.trim() || defaults.eyebrow,
    title: overrides.title?.trim() || defaults.title,
    subtitle: overrides.subtitle?.trim() || defaults.subtitle,
    buttonText: overrides.buttonText?.trim() || defaults.buttonText,
  };
}
