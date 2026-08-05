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
    };
  }

  if (theme === "classic") {
    return {
      shell: "bg-[#f8f3e8] text-slate-900",
      panel: "border-amber-200 bg-[#fffdf8] shadow-sm",
      mutedPanel: "border-amber-200 bg-amber-50/50",
      productCard: "border-amber-200 bg-[#fffdf8] shadow-sm hover:shadow-md",
    };
  }

  return {
    shell: "bg-slate-50 text-slate-900",
    panel: "border-slate-200 bg-white shadow-sm",
    mutedPanel: "border-slate-200 bg-slate-50",
    productCard: "border-slate-200 bg-white shadow-sm hover:shadow-md",
  };
}
