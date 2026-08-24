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
  const vendorIdParam = searchParams.get("vendorId");
  const statusParam = searchParams.get("status");
  const search = searchParams.get("search")?.trim().toLowerCase();

  const userStores = await prisma.store.findMany({
    where: { OR: [{ ownerUserId: user.id }, { ownerId: user.id }] },
    select: { id: true },
  });
  const storeIds = userStores.map((s) => s.id);

  if (storeIds.length === 0 || !(prisma as any).purchaseOrder) {
    return NextResponse.json({ purchaseOrders: [] });
  }

  const targetStoreIds = storeIdParam && storeIds.includes(storeIdParam) ? [storeIdParam] : storeIds;

  const purchaseOrders = await (prisma as any).purchaseOrder.findMany({
    where: {
      storeId: { in: targetStoreIds },
      ...(vendorIdParam ? { vendorId: vendorIdParam } : {}),
      ...(statusParam && statusParam !== "ALL" ? { status: statusParam } : {}),
      ...(search
        ? {
            OR: [
              { poNumber: { contains: search, mode: "insensitive" } },
              { vendor: { name: { contains: search, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    include: {
      store: { select: { id: true, name: true, currency: true } },
      vendor: { select: { id: true, name: true, contactEmail: true } },
      items: {
        select: {
          id: true,
          title: true,
          sku: true,
          qtyOrdered: true,
          qtyReceived: true,
          unitCost: true,
          totalCost: true,
        },
      },
      _count: {
        select: { receipts: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ purchaseOrders });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { storeId, vendorId, poNumber, expectedDate, notes, items, tax, shipping } = body as {
      storeId?: string;
      vendorId?: string;
      poNumber?: string;
      expectedDate?: string | null;
      notes?: string | null;
      tax?: number;
      shipping?: number;
      items?: Array<{
        productId?: string;
        variantId?: string;
        title: string;
        sku?: string;
        qtyOrdered: number;
        unitCost: number;
      }>;
    };

    if (!storeId || typeof storeId !== "string") {
      return NextResponse.json({ error: "Store ID is required" }, { status: 400 });
    }

    if (!vendorId || typeof vendorId !== "string") {
      return NextResponse.json({ error: "Vendor is required" }, { status: 400 });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "At least one PO line item is required" }, { status: 400 });
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

    const vendor = (prisma as any).vendor
      ? await (prisma as any).vendor.findFirst({
          where: { id: vendorId, storeId },
        })
      : null;

    if (!vendor) {
      return NextResponse.json({ error: "Vendor not found for this store" }, { status: 404 });
    }

    let assignedPoNumber = typeof poNumber === "string" && poNumber.trim() ? poNumber.trim() : "";
    if (!assignedPoNumber) {
      const lastPo = (prisma as any).purchaseOrder
        ? await (prisma as any).purchaseOrder.findFirst({
            where: { storeId },
            orderBy: { createdAt: "desc" },
            select: { poNumber: true },
          })
        : null;

      let nextSeq = 1001;
      if (lastPo?.poNumber) {
        const match = lastPo.poNumber.match(/(\d+)/);
        if (match) {
          nextSeq = Number.parseInt(match[1], 10) + 1;
        }
      }
      assignedPoNumber = `PO-${nextSeq}`;
    }

    let calculatedSubtotal = 0;
    const itemsData = items.map((item) => {
      const qty = Math.max(1, Number(item.qtyOrdered) || 1);
      const cost = Math.max(0, Number(item.unitCost) || 0);
      const lineTotal = qty * cost;
      calculatedSubtotal += lineTotal;

      return {
        productId: item.productId || null,
        variantId: item.variantId || null,
        title: item.title?.trim() || "Item",
        sku: item.sku?.trim() || null,
        qtyOrdered: qty,
        qtyReceived: 0,
        unitCost: cost,
        totalCost: lineTotal,
      };
    });

    const taxCost = Math.max(0, Number(tax) || 0);
    const shippingCost = Math.max(0, Number(shipping) || 0);
    const calculatedTotal = calculatedSubtotal + taxCost + shippingCost;

    const purchaseOrder = await (prisma as any).purchaseOrder.create({
      data: {
        storeId,
        vendorId,
        poNumber: assignedPoNumber,
        status: "DRAFT",
        expectedDate: expectedDate ? new Date(expectedDate) : null,
        notes: typeof notes === "string" ? notes.trim() || null : null,
        subtotal: calculatedSubtotal,
        tax: taxCost,
        shipping: shippingCost,
        total: calculatedTotal,
        items: {
          create: itemsData,
        },
      },
      include: {
        store: { select: { id: true, name: true, currency: true } },
        vendor: { select: { id: true, name: true } },
        items: true,
      },
    });

    return NextResponse.json({ purchaseOrder }, { status: 201 });
  } catch (error) {
    console.error("[PO_CREATE_ERROR]", error);
    return NextResponse.json({ error: "Failed to create purchase order" }, { status: 500 });
  }
}
