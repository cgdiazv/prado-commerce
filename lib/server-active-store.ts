import { cookies } from "next/headers";
import { ACTIVE_STORE_COOKIE } from "./dashboard-store-selection";

interface ResolveServerStoreOptions {
  allowAll?: boolean;
  defaultStoreId?: string;
}

/**
 * Resolves the active store ID on the server:
 * 1. An explicit search parameter (e.g. ?storeId=...) takes precedence.
 * 2. If no search param is given, the `prado_active_store_id` cookie is checked.
 * 3. Validates against `availableStores` (if the cookie references a deleted store, it falls back).
 * 4. Falls back to "ALL" (if allowAll is true) or the first available store ID.
 */
export async function resolveServerActiveStoreId(
  searchParamStoreId: string | undefined,
  availableStores: Array<{ id: string }>,
  options?: ResolveServerStoreOptions
): Promise<string> {
  const allowAll = options?.allowAll ?? true;
  const fallback =
    options?.defaultStoreId ??
    (allowAll ? "ALL" : availableStores[0]?.id ?? "");

  // 1. Explicit search param check
  if (searchParamStoreId && searchParamStoreId.trim()) {
    const trimmed = searchParamStoreId.trim();
    if (allowAll && trimmed === "ALL") {
      return "ALL";
    }
    if (availableStores.some((s) => s.id === trimmed)) {
      return trimmed;
    }
  }

  // 2. Cookie check
  try {
    const cookieStore = await cookies();
    const cookieVal = cookieStore.get(ACTIVE_STORE_COOKIE)?.value;
    if (cookieVal) {
      const decoded = decodeURIComponent(cookieVal).trim();
      if (allowAll && decoded === "ALL") {
        return "ALL";
      }
      if (availableStores.some((s) => s.id === decoded)) {
        return decoded;
      }
    }
  } catch {
    // Ignore cookie read failures (e.g., during static analysis)
  }

  return fallback;
}
