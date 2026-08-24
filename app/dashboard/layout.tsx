"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { ChevronDown, ChevronRight, Home, Store, Package, ShoppingCart, Users, Settings, Wrench, CircleHelp, Menu, X, Bell, LogOut } from "lucide-react";
import { PradoLogo } from "@/components/PradoLogo";

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
  const currentYear = new Date().getFullYear();
  const [isProductsOpen, setIsProductsOpen] = useState(pathname.startsWith("/dashboard/products"));
  const [isStoresOpen, setIsStoresOpen] = useState(pathname.startsWith("/dashboard/stores"));
  const [isToolsOpen, setIsToolsOpen] = useState(pathname.startsWith("/dashboard/tools"));
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const isHelpActive = pathname.startsWith("/dashboard/help");

  const [stores, setStores] = useState<{ id: string; name: string }[]>([]);
  const [knownOrderIds, setKnownOrderIds] = useState<Set<string>>(new Set());
  const [isInitialized, setIsInitialized] = useState(false);
  const [toast, setToast] = useState<{ id: string; title: string; message: string } | null>(null);
  const [currentUser, setCurrentUser] = useState<{
    id?: string;
    email?: string;
    name?: string | null;
    company?: string | null;
    plan?: string;
    authenticated?: boolean;
    verified?: boolean;
  } | null>(null);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  useEffect(() => {
    async function fetchCurrentUser() {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          setCurrentUser(data);
        }
      } catch (e) {
        console.error("Failed to fetch user profile", e);
      }
    }
    void fetchCurrentUser();
  }, []);

  function showToast(newToast: { id: string; title: string; message: string }) {
    setToast(newToast);
    setTimeout(() => {
      setToast((current) => (current?.id === newToast.id ? null : current));
    }, 6000);
  }

  useEffect(() => {
    async function fetchStores() {
      try {
        const response = await fetch("/api/stores", { cache: "no-store" });
        if (response.ok) {
          const data = await response.json();
          setStores(data);
        }
      } catch (error) {
        console.error("Failed to fetch stores in layout", error);
      }
    }
    void fetchStores();
  }, []);

  useEffect(() => {
    if (stores.length === 0) return;

    let active = true;

    async function pollOrders() {
      try {
        const allOrdersPromises = stores.map(async (store) => {
          const res = await fetch(`/api/orders?storeId=${store.id}`, { cache: "no-store" });
          if (!res.ok) return [];
          const orders = await res.json();
          return orders.map((order: any) => ({
            id: order.id,
            orderNumber: order.orderNumber,
            total: order.total,
            currency: order.currency,
            storeName: store.name,
            createdAt: order.createdAt,
          }));
        });

        const results = await Promise.all(allOrdersPromises);
        const currentOrders = results.flat();

        if (!active) return;

        setKnownOrderIds((prevKnown) => {
          const nextKnown = new Set(prevKnown);
          const newOrders: any[] = [];

          for (const order of currentOrders) {
            if (!nextKnown.has(order.id)) {
              nextKnown.add(order.id);
              newOrders.push(order);
            }
          }

          if (prevKnown.size === 0 && !isInitialized) {
            setIsInitialized(true);
            return nextKnown;
          }

          if (newOrders.length > 0) {
            const latestOrder = newOrders[0];
            showToast({
              id: latestOrder.id,
              title: "New Order!",
              message: `Order #${latestOrder.orderNumber} (${latestOrder.currency} ${latestOrder.total}) received at ${latestOrder.storeName}.`,
            });
          }

          return nextKnown;
        });
      } catch (error) {
        console.error("Error polling orders:", error);
      }
    }

    void pollOrders();

    const interval = setInterval(() => {
      void pollOrders();
    }, 5000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [stores, isInitialized]);

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
    {
      href: "/dashboard/stores",
      label: "Stores",
      icon: Store,
      children: [
        { href: "/dashboard/stores", label: "All Stores" },
        {
          href: stores[0] ? `/dashboard/stores/${stores[0].id}/themes` : "/dashboard/stores",
          label: "Themes",
        },
      ],
    },
    {
      href: "/dashboard/tools",
      label: "Tools",
      icon: Wrench,
      children: [
        { href: "/dashboard/tools/import-tables", label: "Import Tables" },
        { href: "/dashboard/tools/export-tables", label: "Export Tables" },
      ],
    },
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

    if (pathname.startsWith("/dashboard/stores")) {
      setIsStoresOpen(true);
    }

    if (pathname.startsWith("/dashboard/tools")) {
      setIsToolsOpen(true);
    }

    setIsMobileMenuOpen(false);
  }, [pathname]);

  function isSectionOpen(href: string) {
    if (href === "/dashboard/products") {
      return isProductsOpen;
    }

    if (href === "/dashboard/stores") {
      return isStoresOpen;
    }

    if (href === "/dashboard/tools") {
      return isToolsOpen;
    }

    return false;
  }

  function toggleSection(href: string) {
    if (href === "/dashboard/products") {
      setIsProductsOpen((open) => !open);
      return;
    }

    if (href === "/dashboard/stores") {
      setIsStoresOpen((open) => !open);
      return;
    }

    if (href === "/dashboard/tools") {
      setIsToolsOpen((open) => !open);
    }
  }

  function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
    return (
      <>
        <nav className="flex-1 space-y-1">
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
                    <a
                      href={item.href}
                      onClick={() => onNavigate?.()}
                      className="flex flex-1 items-center gap-3 px-3 py-1.5"
                    >
                      <Icon className={`h-4 w-4 shrink-0 ${active ? "text-cyan-700" : "text-cyan-600"}`} />
                      <span>{item.label}</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => toggleSection(item.href)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition hover:bg-white/80 hover:text-slate-700"
                      aria-label={isSectionOpen(item.href) ? "Hide submenu" : "Show submenu"}
                    >
                      {isSectionOpen(item.href) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </button>
                  </div>
                ) : (
                  <a
                    href={item.href}
                    onClick={() => onNavigate?.()}
                    className={`flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition ${
                      active
                        ? "bg-cyan-50 text-cyan-700"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                  >
                    <Icon className={`h-4 w-4 shrink-0 ${active ? "text-cyan-700" : "text-cyan-600"}`} />
                    <span>{item.label}</span>
                  </a>
                )}

                {item.children && isSectionOpen(item.href) ? (
                  <div className="ml-5 space-y-1 border-l border-slate-200 pl-2">
                    {item.children.map((child) => {
                      const childActive =
                        item.href === "/dashboard/products"
                          ? child.href === "/dashboard/products/new"
                            ? pathname === "/dashboard/products/new"
                            : child.href === "/dashboard/products/categories"
                              ? pathname === "/dashboard/products/categories"
                              : pathname === "/dashboard/products"
                          : item.href === "/dashboard/stores"
                            ? child.label === "Themes"
                              ? pathname.startsWith("/dashboard/stores/") && pathname.endsWith("/themes")
                              : pathname === "/dashboard/stores"
                            : item.href === "/dashboard/tools"
                              ? pathname === child.href
                            : pathname === child.href;

                      return (
                        <a
                          key={`${child.href}:${child.label}`}
                          href={child.href}
                          onClick={() => onNavigate?.()}
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

          <div className="pt-1">
            <div className="my-2 border-t border-slate-200" />
            <a
              href="/dashboard/help"
              onClick={() => onNavigate?.()}
              className={`flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition ${
                isHelpActive
                  ? "bg-cyan-50 text-cyan-700"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <CircleHelp className={`h-4 w-4 shrink-0 ${isHelpActive ? "text-cyan-700" : "text-cyan-600"}`} />
              <span>Help</span>
            </a>
          </div>
        </nav>

        <div className="mt-4 text-left">
          <p className="text-[10px] font-medium tracking-[0.02em] text-slate-400">
            © {currentYear} Prado Systems. All rights reserved.
          </p>
        </div>
      </>
    );
  }

  return (
    <div
      data-route-kind="dashboard"
      className="min-h-screen bg-[#f8fafc] text-slate-900"
      style={{ colorScheme: "light" }}
    >
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-[#ffffff] backdrop-blur-md print:hidden">
        <div className="mx-auto flex h-14 w-full items-center justify-between px-6">
          <Link href="/dashboard" className="flex items-center gap-2">
            <PradoLogo theme="light" subtitle="Merchant Dashboard" size="sm" />
          </Link>

          <div className="ml-auto flex items-center gap-3">
            <div className="h-6 w-px bg-slate-200" />
            {(() => {
              const merchantName = currentUser?.name || stores[0]?.name || (currentUser?.email ? currentUser.email.split("@")[0] : "Merchant");
              const merchantInitial = merchantName.trim().charAt(0).toUpperCase() || "M";
              const merchantSubtitle = currentUser?.company || (currentUser?.plan ? `${currentUser.plan} Merchant` : stores[0]?.name ? `${stores[0].name} Store` : "Merchant Store");

              return (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsUserMenuOpen((open) => !open)}
                    className="flex items-center gap-2.5 rounded-xl px-2 py-1 transition hover:bg-slate-100/70 focus:outline-none"
                    aria-label="User profile menu"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-600 font-bold text-white text-xs shadow-xs ring-2 ring-cyan-600/20">
                      {merchantInitial}
                    </div>
                    <div className="hidden text-left sm:block">
                      <div className="text-xs font-bold text-slate-900 leading-tight">
                        {merchantName}
                      </div>
                      {(currentUser?.verified || currentUser?.authenticated) && (
                        <div className="text-[10px] font-medium text-slate-400 leading-tight">
                          Authenticated
                        </div>
                      )}
                    </div>
                    <ChevronDown
                      className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-150 ${
                        isUserMenuOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {/* Profile Dropdown */}
                  {isUserMenuOpen && (
                    <div
                      className="absolute right-0 top-full mt-2 w-56 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl backdrop-blur-md z-50 transition-all"
                      onMouseLeave={() => setIsUserMenuOpen(false)}
                    >
                      <div className="px-2.5 py-1.5">
                        <p className="text-xs font-bold text-slate-900">
                          {merchantName}
                        </p>
                        <p className="text-[11px] font-medium text-slate-400 mt-0.5">
                          {merchantSubtitle}
                        </p>
                      </div>
                      <div className="my-2 border-t border-slate-100" />
                      <a
                        href="/api/auth/logout"
                        className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-bold text-cyan-600 transition hover:bg-cyan-50 hover:text-cyan-700"
                      >
                        <LogOut className="h-4 w-4 text-cyan-600" />
                        <span>Sign Out</span>
                      </a>
                    </div>
                  )}
                </div>
              );
            })()}

            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-600 transition hover:bg-slate-100 lg:hidden"
              aria-label="Open navigation menu"
            >
              <Menu className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {isMobileMenuOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden print:hidden">
          <button
            type="button"
            aria-label="Close navigation menu"
            className="absolute inset-0 bg-slate-950/45"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <aside className="relative flex h-full w-72 max-w-[85vw] flex-col overflow-hidden border-r border-slate-200 bg-[#ffffff] px-4 py-6 shadow-2xl backdrop-blur-xl">
            <div className="mb-4 flex items-center justify-between">
              <Link href="/dashboard" className="flex items-center gap-2" onClick={() => setIsMobileMenuOpen(false)}>
                <PradoLogo theme="light" subtitle="Merchant Dashboard" size="sm" />
              </Link>
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-600 transition hover:bg-slate-100"
                aria-label="Close navigation menu"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <SidebarContent onNavigate={() => setIsMobileMenuOpen(false)} />
          </aside>
        </div>
      ) : null}

      <div className="flex min-h-[calc(100vh-3.5rem)] bg-[#f8fafc] print:bg-white print:min-h-0">
        <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-48 shrink-0 flex-col overflow-hidden border-r border-slate-200 bg-[#ffffff] px-4 py-6 lg:flex print:hidden">
          <SidebarContent />
        </aside>

        <main className="min-w-0 flex-1 bg-[#f8fafc] px-6 py-10 lg:px-10 print:bg-white print:p-0">
          <div
            className={`flex min-w-0 w-full flex-col ${
              pathname === "/dashboard" ||
              pathname.startsWith("/dashboard/stores") ||
              pathname.startsWith("/dashboard/products") ||
              pathname.startsWith("/dashboard/orders") ||
              pathname.startsWith("/dashboard/customers") ||
              pathname.startsWith("/dashboard/help")
                ? ""
                : "mx-auto max-w-4xl"
            }`}
          >
            {children}
          </div>
        </main>
      </div>

      {/* Styles for animation */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes slideIn {
          from {
            transform: translateX(120%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        @keyframes swing {
          0%, 100% { transform: rotate(0); }
          20% { transform: rotate(15deg); }
          40% { transform: rotate(-10deg); }
          60% { transform: rotate(5deg); }
          80% { transform: rotate(-5deg); }
        }
        .animate-slide-in {
          animation: slideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-swing {
          animation: swing 1s ease-in-out infinite;
        }
      `}} />

      {/* Slide-in Toast Notification */}
      {toast && (
        <div className="fixed bottom-5 left-1/2 z-50 flex w-[calc(100vw-1.5rem)] max-w-sm -translate-x-1/2 animate-slide-in items-center gap-3.5 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl backdrop-blur-md sm:left-auto sm:right-5 sm:w-full sm:translate-x-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cyan-50 text-cyan-600 border border-cyan-100">
            <Bell className="h-4.5 w-4.5 animate-swing" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-slate-900">{toast.title}</p>
            <p className="mt-0.5 text-[11px] text-slate-500 leading-normal">{toast.message}</p>
          </div>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
            aria-label="Dismiss notification"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
