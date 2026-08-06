"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ChevronDown, ChevronRight, Home, Store, Package, ShoppingCart, Users, Settings, CircleHelp, Menu, X, Bell, LogOut } from "lucide-react";

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
  const [isStoresOpen, setIsStoresOpen] = useState(pathname.startsWith("/dashboard/stores"));
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const isHelpActive = pathname.startsWith("/dashboard/help");

  const [stores, setStores] = useState<{ id: string; name: string }[]>([]);
  const [knownOrderIds, setKnownOrderIds] = useState<Set<string>>(new Set());
  const [isInitialized, setIsInitialized] = useState(false);
  const [notifications, setNotifications] = useState<{
    id: string;
    title: string;
    message: string;
    time: string;
    read: boolean;
    orderId: string;
  }[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [toast, setToast] = useState<{ id: string; title: string; message: string } | null>(null);

  function showToast(newToast: { id: string; title: string; message: string }) {
    setToast(newToast);
    setTimeout(() => {
      setToast((current) => (current?.id === newToast.id ? null : current));
    }, 6000);
  }

  function markAsRead(notificationId: string) {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
    );
  }

  function markAllAsRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

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
            setNotifications((prev) => {
              const added = newOrders.map((order) => ({
                id: Math.random().toString(),
                title: "New Order Received!",
                message: `Order #${order.orderNumber} of ${order.currency} ${order.total} placed at ${order.storeName}`,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                read: false,
                orderId: order.id,
              }));
              return [...added, ...prev];
            });

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

    setIsMobileMenuOpen(false);
  }, [pathname]);

  function isSectionOpen(href: string) {
    if (href === "/dashboard/products") {
      return isProductsOpen;
    }

    if (href === "/dashboard/stores") {
      return isStoresOpen;
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
                      <Icon className="h-4 w-4 shrink-0" />
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
                    <Icon className="h-4 w-4 shrink-0" />
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
        </nav>

        <div className="mt-6 border-t border-slate-200 pt-3 text-left">
          <a
            href="/dashboard/help"
            onClick={() => onNavigate?.()}
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
      </>
    );
  }

  return (
    <div
      data-route-kind="dashboard"
      className="min-h-screen bg-[#f8fafc] text-slate-900"
      style={{ colorScheme: "light" }}
    >
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-[#ffffff] backdrop-blur-md">
        <div className="mx-auto flex h-14 w-full items-center justify-between px-6">
          <a href="/dashboard" className="flex items-center gap-2">
            <img src="/logo_dash.webp" alt="Prado Commerce" className="h-4 w-auto" />
          </a>

          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            {/* Notification Bell with Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsDropdownOpen((open) => !open)}
                className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
                aria-label="View notifications"
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-rose-500 text-[8px] font-bold text-white ring-2 ring-white animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Glassmorphic Dropdown */}
              {isDropdownOpen && (
                <div 
                  className="fixed left-1/2 top-16 z-50 w-[calc(100vw-1.5rem)] max-w-sm -translate-x-1/2 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-xl backdrop-blur-md transition-all sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-96 sm:max-w-none sm:translate-x-0"
                  onMouseLeave={() => setIsDropdownOpen(false)}
                >
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <h3 className="text-sm font-semibold text-slate-900">Notifications</h3>
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={markAllAsRead}
                        className="text-xs font-semibold text-cyan-600 hover:text-cyan-700 transition"
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>

                  <div className="mt-3 max-h-64 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                    {notifications.length === 0 ? (
                      <div className="py-6 text-center text-sm text-slate-400">
                        No notifications yet.
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => {
                            markAsRead(n.id);
                            setIsDropdownOpen(false);
                            window.location.href = "/dashboard/orders";
                          }}
                          className={`flex flex-col gap-1 rounded-xl p-3 cursor-pointer border text-left transition ${
                            n.read
                              ? "bg-slate-50/50 border-slate-100/50 text-slate-600"
                              : "bg-cyan-50/20 border-cyan-100/40 hover:bg-cyan-50/40 text-slate-900"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-semibold text-xs text-slate-800">{n.title}</span>
                            <span className="text-[10px] text-slate-400 whitespace-nowrap">{n.time}</span>
                          </div>
                          <p className="text-xs text-slate-600 leading-normal">{n.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <a
              href="/api/auth/logout"
              aria-label="Sign out"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 sm:h-auto sm:w-auto sm:gap-2 sm:px-4 sm:py-1.5"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden text-xs font-semibold sm:inline">Sign out</span>
            </a>
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
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation menu"
            className="absolute inset-0 bg-slate-950/45"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <aside className="relative flex h-full w-72 max-w-[85vw] flex-col overflow-hidden border-r border-slate-200 bg-[#ffffff] px-4 py-6 shadow-2xl backdrop-blur-xl">
            <div className="mb-4 flex items-center justify-between">
              <a href="/dashboard" className="flex items-center gap-2" onClick={() => setIsMobileMenuOpen(false)}>
                <img src="/logo_dash.webp" alt="Prado Commerce" className="h-4 w-auto" />
              </a>
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

      <div className="flex min-h-[calc(100vh-3.5rem)] bg-[#f8fafc]">
        <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-48 shrink-0 flex-col overflow-hidden border-r border-slate-200 bg-[#ffffff] px-4 py-6 lg:flex">
          <SidebarContent />
        </aside>

        <main className="min-w-0 flex-1 bg-[#f8fafc] px-6 py-10 lg:px-10">
          <div
            className={`flex min-w-0 w-full flex-col ${
              pathname === "/dashboard" ||
              pathname.startsWith("/dashboard/stores") ||
              pathname.startsWith("/dashboard/products") ||
              pathname.startsWith("/dashboard/orders") ||
              pathname.startsWith("/dashboard/customers")
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
