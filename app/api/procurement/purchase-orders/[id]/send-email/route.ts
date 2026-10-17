import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { sendPurchaseOrderVendorEmail } from "@/lib/email-notifications";

type RouteProps = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, { params }: RouteProps) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const purchaseOrder = (prisma as any).purchaseOrder
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

    if (!purchaseOrder) {
      return NextResponse.json({ error: "Purchase order not found or unauthorized" }, { status: 404 });
    }

    const vendorEmail = purchaseOrder.vendor?.contactEmail?.trim();
    if (!vendorEmail) {
      return NextResponse.json(
        {
          error: "The vendor does not have a contact email address configured. Please add an email address in Vendors settings before sending.",
        },
        { status: 400 }
      );
    }

    // Dispatch PO email to vendor
    const emailResult = await sendPurchaseOrderVendorEmail({
      store: purchaseOrder.store,
      to: vendorEmail,
      vendorName: purchaseOrder.vendor.name,
      vendorContactName: purchaseOrder.vendor.contactName,
      vendorAddress: purchaseOrder.vendor.address,
      vendorPhone: purchaseOrder.vendor.contactPhone,
      poNumber: purchaseOrder.poNumber,
      issueDate: purchaseOrder.issueDate,
      expectedDate: purchaseOrder.expectedDate,
      notes: purchaseOrder.notes,
      currency: purchaseOrder.store?.currency || "USD",
      subtotal: Number(purchaseOrder.subtotal) || 0,
      tax: Number(purchaseOrder.tax) || 0,
      shipping: Number(purchaseOrder.shipping) || 0,
      total: Number(purchaseOrder.total) || 0,
      items: (purchaseOrder.items || []).map((item: any) => ({
        title: item.title,
        sku: item.sku,
        qtyOrdered: item.qtyOrdered,
        unitCost: Number(item.unitCost) || 0,
        totalCost: Number(item.totalCost) || 0,
      })),
    });

    // If currently DRAFT, automatically update to SENT
    let newStatus = purchaseOrder.status;
    if (purchaseOrder.status === "DRAFT") {
      const updated = await (prisma as any).purchaseOrder.update({
        where: { id },
        data: { status: "SENT" },
        select: { status: true },
      });
      newStatus = updated.status;
    }

    return NextResponse.json({
      success: true,
      message: `Purchase order invoice successfully sent to ${vendorEmail}`,
      status: newStatus,
      emailResult,
    });
  } catch (error) {
    console.error("[PO_SEND_EMAIL_ERROR]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to send purchase order email to vendor" },
      { status: 500 }
    );
  }
}
