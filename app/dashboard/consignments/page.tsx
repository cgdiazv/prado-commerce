import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { Boxes } from "lucide-react";
import { ConsignmentsClient } from "./consignments-client";

export default async function ConsignmentsPage() {
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

  const rawStores = await prisma.store.findMany({
    where: {
      OR: [{ ownerUserId: user.id }, { ownerId: user.id }],
    },
    select: { id: true, name: true, currency: true },
  });

  const stores = JSON.parse(JSON.stringify(rawStores));
  const storeIds = stores.map((s: any) => s.id);

  if (storeIds.length === 0) {
    return (
      <section className="min-w-0 space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
          <Boxes className="mx-auto h-12 w-12 text-slate-300" />
          <h3 className="mt-3 text-sm font-semibold text-slate-900">No stores found</h3>
          <p className="mt-1 text-xs text-slate-500">
            Create a store first to begin managing consignments.
          </p>
        </div>
      </section>
    );
  }

  let consignments: any[] = [];
  try {
    if ((prisma as any).consignment) {
      const rawConsignments = await (prisma as any).consignment.findMany({
        where: {
          storeId: { in: storeIds },
        },
        include: {
          store: { select: { id: true, name: true, currency: true } },
          items: true,
          settlements: {
            orderBy: { date: "desc" },
          },
        },
        orderBy: { createdAt: "desc" },
      });
      consignments = JSON.parse(JSON.stringify(rawConsignments));
    }
  } catch (error) {
    console.error("Error loading consignments:", error);
  }

  return (
    <section className="min-w-0 space-y-6">
      <ConsignmentsClient
        initialConsignments={consignments}
        stores={stores}
      />
    </section>
  );
}
