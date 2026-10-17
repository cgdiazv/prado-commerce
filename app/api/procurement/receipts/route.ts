import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const storeIdParam = searchParams.get("storeId");
  const poIdParam = searchParams.get("poId");
  const search = searchParams.get("search")?.trim().toLowerCase();
  const fromDate = searchParams.get("fromDate");
  const toDate = searchParams.get("toDate");

  try {
    const userStores = await prisma.store.findMany({
      where: { OR: [{ ownerUserId: user.id }, { ownerId: user.id }] },
      select: { id: true, name: true, currency: true },
    });
    const storeIds = userStores.map((s) => s.id);

    if (storeIds.length === 0 || !(prisma as any).purchaseReceipt) {
      return NextResponse.json({ receipts: [], stores: userStores });
    }

    const targetStoreIds = storeIdParam && storeIds.includes(storeIdParam) ? [storeIdParam] : storeIds;

    const dateFilter: { gte?: Date; lte?: Date } = {};
    if (fromDate) {
      const parsed = new Date(fromDate);
      if (!isNaN(parsed.getTime())) {
        dateFilter.gte = parsed;
      }
    }
    if (toDate) {
      const parsed = new Date(toDate);
      if (!isNaN(parsed.getTime())) {
        parsed.setHours(23, 59, 59, 999);
        dateFilter.lte = parsed;
      }
    }

    const receipts = await (prisma as any).purchaseReceipt.findMany({
      where: {
        storeId: { in: targetStoreIds },
        ...(poIdParam ? { poId: poIdParam } : {}),
        ...(Object.keys(dateFilter).length > 0 ? { receivedAt: dateFilter } : {}),
        ...(search
          ? {
              OR: [
                { purchaseOrder: { poNumber: { contains: search, mode: "insensitive" } } },
                { purchaseOrder: { vendor: { name: { contains: search, mode: "insensitive" } } } },
                { receivedBy: { contains: search, mode: "insensitive" } },
                { notes: { contains: search, mode: "insensitive" } },
                {
                  items: {
                    some: {
                      poItem: {
                        OR: [
                          { title: { contains: search, mode: "insensitive" } },
                          { sku: { contains: search, mode: "insensitive" } },
                        ],
                      },
                    },
                  },
                },
              ],
            }
          : {}),
      },
      include: {
        store: { select: { id: true, name: true, currency: true } },
        purchaseOrder: {
          select: {
            id: true,
            poNumber: true,
            status: true,
            vendor: { select: { id: true, name: true } },
          },
        },
        items: {
          include: {
            poItem: {
              select: {
                id: true,
                title: true,
                sku: true,
                unitCost: true,
                variantId: true,
                product: {
                  select: {
                    id: true,
                    title: true,
                    images: true,
                    manufacturer: true,
                  },
                },
                variant: {
                  select: {
                    id: true,
                    title: true,
                    price: true,
                    inventory: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { receivedAt: "desc" },
      take: 150,
    });

    return NextResponse.json({
      receipts,
      stores: userStores,
    });
  } catch (error) {
    console.error("[PROCUREMENT_RECEIPTS_GET_ERROR]", error);
    return NextResponse.json({ error: "Failed to fetch receiving history" }, { status: 500 });
  }
}
