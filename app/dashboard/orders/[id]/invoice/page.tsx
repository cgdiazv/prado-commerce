import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { InvoiceDocument, type InvoiceOrder } from "./invoice-document";

type InvoicePageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams?: Promise<{
    autoPrint?: string;
  }>;
};

export default async function OrderInvoicePage({
  params,
  searchParams,
}: InvoicePageProps) {
  const { id } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const user = await getCurrentUser();

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-slate-800">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800 max-w-md text-center">
          Could not verify your session. Please sign in to view this invoice.
        </div>
      </div>
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
      store: true,
      customer: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phone: true,
          group: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });

  if (!order) {
    notFound();
  }

  const serializedOrder: InvoiceOrder = JSON.parse(
    JSON.stringify({
      id: order.id,
      orderNumber: order.orderNumber,
      customerEmail: order.customerEmail,
      status: order.status,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      fulfillmentStatus: order.fulfillmentStatus,
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
        logoUrl: order.store.logoUrl ?? null,
        senderEmail: order.store.senderEmail ?? null,
        shippingOrigin: order.store.shippingOrigin ?? null,
        customDomain: order.store.customDomain ?? null,
        slug: order.store.slug ?? "",
        invoiceFooterText: order.store.invoiceFooterText ?? null,
        invoicePrefix: order.store.invoicePrefix ?? "INV-",
      },
      customer: order.customer
        ? {
            id: order.customer.id,
            firstName: order.customer.firstName,
            lastName: order.customer.lastName,
            phone: order.customer.phone,
            group: order.customer.group ? { name: order.customer.group.name } : null,
          }
        : null,
    })
  );

  return (
    <InvoiceDocument
      order={serializedOrder}
      autoPrint={resolvedSearchParams?.autoPrint === "true"}
    />
  );
}
