"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import type { StorefrontThemeId } from "@/lib/storefront-theme";
import type { StorefrontCategory } from "./storefront-navbar";

function InstagramIcon({ size = 15, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

type Props = {
  storeName: string;
  theme?: StorefrontThemeId;
  categories?: StorefrontCategory[];
  basePath?: string;
};

export default function StorefrontFooter({
  storeName,
  theme = "minimal",
  categories = [],
  basePath = "",
}: Props) {
  const { t, language } = useLanguage();
  const isEs = language === "es";
  const year = new Date().getFullYear();
  const homeHref = basePath ? `${basePath}/` : "/";

  if (theme === "recinto") {
    return (
      <footer className="w-full bg-[#344e41] text-[#c5cec7] px-6 sm:px-10 lg:px-16 pt-14 pb-8 border-t border-[#252b27]/20">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-12 lg:grid-cols-[1.5fr_1fr_1fr_1fr] pb-12">
            {/* Brand identity */}
            <div className="space-y-4">
              <Link href={homeHref} className="inline-block text-3xl sm:text-4xl font-semibold text-white tracking-tight">
                {storeName}.
              </Link>
              <p className="text-xs leading-relaxed text-[#c5cec7] max-w-sm">
                {isEs
                  ? "Esenciales pensados para el día a día. Para los espacios que compartimos y los momentos que hacemos nuestros."
                  : "Considered essentials for everyday living. For the spaces we share, and the moments we make our own."}
              </p>
              <div className="flex items-center gap-4 pt-2 text-white">
                <a
                  href="https://instagram.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/20 hover:border-white hover:bg-white/10 transition"
                  aria-label="Instagram"
                >
                  <InstagramIcon size={15} />
                </a>
                <a
                  href="https://pinterest.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-white hover:underline transition"
                >
                  <span>Pinterest</span>
                  <ArrowUpRight size={13} />
                </a>
              </div>
            </div>

            {/* Shop Column */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-white">
                {isEs ? "Tienda" : "Shop"}
              </h3>
              <ul className="space-y-2 text-xs">
                <li>
                  <Link href={homeHref} className="hover:text-white transition">
                    {isEs ? "Todos los productos" : "All products"}
                  </Link>
                </li>
                <li>
                  <Link href="#new-arrivals" className="hover:text-white transition">
                    {isEs ? "Novedades" : "New arrivals"}
                  </Link>
                </li>
                <li>
                  <Link href="#featured-products" className="hover:text-white transition">
                    {isEs ? "Más vendidos" : "Bestsellers"}
                  </Link>
                </li>
                {categories.slice(0, 4).map((cat) => (
                  <li key={cat.id}>
                    <Link
                      href={basePath ? `${basePath}/category/${cat.slug}` : `/category/${cat.slug}`}
                      className="hover:text-white transition"
                    >
                      {cat.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Help Column */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-white">
                {isEs ? "Ayuda y Soporte" : "Here to help"}
              </h3>
              <ul className="space-y-2 text-xs">
                <li>
                  <a href="#support" className="hover:text-white transition">
                    {isEs ? "Contacto" : "Contact us"}
                  </a>
                </li>
                <li>
                  <a href="#support" className="hover:text-white transition">
                    {isEs ? "Información de envíos" : "Shipping information"}
                  </a>
                </li>
                <li>
                  <a href="#support" className="hover:text-white transition">
                    {isEs ? "Devoluciones y cambios" : "Returns & exchanges"}
                  </a>
                </li>
                <li>
                  <Link href={basePath ? `${basePath}/account` : "/account"} className="hover:text-white transition">
                    {isEs ? "Rastrea tu pedido" : "Track your order"}
                  </Link>
                </li>
                <li>
                  <a href="#support" className="hover:text-white transition">
                    {isEs ? "Preguntas frecuentes" : "Frequently asked questions"}
                  </a>
                </li>
              </ul>
            </div>

            {/* Discover Column */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-white">
                {isEs ? `Descubre ${storeName}` : `Discover ${storeName}`}
              </h3>
              <ul className="space-y-2 text-xs">
                <li>
                  <a href="#journal" className="hover:text-white transition">
                    {isEs ? "Nuestra historia" : "Our story"}
                  </a>
                </li>
                <li>
                  <a href="#journal" className="hover:text-white transition">
                    {isEs ? "El diario" : "The journal"}
                  </a>
                </li>
                <li>
                  <a href="#journal" className="hover:text-white transition">
                    {isEs ? "Materiales y cuidado" : "Materials & care"}
                  </a>
                </li>
                <li>
                  <a href="#journal" className="hover:text-white transition">
                    {isEs ? "Inspiración cotidiana" : "Find inspiration"}
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Legal bottom row */}
          <div className="border-t border-[#5b7063] pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-[#c5cec7]">
            <div className="flex flex-wrap items-center gap-4">
              <span>© {year} {storeName}.</span>
              <a href="https://pradocommerce.com/privacy" className="hover:text-white transition hover:underline">
                {isEs ? "Privacidad" : "Privacy policy"}
              </a>
              <a href="https://pradocommerce.com/terms" className="hover:text-white transition hover:underline">
                {isEs ? "Términos" : "Terms of service"}
              </a>
            </div>

            <div className="flex items-center gap-6">
              <a
                href="https://pradocommerce.com"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white transition"
              >
                {t.storefront.poweredBy}
              </a>
              <span className="text-[#c5cec7]/80">
                {isEs ? "USD $ · Español" : "United States · USD $ · English"}
              </span>
            </div>
          </div>
        </div>
      </footer>
    );
  }

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
