export const RESERVED_STORE_SLUGS = ["app", "api", "cdn", "www"] as const;

export function normalizeStoreSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function isReservedStoreSlug(value: string) {
  return (RESERVED_STORE_SLUGS as readonly string[]).includes(normalizeStoreSlug(value));
}