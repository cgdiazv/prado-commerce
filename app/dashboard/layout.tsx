"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ChevronDown, ChevronRight, Home, Store, Package, ShoppingCart, Users, Settings, CircleHelp } from "lucide-react";

type NavChild = {
  href: string;
  label: string;
};

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  children?: NavChild[];
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isProductsOpen, setIsProductsOpen] = useState(pathname.startsWith("/dashboard/products"));
  const isHelpActive = pathname.startsWith("/dashboard/help");

  const navItems: NavItem[] = [
    { href: "/dashboard", label: "Dashboard", icon: Home },
    { href: "/dashboard/orders", label: "Orders", icon: ShoppingCart },
    {
      href: "/dashboard/products",
      label: "Products",
      icon: Package,
      children: [
        { href: "/dashboard/products", label: "All Products" },
        { href: "/dashboard/products/new", label: "Add Product" },
        { href: "/dashboard/products/categories", label: "Categories" },
      ],
    },
    { href: "/dashboard/customers", label: "Customers", icon: Users },
    { href: "/dashboard/stores", label: "Stores", icon: Store },
    { href: "/dashboard/settings", label: "Settings", icon: Settings },
  ];

  function isActive(href: string): boolean {
    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }
    return pathname.startsWith(href);
  }

  useEffect(() => {
    if (pathname.startsWith("/dashboard/products")) {
      setIsProductsOpen(true);
    }
  }, [pathname]);

  return (
    <div
      data-route-kind="dashboard"
      className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.9),_rgba(237,242,247,0.94)_40%,_rgba(226,232,240,0.9))] text-slate-900"
    >
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 w-full items-center justify-between px-6">
          <a href="/dashboard" className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.7)]" />
            <span className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-700">
              Prado Commerce
            </span>
          </a>
          <a
            href="/api/auth/logout"
            className="rounded-full border border-slate-200 px-4 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
          >
            Sign out
          </a>
        </div>
      </header>

      <div className="flex min-h-[calc(100vh-3.5rem)]">
        <aside className="sticky top-14 flex h-[calc(100vh-3.5rem)] w-48 shrink-0 flex-col overflow-hidden border-r border-slate-200 bg-white/50 px-4 py-6">
          <nav className="space-y-1 flex-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);

              return (
                <div key={item.href} className="space-y-1">
                  {item.children ? (
                    <div
                      className={`flex items-center rounded-lg px-1 py-1 text-sm font-medium transition ${
                        active
                          ? "bg-cyan-50 text-cyan-700"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                      }`}
                    >
                      <a href={item.href} className="flex flex-1 items-center gap-3 px-3 py-1.5">
                        <Icon className="h-4 w-4 shrink-0" />
                        <span>{item.label}</span>
                      </a>
                      <button
                        type="button"
                        onClick={() => setIsProductsOpen((open) => !open)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition hover:bg-white/80 hover:text-slate-700"
                        aria-label={isProductsOpen ? "Hide Products submenu" : "Show Products submenu"}
                      >
                        {isProductsOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </button>
                    </div>
                  ) : (
                    <a
                      href={item.href}
                      className={`flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition ${
                        active
                          ? "bg-cyan-50 text-cyan-700"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span>{item.label}</span>
                    </a>
                  )}

                  {item.children && isProductsOpen ? (
                    <div className="ml-5 space-y-1 border-l border-slate-200 pl-2">
                      {item.children.map((child) => {
                        const childActive =
                          child.href === "/dashboard/products/new"
                            ? pathname === "/dashboard/products/new"
                            : child.href === "/dashboard/products/categories"
                              ? pathname === "/dashboard/products/categories"
                            : pathname === "/dashboard/products";

                        return (
                          <a
                            key={child.href}
                            href={child.href}
                            className={`block rounded-md px-2 py-1.5 text-xs font-semibold tracking-[0.02em] transition ${
                              childActive
                                ? "bg-cyan-50 text-cyan-700"
                                : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                            }`}
                          >
                            {child.label}
                          </a>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </nav>

          <div className="mt-6 border-t border-slate-200 pt-3 text-left">
            <a
              href="/dashboard/help"
              className={`mb-2 inline-flex items-center gap-2 rounded-md px-2 py-1 text-[11px] font-medium tracking-[0.02em] transition ${
                isHelpActive
                  ? "bg-cyan-50 text-cyan-700"
                  : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
              }`}
            >
              <CircleHelp className="h-3.5 w-3.5" />
              Help
            </a>
            <p className="text-[10px] font-medium tracking-[0.02em] text-slate-400">
            © {new Date().getFullYear()} Prado Commerce
            </p>
          </div>
        </aside>

        <main className="flex-1 px-6 py-10 lg:px-10">
          <div
            className={`flex w-full flex-col ${
              pathname === "/dashboard" ||
              pathname.startsWith("/dashboard/stores") ||
              (pathname.startsWith("/dashboard/products") && !pathname.startsWith("/dashboard/products/new")) ||
              pathname.startsWith("/dashboard/orders") ||
              (pathname.startsWith("/dashboard/customers") &&
                !pathname.startsWith("/dashboard/customers/new"))
                ? ""
                : pathname.startsWith("/dashboard/products/new")
                  ? "mx-auto max-w-4xl"
                : pathname.startsWith("/dashboard/customers/new")
                  ? "mx-auto max-w-4xl"
                  : "mx-auto max-w-4xl"
            }`}
          >
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
