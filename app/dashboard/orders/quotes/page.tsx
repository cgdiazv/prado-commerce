import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { resolveServerActiveStoreId } from "@/lib/server-active-store";
import { QuotesDashboard } from "./quotes-dashboard";

type Props = { searchParams?: Promise<{ storeId?: string }> };

export default async function QuotesPage({ searchParams }: Props) {
  const user = await getCurrentUser();
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  if (!user) {
    return (
      <QuotesDashboard
        initialStores={[]}
        initialQuotes={[]}
        selectedStoreId={null}
        setupError="Could not verify your session."
      />
    );
  }

  let stores: Array<{ id: string; name: string; currency: string }> = [];
  let selectedStoreId: string | null = null;
  let serializedQuotes: Array<{
    id: string;
    storeId: string;
    quoteNumber: number;
    customerEmail: string;
    customerName: string | null;
    customerPhone: string | null;
    status: "DRAFT" | "SENT" | "ACCEPTED" | "REJECTED" | "EXPIRED" | "CONVERTED";
    total: string;
    currency: string;
    validUntil: string | null;
    createdAt: string;
  }> = [];
  let setupError: string | null = null;

  try {
    stores = await prisma.store.findMany({
      where: { ownerUserId: user.id },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, currency: true },
    });
    selectedStoreId = await resolveServerActiveStoreId(
      resolvedSearchParams?.storeId,
      stores,
    );
    const quotes = await prisma.quote.findMany({
      where: selectedStoreId === "ALL"
        ? { storeId: { in: stores.map((store) => store.id) } }
        : selectedStoreId
          ? { storeId: selectedStoreId }
          : { id: "__none__" },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        storeId: true,
        quoteNumber: true,
        customerEmail: true,
        customer: { select: { firstName: true, lastName: true, phone: true } },
        status: true,
        total: true,
        currency: true,
        validUntil: true,
        createdAt: true,
      },
    });

    serializedQuotes = quotes.map((quote) => ({
          ...quote,
          customerName:
            [quote.customer?.firstName, quote.customer?.lastName].filter(Boolean).join(" ") ||
            null,
          customerPhone: quote.customer?.phone ?? null,
          total: quote.total.toString(),
          validUntil: quote.validUntil?.toISOString() ?? null,
          createdAt: quote.createdAt.toISOString(),
        }));
  } catch (error) {
    console.error("[QUOTES_PAGE_ERROR]", error);
    setupError = "Could not load quotes. Make sure the latest database migration has been applied.";
  }

  return (
    <QuotesDashboard
      initialStores={stores}
      initialQuotes={serializedQuotes}
      selectedStoreId={selectedStoreId}
      setupError={setupError}
    />
  );
}
