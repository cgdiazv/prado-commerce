"use client";

import { useLanguage } from "@/lib/i18n/LanguageContext";

type Props = { storeName: string };

export default function StorefrontFooter({ storeName }: Props) {
  const { t } = useLanguage();
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-slate-200 bg-white px-6 py-5">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 text-sm text-slate-500 sm:flex-row">
        <span>© {year} {storeName}. {t.storefront.allRightsReserved}</span>
        <a
          href="https://pradocommerce.com"
          target="_blank"
          rel="noopener noreferrer"
          className="transition hover:text-slate-900"
        >
          {t.storefront.poweredBy}
        </a>
      </div>
    </footer>
  );
}
