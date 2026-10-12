"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useLanguage } from "@/lib/i18n/LanguageContext";

export function Footer() {
  const pathname = usePathname();
  const { t } = useLanguage();
  const year = new Date().getFullYear();

  if (pathname?.startsWith("/storefront")) {
    return null;
  }

  const copyrightText = t.footer.copyright.replace("{year}", String(year));

  return (
    <footer className="border-t border-white/12 bg-slate-950/35 px-6 py-8 backdrop-blur-sm sm:px-8 lg:px-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 text-sm text-slate-300 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs text-slate-400">{copyrightText}</p>
        </div>

        <nav aria-label="Footer" className="flex flex-wrap items-center gap-4">
          <Link href="/privacy" className="transition hover:text-cyan-100">
            {t.footer.privacy}
          </Link>
          <Link href="/terms" className="transition hover:text-cyan-100">
            {t.footer.terms}
          </Link>
        </nav>
      </div>
    </footer>
  );
}