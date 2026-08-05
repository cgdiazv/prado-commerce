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
  if (theme === "bold") {
    return {
      eyebrow: "Limited drops",
      title: `${storeName} storefront, built to stand out`,
      subtitle: "High-contrast layout, punchy product focus, and quick cart actions for fast buying.",
    };
  }

  if (theme === "classic") {
    return {
      eyebrow: "Curated collection",
      title: `Welcome to ${storeName}`,
      subtitle: "A timeless catalog layout that highlights quality picks and featured products first.",
    };
  }

  return {
    eyebrow: "Shop online",
    title: `Explore ${storeName}`,
    subtitle: "A clean browsing experience with search, categories, and quick add-to-cart actions.",
  };
}
