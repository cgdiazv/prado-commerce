import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { QuoteForm } from "../new/quote-form";

type Props = {
  params: Promise<{ id: string }>;
};

function formatDateInput(date: Date | null): string {
  if (!date) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default async function EditQuotePage({ params }: Props) {
  const [{ id }, user] = await Promise.all([params, getCurrentUser()]);

  if (!user) {
    return (
      <QuoteForm
        stores={[]}
        selectedStoreId={null}
        setupError="Could not verify your session."
      />
    );
  }

  const [stores, quote] = await Promise.all([
    prisma.store.findMany({
      where: { ownerUserId: user.id },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, currency: true },
    }),
    prisma.quote.findFirst({
      where: { id, store: { ownerUserId: user.id } },
      include: {
        customer: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
        items: true,
      },
    }),
  ]);

  if (!quote) {
    notFound();
  }

  const initialQuote = {
    id: quote.id,
    quoteNumber: quote.quoteNumber,
    storeId: quote.storeId,
    status: quote.status,
    customer: quote.customer,
    customerEmail: quote.customerEmail,
    currency: quote.currency,
    tax: Number(quote.tax).toFixed(2),
    shipping: Number(quote.shipping).toFixed(2),
    validUntil: formatDateInput(quote.validUntil),
    notes: quote.notes ?? "",
    convertedOrderId: quote.convertedOrderId ?? null,
    items: quote.items.map((item) => ({
      title: item.title,
      price: Number(item.price).toFixed(2),
      quantity: String(item.quantity),
      variantId: item.variantId,
    })),
  };

  return (
    <QuoteForm
      stores={stores}
      selectedStoreId={quote.storeId}
      initialQuote={initialQuote}
    />
  );
}
