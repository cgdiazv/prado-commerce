"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import type { StorefrontThemeId } from "@/lib/storefront-theme";
import {
  getPublishedStorefrontPageKeys,
  getStorefrontPagePath,
  getStorefrontPageTitle,
  normalizeStorefrontPages,
  type StorefrontPages,
} from "@/lib/storefront-pages";
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
  pages?: StorefrontPages;
  basePath?: string;
};

export default function StorefrontFooter({
  storeName,
  theme = "minimal",
  categories = [],
  pages,
  basePath = "",
}: Props) {
  const { t, language } = useLanguage();
  const isEs = language === "es";
  const year = new Date().getFullYear();
  const homeHref = basePath ? `${basePath}/` : "/";
  const normalizedPages = normalizeStorefrontPages(pages);
  const pageLinks = getPublishedStorefrontPageKeys(normalizedPages).map((key) => ({
    key,
    href: getStorefrontPagePath(basePath, key),
    title: getStorefrontPageTitle(key, normalizedPages[key], language),
  }));

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
                {pageLinks.map((link) => (
                  <li key={link.key}>
                    <Link href={link.href} className="hover:text-white transition">
                      {link.title}
                    </Link>
                  </li>
                ))}
                <li>
                  <Link href={basePath ? `${basePath}/account` : "/account"} className="hover:text-white transition">
                    {isEs ? "Rastrea tu pedido" : "Track your order"}
                  </Link>
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

  if (theme === "calipso") {
    return (
      <footer className="w-full bg-[#352319] px-6 pb-7 pt-12 text-[#e8d8c6] sm:px-10 lg:px-16">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-10 border-b border-[#765640] pb-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
            <div className="max-w-xs">
              <Link href={homeHref} className="font-serif text-3xl tracking-tight text-[#f4d45c]">
                {storeName.toLowerCase()}.
              </Link>
              <p className="mt-3 text-[11px] leading-5 text-[#c8b49f]">
                {isEs
                  ? "Pequeños hallazgos, grandes momentos. Gracias por formar parte del universo Calipso."
                  : "Little discoveries, lovely moments. Thank you for being part of the Calipso world."}
              </p>
            </div>

            <div>
              <h3 className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[#f4d45c]">
                {isEs ? "Tienda" : "Shop"}
              </h3>
              <nav className="mt-4 flex flex-col gap-2 text-[10px]">
                <Link href={`${homeHref}#all-products`} className="transition hover:text-white">
                  {isEs ? "Todo el catálogo" : "Shop all"}
                </Link>
                <Link href={`${homeHref}#new-arrivals`} className="transition hover:text-white">
                  {isEs ? "Novedades" : "New arrivals"}
                </Link>
                {categories.slice(0, 4).map((category) => (
                  <Link key={category.id} href={basePath ? `${basePath}/category/${category.slug}` : `/category/${category.slug}`} className="transition hover:text-white">
                    {category.name}
                  </Link>
                ))}
              </nav>
            </div>

            <div>
              <h3 className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[#f4d45c]">
                {isEs ? "Ayuda" : "Help"}
              </h3>
              <nav className="mt-4 flex flex-col gap-2 text-[10px]">
                <Link href={basePath ? `${basePath}/account` : "/account"} className="transition hover:text-white">
                  {isEs ? "Mi cuenta" : "My account"}
                </Link>
                {pageLinks.map((link) => (
                  <Link key={link.key} href={link.href} className="transition hover:text-white">
                    {link.title}
                  </Link>
                ))}
              </nav>
            </div>

            <div>
              <h3 className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[#f4d45c]">
                {isEs ? "Síguenos" : "Follow along"}
              </h3>
              <p className="mt-4 text-[10px] leading-5">
                {isEs ? "Inspiración bonita para todos los días." : "A little everyday inspiration."}
              </p>
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 text-[10px] transition hover:text-white">
                Instagram <ArrowUpRight size={12} />
              </a>
            </div>
          </div>

          <div className="flex flex-col items-center justify-between gap-3 pt-5 text-[9px] text-[#c8b49f] sm:flex-row">
            <span>© {year} {storeName}. {t.storefront.allRightsReserved}</span>
            <a href="https://pradocommerce.com" target="_blank" rel="noopener noreferrer" className="transition hover:text-white">
              {isEs ? "Desarrollado por Prado Commerce" : t.storefront.poweredBy}
            </a>
          </div>
        </div>
      </footer>
    );
  }

  // Mercado (Figma template)
  return (
    <footer className="w-full border-t border-[#e5e5e0] bg-white px-6 sm:px-10 lg:px-16 pt-12 pb-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-10 lg:gap-16 pb-10">
          {/* Brand mark and description */}
          <div className="space-y-3 max-w-sm">
            <Link href={homeHref} className="inline-flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-[#20201e] text-sm font-semibold text-white">
                {storeName.charAt(0).toUpperCase()}
              </div>
              <span className="text-xl font-semibold tracking-tight text-[#20201e]">
                {storeName}
              </span>
            </Link>
            <p className="text-[13px] leading-relaxed text-[#747470]">
              {isEs
                ? "Tienda minimalista para explorar productos, comparar ofertas y completar compras de manera clara."
                : "Minimalist store to explore products, compare offers, and complete purchases clearly."}
            </p>
          </div>

          {/* Navigation columns */}
          <div className="grid grid-cols-3 gap-8 sm:gap-14 lg:gap-16">
            <div className="space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#747470]">
                {isEs ? "TIENDA" : "SHOP"}
              </p>
              <ul className="space-y-2.5 text-[13px] text-[#20201e]">
                <li>
                  <Link href={`${homeHref}#all-products`} className="hover:opacity-70 transition">
                    {isEs ? "Catálogo" : "Catalog"}
                  </Link>
                </li>
                <li>
                  <Link href={`${homeHref}#all-products`} className="hover:opacity-70 transition">
                    {isEs ? "Nuevos" : "New"}
                  </Link>
                </li>
                <li>
                  <Link href={`${homeHref}#all-products`} className="hover:opacity-70 transition">
                    {isEs ? "Ofertas" : "Offers"}
                  </Link>
                </li>
                {categories.length > 0 ? (
                  categories.slice(0, 3).map((cat) => (
                    <li key={cat.id}>
                      <Link
                        href={basePath ? `${basePath}/category/${cat.slug}` : `/category/${cat.slug}`}
                        className="hover:opacity-70 transition"
                      >
                        {cat.name}
                      </Link>
                    </li>
                  ))
                ) : (
                  <li>
                    <Link href={`${homeHref}#all-products`} className="hover:opacity-70 transition">
                      {isEs ? "Categorías" : "Categories"}
                    </Link>
                  </li>
                )}
              </ul>
            </div>

            <div className="space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#747470]">
                {isEs ? "CUENTA" : "ACCOUNT"}
              </p>
              <ul className="space-y-2.5 text-[13px] text-[#20201e]">
                <li>
                  <Link href={`${basePath}/account`} className="hover:opacity-70 transition">
                    {isEs ? "Ingresar" : "Sign In"}
                  </Link>
                </li>
                <li>
                  <Link href={`${basePath}/account`} className="hover:opacity-70 transition">
                    {isEs ? "Mi cuenta" : "My Account"}
                  </Link>
                </li>
                <li>
                  <Link href={`${basePath}/account`} className="hover:opacity-70 transition">
                    {isEs ? "Pedidos" : "Orders"}
                  </Link>
                </li>
                <li>
                  <Link href={`${basePath}/account`} className="hover:opacity-70 transition">
                    {isEs ? "Favoritos" : "Wishlist"}
                  </Link>
                </li>
              </ul>
            </div>

            {pageLinks.length > 0 ? (
              <div className="space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#747470]">
                  {isEs ? "AYUDA" : "HELP"}
                </p>
                <ul className="space-y-2.5 text-[13px] text-[#20201e]">
                  {pageLinks.map((link) => (
                    <li key={link.key}>
                      <Link href={link.href} className="hover:opacity-70 transition">
                        {link.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </div>

        {/* Footer bottom bar */}
        <div className="border-t border-[#e5e5e0] pt-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-[#747470]">
          <span>© {year} {storeName}. {t.storefront.allRightsReserved}</span>
          <a
            href="https://pradocommerce.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[#20201e] transition"
          >
            {isEs ? "Desarrollado por Prado Commerce" : t.storefront.poweredBy}
          </a>
        </div>
      </div>
    </footer>
  );
}
