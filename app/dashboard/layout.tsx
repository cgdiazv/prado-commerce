"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ChevronDown, ChevronRight, Home, Store, Package, ShoppingCart, Users, Settings, Wrench, CircleHelp, Menu, X, Bell, LogOut, Truck, BarChart3, Boxes } from "lucide-react";
import { PradoLogo } from "@/components/PradoLogo";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { PwaInstallPrompt } from "@/components/PwaInstallPrompt";

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

const KNOWN_ORDERS_STORAGE_KEY = "prado_dashboard_known_orders";

function loadKnownOrders(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = sessionStorage.getItem(KNOWN_ORDERS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return new Set(parsed);
      }
    }
  } catch {
    // Ignore storage parse error
  }
  return new Set();
}

function persistKnownOrders(ids: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(KNOWN_ORDERS_STORAGE_KEY, JSON.stringify(Array.from(ids).slice(-500)));
  } catch {
    // Ignore storage quota/security error
  }
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { t, language } = useLanguage();
  const currentYear = new Date().getFullYear();
  const [openSection, setOpenSection] = useState<string | null>(() => {
    if (pathname.startsWith("/dashboard/orders")) return "/dashboard/orders";
    if (pathname.startsWith("/dashboard/products")) return "/dashboard/products";
    if (pathname.startsWith("/dashboard/procurement")) return "/dashboard/procurement";
    if (pathname.startsWith("/dashboard/reports")) return "/dashboard/reports";
    if (pathname.startsWith("/dashboard/customers")) return "/dashboard/customers";
    if (pathname.startsWith("/dashboard/stores")) return "/dashboard/stores";
    return null;
  });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const isHelpActive = pathname.startsWith("/dashboard/help");

  const [stores, setStores] = useState<{ id: string; name: string }[]>([]);
  const sessionStartedAtRef = useRef<number>(Date.now());
  const knownOrderIdsRef = useRef<Set<string>>(new Set());
  const isInitializedRef = useRef(false);
  const [toast, setToast] = useState<{ id: string; title: string; message: string } | null>(null);

  useEffect(() => {
    const stored = loadKnownOrders();
    for (const id of stored) {
      knownOrderIdsRef.current.add(id);
    }
  }, []);
  const [currentUser, setCurrentUser] = useState<{
    id?: string;
    email?: string;
    name?: string | null;
    company?: string | null;
    plan?: string;
    authenticated?: boolean;
    verified?: boolean;
    isCashier?: boolean;
    cashier?: {
      cashierId: string;
      cashierName: string;
      cashierEmail: string;
      cashierRole: string;
      storeId: string;
      storeName: string;
    } | null;
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
    if (stores.length === 0 || currentUser?.isCashier) return;

    let active = true;

    async function pollOrders() {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        return;
      }

      try {
        const currentOrders: any[] = [];
        for (const store of stores) {
          if (!active) break;
          try {
            const res = await fetch(`/api/orders?storeId=${store.id}`, { cache: "no-store" });
            if (res.ok) {
              const orders = await res.json();
              if (Array.isArray(orders)) {
                for (const order of orders) {
                  currentOrders.push({
                    id: order.id,
                    orderNumber: order.orderNumber,
                    total: order.total,
                    currency: order.currency,
                    storeName: store.name,
                    createdAt: order.createdAt,
                  });
                }
              }
            }
          } catch {
            // Ignore transient background poll errors
          }
        }

        if (!active) return;

        // Establish initial baseline on first run without notifying
        if (!isInitializedRef.current) {
          isInitializedRef.current = true;
          for (const order of currentOrders) {
            knownOrderIdsRef.current.add(order.id);
          }
          persistKnownOrders(knownOrderIdsRef.current);
          return;
        }

        const genuineNewOrders: typeof currentOrders = [];
        for (const order of currentOrders) {
          if (!knownOrderIdsRef.current.has(order.id)) {
            knownOrderIdsRef.current.add(order.id);
            const orderTime = new Date(order.createdAt).getTime();
            if (!Number.isNaN(orderTime) && orderTime > sessionStartedAtRef.current) {
              genuineNewOrders.push(order);
            }
          }
        }

        persistKnownOrders(knownOrderIdsRef.current);

        if (genuineNewOrders.length > 0) {
          const latestOrder = genuineNewOrders[0];
          showToast({
            id: latestOrder.id,
            title: t.dashboard.newOrderTitle,
            message: t.dashboard.newOrderMessage
              .replace("{orderNumber}", String(latestOrder.orderNumber))
              .replace("{currency}", latestOrder.currency)
              .replace("{total}", latestOrder.total)
              .replace("{storeName}", latestOrder.storeName),
          });
        }
      } catch (error) {
        console.error("Error polling orders:", error);
      }
    }

    const initialTimeout = setTimeout(() => {
      void pollOrders();
    }, 10000);

    const interval = setInterval(() => {
      void pollOrders();
    }, 45000);

    return () => {
      active = false;
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [stores]);

  const navItems: NavItem[] = [
    { href: "/dashboard", label: t.dashboard.merchantDashboard, icon: Home },
    {
      href: "/dashboard/orders",
      label: t.dashboard.orders,
      icon: ShoppingCart,
      children: [
        { href: "/dashboard/orders", label: t.dashboard.allOrders },
        { href: "/dashboard/orders/new", label: t.dashboard.newOrder },
        { href: "/dashboard/orders/pos", label: t.dashboard.pointOfSale },
      ],
    },
    {
      href: "/dashboard/products",
      label: t.dashboard.products,
      icon: Package,
      children: [
        { href: "/dashboard/products", label: t.dashboard.allProducts },
        { href: "/dashboard/products/new", label: t.dashboard.addProduct },
        { href: "/dashboard/products/categories", label: t.dashboard.categories },
        { href: "/dashboard/products/brands", label: t.dashboard.brands },
      ],
    },
    {
      href: "/dashboard/procurement",
      label: t.dashboard.procurement,
      icon: Truck,
      children: [
        { href: "/dashboard/procurement", label: t.dashboard.procurementOverview },
        { href: "/dashboard/procurement/purchase-orders", label: t.dashboard.purchaseOrders },
        { href: "/dashboard/procurement/receipts", label: t.dashboard.receivingHistory },
        { href: "/dashboard/procurement/vendors", label: t.dashboard.vendors },
      ],
    },
    {
      href: "/dashboard/consignments",
      label: t.dashboard.consignments,
      icon: Boxes,
    },
    {
      href: "/dashboard/customers",
      label: t.dashboard.customers,
      icon: Users,
      children: [
        { href: "/dashboard/customers", label: t.dashboard.allCustomers },
        { href: "/dashboard/customers/new", label: t.dashboard.addCustomer },
        { href: "/dashboard/customers/groups", label: t.dashboard.customerGroups },
        { href: "/dashboard/customers/groups/new", label: t.dashboard.newCustomerGroup },
      ],
    },
    {
      href: "/dashboard/stores",
      label: t.dashboard.stores,
      icon: Store,
      children: [
        { href: "/dashboard/stores", label: t.dashboard.allStores },
        {
          href: stores[0] ? `/dashboard/stores/${stores[0].id}/themes` : "/dashboard/stores",
          label: t.dashboard.themes,
        },
      ],
    },
    {
      href: "/dashboard/reports",
      label: t.dashboard.reports,
      icon: BarChart3,
      children: [
        { href: "/dashboard/reports?tab=customers", label: t.dashboard.salesByCustomer },
        { href: "/dashboard/reports?tab=brands", label: t.dashboard.salesByBrand },
        { href: "/dashboard/reports?tab=profit", label: t.dashboard.monthlyProfitAndCost },
      ],
    },
  ];

  function isActive(href: string): boolean {
    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }
    return pathname.startsWith(href);
  }

  useEffect(() => {
    if (pathname.startsWith("/dashboard/orders")) {
      setOpenSection("/dashboard/orders");
    } else if (pathname.startsWith("/dashboard/products")) {
      setOpenSection("/dashboard/products");
    } else if (pathname.startsWith("/dashboard/procurement")) {
      setOpenSection("/dashboard/procurement");
    } else if (pathname.startsWith("/dashboard/reports")) {
      setOpenSection("/dashboard/reports");
    } else if (pathname.startsWith("/dashboard/customers")) {
      setOpenSection("/dashboard/customers");
    } else if (pathname.startsWith("/dashboard/stores")) {
      setOpenSection("/dashboard/stores");
    }

    setIsMobileMenuOpen(false);
  }, [pathname]);

  function isSectionOpen(href: string) {
    return openSection === href;
  }

  function toggleSection(href: string) {
    setOpenSection((current) => (current === href ? null : href));
  }

  function ReportsSubLink({
    child,
    onNavigate,
  }: {
    child: NavChild;
    onNavigate?: () => void;
  }) {
    const searchParams = useSearchParams();
    const currentTab = searchParams?.get("tab") || "customers";
    const childTab = child.href.includes("tab=") ? child.href.split("tab=")[1] : "customers";
    const childActive = currentTab === childTab;

    return (
      <Link
        href={child.href}
        onClick={() => onNavigate?.()}
        className={`block truncate rounded px-2 py-1.5 text-xs font-semibold tracking-[0.02em] transition border-l-2 ${
          childActive
            ? "border-cyan-600 bg-cyan-50 text-cyan-700"
            : "border-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-700"
        }`}
      >
        {child.label}
      </Link>
    );
  }

  function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
    return (
      <>
        <nav className="flex-1 min-h-0 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);

            return (
              <div key={item.href} className="space-y-1">
                {item.children ? (
                  <div
                    className={`flex items-center rounded px-1 py-1 text-sm font-medium transition border-l-2 ${
                      active
                        ? "border-cyan-600 bg-cyan-50 text-cyan-700"
                        : "border-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                  >
                    <Link
                      href={item.href}
                      onClick={() => {
                        setOpenSection(item.href);
                        onNavigate?.();
                      }}
                      className="flex flex-1 min-w-0 items-center gap-3 px-3 py-1.5"
                    >
                      <Icon className="h-4 w-4 shrink-0 text-current" />
                      <span className="truncate">{item.label}</span>
                    </Link>
                    <button
                      type="button"
                      onClick={() => toggleSection(item.href)}
                      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-500 transition hover:bg-white/80 hover:text-slate-700"
                      aria-label={isSectionOpen(item.href) ? "Hide submenu" : "Show submenu"}
                    >
                      {isSectionOpen(item.href) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </button>
                  </div>
                ) : (
                  <Link
                    href={item.href}
                    onClick={() => onNavigate?.()}
                    className={`flex items-center gap-3 rounded px-4 py-2.5 text-sm font-medium transition border-l-2 ${
                      active
                        ? "border-cyan-600 bg-cyan-50 text-cyan-700"
                        : "border-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0 text-current" />
                    <span className="truncate">{item.label}</span>
                  </Link>
                )}

                {item.children && isSectionOpen(item.href) ? (
                  <div className="ml-5 space-y-1 border-l border-slate-200 pl-2">
                    {item.children.map((child) => {
                      if (item.href === "/dashboard/reports") {
                        return (
                          <Suspense
                            key={`${child.href}:${child.label}`}
                            fallback={
                              <Link
                                href={child.href}
                                onClick={() => onNavigate?.()}
                                className="block truncate rounded px-2 py-1.5 text-xs font-semibold tracking-[0.02em] transition border-l-2 border-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                              >
                                {child.label}
                              </Link>
                            }
                          >
                            <ReportsSubLink child={child} onNavigate={onNavigate} />
                          </Suspense>
                        );
                      }

                      const childActive =
                        item.href === "/dashboard/orders"
                          ? child.href === "/dashboard/orders/new"
                            ? pathname === "/dashboard/orders/new"
                            : child.href === "/dashboard/orders/pos"
                              ? pathname.startsWith("/dashboard/orders/pos")
                              : pathname === "/dashboard/orders"
                          : item.href === "/dashboard/products"
                            ? child.href === "/dashboard/products/new"
                              ? pathname === "/dashboard/products/new"
                              : child.href === "/dashboard/products/categories"
                                ? pathname === "/dashboard/products/categories"
                                : child.href === "/dashboard/products/brands"
                                  ? pathname === "/dashboard/products/brands"
                                  : pathname === "/dashboard/products"
                            : item.href === "/dashboard/customers"
                              ? child.href === "/dashboard/customers/groups/new"
                                ? pathname === "/dashboard/customers/groups/new"
                                : child.href === "/dashboard/customers/groups"
                                  ? pathname === "/dashboard/customers/groups"
                                  : child.href === "/dashboard/customers/new"
                                    ? pathname === "/dashboard/customers/new"
                                    : pathname === "/dashboard/customers"
                            : item.href === "/dashboard/stores"
                              ? child.label === "Themes"
                                ? pathname.startsWith("/dashboard/stores/") && pathname.endsWith("/themes")
                                : pathname === "/dashboard/stores"
                              : item.href === "/dashboard/tools"
                                ? pathname === child.href
                              : pathname === child.href;

                      return (
                        <Link
                          key={`${child.href}:${child.label}`}
                          href={child.href}
                          onClick={() => onNavigate?.()}
                          className={`block truncate rounded px-2 py-1.5 text-xs font-semibold tracking-[0.02em] transition border-l-2 ${
                            childActive
                              ? "border-cyan-600 bg-cyan-50 text-cyan-700"
                              : "border-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                          }`}
                        >
                          {child.label}
                        </Link>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          })}

          <div className="pt-1">
            <div className="my-2 border-t border-slate-200" />
            <Link
              href="/dashboard/help"
              onClick={() => onNavigate?.()}
              className={`flex items-center gap-3 rounded px-4 py-2.5 text-sm font-medium transition border-l-2 ${
                isHelpActive
                  ? "border-cyan-600 bg-cyan-50 text-cyan-700"
                  : "border-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <CircleHelp className="h-4 w-4 shrink-0 text-current" />
              <span>{t.dashboard.help}</span>
            </Link>
          </div>
        </nav>

        <div className="mt-4 pt-3 border-t border-slate-100 text-left shrink-0">
          <div className="mb-3 flex items-center justify-between rounded-xl border border-slate-200/80 bg-slate-50/80 px-3 py-2 lg:hidden">
            <span className="text-xs font-semibold text-slate-600">
              {language === "es" ? "Idioma" : "Language"}
            </span>
            <LanguageToggle variant="light" />
          </div>
          <p className="text-[10px] font-medium tracking-[0.02em] text-slate-400">
            © {currentYear} Prado Systems. {t.dashboard.rightsReserved}
          </p>
        </div>
      </>
    );
  }

  if (pathname.endsWith("/invoice")) {
    return <>{children}</>;
  }

  return (
    <div
      data-route-kind="dashboard"
      className="min-h-screen bg-[#f8fafc] text-slate-900"
      style={{ colorScheme: "light" }}
    >
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-[#ffffff] backdrop-blur-md print:hidden">
        <div className="mx-auto flex h-14 w-full items-center justify-between px-4 sm:px-6">
          <Link href={currentUser?.isCashier ? "/dashboard/orders/pos" : "/dashboard"} className="inline-flex items-center gap-2.5 transition hover:opacity-85">
            <PradoLogo theme="light" />
          </Link>

          <div className="ml-auto flex items-center gap-3">
            <div className="hidden lg:flex items-center">
              <LanguageToggle variant="light" />
            </div>
            <div className="hidden h-6 w-px bg-slate-200 lg:block" />
            {(() => {
              const merchantName = currentUser?.isCashier && currentUser.cashier?.cashierName
                ? currentUser.cashier.cashierName
                : currentUser?.name || stores[0]?.name || (currentUser?.email ? currentUser.email.split("@")[0] : "Merchant");
              const merchantInitial = merchantName.trim().charAt(0).toUpperCase() || "M";
              const merchantSubtitle = currentUser?.isCashier
                ? (currentUser.cashier?.cashierRole ? `${currentUser.cashier.cashierRole} • ${currentUser.cashier.storeName || "POS"}` : (language === "es" ? "Cajero Autorizado" : "Authorized Cashier"))
                : currentUser?.company || (currentUser?.plan ? `${currentUser.plan} Merchant` : stores[0]?.name ? `${stores[0].name} Store` : "Merchant Store");

              return (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsUserMenuOpen((open) => !open)}
                    className="flex items-center gap-2.5 rounded-xl px-2 py-1 transition hover:bg-slate-100/70 focus:outline-none cursor-pointer"
                    aria-label="User profile menu"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-600 font-bold text-white text-xs shadow-xs ring-2 ring-cyan-600/20">
                      {merchantInitial}
                    </div>
                    <div className="hidden text-left sm:block">
                      <div className="text-xs font-bold text-slate-900 leading-tight">
                        {merchantName}
                      </div>
                      {currentUser?.isCashier ? (
                        <div className="text-[10px] font-medium text-cyan-600 leading-tight">
                          {language === "es" ? "Cajero" : "Cashier"}
                        </div>
                      ) : (currentUser?.verified || currentUser?.authenticated) ? (
                        <div className="text-[10px] font-medium text-slate-400 leading-tight">
                          {t.dashboard.authenticated}
                        </div>
                      ) : null}
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
                      <div className="my-1.5 border-t border-slate-100" />
                      {!currentUser?.isCashier && (
                        <>
                          <Link
                            href="/dashboard/tools"
                            onClick={() => setIsUserMenuOpen(false)}
                            className={`flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-semibold transition ${
                              pathname.startsWith("/dashboard/tools")
                                ? "bg-cyan-50 text-cyan-700"
                                : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                            }`}
                          >
                            <Wrench className={`h-4 w-4 ${pathname.startsWith("/dashboard/tools") ? "text-cyan-700" : "text-slate-500"}`} />
                            <span>{t.dashboard.tools}</span>
                          </Link>
                          <Link
                            href="/dashboard/settings"
                            onClick={() => setIsUserMenuOpen(false)}
                            className={`flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-semibold transition ${
                              pathname.startsWith("/dashboard/settings")
                                ? "bg-cyan-50 text-cyan-700"
                                : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                            }`}
                          >
                            <Settings className={`h-4 w-4 ${pathname.startsWith("/dashboard/settings") ? "text-cyan-700" : "text-slate-500"}`} />
                            <span>{t.dashboard.settings}</span>
                          </Link>
                          <div className="my-1.5 border-t border-slate-100" />
                        </>
                      )}
                      <a
                        href="/api/auth/logout"
                        className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-bold text-cyan-600 transition hover:bg-cyan-50 hover:text-cyan-700"
                      >
                        <LogOut className="h-4 w-4 text-cyan-600" />
                        <span>{t.dashboard.logout}</span>
                      </a>
                    </div>
                  )}
                </div>
              );
            })()}

            {!currentUser?.isCashier && (
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(true)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-600 transition hover:bg-slate-100 lg:hidden cursor-pointer"
                aria-label="Open navigation menu"
              >
                <Menu className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </header>

      {isMobileMenuOpen && !currentUser?.isCashier ? (
        <div className="fixed inset-0 z-50 lg:hidden print:hidden">
          <button
            type="button"
            aria-label="Close navigation menu"
            className="absolute inset-0 bg-slate-950/45"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <aside className="relative flex h-full w-72 max-w-[85vw] flex-col overflow-hidden border-r border-slate-200 bg-[#ffffff] px-4 py-6 shadow-2xl backdrop-blur-xl sm:w-80">
            <div className="mb-4 flex items-center justify-between">
              <Link href="/dashboard" className="inline-flex items-center gap-2.5 transition hover:opacity-85" onClick={() => setIsMobileMenuOpen(false)}>
                <PradoLogo theme="light" />
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
        {!currentUser?.isCashier && (
          <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-64 shrink-0 flex-col overflow-hidden border-r border-slate-200 bg-[#ffffff] px-4 py-6 lg:flex xl:w-72 print:hidden">
            <SidebarContent />
          </aside>
        )}

        <main className={`min-w-0 flex-1 bg-[#f8fafc] px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10 print:bg-white print:p-0 ${currentUser?.isCashier ? "!px-3 !py-4 sm:!px-6" : ""}`}>
          <div
            className={`flex min-w-0 w-full flex-col ${
              pathname === "/dashboard" ||
              pathname.startsWith("/dashboard/stores") ||
              pathname.startsWith("/dashboard/products") ||
              pathname.startsWith("/dashboard/orders") ||
              pathname.startsWith("/dashboard/procurement") ||
              pathname.startsWith("/dashboard/reports") ||
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

      {/* PWA Install Banner */}
      <PwaInstallPrompt />
    </div>
  );
}
