"use client";

import React, { createContext, useContext, useEffect, useSyncExternalStore } from "react";
import { type Language, type Translations, translations } from "./translations";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
}

const LanguageContext = createContext<LanguageContextType>({
  language: "es",
  setLanguage: () => {},
  t: translations.es,
});

const STORAGE_KEY = "prado_lang";
const listeners = new Set<() => void>();

function subscribe(callback: () => void) {
  listeners.add(callback);
  window.addEventListener("storage", callback);
  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", callback);
  };
}

function getSnapshot(): Language {
  try {
    if (typeof document !== "undefined") {
      const match = document.cookie.match(/(?:^|;\s*)prado_lang=([^;]+)/);
      if (match && (match[1] === "en" || match[1] === "es")) {
        return match[1] as Language;
      }
    }
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "en" || saved === "es") {
      return saved;
    }
  } catch {
    // Storage access blocked
  }
  return "es";
}

export function LanguageProvider({
  children,
  initialLanguage = "es",
}: {
  children: React.ReactNode;
  initialLanguage?: Language;
}) {
  const getServerSnapshot = React.useCallback(() => initialLanguage, [initialLanguage]);
  const language = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    document.documentElement.lang = language;
    try {
      document.cookie = `prado_lang=${language}; path=/; max-age=31536000; SameSite=Lax`;
      localStorage.setItem(STORAGE_KEY, language);
    } catch {
      // Storage access blocked
    }
  }, [language]);

  const setLanguage = (newLang: Language) => {
    try {
      localStorage.setItem(STORAGE_KEY, newLang);
      document.cookie = `prado_lang=${newLang}; path=/; max-age=31536000; SameSite=Lax`;
      document.documentElement.lang = newLang;
      listeners.forEach((listener) => listener());
    } catch {
      // Storage access blocked
    }
  };

  const currentTranslations = translations[language] || translations.es;

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t: currentTranslations,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
