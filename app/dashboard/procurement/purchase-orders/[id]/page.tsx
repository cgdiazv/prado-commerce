import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import PODetailClient from "./po-detail-client";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function PurchaseOrderDetailPage({ params }: PageProps) {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <section className="min-w-0 space-y-6">
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Could not verify your session. Please sign in again.
        </div>
      </section>
    );
  }

  const { id } = await params;

  let purchaseOrder: any = null;

  try {
    purchaseOrder = (prisma as any).purchaseOrder
      ? await (prisma as any).purchaseOrder.findFirst({
          where: {
            id,
            store: {
              OR: [{ ownerUserId: user.id }, { ownerId: user.id }],
            },
          },
          include: {
            store: { select: { id: true, name: true, currency: true, logoUrl: true, senderEmail: true, shippingOrigin: true } },
            vendor: true,
            items: {
              include: {
                variant: {
                  select: { id: true, sku: true, title: true, inventory: true, product: { select: { id: true, title: true } } },
                },
              },
            },
            receipts: {
              orderBy: { receivedAt: "desc" },
              include: {
                items: {
                  include: {
                    poItem: true,
                  },
                },
              },
            },
          },
        })
      : null;
  } catch (error) {
    console.error("[PO_DETAIL_PAGE_QUERY_ERROR]", error);
  }

  if (!purchaseOrder) {
    notFound();
  }

  const serializedPO = JSON.parse(JSON.stringify(purchaseOrder));

  return (
    <PODetailClient
      initialPO={serializedPO}
      currentUser={{ name: user.name || null, email: user.email || null }}
    />
  );
}
