import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { QuoteForm } from "./quote-form";

type Props = { searchParams?: Promise<{ storeId?: string }> };

export default async function NewQuotePage({ searchParams }: Props) {
  const user = await getCurrentUser();
  const params = searchParams ? await searchParams : undefined;
  if (!user) return <QuoteForm stores={[]} selectedStoreId={null} setupError="Could not verify your session." />;

  let stores: Array<{ id: string; name: string; currency: string }> = [];
  let selectedStoreId: string | null = null;
  let setupError: string | null = null;

  try {
    stores = await prisma.store.findMany({
      where: { ownerUserId: user.id },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, currency: true },
    });
    selectedStoreId = stores.some((store) => store.id === params?.storeId)
      ? params!.storeId!
      : stores[0]?.id ?? null;
  } catch (error) {
    console.error("[NEW_QUOTE_PAGE_ERROR]", error);
    setupError = "Could not load stores.";
  }

  return <QuoteForm stores={stores} selectedStoreId={selectedStoreId} setupError={setupError} />;
}
