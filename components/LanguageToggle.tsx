"use client";

import React from "react";
import { Globe } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";

interface LanguageToggleProps {
  variant?: "dark" | "light";
  className?: string;
  showIcon?: boolean;
}

export function LanguageToggle({
  variant = "dark",
  className = "",
  showIcon = true,
}: LanguageToggleProps) {
  const { language, setLanguage } = useLanguage();

  const isDark = variant === "dark";

  return (
    <div
      className={`inline-flex items-center rounded-full border transition-colors ${
        isDark
          ? "border-cyan-200/30 bg-slate-950/50 text-cyan-100 shadow-[0_2px_10px_rgba(6,182,212,0.15)]"
          : "border-slate-200 bg-slate-100/80 text-slate-700 shadow-xs"
      } p-0.5 backdrop-blur-md ${className}`}
      role="group"
      aria-label="Language selection"
    >
      {showIcon && (
        <span className={`pl-1.5 pr-0.5 ${isDark ? "text-cyan-300/80" : "text-slate-400"}`}>
          <Globe className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
      )}

      <button
        type="button"
        onClick={() => setLanguage("es")}
        className={`rounded-full px-2 py-0.5 text-[11px] font-bold tracking-wider transition-all duration-200 ${
          language === "es"
            ? isDark
              ? "bg-cyan-300 text-slate-900 shadow-xs"
              : "bg-white text-slate-900 shadow-xs"
            : isDark
            ? "text-cyan-100/70 hover:text-cyan-50 hover:bg-white/5"
            : "text-slate-500 hover:text-slate-800 hover:bg-white/60"
        }`}
        aria-pressed={language === "es"}
        aria-label="Español"
      >
        ES
      </button>

      <button
        type="button"
        onClick={() => setLanguage("en")}
        className={`rounded-full px-2 py-0.5 text-[11px] font-bold tracking-wider transition-all duration-200 ${
          language === "en"
            ? isDark
              ? "bg-cyan-300 text-slate-900 shadow-xs"
              : "bg-white text-slate-900 shadow-xs"
            : isDark
            ? "text-cyan-100/70 hover:text-cyan-50 hover:bg-white/5"
            : "text-slate-500 hover:text-slate-800 hover:bg-white/60"
        }`}
        aria-pressed={language === "en"}
        aria-label="English"
      >
        EN
      </button>
    </div>
  );
}
