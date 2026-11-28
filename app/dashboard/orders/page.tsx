import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { resolveServerActiveStoreId } from "@/lib/server-active-store";
import { OrdersDashboard, type Order } from "./orders-dashboard";

type OrdersPageProps = {
  searchParams?: Promise<{
    storeId?: string;
  }>;
};

function resolveCustomerName(order: {
  customer?: { firstName: string | null; lastName: string | null } | null;
  shippingAddress?: unknown;
  billingAddress?: unknown;
}): string | null {
  const fromCustomer = [order.customer?.firstName, order.customer?.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();
  if (fromCustomer) return fromCustomer;

  for (const addr of [order.shippingAddress, order.billingAddress]) {
    if (addr && typeof addr === "object" && !Array.isArray(addr)) {
      const a = addr as { firstName?: unknown; lastName?: unknown; name?: unknown };
      const full = [
        typeof a.firstName === "string" ? a.firstName.trim() : "",
        typeof a.lastName === "string" ? a.lastName.trim() : "",
      ]
        .filter(Boolean)
        .join(" ")
        .trim();
      if (full) return full;
      if (typeof a.name === "string" && a.name.trim()) return a.name.trim();
    }
  }

  return null;
}

export default async function OrdersPage({ searchParams }: OrdersPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const user = await getCurrentUser();

  if (!user) {
    return (
      <OrdersDashboard
        initialStores={[]}
        initialOrders={[]}
        selectedStoreId={null}
        setupError="Could not verify your session. Please sign in again after database connectivity is restored."
      />
    );
  }

  try {
    const stores = await prisma.store.findMany({
      where: {
        OR: [{ ownerUserId: user.id }, { ownerId: user.id }],
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        currency: true,
      },
    });

    const selectedStoreId = await resolveServerActiveStoreId(resolvedSearchParams?.storeId, stores);

    const whereClause =
      selectedStoreId === "ALL"
        ? { storeId: { in: stores.map((s) => s.id) } }
        : selectedStoreId
          ? { storeId: selectedStoreId }
          : null;

    const orders = whereClause
      ? await prisma.order.findMany({
          where: whereClause,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            storeId: true,
            orderNumber: true,
            customerEmail: true,
            customer: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
            status: true,
            paymentStatus: true,
            fulfillmentStatus: true,
            paymentProvider: true,
            paymentMethod: true,
            trackingNumber: true,
            trackingCarrier: true,
            shippedAt: true,
            shippingAddress: true,
            billingAddress: true,
            subtotal: true,
            tax: true,
            shipping: true,
            total: true,
            currency: true,
            createdAt: true,
            items: {
              select: {
                quantity: true,
              },
            },
          },
        })
      : [];

    const serializedOrders: Order[] = orders.map((order) => {
      const itemsCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
      const shippingNum = Number(order.shipping);
      const isPos = order.paymentProvider === "pos";
      const channel = isPos ? "POS" : "Online Store";
      const deliveryMethod = isPos
        ? "In-Store Pickup"
        : shippingNum <= 0
          ? "Free Shipping"
          : "Standard Shipping";
      const deliveryStatus =
        order.fulfillmentStatus === "SHIPPED" || order.status === "COMPLETED"
          ? order.trackingNumber
            ? "In transit"
            : "Delivered"
          : order.trackingNumber
            ? "Tracking added"
            : "";

      return {
        id: order.id,
        storeId: order.storeId,
        orderNumber: order.orderNumber,
        customerEmail: order.customerEmail,
        customerName: resolveCustomerName(order),
        status: order.status,
        paymentStatus: order.paymentStatus,
        fulfillmentStatus: order.fulfillmentStatus,
        channel,
        itemsCount,
        deliveryStatus,
        deliveryMethod,
        tags: [],
        subtotal: order.subtotal.toString(),
        tax: order.tax.toString(),
        shipping: order.shipping.toString(),
        total: order.total.toString(),
        currency: order.currency,
        createdAt: order.createdAt.toISOString(),
      };
    });

    const serializedStores = JSON.parse(JSON.stringify(stores));

    return (
      <OrdersDashboard
        initialStores={serializedStores}
        initialOrders={serializedOrders}
        selectedStoreId={selectedStoreId}
      />
    );
  } catch (error) {
    console.error("[ORDERS_PAGE_DB_ERROR]", error);

    return (
      <OrdersDashboard
        initialStores={[]}
        initialOrders={[]}
        selectedStoreId={null}
        setupError="Could not load orders. Check DATABASE_URL, run migrations, and make sure Postgres is reachable."
      />
    );
  }
}
