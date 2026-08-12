import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { DollarSign, ShoppingCart, TrendingUp, Store } from "lucide-react";


export default async function DashboardPage() {
  const user = await getCurrentUser();
  const currentPlan = user?.plan ?? "STARTER";
  const isStarter = currentPlan === "STARTER";

  let totalRevenue = 0;
  let totalOrders = 0;
  let totalProducts = 0;
  let totalStores = 0;
  let dashboardError: string | null =
    user === null
      ? "Could not verify your session. Please sign in again after database connectivity is restored."
      : null;

  if (user) {
    try {
    const stores = await prisma.store.findMany({
      where: { ownerUserId: user.id },
      select: { id: true },
    });

    totalStores = stores.length;

      if (stores.length > 0) {
      const storeIds = stores.map((s) => s.id);

      const products = await prisma.product.findMany({
        where: { storeId: { in: storeIds } },
        select: { id: true },
      });

      totalProducts = products.length;

      const orders = await prisma.order.findMany({
        where: { storeId: { in: storeIds } },
        select: { total: true, status: true },
      });

      totalOrders = orders.length;
      totalRevenue = orders
        .filter((order) => order.status !== "CANCELLED")
        .reduce((sum, order) => sum + Number(order.total), 0);
      }
    } catch (error) {
      console.error("[DASHBOARD_PAGE_DB_ERROR]", error);
      dashboardError =
        "Could not load dashboard data. Check DATABASE_URL, run migrations, and make sure Postgres is reachable.";
    }
  }

  const summaryCards = [
    {
      label: "Total Stores",
      value: totalStores.toString(),
      icon: Store,
      color: "cyan",
    },
    {
      label: "Total Products",
      value: totalProducts.toString(),
      icon: ShoppingCart,
      color: "blue",
    },
    {
      label: "Total Revenue",
      value: `$${totalRevenue.toFixed(2)}`,
      icon: DollarSign,
      color: "green",
    },
    {
      label: "Total Orders",
      value: totalOrders.toString(),
      icon: TrendingUp,
      color: "purple",
    },
  ];

  return (
    <section>
      {dashboardError ? (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {dashboardError}
        </div>
      ) : null}

      <div className="space-y-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
              Overview
            </p>
            <span className="inline-flex rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-cyan-700">
              {currentPlan}
            </span>
          </div>
          <h1 className="mt-4 text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">
            E-Commerce & Storefront Management Console
          </h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-slate-600 sm:text-lg">
            Unified control plane for managing your stores, products, sales channels, and customer orders.
          </p>
        </div>

        {isStarter ? (
          <div className="rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm text-cyan-800">
            You are on the Starter plan: 1 store, up to 50 products per store, and no custom domains.
            Upgrade to Prado Commerce Pro to unlock more growth capacity.
          </div>
        ) : null}

        <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {summaryCards.map((card) => {
            const Icon = card.icon;
            const colorClasses: Record<string, string> = {
              cyan: "bg-cyan-50 text-cyan-700 border-cyan-200",
              blue: "bg-blue-50 text-blue-700 border-blue-200",
              green: "bg-green-50 text-green-700 border-green-200",
              purple: "bg-purple-50 text-purple-700 border-purple-200",
            };

            return (
              <div
                key={card.label}
                className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md"
              >
                <div
                  className={`inline-flex rounded-lg border p-2 ${
                    colorClasses[card.color] || colorClasses.cyan
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <p className="mt-4 text-sm font-medium text-slate-600">
                  {card.label}
                </p>
                <p className="mt-2 text-3xl font-semibold text-slate-950">
                  {card.value}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
