import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

type RouteProps = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: RouteProps) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const vendor = (prisma as any).vendor
    ? await (prisma as any).vendor.findFirst({
        where: {
          id,
          store: {
            OR: [{ ownerUserId: user.id }, { ownerId: user.id }],
          },
        },
        include: {
          store: { select: { id: true, name: true, currency: true } },
          purchaseOrders: {
            orderBy: { createdAt: "desc" },
            take: 10,
            select: {
              id: true,
              poNumber: true,
              status: true,
              total: true,
              issueDate: true,
              expectedDate: true,
            },
          },
        },
      })
    : null;

  if (!vendor) {
    return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
  }

  return NextResponse.json({ vendor });
}

export async function PATCH(request: Request, { params }: RouteProps) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const existing = (prisma as any).vendor
      ? await (prisma as any).vendor.findFirst({
          where: {
            id,
            store: {
              OR: [{ ownerUserId: user.id }, { ownerId: user.id }],
            },
          },
        })
      : null;

    if (!existing) {
      return NextResponse.json({ error: "Vendor not found or unauthorized" }, { status: 404 });
    }

    const body = await request.json();
    const { name, contactName, contactEmail, contactPhone, address, notes } = body;

    const updated = await (prisma as any).vendor.update({
      where: { id },
      data: {
        ...(typeof name === "string" && name.trim() ? { name: name.trim() } : {}),
        contactName: contactName !== undefined ? (typeof contactName === "string" && contactName.trim() ? contactName.trim() : null) : undefined,
        contactEmail: contactEmail !== undefined ? (typeof contactEmail === "string" && contactEmail.trim() ? contactEmail.trim() : null) : undefined,
        contactPhone: contactPhone !== undefined ? (typeof contactPhone === "string" && contactPhone.trim() ? contactPhone.trim() : null) : undefined,
        address: address !== undefined ? (typeof address === "string" && address.trim() ? address.trim() : null) : undefined,
        notes: notes !== undefined ? (typeof notes === "string" && notes.trim() ? notes.trim() : null) : undefined,
      },
      include: {
        store: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ vendor: updated });
  } catch (error) {
    console.error("[VENDOR_UPDATE_ERROR]", error);
    return NextResponse.json({ error: "Failed to update vendor" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteProps) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const existing = (prisma as any).vendor
      ? await (prisma as any).vendor.findFirst({
          where: {
            id,
            store: {
              OR: [{ ownerUserId: user.id }, { ownerId: user.id }],
            },
          },
        })
      : null;

    if (!existing) {
      return NextResponse.json({ error: "Vendor not found or unauthorized" }, { status: 404 });
    }

    await (prisma as any).vendor.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[VENDOR_DELETE_ERROR]", error);
    return NextResponse.json({ error: "Failed to delete vendor" }, { status: 500 });
  }
}
