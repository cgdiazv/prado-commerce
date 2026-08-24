import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

type RouteProps = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, { params }: RouteProps) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: poId } = await params;

  try {
    const body = await request.json();
    const { receivedBy, notes, items } = body as {
      receivedBy?: string;
      notes?: string;
      items?: Array<{
        poItemId: string;
        qtyReceived: number;
      }>;
    };

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "At least one item receipt quantity is required" }, { status: 400 });
    }

    const purchaseOrder = (prisma as any).purchaseOrder
      ? await (prisma as any).purchaseOrder.findFirst({
          where: {
            id: poId,
            store: {
              OR: [{ ownerUserId: user.id }, { ownerId: user.id }],
            },
          },
          include: {
            items: true,
          },
        })
      : null;

    if (!purchaseOrder) {
      return NextResponse.json({ error: "Purchase Order not found or unauthorized" }, { status: 404 });
    }

    if (purchaseOrder.status === "CANCELLED") {
      return NextResponse.json({ error: "Cannot receive items on a cancelled purchase order" }, { status: 400 });
    }

    const validItemsToReceive = items.filter((item) => typeof item.qtyReceived === "number" && item.qtyReceived > 0);

    if (validItemsToReceive.length === 0) {
      return NextResponse.json({ error: "Please enter a received quantity greater than 0" }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const receipt = await (tx as any).purchaseReceipt.create({
        data: {
          poId,
          storeId: purchaseOrder.storeId,
          receivedBy: typeof receivedBy === "string" && receivedBy.trim() ? receivedBy.trim() : user.name || user.email,
          notes: typeof notes === "string" && notes.trim() ? notes.trim() : null,
        },
      });

      for (const receiveItem of validItemsToReceive) {
        const poItem = purchaseOrder.items.find((i: any) => i.id === receiveItem.poItemId);
        if (!poItem) continue;

        const qtyToIncrement = Math.max(1, Math.floor(receiveItem.qtyReceived));

        await (tx as any).purchaseReceiptItem.create({
          data: {
            receiptId: receipt.id,
            poItemId: poItem.id,
            qtyReceived: qtyToIncrement,
          },
        });

        await (tx as any).purchaseOrderItem.update({
          where: { id: poItem.id },
          data: {
            qtyReceived: { increment: qtyToIncrement },
          },
        });

        if (poItem.variantId) {
          await tx.productVariant.update({
            where: { id: poItem.variantId },
            data: {
              inventory: { increment: qtyToIncrement },
            },
          });
        }
      }

      const updatedPoItems = await (tx as any).purchaseOrderItem.findMany({
        where: { poId },
      });

      const allFulfilled = updatedPoItems.every((item: any) => item.qtyReceived >= item.qtyOrdered);
      const someReceived = updatedPoItems.some((item: any) => item.qtyReceived > 0);

      const nextStatus = allFulfilled ? "RECEIVED" : someReceived ? "PARTIAL" : purchaseOrder.status;

      const updatedPo = await (tx as any).purchaseOrder.update({
        where: { id: poId },
        data: { status: nextStatus },
        include: {
          store: { select: { id: true, name: true, currency: true } },
          vendor: true,
          items: true,
          receipts: {
            orderBy: { receivedAt: "desc" },
            include: { items: { include: { poItem: true } } },
          },
        },
      });

      return { receipt, purchaseOrder: updatedPo };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("[RECEIVE_ITEMS_ERROR]", error);
    return NextResponse.json({ error: "Failed to process item receipt" }, { status: 500 });
  }
}
