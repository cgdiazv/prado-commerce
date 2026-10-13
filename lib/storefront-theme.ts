export type StorefrontThemeId = "minimal" | "bold" | "classic";

export function normalizeStorefrontTheme(
  value: "MINIMAL" | "BOLD" | "CLASSIC" | null | undefined,
): StorefrontThemeId {
  if (value === "BOLD") {
    return "bold";
  }

  if (value === "CLASSIC") {
    return "classic";
  }

  return "minimal";
}

export function toStorefrontThemeEnum(value: StorefrontThemeId): "MINIMAL" | "BOLD" | "CLASSIC" {
  if (value === "bold") {
    return "BOLD";
  }

  if (value === "classic") {
    return "CLASSIC";
  }

  return "MINIMAL";
}

export function getStorefrontThemeClasses(theme: StorefrontThemeId) {
  if (theme === "bold") {
    return {
      shell: "bg-[radial-gradient(circle_at_top_right,_rgba(34,211,238,0.2),_rgba(15,23,42,0.04)_45%,_rgba(248,250,252,1))] text-slate-900",
      panel: "border-slate-300 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.14)]",
      mutedPanel: "border-slate-300 bg-slate-50",
      productCard: "border-slate-300 bg-white shadow-[0_14px_30px_rgba(15,23,42,0.12)] hover:shadow-[0_18px_36px_rgba(15,23,42,0.16)]",
      hero: "border-slate-300 bg-[linear-gradient(120deg,_rgba(15,23,42,0.98),_rgba(30,41,59,0.95))] text-white shadow-[0_20px_60px_rgba(15,23,42,0.3)]",
      featuredWrap: "border-slate-300 bg-white/90",
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
    theme === "bold"
      ? {
          eyebrow: isEs ? "Lanzamientos exclusivos" : "Limited drops",
          title: isEs ? `Tienda ${storeName}, creada para destacar` : `${storeName} storefront, built to stand out`,
          subtitle: isEs
            ? "Diseño de alto contraste, enfoque directo en productos y compra rápida."
            : "High-contrast layout, punchy product focus, and quick cart actions for fast buying.",
          buttonText: isEs ? "Ver destacados" : "Shop featured",
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
