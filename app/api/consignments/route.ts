import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { Prisma } from "@prisma/client";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const storeIdParam = searchParams.get("storeId");
  const typeParam = searchParams.get("type");
  const statusParam = searchParams.get("status");
  const search = searchParams.get("search")?.trim().toLowerCase();

  const userStores = await prisma.store.findMany({
    where: { OR: [{ ownerUserId: user.id }, { ownerId: user.id }] },
    select: { id: true },
  });
  const storeIds = userStores.map((s) => s.id);

  if (storeIds.length === 0 || !(prisma as any).consignment) {
    return NextResponse.json({ consignments: [] });
  }

  const targetStoreIds = storeIdParam && storeIds.includes(storeIdParam) ? [storeIdParam] : storeIds;

  try {
    const consignments = await (prisma as any).consignment.findMany({
      where: {
        storeId: { in: targetStoreIds },
        ...(typeParam && typeParam !== "ALL" ? { type: typeParam } : {}),
        ...(statusParam && statusParam !== "ALL" ? { status: statusParam } : {}),
        ...(search
          ? {
              OR: [
                { code: { contains: search, mode: "insensitive" } },
                { contactName: { contains: search, mode: "insensitive" } },
                { contactEmail: { contains: search, mode: "insensitive" } },
                { notes: { contains: search, mode: "insensitive" } },
                { items: { some: { productTitle: { contains: search, mode: "insensitive" } } } },
              ],
            }
          : {}),
      },
      include: {
        store: { select: { id: true, name: true, currency: true } },
        items: {
          select: {
            id: true,
            productTitle: true,
            sku: true,
            variantId: true,
            initialQuantity: true,
            soldQuantity: true,
            returnedQuantity: true,
            agreedCost: true,
            suggestedPrice: true,
          },
        },
        settlements: {
          orderBy: { date: "desc" },
          select: {
            id: true,
            settlementNumber: true,
            date: true,
            totalUnitsSold: true,
            totalAmount: true,
            paymentMethod: true,
            reference: true,
            notes: true,
            settledBy: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ consignments });
  } catch (error) {
    console.error("Error fetching consignments:", error);
    return NextResponse.json({ error: "Failed to fetch consignments" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      storeId,
      type = "RECEIVED",
      code,
      contactName,
      contactEmail,
      contactPhone,
      startDate,
      endDate,
      notes,
      items,
    } = body as {
      storeId?: string;
      type?: "RECEIVED" | "GIVEN";
      code?: string;
      contactName?: string;
      contactEmail?: string;
      contactPhone?: string;
      startDate?: string;
      endDate?: string;
      notes?: string;
      items?: Array<{
        productTitle: string;
        sku?: string;
        variantId?: string;
        initialQuantity: number;
        agreedCost: number;
        suggestedPrice?: number;
      }>;
    };

    if (!storeId || typeof storeId !== "string") {
      return NextResponse.json({ error: "Store ID is required" }, { status: 400 });
    }

    if (!contactName || typeof contactName !== "string" || !contactName.trim()) {
      return NextResponse.json({ error: "Contact name is required" }, { status: 400 });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "At least one consignment item is required" }, { status: 400 });
    }

    const store = await prisma.store.findFirst({
      where: {
        id: storeId,
        OR: [{ ownerUserId: user.id }, { ownerId: user.id }],
      },
    });

    if (!store) {
      return NextResponse.json({ error: "Store not found or unauthorized" }, { status: 404 });
    }

    // Determine consignment code if not given
    let finalCode = code && code.trim() ? code.trim() : "";
    if (!finalCode) {
      const lastConsignment = await (prisma as any).consignment.findFirst({
        where: { storeId },
        orderBy: { createdAt: "desc" },
        select: { code: true, consignmentNumber: true },
      });

      let nextNum = 1001;
      if (lastConsignment?.code) {
        const match = lastConsignment.code.match(/(\d+)/);
        if (match) {
          nextNum = Number.parseInt(match[1], 10) + 1;
        }
      }
      finalCode = `CNS-${nextNum}`;
    }

    // Calculate total agreed amount
    let totalAgreed = 0;
    const itemsData = items.map((item) => {
      const qty = Math.max(1, Number.parseInt(String(item.initialQuantity), 10) || 1);
      const cost = Math.max(0, Number.parseFloat(String(item.agreedCost)) || 0);
      const price = item.suggestedPrice !== undefined ? Math.max(0, Number.parseFloat(String(item.suggestedPrice)) || 0) : null;
      totalAgreed += qty * cost;

      return {
        productTitle: item.productTitle.trim(),
        sku: item.sku?.trim() || null,
        variantId: item.variantId?.trim() || null,
        initialQuantity: qty,
        soldQuantity: 0,
        returnedQuantity: 0,
        agreedCost: new Prisma.Decimal(cost.toFixed(2)),
        suggestedPrice: price !== null ? new Prisma.Decimal(price.toFixed(2)) : null,
      };
    });

    const consignment = await (prisma as any).consignment.create({
      data: {
        storeId,
        type: type === "GIVEN" ? "GIVEN" : "RECEIVED",
        code: finalCode,
        contactName: contactName.trim(),
        contactEmail: contactEmail?.trim() || null,
        contactPhone: contactPhone?.trim() || null,
        status: "ACTIVE",
        startDate: startDate ? new Date(startDate) : new Date(),
        endDate: endDate ? new Date(endDate) : null,
        notes: notes?.trim() || null,
        totalAgreedAmount: new Prisma.Decimal(totalAgreed.toFixed(2)),
        totalSettledAmount: new Prisma.Decimal("0.00"),
        currency: store.currency || "USD",
        items: {
          create: itemsData,
        },
      },
      include: {
        items: true,
        settlements: true,
      },
    });

    return NextResponse.json({ consignment }, { status: 201 });
  } catch (error) {
    console.error("Error creating consignment:", error);
    return NextResponse.json({ error: "Failed to create consignment" }, { status: 500 });
  }
}
