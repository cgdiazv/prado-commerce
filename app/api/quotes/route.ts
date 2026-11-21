import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentCashierFromRequest, getCurrentUserFromRequest } from "@/lib/session";

function amount(value: unknown, fallback = 0) {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseFloat(value)
        : fallback;
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed * 100) / 100 : fallback;
}

export async function GET(request: Request) {
  const user = await getCurrentUserFromRequest(request);
  const cashier = getCurrentCashierFromRequest(request);
  if (!user && !cashier) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const storeId = new URL(request.url).searchParams.get("storeId")?.trim();
  if (!storeId) return NextResponse.json({ error: "storeId is required" }, { status: 400 });
  if (cashier && storeId !== cashier.storeId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const stores = await prisma.store.findMany({
    where: cashier
      ? { id: cashier.storeId }
      : { ownerUserId: user!.id, ...(storeId === "ALL" ? {} : { id: storeId }) },
    select: { id: true },
  });
  const storeIds = stores.map((store) => store.id);

  const quotes = await prisma.quote.findMany({
    where: { storeId: { in: storeIds } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      storeId: true,
      quoteNumber: true,
      customerEmail: true,
      customer: { select: { firstName: true, lastName: true } },
      status: true,
      subtotal: true,
      tax: true,
      shipping: true,
      total: true,
      currency: true,
      validUntil: true,
      createdAt: true,
    },
  });

  return NextResponse.json(
    quotes.map((quote) => ({
      ...quote,
      customerName:
        [quote.customer?.firstName, quote.customer?.lastName].filter(Boolean).join(" ") || null,
      subtotal: quote.subtotal.toString(),
      tax: quote.tax.toString(),
      shipping: quote.shipping.toString(),
      total: quote.total.toString(),
      validUntil: quote.validUntil?.toISOString() ?? null,
      createdAt: quote.createdAt.toISOString(),
    })),
  );
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUserFromRequest(request);
    const cashier = getCurrentCashierFromRequest(request);
    if (!user && !cashier) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const storeId = String(body?.storeId ?? "").trim();
    const customerEmail = String(body?.customerEmail ?? "").trim().toLowerCase();
    if (!storeId || !customerEmail) {
      return NextResponse.json({ error: "storeId and customerEmail are required" }, { status: 400 });
    }

    const store = await prisma.store.findFirst({
      where: cashier ? { id: cashier.storeId } : { id: storeId, ownerUserId: user!.id },
      select: { id: true },
    });
    if (!store) return NextResponse.json({ error: "Store not found" }, { status: 404 });

    const customer = await prisma.customer.findFirst({
      where: { storeId, email: customerEmail },
      select: { id: true },
    });
    if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });

    const rawItems: unknown[] = Array.isArray(body?.items) ? body.items : [];
    const items: Array<{
      title: string;
      price: number;
      quantity: number;
      variantId: string | null;
    }> = rawItems
      .map((value) => {
        const item =
          typeof value === "object" && value !== null
            ? value as Record<string, unknown>
            : {};
        return {
          title: String(item.title ?? "").trim(),
          price: amount(item.price),
          quantity: Math.max(1, Number.parseInt(String(item.quantity ?? 1), 10) || 1),
          variantId: typeof item.variantId === "string" ? item.variantId : null,
        };
      })
      .filter((item) => item.title);
    if (!items.length) return NextResponse.json({ error: "Add at least one item" }, { status: 400 });

    const variantIds = items.map((item) => item.variantId).filter((id): id is string => Boolean(id));
    const variants = variantIds.length
      ? await prisma.productVariant.findMany({
          where: { id: { in: variantIds }, product: { storeId } },
          select: { id: true },
        })
      : [];
    if (new Set(variantIds).size !== variants.length) {
      return NextResponse.json({ error: "One or more products are invalid" }, { status: 400 });
    }

    const subtotal = Math.round(
      items.reduce((sum, item) => sum + item.price * item.quantity, 0) * 100,
    ) / 100;
    const tax = amount(body?.tax);
    const shipping = amount(body?.shipping);
    const total = Math.round((subtotal + tax + shipping) * 100) / 100;
    const validUntilInput = String(body?.validUntil ?? "").trim();
    const validUntil = validUntilInput ? new Date(`${validUntilInput}T23:59:59`) : null;

    const quote = await prisma.quote.create({
      data: {
        storeId,
        customerId: customer.id,
        customerEmail,
        status: "DRAFT",
        subtotal,
        tax,
        shipping,
        total,
        currency: String(body?.currency ?? "USD").toUpperCase().slice(0, 3),
        notes: String(body?.notes ?? "").trim() || null,
        validUntil,
        items: { create: items },
      },
      select: { id: true, quoteNumber: true },
    });

    return NextResponse.json(quote, { status: 201 });
  } catch (error) {
    console.error("[QUOTES_POST_ERROR]", error);
    return NextResponse.json({ error: "Failed to create quote" }, { status: 500 });
  }
}
