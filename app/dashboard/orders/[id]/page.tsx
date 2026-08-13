import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import OrderDetailClient from "./order-detail-client";

type OrderPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function OrderDetailPage({ params }: OrderPageProps) {
  const { id } = await params;
  const user = await getCurrentUser();

  if (!user) {
    return (
      <section className="min-w-0 space-y-6">
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Could not verify your session. Please sign in again after database connectivity is restored.
        </div>
      </section>
    );
  }

  const order = await prisma.order.findFirst({
    where: {
      id,
      store: {
        ownerUserId: user.id,
      },
    },
    include: {
      items: true,
      store: {
        select: {
          name: true,
          currency: true,
        },
      },
    },
  });

  if (!order) {
    notFound();
  }

  const serializedOrder = {
    id: order.id,
    orderNumber: order.orderNumber,
    customerEmail: order.customerEmail,
    status: order.status,
    paymentStatus: order.paymentStatus,
    fulfillmentStatus: order.fulfillmentStatus,
    trackingNumber: order.trackingNumber,
    trackingCarrier: order.trackingCarrier,
    trackingUrl: order.trackingUrl,
    shippedAt: order.shippedAt?.toISOString() ?? null,
    shipStationOrderId: order.shipStationOrderId,
    shipStationSyncedAt: order.shipStationSyncedAt?.toISOString() ?? null,
    shipStationSyncError: order.shipStationSyncError,
    subtotal: order.subtotal.toString(),
    tax: order.tax.toString(),
    shipping: order.shipping.toString(),
    total: order.total.toString(),
    currency: order.currency,
    shippingAddress: order.shippingAddress,
    billingAddress: order.billingAddress,
    createdAt: order.createdAt.toISOString(),
    items: order.items.map((item) => ({
      id: item.id,
      title: item.title,
      price: item.price.toString(),
      quantity: item.quantity,
    })),
    store: {
      name: order.store.name,
      currency: order.store.currency,
    },
  };

  return <OrderDetailClient initialOrder={serializedOrder} />;
}
