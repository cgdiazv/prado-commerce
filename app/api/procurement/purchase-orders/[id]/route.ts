import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export type PurchaseOrderStatus = "DRAFT" | "SENT" | "PARTIAL" | "RECEIVED" | "CANCELLED";
const VALID_PO_STATUSES: string[] = ["DRAFT", "SENT", "PARTIAL", "RECEIVED", "CANCELLED"];

type RouteProps = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: RouteProps) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const purchaseOrder = (prisma as any).purchaseOrder
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

  if (!purchaseOrder) {
    return NextResponse.json({ error: "Purchase Order not found" }, { status: 404 });
  }

  return NextResponse.json({ purchaseOrder });
}

export async function PATCH(request: Request, { params }: RouteProps) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const existing = (prisma as any).purchaseOrder
      ? await (prisma as any).purchaseOrder.findFirst({
          where: {
            id,
            store: {
              OR: [{ ownerUserId: user.id }, { ownerId: user.id }],
            },
          },
        })
      : null;

    if (!existing) {
      return NextResponse.json({ error: "Purchase Order not found or unauthorized" }, { status: 404 });
    }

    const body = await request.json();
    const { status, expectedDate, notes } = body as {
      status?: PurchaseOrderStatus;
      expectedDate?: string | null;
      notes?: string | null;
    };

    const updated = await (prisma as any).purchaseOrder.update({
      where: { id },
      data: {
        ...(status && VALID_PO_STATUSES.includes(status) ? { status } : {}),
        ...(expectedDate !== undefined ? { expectedDate: expectedDate ? new Date(expectedDate) : null } : {}),
        ...(notes !== undefined ? { notes: typeof notes === "string" ? notes.trim() || null : null } : {}),
      },
      include: {
        store: { select: { id: true, name: true, currency: true } },
        vendor: { select: { id: true, name: true } },
        items: true,
      },
    });

    return NextResponse.json({ purchaseOrder: updated });
  } catch (error) {
    console.error("[PO_UPDATE_ERROR]", error);
    return NextResponse.json({ error: "Failed to update purchase order" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteProps) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const existing = (prisma as any).purchaseOrder
      ? await (prisma as any).purchaseOrder.findFirst({
          where: {
            id,
            store: {
              OR: [{ ownerUserId: user.id }, { ownerId: user.id }],
            },
          },
        })
      : null;

    if (!existing) {
      return NextResponse.json({ error: "Purchase Order not found or unauthorized" }, { status: 404 });
    }

    await (prisma as any).purchaseOrder.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[PO_DELETE_ERROR]", error);
    return NextResponse.json({ error: "Failed to delete purchase order" }, { status: 500 });
  }
}
