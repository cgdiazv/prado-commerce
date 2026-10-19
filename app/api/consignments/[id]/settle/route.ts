import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { Prisma } from "@prisma/client";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const consignment = await (prisma as any).consignment.findUnique({
      where: { id },
      include: {
        store: true,
        items: true,
      },
    });

    if (!consignment) {
      return NextResponse.json({ error: "Consignment not found" }, { status: 404 });
    }

    if (
      consignment.store.ownerUserId !== user.id &&
      consignment.store.ownerId !== user.id
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    if (consignment.status === "CANCELLED") {
      return NextResponse.json(
        { error: "Cannot settle a cancelled consignment" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      settledItems,
      paymentMethod = "TRANSFERENCIA",
      reference,
      notes,
      date,
    } = body as {
      settledItems: Array<{
        itemId: string;
        unitsSold: number;
        unitsReturned?: number;
      }>;
      paymentMethod?: string;
      reference?: string;
      notes?: string;
      date?: string;
    };

    if (!settledItems || !Array.isArray(settledItems) || settledItems.length === 0) {
      return NextResponse.json(
        { error: "At least one item must be included in the settlement" },
        { status: 400 }
      );
    }

    // Verify items and compute total settlement
    let totalSettlementAmount = 0;
    let totalUnitsSold = 0;
    const itemMap = new Map(consignment.items.map((i: any) => [i.id, i]));

    for (const itemInput of settledItems) {
      const dbItem: any = itemMap.get(itemInput.itemId);
      if (!dbItem) {
        return NextResponse.json(
          { error: `Item ${itemInput.itemId} does not belong to this consignment` },
          { status: 400 }
        );
      }

      const unitsSold = Math.max(0, Number.parseInt(String(itemInput.unitsSold), 10) || 0);
      const unitsReturned = Math.max(0, Number.parseInt(String(itemInput.unitsReturned || 0), 10) || 0);

      const available = dbItem.initialQuantity - (dbItem.soldQuantity + dbItem.returnedQuantity);
      if (unitsSold + unitsReturned > available) {
        return NextResponse.json(
          {
            error: `Total units for "${dbItem.productTitle}" (${unitsSold + unitsReturned}) exceeds remaining units (${available})`,
          },
          { status: 400 }
        );
      }

      const agreedCost = Number.parseFloat(String(dbItem.agreedCost)) || 0;
      totalSettlementAmount += unitsSold * agreedCost;
      totalUnitsSold += unitsSold;
    }

    const settlementDate = date ? new Date(date) : new Date();

    // Execute in transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Update each consignment item's sold and returned counts
      for (const itemInput of settledItems) {
        const unitsSold = Math.max(0, Number.parseInt(String(itemInput.unitsSold), 10) || 0);
        const unitsReturned = Math.max(0, Number.parseInt(String(itemInput.unitsReturned || 0), 10) || 0);

        if (unitsSold > 0 || unitsReturned > 0) {
          await (tx as any).consignmentItem.update({
            where: { id: itemInput.itemId },
            data: {
              soldQuantity: { increment: unitsSold },
              returnedQuantity: { increment: unitsReturned },
            },
          });
        }
      }

      // 2. Create the settlement record
      const settlement = await (tx as any).consignmentSettlement.create({
        data: {
          consignmentId: id,
          date: settlementDate,
          totalUnitsSold,
          totalAmount: new Prisma.Decimal(totalSettlementAmount.toFixed(2)),
          paymentMethod,
          reference: reference?.trim() || null,
          notes: notes?.trim() || null,
          settledBy: user.name || user.email || "Merchant",
        },
      });

      // 3. Update the consignment's total settled amount
      const currentSettled = Number.parseFloat(String(consignment.totalSettledAmount)) || 0;
      const newTotalSettled = currentSettled + totalSettlementAmount;

      // 4. Check if all items are fully accounted for
      const allItems = await (tx as any).consignmentItem.findMany({
        where: { consignmentId: id },
      });

      const isFullySettled = allItems.every(
        (it: any) => it.soldQuantity + it.returnedQuantity >= it.initialQuantity
      );

      const updatedConsignment = await (tx as any).consignment.update({
        where: { id },
        data: {
          totalSettledAmount: new Prisma.Decimal(newTotalSettled.toFixed(2)),
          ...(isFullySettled ? { status: "SETTLED" } : {}),
        },
        include: {
          items: true,
          settlements: {
            orderBy: { date: "desc" },
          },
        },
      });

      return { settlement, consignment: updatedConsignment };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Error creating consignment settlement:", error);
    return NextResponse.json(
      { error: "Failed to process consignment settlement" },
      { status: 500 }
    );
  }
}
