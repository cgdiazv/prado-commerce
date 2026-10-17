"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";

const STORAGE_KEY = "prado_cookie_consent";
const COOKIE_NAME = "prado_cookie_consent";

const listeners = new Set<() => void>();

function subscribe(callback: () => void) {
  listeners.add(callback);
  const handleStorage = (e: StorageEvent) => {
    if (!e.key || e.key === STORAGE_KEY) {
      callback();
    }
  };
  window.addEventListener("storage", handleStorage);
  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", handleStorage);
  };
}

function getSnapshot(): boolean {
  try {
    const localConsent = localStorage.getItem(STORAGE_KEY);
    const hasCookie = typeof document !== "undefined" && document.cookie.includes(`${COOKIE_NAME}=1`);
    return Boolean(localConsent || hasCookie);
  } catch {
    return true;
  }
}

function getServerSnapshot(): boolean {
  // During server-rendering, pretend it is acknowledged to prevent hydration mismatch
  return true;
}

export function CookieBanner() {
  const { t } = useLanguage();
  const isAcknowledged = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const handleAcknowledge = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "acknowledged");
      document.cookie = `${COOKIE_NAME}=1; path=/; max-age=31536000; SameSite=Lax`;
    } catch {
      // Storage access blocked or restricted
    }
    listeners.forEach((listener) => listener());
  };

  if (isAcknowledged) {
    return null;
  }

  return (
    <div
      role="region"
      aria-label="Cookie acknowledgment"
      className="fixed bottom-0 inset-x-0 w-full z-50 border-t border-cyan-500/25 bg-slate-950/95 backdrop-blur-md px-4 py-5 sm:px-6 sm:py-4.5 text-slate-300 shadow-[0_-8px_32px_rgba(0,0,0,0.65)]"
    >
      <div className="mx-auto flex w-full max-w-7xl flex-col sm:flex-row sm:items-center sm:justify-between gap-3.5 sm:gap-6 text-sm">
        {/* Strip content */}
        <div className="min-w-0">
          <p className="leading-relaxed">
            <span>{t.cookies.message}</span>{" "}
            <Link
              href="/privacy"
              className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2 transition-colors whitespace-nowrap font-medium"
            >
              {t.cookies.privacyPolicy}
            </Link>
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex shrink-0 items-center gap-2 self-end sm:self-center">
          <button
            type="button"
            onClick={handleAcknowledge}
            className="rounded-lg bg-cyan-500 px-5 py-2 text-sm font-semibold text-slate-950 transition-all hover:bg-cyan-400 active:scale-95 cursor-pointer shadow-md whitespace-nowrap"
          >
            {t.cookies.accept}
          </button>
          <button
            type="button"
            onClick={handleAcknowledge}
            aria-label={t.cookies.dismiss}
            title={t.cookies.dismiss}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-slate-200 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
