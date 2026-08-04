"use client";

import Link from "next/link";
import { useState, type CSSProperties } from "react";
import { Menu, ShoppingCart, User, X } from "lucide-react";
import { getStoreBrandingCssVars, normalizeMainColor } from "@/lib/branding";

export type StorefrontCategory = {
  id: string;
  name: string;
  slug: string;
};

type StorefrontNavbarProps = {
  storeName: string;
  basePath?: string;
  categories?: StorefrontCategory[];
  activeCategory?: string;
  isAccountActive?: boolean;
  mainColor?: string;
};

export default function StorefrontNavbar({
  storeName,
  basePath = "",
  categories = [],
  activeCategory,
  isAccountActive = false,
  mainColor = "#0f172a",
}: StorefrontNavbarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const homeHref = basePath ? `${basePath}/` : "/";
  const accountHref = basePath ? `${basePath}/account` : "/account";
  const resolvedMainColor = normalizeMainColor(mainColor);

  function closeMobileMenu() {
    setIsMobileMenuOpen(false);
  }

  return (
    <header
      style={getStoreBrandingCssVars(resolvedMainColor) as CSSProperties}
      className="border-b border-slate-200 bg-white px-6 py-4"
    >
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            {categories.length > 0 ? (
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(true)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 md:hidden"
                aria-label="Open categories menu"
                aria-expanded={isMobileMenuOpen}
                aria-controls="storefront-mobile-categories"
              >
                <Menu size={20} />
              </button>
            ) : null}

            <Link
              href={homeHref}
              className="shrink-0 text-xl font-semibold tracking-tight transition-opacity hover:opacity-75"
              onClick={closeMobileMenu}
            >
              {storeName}
            </Link>
          </div>

          {categories.length > 0 && (
            <nav className="hidden flex-1 flex-wrap items-center gap-x-5 gap-y-1 md:flex">
              <Link
                href={homeHref}
                className={`text-sm font-medium transition-colors ${
                  !activeCategory ? "font-semibold" : "text-slate-500 hover:text-slate-900"
                }`}
                style={!activeCategory ? { color: resolvedMainColor } : undefined}
              >
                All
              </Link>
              {categories.map((cat) => (
                <Link
                  key={cat.id}
                  href={basePath ? `${basePath}/?category=${cat.slug}` : `/?category=${cat.slug}`}
                  className={`text-sm font-medium transition-colors ${
                    activeCategory === cat.slug ? "font-semibold" : "text-slate-500 hover:text-slate-900"
                  }`}
                  style={activeCategory === cat.slug ? { color: resolvedMainColor } : undefined}
                  onClick={closeMobileMenu}
                >
                  {cat.name}
                </Link>
              ))}
            </nav>
          )}

          <div className="flex shrink-0 items-center gap-3">
            <Link
              href={accountHref}
              aria-label="Account"
              onClick={closeMobileMenu}
              className={`flex h-9 w-9 items-center justify-center rounded-full transition ${
                isAccountActive
                  ? "bg-slate-100 text-slate-900"
                  : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <User size={20} />
            </Link>
            <button
              type="button"
              data-prado-cart-toggle
              aria-label="Cart"
              className="relative flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
            >
              <ShoppingCart size={20} />
              <span
                data-prado-cart-count
                className="absolute -right-0.5 -top-0.5 hidden min-w-[18px] rounded-full bg-[var(--store-main-color)] px-1 text-center text-[10px] font-bold leading-[18px] text-white [&:not(:empty)]:block"
              />
            </button>
          </div>
        </div>
      </div>

      {categories.length > 0 ? (
        <>
          <button
            type="button"
            onClick={closeMobileMenu}
            aria-label="Close categories menu overlay"
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
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Categories</p>
              <button
                type="button"
                onClick={closeMobileMenu}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                aria-label="Close categories menu"
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
                style={!activeCategory ? { color: resolvedMainColor } : undefined}
              >
                All
              </Link>

              {categories.map((cat) => (
                <Link
                  key={cat.id}
                  href={basePath ? `${basePath}/?category=${cat.slug}` : `/?category=${cat.slug}`}
                  onClick={closeMobileMenu}
                  className={`rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                    activeCategory === cat.slug
                      ? "font-semibold"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                  style={activeCategory === cat.slug ? { color: resolvedMainColor } : undefined}
                >
                  {cat.name}
                </Link>
              ))}
            </nav>
          </aside>
        </>
      ) : null}
    </header>
  );
}
