import type { StorefrontTheme } from "@prisma/client";

export type StorefrontThemeId = "mercado" | "minimal" | "recinto" | "calipso";

export function normalizeStorefrontTheme(
  value: StorefrontTheme | "recinto" | "minimal" | "mercado" | "classic" | "calipso" | null | undefined,
): StorefrontThemeId {
  if (value === "RECINTO" || value === "recinto") {
    return "recinto";
  }

  if (value === "CLASSIC" || value === "classic" || value === "calipso") {
    return "calipso";
  }

  return "mercado";
}

export function toStorefrontThemeEnum(value: StorefrontThemeId): StorefrontTheme {
  if (value === "recinto") {
    return "RECINTO";
  }

  if (value === "calipso") {
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

  if (theme === "calipso") {
    return {
      shell: "bg-[#fffaf2] text-[#352319] selection:bg-[#a43d1b] selection:text-white",
      panel: "border-[#eadfce] bg-[#fffaf2] shadow-none",
      mutedPanel: "border-[#eadfce] bg-[#fbf2df]",
      productCard: "border-[#eadfce] bg-[#fffaf2] hover:border-[#a43d1b]/50 transition-all duration-200",
      hero: "border-transparent bg-[#fbefca] text-[#352319]",
      featuredWrap: "border-[#eadfce] bg-[#fffaf2]",
    };
  }

  // Mercado (Figma design system)
  return {
    shell: "bg-white text-[#20201e] selection:bg-[#20201e] selection:text-white",
    panel: "border-[#e5e5e0] bg-white shadow-none",
    mutedPanel: "border-[#e5e5e0] bg-[#f6f6f3]",
    productCard: "border-transparent bg-white transition-all duration-200",
    hero: "border-transparent bg-white text-[#20201e]",
    featuredWrap: "border-[#e5e5e0] bg-[#f6f6f3]",
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
      : theme === "calipso"
        ? {
            eyebrow: isEs ? "ENCUENTRA TU PRÓXIMO FAVORITO" : "FIND YOUR NEXT FAVORITE",
            title: isEs ? "Un poco de sol. Mucho de ti." : "A little sunshine. A lot of you.",
            subtitle: isEs
              ? "Accesorios, belleza y hallazgos cotidianos para darle un giro bonito a tu día."
              : "Accessories, beauty, and everyday finds to bring a little brightness to your day.",
            buttonText: isEs ? "Descubrir novedades" : "Discover new arrivals",
          }
        : {
            // Mercado theme defaults from Figma
            eyebrow: isEs ? "TU PRÓXIMO PROYECTO" : "YOUR NEXT PROJECT",
            title: isEs ? "Tu próximo proyecto empieza aquí." : "Your next project starts here.",
            subtitle: isEs
              ? `Explora los mejores productos y servicios disponibles en ${storeName}.`
              : `Explore top quality products and services available at ${storeName}.`,
            buttonText: isEs ? "Explorar catálogo" : "Explore catalog",
          };

  return {
    eyebrow: overrides.eyebrow?.trim() || defaults.eyebrow,
    title: overrides.title?.trim() || defaults.title,
    subtitle: overrides.subtitle?.trim() || defaults.subtitle,
    buttonText: overrides.buttonText?.trim() || defaults.buttonText,
  };
}
