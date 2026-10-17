import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { DashboardSummaryView } from "./dashboard-summary-view";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const currentPlan = user?.plan ?? "STARTER";
  const isStarter = currentPlan === "STARTER";

  let totalRevenue = 0;
  let totalOrders = 0;
  let totalProducts = 0;
  let totalStores = 0;
  let baseCurrency = "USD";
  let dashboardError: string | null =
    user === null
      ? "Could not verify your session. Please sign in again after database connectivity is restored."
      : null;

  const currentYear = new Date().getFullYear();
  const monthlySales = Array.from({ length: 12 }, (_, i) => ({
    monthIndex: i,
    revenue: 0,
    orderCount: 0,
  }));

  if (user) {
    try {
      const stores = await prisma.store.findMany({
        where: { ownerUserId: user.id },
        select: { id: true, currency: true },
      });

      totalStores = stores.length;

      if (stores.length > 0) {
        baseCurrency = stores[0].currency;
        const storeIds = stores.map((s) => s.id);

        const products = await prisma.product.findMany({
          where: { storeId: { in: storeIds } },
          select: { id: true },
        });

        totalProducts = products.length;

        const orders = await prisma.order.findMany({
          where: { storeId: { in: storeIds } },
          select: { total: true, status: true, createdAt: true },
        });

        totalOrders = orders.length;
        orders.forEach((order) => {
          if (order.status === "CANCELLED") return;
          const orderTotal = Number(order.total) || 0;
          totalRevenue += orderTotal;

          const orderDate = new Date(order.createdAt);
          if (orderDate.getFullYear() === currentYear) {
            const m = orderDate.getMonth();
            if (m >= 0 && m < 12) {
              monthlySales[m].revenue += orderTotal;
              monthlySales[m].orderCount += 1;
            }
          }
        });
      }
    } catch (error) {
      console.error("[DASHBOARD_PAGE_DB_ERROR]", error);
      dashboardError =
        "Could not load dashboard data. Check DATABASE_URL, run migrations, and make sure Postgres is reachable.";
    }
  }

  return (
    <DashboardSummaryView
      totalStores={totalStores}
      totalProducts={totalProducts}
      totalRevenue={totalRevenue}
      totalOrders={totalOrders}
      baseCurrency={baseCurrency}
      currentPlan={currentPlan}
      isStarter={isStarter}
      dashboardError={dashboardError}
      monthlySales={monthlySales}
      year={currentYear}
    />
  );
}
