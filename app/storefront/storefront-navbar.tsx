import Link from "next/link";
import { ShoppingCart, User } from "lucide-react";

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
};

export default function StorefrontNavbar({
  storeName,
  basePath = "",
  categories = [],
  activeCategory,
  isAccountActive = false,
}: StorefrontNavbarProps) {
  const homeHref = basePath ? `${basePath}/` : "/";
  const accountHref = basePath ? `${basePath}/account` : "/account";

  return (
    <header className="border-b border-slate-200 bg-white px-6 py-4">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center justify-between gap-6">
          <Link
            href={homeHref}
            className="shrink-0 text-xl font-semibold tracking-tight transition-opacity hover:opacity-75"
          >
            {storeName}
          </Link>

          {categories.length > 0 && (
            <nav className="flex flex-1 flex-wrap items-center gap-x-5 gap-y-1">
              <Link
                href={homeHref}
                className={`text-sm font-medium transition-colors ${
                  !activeCategory ? "font-semibold text-slate-900" : "text-slate-500 hover:text-slate-900"
                }`}
              >
                All
              </Link>
              {categories.map((cat) => (
                <Link
                  key={cat.id}
                  href={basePath ? `${basePath}/?category=${cat.slug}` : `/?category=${cat.slug}`}
                  className={`text-sm font-medium transition-colors ${
                    activeCategory === cat.slug ? "font-semibold text-slate-900" : "text-slate-500 hover:text-slate-900"
                  }`}
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
                className="absolute -right-0.5 -top-0.5 hidden min-w-[18px] rounded-full bg-slate-900 px-1 text-center text-[10px] font-bold leading-[18px] text-white [&:not(:empty)]:block"
              />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
