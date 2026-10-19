import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function GET(
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
        store: { select: { id: true, name: true, currency: true, ownerUserId: true, ownerId: true } },
        items: true,
        settlements: {
          orderBy: { date: "desc" },
        },
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

    return NextResponse.json({ consignment });
  } catch (error) {
    console.error("Error fetching consignment:", error);
    return NextResponse.json({ error: "Failed to fetch consignment" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const existing = await (prisma as any).consignment.findUnique({
      where: { id },
      include: { store: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Consignment not found" }, { status: 404 });
    }

    if (
      existing.store.ownerUserId !== user.id &&
      existing.store.ownerId !== user.id
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const { status, contactName, contactEmail, contactPhone, notes, endDate } = body;

    const updated = await (prisma as any).consignment.update({
      where: { id },
      data: {
        ...(status ? { status } : {}),
        ...(contactName ? { contactName: contactName.trim() } : {}),
        ...(contactEmail !== undefined ? { contactEmail: contactEmail ? contactEmail.trim() : null } : {}),
        ...(contactPhone !== undefined ? { contactPhone: contactPhone ? contactPhone.trim() : null } : {}),
        ...(notes !== undefined ? { notes: notes ? notes.trim() : null } : {}),
        ...(endDate !== undefined ? { endDate: endDate ? new Date(endDate) : null } : {}),
      },
      include: {
        items: true,
        settlements: true,
      },
    });

    return NextResponse.json({ consignment: updated });
  } catch (error) {
    console.error("Error updating consignment:", error);
    return NextResponse.json({ error: "Failed to update consignment" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const existing = await (prisma as any).consignment.findUnique({
      where: { id },
      include: {
        store: true,
        settlements: { select: { id: true } },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Consignment not found" }, { status: 404 });
    }

    if (
      existing.store.ownerUserId !== user.id &&
      existing.store.ownerId !== user.id
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // If there are recorded settlements, mark as CANCELLED instead of deleting data
    if (existing.settlements && existing.settlements.length > 0) {
      const updated = await (prisma as any).consignment.update({
        where: { id },
        data: { status: "CANCELLED" },
      });
      return NextResponse.json({
        message: "Consignment has active settlements and was marked as CANCELLED",
        consignment: updated,
      });
    }

    await (prisma as any).consignment.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting consignment:", error);
    return NextResponse.json({ error: "Failed to delete consignment" }, { status: 500 });
  }
}
