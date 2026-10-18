import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, getCurrentCashier, getCurrentCashierFromRequest } from "@/lib/session";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  const cashier = (await getCurrentCashier()) ?? getCurrentCashierFromRequest(request);

  if (!user && !cashier) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "all"; // 'customers' | 'brands' | 'summary' | 'all'
  const storeIdParam = searchParams.get("storeId");
  const yearParam = searchParams.get("year");
  const fromDateParam = searchParams.get("fromDate");
  const toDateParam = searchParams.get("toDate");

  if (cashier && storeIdParam && storeIdParam !== cashier.storeId) {
    return NextResponse.json(
      { error: "Forbidden: You are not authorized to view reports for other stores." },
      { status: 403 },
    );
  }

  try {
    const userStores = await prisma.store.findMany({
      where: cashier
        ? { id: cashier.storeId }
        : {
            OR: [{ ownerUserId: user!.id }, { ownerId: user!.id }],
          },
      select: { id: true, name: true, currency: true },
      orderBy: { createdAt: "asc" },
    });

    const storeIds = userStores.map((s) => s.id);
    if (storeIds.length === 0) {
      return NextResponse.json({
        stores: [],
        customers: [],
        brands: [],
        summary: null,
      });
    }

    const targetStoreIds = cashier
      ? [cashier.storeId]
      : storeIdParam && storeIds.includes(storeIdParam)
        ? [storeIdParam]
        : storeIds;

    const dateFilter: { gte?: Date; lte?: Date } = {};
    if (yearParam && yearParam !== "ALL") {
      const year = parseInt(yearParam, 10);
      if (!isNaN(year)) {
        dateFilter.gte = new Date(year, 0, 1);
        dateFilter.lte = new Date(year, 11, 31, 23, 59, 59, 999);
      }
    } else {
      if (fromDateParam) {
        const d = new Date(fromDateParam);
        if (!isNaN(d.getTime())) dateFilter.gte = d;
      }
      if (toDateParam) {
        const d = new Date(toDateParam);
        if (!isNaN(d.getTime())) {
          d.setHours(23, 59, 59, 999);
          dateFilter.lte = d;
        }
      }
    }

    // Fetch all non-cancelled orders for these stores
    const orders = await prisma.order.findMany({
      where: {
        storeId: { in: targetStoreIds },
        status: { not: "CANCELLED" },
        ...(Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {}),
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
    const customerMap = new Map<string, {
      customerId: string;
      customerName: string;
      customerEmail: string;
      customerPhone: string | null;
      storeName: string;
      totalSpent: number;
      totalOrders: number;
      firstOrderDate: string;
      lastOrderDate: string;
      annualSales: Record<string, { totalSpent: number; orderCount: number }>;
      orders: Array<{
        id: string;
        orderNumber: string;
        date: string;
        total: number;
        currency: string;
        paymentStatus: string;
        fulfillmentStatus: string;
        itemsCount: number;
      }>;
    }>();

    for (const order of orders) {
      const email = order.customerEmail.toLowerCase().trim();
      const orderTotal = Number(order.total);
      const orderYear = new Date(order.createdAt).getFullYear().toString();
      const orderDateStr = order.createdAt.toISOString();

      let record = customerMap.get(email);
      if (!record) {
        const name = [order.customer?.firstName, order.customer?.lastName].filter(Boolean).join(" ") ||
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

    for (const order of orders) {
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

    const brandsResult = Array.from(brandMap.values())
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
      orders.reduce((sum, o) => sum + Number(o.total), 0).toFixed(2)
    );
    const totalOrdersCount = orders.length;
    const averageOrderValue = totalOrdersCount > 0
      ? Number((totalRevenue / totalOrdersCount).toFixed(2))
      : 0;

    // Monthly breakdown for charting
    const monthlyMap = new Map<string, { month: string; revenue: number; orders: number }>();
    for (const order of orders) {
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

    // Available years for dropdown
    const availableYearsSet = new Set<string>();
    for (const order of orders) {
      availableYearsSet.add(new Date(order.createdAt).getFullYear().toString());
    }
    const currentYear = new Date().getFullYear().toString();
    availableYearsSet.add(currentYear);
    const availableYears = Array.from(availableYearsSet).sort().reverse();

    return NextResponse.json({
      stores: userStores,
      availableYears,
      summary: {
        totalRevenue,
        totalOrdersCount,
        averageOrderValue,
        uniqueCustomers: customerMap.size,
        uniqueBrands: brandMap.size,
        monthlyBreakdown,
      },
      customers: type === "brands" ? [] : customersResult,
      brands: type === "customers" ? [] : brandsResult,
    });
  } catch (error) {
    console.error("[REPORTS_GET_ERROR]", error);
    return NextResponse.json({ error: "Failed to generate sales report" }, { status: 500 });
  }
}
