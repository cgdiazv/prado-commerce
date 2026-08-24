import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { OrdersDashboard } from "./orders-dashboard";

type OrdersPageProps = {
  searchParams?: Promise<{
    storeId?: string;
  }>;
};

type OrderRecord = {
  id: string;
  storeId: string;
  orderNumber: number;
  customerEmail: string;
  customerName: string | null;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "CANCELLED";
  paymentStatus: "UNPAID" | "PAID" | "REFUNDED" | "FAILED";
  subtotal: string;
  tax: string;
  shipping: string;
  total: string;
  currency: string;
  createdAt: string;
};

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
      where: { ownerUserId: user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        currency: true,
      },
    });

    const selectedStoreId = resolvedSearchParams?.storeId ?? stores[0]?.id ?? null;

    const orders = selectedStoreId
      ? await prisma.order.findMany({
          where: { storeId: selectedStoreId },
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
            subtotal: true,
            tax: true,
            shipping: true,
            total: true,
            currency: true,
            createdAt: true,
          },
        })
      : [];

    const serializedOrders = JSON.parse(
      JSON.stringify(
        orders.map((order) => ({
          id: order.id,
          storeId: order.storeId,
          orderNumber: order.orderNumber,
          customerEmail: order.customerEmail,
          customerName: [order.customer?.firstName, order.customer?.lastName].filter(Boolean).join(" ") || null,
          status: order.status,
          paymentStatus: order.paymentStatus,
          subtotal: order.subtotal.toString(),
          tax: order.tax.toString(),
          shipping: order.shipping.toString(),
          total: order.total.toString(),
          currency: order.currency,
          createdAt: order.createdAt.toISOString(),
        }))
      )
    );

    const serializedStores = JSON.parse(JSON.stringify(stores));

    return (
      <OrdersDashboard
        initialStores={serializedStores}
        initialOrders={serializedOrders as OrderRecord[]}
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
