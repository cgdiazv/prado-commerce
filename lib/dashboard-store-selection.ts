export const ACTIVE_STORE_COOKIE = "prado_active_store_id";
export const ACTIVE_STORE_EVENT = "prado-active-store-change";

/**
 * Reads the active store ID stored in the browser (localStorage or cookie).
 * Returns the storeId string or "ALL", or null if not set.
 */
export function getStoredActiveStoreId(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const fromStorage = window.localStorage.getItem(ACTIVE_STORE_COOKIE);
    if (fromStorage && fromStorage.trim().length > 0) {
      return fromStorage.trim();
    }

    const match = document.cookie.match(
      new RegExp(`(?:^|;\\s*)${ACTIVE_STORE_COOKIE}=([^;]+)`)
    );
    if (match?.[1]) {
      const decoded = decodeURIComponent(match[1]).trim();
      if (decoded.length > 0) {
        return decoded;
      }
    }
  } catch {
    // Ignore storage/cookie access errors (e.g. strict privacy mode)
  }

  return null;
}

/**
 * Persists the active store ID across browser sessions and modules.
 * Sets both localStorage and a 1-year SameSite cookie for SSR server components,
 * and notifies active components via a CustomEvent.
 */
export function setStoredActiveStoreId(storeId: string): void {
  if (typeof window === "undefined") {
    return;
  }

  const normalized = (storeId ?? "").trim();
  if (!normalized) {
    return;
  }

  try {
    window.localStorage.setItem(ACTIVE_STORE_COOKIE, normalized);
  } catch {
    // Ignore quota/security errors
  }

  try {
    // 365 days expiration, path=/ so it's accessible across all dashboard routes
    const maxAge = 365 * 24 * 60 * 60;
    document.cookie = `${ACTIVE_STORE_COOKIE}=${encodeURIComponent(normalized)}; path=/; max-age=${maxAge}; SameSite=Lax`;
  } catch {
    // Ignore cookie write errors
  }

  try {
    window.dispatchEvent(
      new CustomEvent<string>(ACTIVE_STORE_EVENT, { detail: normalized })
    );
  } catch {
    // Ignore event dispatch errors
  }
}

/**
 * Subscribes to active store changes (from other tabs via 'storage' or current tab via CustomEvent).
 */
export function subscribeToActiveStoreChange(
  callback: (storeId: string) => void
): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handleCustomEvent = (event: Event) => {
    const customEvent = event as CustomEvent<string>;
    if (typeof customEvent.detail === "string" && customEvent.detail) {
      callback(customEvent.detail);
    }
  };

  const handleStorage = (event: StorageEvent) => {
    if (event.key === ACTIVE_STORE_COOKIE && event.newValue) {
      callback(event.newValue);
    }
  };

  window.addEventListener(ACTIVE_STORE_EVENT, handleCustomEvent);
  window.addEventListener("storage", handleStorage);

  return () => {
    window.removeEventListener(ACTIVE_STORE_EVENT, handleCustomEvent);
    window.removeEventListener("storage", handleStorage);
  };
}
