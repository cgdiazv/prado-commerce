import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { PosClientView } from "./pos-client-view";

type PosPageProps = {
  searchParams?: Promise<{
    storeId?: string;
  }>;
};

export default async function PosPage({ searchParams }: PosPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const user = await getCurrentUser();

  if (!user) {
    return (
      <PosClientView
        stores={[]}
        initialStoreId={null}
        userName={null}
        userEmail={null}
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
        customDomain: true,
        logoUrl: true,
        senderEmail: true,
        replyToEmail: true,
        shippingOrigin: true,
      },
    });

    const selectedStoreId = resolvedSearchParams?.storeId ?? stores[0]?.id ?? null;

    return (
      <PosClientView
        stores={stores}
        initialStoreId={selectedStoreId}
        userName={user.name}
        userEmail={user.email}
      />
    );
  } catch (error) {
    console.error("[POS_PAGE_DB_ERROR]", error);

    return (
      <PosClientView
        stores={[]}
        initialStoreId={null}
        userName={user.name}
        userEmail={user.email}
      />
    );
  }
}
