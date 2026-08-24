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
  const search = searchParams.get("search")?.trim().toLowerCase();

  const userStores = await prisma.store.findMany({
    where: { OR: [{ ownerUserId: user.id }, { ownerId: user.id }] },
    select: { id: true },
  });
  const storeIds = userStores.map((s) => s.id);

  if (storeIds.length === 0 || !(prisma as any).vendor) {
    return NextResponse.json({ vendors: [] });
  }

  const targetStoreIds = storeIdParam && storeIds.includes(storeIdParam) ? [storeIdParam] : storeIds;

  const vendors = await (prisma as any).vendor.findMany({
    where: {
      storeId: { in: targetStoreIds },
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { contactName: { contains: search, mode: "insensitive" } },
              { contactEmail: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: {
      store: {
        select: { id: true, name: true },
      },
      _count: {
        select: { purchaseOrders: true },
      },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ vendors });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { storeId, name, contactName, contactEmail, contactPhone, address, notes } = body;

    if (!storeId || typeof storeId !== "string") {
      return NextResponse.json({ error: "Store ID is required" }, { status: 400 });
    }

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Vendor name is required" }, { status: 400 });
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

    const vendor = await (prisma as any).vendor.create({
      data: {
        storeId,
        name: name.trim(),
        contactName: typeof contactName === "string" ? contactName.trim() || null : null,
        contactEmail: typeof contactEmail === "string" ? contactEmail.trim() || null : null,
        contactPhone: typeof contactPhone === "string" ? contactPhone.trim() || null : null,
        address: typeof address === "string" ? address.trim() || null : null,
        notes: typeof notes === "string" ? notes.trim() || null : null,
      },
      include: {
        store: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ vendor }, { status: 201 });
  } catch (error) {
    console.error("[VENDOR_CREATE_ERROR]", error);
    return NextResponse.json({ error: "Failed to create vendor" }, { status: 500 });
  }
}
