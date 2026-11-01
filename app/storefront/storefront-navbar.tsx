"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState, type CSSProperties } from "react";
import { Menu, Search, ShoppingBag, User, X, ArrowRight } from "lucide-react";
import { getStoreBrandingCssVars, normalizeMainColor } from "@/lib/branding";
import type { StorefrontThemeId } from "@/lib/storefront-theme";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { LanguageToggle } from "@/components/LanguageToggle";

export type StorefrontCategory = {
  id: string;
  name: string;
  slug: string;
};

type StorefrontNavbarProps = {
  storeName: string;
  logoUrl?: string | null;
  basePath?: string;
  categories?: StorefrontCategory[];
  theme?: StorefrontThemeId;
  mainColor?: string;
};

export default function StorefrontNavbar({
  storeName,
  logoUrl = null,
  basePath = "",
  categories = [],
  theme = "minimal",
  mainColor = "#0f172a",
}: StorefrontNavbarProps) {
  const { t, language } = useLanguage();
  const isEs = language === "es";
  const isMercado = theme === "mercado" || theme === "minimal";
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const pathSegments = pathname.split("/").filter(Boolean);
  const categorySegmentIndex = pathSegments.lastIndexOf("category");
  const activeCategory = categorySegmentIndex >= 0 ? pathSegments[categorySegmentIndex + 1] : searchParams.get("category") ?? undefined;
  const searchQuery = searchParams.get("q") ?? "";
  const isAccountActive = pathSegments.at(-1) === "account";
  const homeHref = basePath ? `${basePath}/` : "/";
  const accountHref = basePath ? `${basePath}/account` : "/account";
  const activeCategoryHref = activeCategory
    ? (basePath ? `${basePath}/category/${activeCategory}` : `/category/${activeCategory}`)
    : homeHref;
  const resolvedMainColor = normalizeMainColor(mainColor);

  const headerClass =
    theme === "recinto"
      ? "border-b border-[#e3e5de] bg-white px-4 sm:px-8 lg:px-12 py-3.5"
      : "border-b border-[#e5e5e0] bg-white px-6 sm:px-10 lg:px-16 py-3.5";

  function closeMobileMenu() {
    setIsMobileMenuOpen(false);
  }

  if (theme === "calipso") {
    return (
      <>
        <aside className="bg-[#a43d1b] px-4 py-2 text-center text-[10px] tracking-wide text-white sm:text-[11px]">
          {isEs ? "Pequeños detalles. Grandes descubrimientos." : "Little details. Big discoveries."}
          <a href={`${homeHref}#new-arrivals`} className="ml-2 underline underline-offset-2">
            {isEs ? "Descubre lo nuevo" : "Discover what’s new"}
          </a>
        </aside>
        <header
          style={getStoreBrandingCssVars(resolvedMainColor) as CSSProperties}
          className="border-b border-[#eadfce] bg-[#fffaf2]"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-8 lg:px-12">
            <div className="flex min-h-[76px] items-center justify-between gap-4 py-3">
              <div className="flex items-center gap-2">
                {categories.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => setIsMobileMenuOpen(true)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[#493126] transition hover:bg-[#f4ead9] md:hidden"
                    aria-label={t.storefront.openCategoriesMenu}
                    aria-expanded={isMobileMenuOpen}
                    aria-controls="storefront-mobile-categories"
                  >
                    <Menu size={19} />
                  </button>
                ) : null}
                <Link
                  href={homeHref}
                  onClick={closeMobileMenu}
                  className="font-serif text-[27px] leading-none tracking-tight text-[#a43d1b] sm:text-[32px]"
                >
                  {logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={logoUrl} alt={storeName} className="h-9 w-auto max-w-[180px] object-contain" />
                  ) : (
                    <span>{storeName.toLowerCase()}.</span>
                  )}
                </Link>
              </div>

              <form action={activeCategoryHref} method="get" className="hidden min-w-0 max-w-xl flex-1 md:block">
                <div className="flex h-10 items-center overflow-hidden rounded-full bg-[#f5efe3] pl-4">
                  <Search className="h-4 w-4 shrink-0 text-[#8b7b6c]" />
                  <input
                    type="search"
                    name="q"
                    defaultValue={searchQuery}
                    placeholder={isEs ? "¿Qué quieres descubrir hoy?" : "What would you like to discover today?"}
                    className="h-full min-w-0 flex-1 bg-transparent px-3 text-xs text-[#352319] outline-none placeholder:text-[#8b7b6c]"
                  />
                  <button
                    type="submit"
                    className="h-full shrink-0 bg-[#a43d1b] px-5 text-[11px] font-semibold text-white transition hover:bg-[#873116]"
                  >
                    {isEs ? "Buscar" : "Search"}
                  </button>
                </div>
              </form>

              <div className="flex shrink-0 items-center gap-3 text-[#493126] sm:gap-5">
                <LanguageToggle variant="light" />
                <Link
                  href={accountHref}
                  aria-label={t.storefront.account}
                  onClick={closeMobileMenu}
                  className="hidden items-center gap-1.5 text-xs transition hover:text-[#a43d1b] sm:inline-flex"
                >
                  <User size={16} />
                  <span>{isEs ? "Mi cuenta" : "My account"}</span>
                </Link>
                <button
                  type="button"
                  data-prado-cart-toggle
                  aria-label={t.storefront.cart}
                  className="inline-flex items-center gap-1.5 text-xs transition hover:text-[#a43d1b]"
                >
                  <ShoppingBag size={17} />
                  <span className="hidden sm:inline">{isEs ? "Bolsa" : "Bag"}</span>
                  <span data-prado-cart-count className="text-[10px]">(0)</span>
                </button>
              </div>
            </div>

            <form action={activeCategoryHref} method="get" className="pb-3 md:hidden">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8b7b6c]" />
                <input
                  type="search"
                  name="q"
                  defaultValue={searchQuery}
                  placeholder={isEs ? "¿Qué quieres descubrir hoy?" : "What would you like to discover today?"}
                  className="h-10 w-full rounded-full bg-[#f5efe3] pl-9 pr-4 text-xs text-[#352319] outline-none"
                />
              </div>
            </form>
          </div>

          <nav className="hidden items-center gap-7 overflow-x-auto bg-[#f4d45c] px-6 py-3 text-[11px] font-medium text-[#352319] md:flex lg:px-12">
            <Link href={`${homeHref}#all-products`} className="shrink-0">{isEs ? "Todo el catálogo" : "Shop all"}</Link>
            <Link href={`${homeHref}#new-arrivals`} className="shrink-0">{isEs ? "Novedades" : "New arrivals"}</Link>
            {categories.map((category) => (
              <Link
                key={category.id}
                href={basePath ? `${basePath}/category/${category.slug}` : `/category/${category.slug}`}
                className="shrink-0 transition hover:text-[#a43d1b]"
              >
                {category.name}
              </Link>
            ))}
          </nav>

          {categories.length > 0 ? (
            <>
              <button
                type="button"
                onClick={closeMobileMenu}
                aria-label={t.storefront.closeCategoriesMenu}
                className={`fixed inset-0 z-40 bg-[#352319]/40 transition-opacity md:hidden ${
                  isMobileMenuOpen ? "opacity-100" : "pointer-events-none opacity-0"
                }`}
              />
              <aside
                id="storefront-mobile-categories"
                className={`fixed left-0 top-0 z-50 flex h-full w-[82vw] max-w-sm flex-col border-r border-[#eadfce] bg-[#fffaf2] shadow-xl transition-transform duration-300 md:hidden ${
                  isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
                }`}
                aria-hidden={!isMobileMenuOpen}
              >
                <div className="flex items-center justify-between border-b border-[#eadfce] px-5 py-4">
                  <p className="font-serif text-lg text-[#a43d1b]">{storeName}.</p>
                  <button
                    type="button"
                    onClick={closeMobileMenu}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[#493126] hover:bg-[#f4ead9]"
                    aria-label={t.storefront.closeCategoriesMenu}
                  >
                    <X size={18} />
                  </button>
                </div>
                <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-3">
                  <Link href={`${homeHref}#all-products`} onClick={closeMobileMenu} className="rounded-xl px-3 py-2.5 text-sm text-[#493126]">
                    {isEs ? "Todo el catálogo" : "Shop all"}
                  </Link>
                  <Link href={`${homeHref}#new-arrivals`} onClick={closeMobileMenu} className="rounded-xl px-3 py-2.5 text-sm text-[#493126]">
                    {isEs ? "Novedades" : "New arrivals"}
                  </Link>
                  {categories.map((category) => (
                    <Link
                      key={category.id}
                      href={basePath ? `${basePath}/category/${category.slug}` : `/category/${category.slug}`}
                      onClick={closeMobileMenu}
                      className="rounded-xl px-3 py-2.5 text-sm text-[#493126] hover:bg-[#f5efe3]"
                    >
                      {category.name}
                    </Link>
                  ))}
                </nav>
              </aside>
            </>
          ) : null}
        </header>
      </>
    );
  }

  return (
    <>
      {theme === "recinto" && (
        <aside
          aria-label={isEs ? "Anuncio de la tienda" : "Store announcement"}
          className="bg-[#344e41] text-white px-4 py-2 text-center text-[11px] font-normal tracking-wide flex items-center justify-center gap-2 sm:gap-3 transition"
        >
          <span>
            {isEs ? "Esenciales pensados para el día a día." : "Considered essentials. Everyday living."}
          </span>
          <Link
            href="#featured-products"
            className="inline-flex items-center gap-1 font-medium underline underline-offset-2 hover:opacity-90"
          >
            <span>{isEs ? "Explora la nueva colección" : "Explore the new collection"}</span>
            <ArrowRight size={12} aria-hidden="true" />
          </Link>
        </aside>
      )}

      <header
        style={getStoreBrandingCssVars(resolvedMainColor) as CSSProperties}
        className={headerClass}
      >
        <div className="mx-auto max-w-7xl">
          <div className="flex items-center justify-between gap-4 sm:gap-8">
            <div className="flex items-center gap-2">
              {categories.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setIsMobileMenuOpen(true)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 md:hidden"
                  aria-label={t.storefront.openCategoriesMenu}
                  aria-expanded={isMobileMenuOpen}
                  aria-controls="storefront-mobile-categories"
                >
                  <Menu size={20} />
                </button>
              ) : null}

              <Link
                href={homeHref}
                className="shrink-0 transition-opacity hover:opacity-85"
                onClick={closeMobileMenu}
              >
                {logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoUrl} alt={storeName} className="h-9 w-auto max-w-[180px] object-contain" />
                ) : theme === "recinto" ? (
                  <span className="text-2xl sm:text-[30px] font-semibold tracking-tight text-[#252b27] lowercase">
                    {storeName}.
                  </span>
                ) : (
                  // Mercado template brand mark from Figma
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-[#20201e] text-sm font-semibold text-white">
                      {storeName.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-[19px] font-semibold tracking-tight text-[#20201e]">{storeName}</span>
                  </div>
                )}
              </Link>
            </div>

            <div className={`hidden min-w-0 flex-1 md:block ${isMercado ? "max-w-xl" : "max-w-md"}`}>
              <form action={activeCategoryHref} method="get" className="w-full">
                <div className="relative">
                  <Search
                    className={`pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ${
                      theme === "recinto" ? "text-[#73766f]" : "text-[#20201e]"
                    }`}
                  />
                  <input
                    type="search"
                    name="q"
                    defaultValue={searchQuery}
                    placeholder={
                      theme === "recinto"
                        ? isEs
                          ? "Buscar productos, colecciones y más"
                          : "Search products, collections and more"
                        : isEs
                          ? "Buscar productos..."
                          : "Search products..."
                    }
                    className={`h-9 w-full pl-9 pr-12 text-xs outline-none transition ${
                      theme === "recinto"
                        ? "rounded-[4px] border border-transparent bg-[#f3f3ee] text-[#252b27] placeholder-[#73766f] focus:border-[#344e41] focus:bg-white"
                        : "rounded-[4px] border border-transparent bg-[#f6f6f3] text-[#20201e] placeholder-[#747470] focus:border-[#20201e] focus:bg-white"
                    }`}
                  />
                  {theme === "recinto" && (
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-[#73766f]">
                      ⌘ K
                    </span>
                  )}
                </div>
              </form>
            </div>

            <div className="flex shrink-0 items-center gap-3 sm:gap-5">
              <LanguageToggle variant="light" simple={isMercado} />

              <Link
                href={accountHref}
                aria-label={t.storefront.account}
                onClick={closeMobileMenu}
                className={`inline-flex items-center gap-2 transition text-xs ${
                  theme === "recinto"
                    ? isAccountActive
                      ? "text-[#344e41] font-semibold"
                      : "text-[#252b27] hover:text-[#344e41]"
                    : "text-[#20201e] font-normal hover:opacity-75"
                }`}
              >
                <User size={18} className="text-[#20201e]" />
                {!isMercado && (
                  <span className="hidden sm:inline">{isEs ? "Mi cuenta" : "Account"}</span>
                )}
              </Link>

              <button
                type="button"
                data-prado-cart-toggle
                aria-label={t.storefront.cart}
                className={`relative inline-flex items-center gap-2 transition text-xs ${
                  theme === "recinto"
                    ? "text-[#252b27] hover:text-[#344e41]"
                    : "text-[#20201e] font-normal hover:opacity-75"
                }`}
              >
                <ShoppingBag size={18} className="text-[#20201e]" />
                {!isMercado && (
                  <span className="hidden sm:inline">
                    {theme === "recinto" ? (isEs ? "Bolsa" : "Bag") : (isEs ? "Carrito" : "Cart")} (<span data-prado-cart-count className="inline">0</span>)
                  </span>
                )}
                {isMercado && (
                  <span
                    data-prado-cart-count
                    data-prado-cart-badge
                    className="absolute -right-1.5 -top-1.5 hidden min-w-[16px] rounded-full bg-[#20201e] px-1 text-center text-[10px] font-bold leading-[16px] text-white [&:not(:empty)]:block"
                  />
                )}
                {!isMercado && (
                  <span
                    data-prado-cart-count
                    className="sm:hidden absolute -right-1 -top-1 hidden min-w-[16px] rounded-full bg-[#20201e] px-1 text-center text-[10px] font-bold leading-[16px] text-white [&:not(:empty)]:block"
                  />
                )}
              </button>
            </div>
          </div>

          {/* Recinto Dedicated Category Bar */}
          {theme === "recinto" ? (
            <div className="mt-3.5 hidden md:flex items-center justify-between border-t border-[#e3e5de] pt-3 text-xs">
              <nav className="flex items-center gap-6">
                <Link
                  href={homeHref}
                  className={`transition ${
                    !activeCategory ? "text-[#252b27] font-semibold" : "text-[#73766f] hover:text-[#252b27]"
                  }`}
                >
                  {isEs ? "Ver todo" : "Shop all"}
                </Link>
                <Link href="#new-arrivals" className="text-[#73766f] transition hover:text-[#252b27]">
                  {isEs ? "Novedades" : "New arrivals"}
                </Link>
                <Link href="#featured-products" className="text-[#73766f] transition hover:text-[#252b27]">
                  {isEs ? "Más vendidos" : "Bestsellers"}
                </Link>
                {categories.map((cat) => (
                  <Link
                    key={cat.id}
                    href={basePath ? `${basePath}/category/${cat.slug}` : `/category/${cat.slug}`}
                    className={`transition ${
                      activeCategory === cat.slug ? "text-[#252b27] font-semibold" : "text-[#73766f] hover:text-[#252b27]"
                    }`}
                  >
                    {cat.name}
                  </Link>
                ))}
              </nav>

              <div className="flex items-center gap-5 text-[#73766f]">
                <a href="#journal" className="transition hover:text-[#252b27]">
                  {isEs ? "El diario" : "The journal"}
                </a>
                <span>{isEs ? "USD $ · ES" : "US / USD · EN"}</span>
              </div>
            </div>
          ) : (
            categories.length > 0 && (
              <nav
                className={`hidden md:flex flex-wrap items-center gap-x-5 gap-y-1 mt-3 ${
                  isMercado ? "justify-center" : ""
                }`}
              >
                <Link
                  href={homeHref}
                  className={`text-sm font-medium transition-colors ${
                    !activeCategory ? "font-semibold" : "text-slate-500 hover:text-slate-900"
                  }`}
                  style={!activeCategory ? { color: resolvedMainColor } : undefined}
                >
                  {t.storefront.all}
                </Link>
                {categories.map((cat) => (
                  <Link
                    key={cat.id}
                    href={basePath ? `${basePath}/category/${cat.slug}` : `/category/${cat.slug}`}
                    className={`text-sm font-medium transition-colors ${
                      activeCategory === cat.slug ? "font-semibold" : "text-slate-500 hover:text-slate-900"
                    }`}
                    style={activeCategory === cat.slug ? { color: resolvedMainColor } : undefined}
                  >
                    {cat.name}
                  </Link>
                ))}
              </nav>
            )
          )}

          {/* Mobile search bar */}
          <form action={activeCategoryHref} method="get" className="mt-3 md:hidden">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                name="q"
                defaultValue={searchQuery}
                placeholder={t.storefront.searchPlaceholder}
                className={`h-9 w-full pl-9 pr-4 text-xs outline-none transition ${
                  theme === "recinto"
                    ? "rounded-[4px] border border-transparent bg-[#f3f3ee] text-[#252b27]"
                    : "rounded-full border border-slate-200 bg-white text-slate-900"
                }`}
              />
            </div>
          </form>
        </div>

        {/* Mobile menu drawer */}
        {categories.length > 0 ? (
          <>
            <button
              type="button"
              onClick={closeMobileMenu}
              aria-label={t.storefront.closeCategoriesMenu}
              className={`fixed inset-0 z-40 bg-slate-900/40 transition-opacity md:hidden ${
                isMobileMenuOpen ? "opacity-100" : "pointer-events-none opacity-0"
              }`}
            />

            <aside
              id="storefront-mobile-categories"
              className={`fixed left-0 top-0 z-50 flex h-full w-[82vw] max-w-sm flex-col border-r border-slate-200 bg-white shadow-xl transition-transform duration-300 md:hidden ${
                isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
              }`}
              aria-hidden={!isMobileMenuOpen}
            >
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
                  {t.storefront.categories}
                </p>
                <button
                  type="button"
                  onClick={closeMobileMenu}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                  aria-label={t.storefront.closeCategoriesMenu}
                >
                  <X size={18} />
                </button>
              </div>

              <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-3">
                <Link
                  href={homeHref}
                  onClick={closeMobileMenu}
                  className={`rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                    !activeCategory ? "font-semibold" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                  style={!activeCategory && theme !== "recinto" ? { color: resolvedMainColor } : undefined}
                >
                  {t.storefront.all}
                </Link>

                {categories.map((cat) => (
                  <Link
                    key={cat.id}
                    href={basePath ? `${basePath}/category/${cat.slug}` : `/category/${cat.slug}`}
                    onClick={closeMobileMenu}
                    className={`rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                      activeCategory === cat.slug
                        ? "font-semibold text-slate-900 bg-slate-100"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                    style={activeCategory === cat.slug && theme !== "recinto" ? { color: resolvedMainColor } : undefined}
                  >
                    {cat.name}
                  </Link>
                ))}
              </nav>
            </aside>
          </>
        ) : null}
      </header>
    </>
  );
}
