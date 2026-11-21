import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { QuoteDocument } from "./quote-document";

type Props = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ autoPrint?: string }>;
};

export default async function QuotePrintPage({ params, searchParams }: Props) {
  const [{ id }, query, user] = await Promise.all([
    params,
    searchParams ?? Promise.resolve(undefined),
    getCurrentUser(),
  ]);
  if (!user) notFound();

  const quote = await prisma.quote.findFirst({
    where: { id, store: { ownerUserId: user.id } },
    include: {
      items: true,
      customer: { select: { firstName: true, lastName: true, phone: true } },
      store: {
        select: {
          name: true,
          logoUrl: true,
          senderEmail: true,
          shippingOrigin: true,
          currency: true,
        },
      },
    },
  });
  if (!quote) notFound();

  return (
    <QuoteDocument
      autoPrint={query?.autoPrint === "true"}
      quote={{
        id: quote.id,
        quoteNumber: quote.quoteNumber,
        customerEmail: quote.customerEmail,
        customer: quote.customer,
        status: quote.status,
        subtotal: quote.subtotal.toString(),
        tax: quote.tax.toString(),
        shipping: quote.shipping.toString(),
        total: quote.total.toString(),
        currency: quote.currency,
        notes: quote.notes,
        validUntil: quote.validUntil?.toISOString() ?? null,
        createdAt: quote.createdAt.toISOString(),
        items: quote.items.map((item) => ({
          id: item.id,
          title: item.title,
          price: item.price.toString(),
          quantity: item.quantity,
        })),
        store: quote.store,
      }}
    />
  );
}
