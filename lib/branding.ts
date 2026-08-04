const HEX_COLOR_PATTERN = /^#([0-9a-fA-F]{6})$/;

export function normalizeMainColor(value: unknown, fallback = "#0f172a") {
  if (typeof value !== "string") {
    return fallback;
  }

  const trimmed = value.trim();
  if (!HEX_COLOR_PATTERN.test(trimmed)) {
    return fallback;
  }

  return trimmed.toLowerCase();
}

export function darkenHexColor(hex: string, amount = 0.12) {
  const normalized = normalizeMainColor(hex);
  const ratio = Math.max(0, Math.min(1, amount));

  const r = parseInt(normalized.slice(1, 3), 16);
  const g = parseInt(normalized.slice(3, 5), 16);
  const b = parseInt(normalized.slice(5, 7), 16);

  const nextR = Math.max(0, Math.floor(r * (1 - ratio)));
  const nextG = Math.max(0, Math.floor(g * (1 - ratio)));
  const nextB = Math.max(0, Math.floor(b * (1 - ratio)));

  return `#${nextR.toString(16).padStart(2, "0")}${nextG.toString(16).padStart(2, "0")}${nextB.toString(16).padStart(2, "0")}`;
}

export function buildEmailBrandingStyles(mainColor: string) {
  const primary = normalizeMainColor(mainColor);
  const primaryHover = darkenHexColor(primary, 0.12);

  return {
    primary,
    primaryHover,
    button: `background:${primary};color:#ffffff;border-radius:999px;padding:12px 20px;font-weight:600;text-decoration:none;display:inline-block;`,
    accentText: `color:${primary};font-weight:600;`,
    sectionBorder: `border:1px solid ${primary}22;`,
  };
}

export function getStoreBrandingCssVars(mainColor: string) {
  const primary = normalizeMainColor(mainColor);
  const primaryHover = darkenHexColor(primary, 0.12);

  return {
    "--store-main-color": primary,
    "--store-main-color-hover": primaryHover,
  };
}
