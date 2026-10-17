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
          include: {
            store: {
              select: {
                id: true,
                name: true,
                slug: true,
                mainColor: true,
                currency: true,
                logoUrl: true,
                senderName: true,
                senderEmail: true,
                replyToEmail: true,
                shippingOrigin: true,
              },
            },
            vendor: true,
            items: true,
          },
        })
      : null;

    if (!existing) {
      return NextResponse.json({ error: "Purchase Order not found or unauthorized" }, { status: 404 });
    }

    const body = await request.json();
    const { status, expectedDate, notes, sendEmail } = body as {
      status?: PurchaseOrderStatus;
      expectedDate?: string | null;
      notes?: string | null;
      sendEmail?: boolean;
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
        vendor: { select: { id: true, name: true, contactEmail: true } },
        items: true,
      },
    });

    let emailSent = false;
    let emailRecipient: string | null = null;
    let emailError: string | null = null;

    if (sendEmail) {
      const targetEmail = existing.vendor?.contactEmail?.trim();
      if (targetEmail) {
        try {
          const { sendPurchaseOrderVendorEmail } = await import("@/lib/email-notifications");
          await sendPurchaseOrderVendorEmail({
            store: existing.store,
            to: targetEmail,
            vendorName: existing.vendor.name,
            vendorContactName: existing.vendor.contactName,
            vendorAddress: existing.vendor.address,
            vendorPhone: existing.vendor.contactPhone,
            poNumber: existing.poNumber,
            issueDate: existing.issueDate,
            expectedDate: expectedDate !== undefined ? (expectedDate ? new Date(expectedDate) : null) : existing.expectedDate,
            notes: notes !== undefined ? notes : existing.notes,
            currency: existing.store?.currency || "USD",
            subtotal: Number(existing.subtotal) || 0,
            tax: Number(existing.tax) || 0,
            shipping: Number(existing.shipping) || 0,
            total: Number(existing.total) || 0,
            items: (existing.items || []).map((item: any) => ({
              title: item.title,
              sku: item.sku,
              qtyOrdered: item.qtyOrdered,
              unitCost: Number(item.unitCost) || 0,
              totalCost: Number(item.totalCost) || 0,
            })),
          });
          emailSent = true;
          emailRecipient = targetEmail;
        } catch (mailErr) {
          console.error("[PO_EMAIL_DISPATCH_ERROR]", mailErr);
          emailError = mailErr instanceof Error ? mailErr.message : "Failed to send email to vendor";
        }
      } else {
        emailError = "Vendor has no contact email configured.";
      }
    }

    return NextResponse.json({
      purchaseOrder: updated,
      emailSent,
      emailRecipient,
      emailError,
    });
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
