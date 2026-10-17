import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import ReportsDashboardClient, {
  BrandReportItem,
  CustomerReportItem,
  ReportSummary,
} from "./reports-dashboard-client";

export default async function ReportsPage() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <section className="min-w-0 space-y-6">
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Could not verify your session. Please sign in again.
        </div>
      </section>
    );
  }

  const stores = await prisma.store.findMany({
    where: {
      OR: [{ ownerUserId: user.id }, { ownerId: user.id }],
    },
    select: { id: true, name: true, currency: true },
    orderBy: { createdAt: "asc" },
  });

  const storeIds = stores.map((s) => s.id);

  if (storeIds.length === 0) {
    return (
      <ReportsDashboardClient
        initialCustomers={[]}
        initialBrands={[]}
        initialSummary={{
          totalRevenue: 0,
          totalOrdersCount: 0,
          averageOrderValue: 0,
          uniqueCustomers: 0,
          uniqueBrands: 0,
          monthlyBreakdown: [],
        }}
        stores={[]}
        availableYears={[new Date().getFullYear().toString()]}
      />
    );
  }

  const rawOrders = await prisma.order.findMany({
    where: {
      storeId: { in: storeIds },
      status: { not: "CANCELLED" },
    },
    include: {
      store: { select: { id: true, name: true, currency: true } },
      customer: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
        },
      },
      items: {
        include: {
          variant: {
            select: {
              id: true,
              productId: true,
              product: {
                select: {
                  id: true,
                  title: true,
                  manufacturer: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // 1. Customer Sales Breakdown (Anual por cliente)
  const customerMap = new Map<string, CustomerReportItem>();

  for (const order of rawOrders) {
    const email = order.customerEmail.toLowerCase().trim();
    const orderTotal = Number(order.total);
    const orderYear = new Date(order.createdAt).getFullYear().toString();
    const orderDateStr = order.createdAt.toISOString();

    let record = customerMap.get(email);
    if (!record) {
      const name =
        [order.customer?.firstName, order.customer?.lastName].filter(Boolean).join(" ") ||
        order.customerEmail.split("@")[0];

      record = {
        customerId: order.customerId || email,
        customerName: name,
        customerEmail: order.customerEmail,
        customerPhone: order.customer?.phone || null,
        storeName: order.store.name,
        totalSpent: 0,
        totalOrders: 0,
        firstOrderDate: orderDateStr,
        lastOrderDate: orderDateStr,
        annualSales: {},
        orders: [],
      };
      customerMap.set(email, record);
    }

    record.totalSpent = Number((record.totalSpent + orderTotal).toFixed(2));
    record.totalOrders += 1;

    if (new Date(orderDateStr) > new Date(record.lastOrderDate)) {
      record.lastOrderDate = orderDateStr;
    }
    if (new Date(orderDateStr) < new Date(record.firstOrderDate)) {
      record.firstOrderDate = orderDateStr;
    }

    if (!record.annualSales[orderYear]) {
      record.annualSales[orderYear] = { totalSpent: 0, orderCount: 0 };
    }
    record.annualSales[orderYear].totalSpent = Number(
      (record.annualSales[orderYear].totalSpent + orderTotal).toFixed(2)
    );
    record.annualSales[orderYear].orderCount += 1;

    record.orders.push({
      id: order.id,
      orderNumber: String(order.orderNumber),
      date: orderDateStr,
      total: orderTotal,
      currency: order.currency,
      paymentStatus: order.paymentStatus,
      fulfillmentStatus: order.fulfillmentStatus,
      itemsCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
    });
  }

  const customersResult = Array.from(customerMap.values()).sort(
    (a, b) => b.totalSpent - a.totalSpent
  );

  // 2. Brand Sales Breakdown (Ventas por marcas)
  const brandMap = new Map<string, {
    brand: string;
    unitsSold: number;
    totalRevenue: number;
    orderCount: number;
    productMap: Map<string, { title: string; units: number; revenue: number }>;
  }>();

  let grandTotalRevenue = 0;

  for (const order of rawOrders) {
    const orderBrandsSeen = new Set<string>();

    for (const item of order.items) {
      const brandRaw = item.variant?.product?.manufacturer?.trim();
      const brand = brandRaw && brandRaw.length > 0 ? brandRaw : "Genérico / Sin marca";
      const itemRevenue = Number(item.price) * item.quantity;
      grandTotalRevenue += itemRevenue;

      let brandRecord = brandMap.get(brand);
      if (!brandRecord) {
        brandRecord = {
          brand,
          unitsSold: 0,
          totalRevenue: 0,
          orderCount: 0,
          productMap: new Map(),
        };
        brandMap.set(brand, brandRecord);
      }

      brandRecord.unitsSold += item.quantity;
      brandRecord.totalRevenue = Number((brandRecord.totalRevenue + itemRevenue).toFixed(2));

      if (!orderBrandsSeen.has(brand)) {
        orderBrandsSeen.add(brand);
        brandRecord.orderCount += 1;
      }

      const prodTitle = item.variant?.product?.title || item.title;
      let prodStat = brandRecord.productMap.get(prodTitle);
      if (!prodStat) {
        prodStat = { title: prodTitle, units: 0, revenue: 0 };
        brandRecord.productMap.set(prodTitle, prodStat);
      }
      prodStat.units += item.quantity;
      prodStat.revenue = Number((prodStat.revenue + itemRevenue).toFixed(2));
    }
  }

  const brandsResult: BrandReportItem[] = Array.from(brandMap.values())
    .map((b) => {
      const topProducts = Array.from(b.productMap.values())
        .sort((x, y) => y.revenue - x.revenue)
        .slice(0, 5);

      const percentage = grandTotalRevenue > 0
        ? Number(((b.totalRevenue / grandTotalRevenue) * 100).toFixed(1))
        : 0;

      return {
        brand: b.brand,
        unitsSold: b.unitsSold,
        totalRevenue: b.totalRevenue,
        orderCount: b.orderCount,
        percentage,
        topProducts,
      };
    })
    .sort((a, b) => b.totalRevenue - a.totalRevenue);

  // 3. Summary metrics
  const totalRevenue = Number(
    rawOrders.reduce((sum, o) => sum + Number(o.total), 0).toFixed(2)
  );
  const totalOrdersCount = rawOrders.length;
  const averageOrderValue = totalOrdersCount > 0
    ? Number((totalRevenue / totalOrdersCount).toFixed(2))
    : 0;

  const monthlyMap = new Map<string, { month: string; revenue: number; orders: number }>();
  for (const order of rawOrders) {
    const d = new Date(order.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    let m = monthlyMap.get(key);
    if (!m) {
      m = { month: key, revenue: 0, orders: 0 };
      monthlyMap.set(key, m);
    }
    m.revenue = Number((m.revenue + Number(order.total)).toFixed(2));
    m.orders += 1;
  }

  const monthlyBreakdown = Array.from(monthlyMap.values()).sort((a, b) =>
    a.month.localeCompare(b.month)
  );

  const availableYearsSet = new Set<string>();
  for (const order of rawOrders) {
    availableYearsSet.add(new Date(order.createdAt).getFullYear().toString());
  }
  const currentYear = new Date().getFullYear().toString();
  availableYearsSet.add(currentYear);
  const availableYears = Array.from(availableYearsSet).sort().reverse();

  const summary: ReportSummary = {
    totalRevenue,
    totalOrdersCount,
    averageOrderValue,
    uniqueCustomers: customerMap.size,
    uniqueBrands: brandMap.size,
    monthlyBreakdown,
  };

  return (
    <ReportsDashboardClient
      initialCustomers={customersResult}
      initialBrands={brandsResult}
      initialSummary={summary}
      stores={JSON.parse(JSON.stringify(stores))}
      availableYears={availableYears}
    />
  );
}
