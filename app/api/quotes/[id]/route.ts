import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentCashierFromRequest, getCurrentUserFromRequest } from "@/lib/session";

type Context = { params: Promise<{ id: string }> };

const EDITABLE_STATUSES = ["DRAFT", "SENT", "ACCEPTED", "REJECTED", "EXPIRED"] as const;
type EditableQuoteStatus = (typeof EDITABLE_STATUSES)[number];

function amount(value: unknown, fallback = 0) {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseFloat(value)
        : fallback;
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed * 100) / 100 : fallback;
}

async function findOwnedQuote(request: Request, id: string) {
  const user = await getCurrentUserFromRequest(request);
  const cashier = getCurrentCashierFromRequest(request);
  if (!user && !cashier) return null;
  return prisma.quote.findFirst({
    where: cashier
      ? { id, storeId: cashier.storeId }
      : { id, store: { ownerUserId: user!.id } },
    include: {
      customer: { select: { firstName: true, lastName: true } },
      items: true,
    },
  });
}

export async function GET(request: Request, context: Context) {
  const { id } = await context.params;
  const quote = await findOwnedQuote(request, id);
  if (!quote) return NextResponse.json({ error: "Quote not found" }, { status: 404 });
  return NextResponse.json({
    ...quote,
    subtotal: quote.subtotal.toString(),
    tax: quote.tax.toString(),
    shipping: quote.shipping.toString(),
    total: quote.total.toString(),
    items: quote.items.map((item) => ({
      ...item,
      price: item.price.toString(),
    })),
  });
}

export async function PATCH(request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const owned = await findOwnedQuote(request, id);
    if (!owned) return NextResponse.json({ error: "Quote not found" }, { status: 404 });

    if (owned.status === "CONVERTED") {
      return NextResponse.json({ error: "Converted quotes cannot be edited" }, { status: 409 });
    }

    const body = await request.json();
    const hasFullEditFields =
      body?.items !== undefined ||
      body?.customerEmail !== undefined ||
      body?.currency !== undefined ||
      body?.tax !== undefined ||
      body?.shipping !== undefined ||
      body?.validUntil !== undefined ||
      body?.notes !== undefined;

    if (!hasFullEditFields) {
      const status = String(body?.status ?? "");
      if (!EDITABLE_STATUSES.includes(status as EditableQuoteStatus)) {
        return NextResponse.json({ error: "Invalid quote status" }, { status: 400 });
      }
      const quote = await prisma.quote.update({
        where: { id },
        data: { status: status as EditableQuoteStatus },
        select: { id: true, status: true },
      });
      return NextResponse.json(quote);
    }

    let nextStatus: EditableQuoteStatus | undefined;
    if (body?.status !== undefined) {
      const status = String(body.status);
      if (!EDITABLE_STATUSES.includes(status as EditableQuoteStatus)) {
        return NextResponse.json({ error: "Invalid quote status" }, { status: 400 });
      }
      nextStatus = status as EditableQuoteStatus;
    }

    let customerId = owned.customerId;
    let customerEmail = owned.customerEmail;
    if (body?.customerEmail !== undefined) {
      const normalizedEmail = String(body.customerEmail ?? "").trim().toLowerCase();
      if (!normalizedEmail) {
        return NextResponse.json({ error: "customerEmail is required" }, { status: 400 });
      }
      const customer = await prisma.customer.findFirst({
        where: { storeId: owned.storeId, email: normalizedEmail },
        select: { id: true, email: true },
      });
      if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });
      customerId = customer.id;
      customerEmail = customer.email;
    }

    let nextItems: Array<{
      title: string;
      price: number;
      quantity: number;
      variantId: string | null;
    }> | null = null;

    if (body?.items !== undefined) {
      const rawItems: unknown[] = Array.isArray(body.items) ? body.items : [];
      const parsedItems = rawItems
        .map((value) => {
          const item =
            typeof value === "object" && value !== null
              ? (value as Record<string, unknown>)
              : {};
          return {
            title: String(item.title ?? "").trim(),
            price: amount(item.price),
            quantity: Math.max(1, Number.parseInt(String(item.quantity ?? 1), 10) || 1),
            variantId: typeof item.variantId === "string" && item.variantId.trim() ? item.variantId.trim() : null,
          };
        })
        .filter((item) => item.title);

      if (!parsedItems.length) {
        return NextResponse.json({ error: "Add at least one item" }, { status: 400 });
      }

      const variantIds = parsedItems
        .map((item) => item.variantId)
        .filter((variantId): variantId is string => Boolean(variantId));
      const variants = variantIds.length
        ? await prisma.productVariant.findMany({
            where: { id: { in: variantIds }, product: { storeId: owned.storeId } },
            select: { id: true },
          })
        : [];
      if (new Set(variantIds).size !== variants.length) {
        return NextResponse.json({ error: "One or more products are invalid" }, { status: 400 });
      }
      nextItems = parsedItems;
    }

    const subtotal = nextItems
      ? Math.round(nextItems.reduce((sum, item) => sum + item.price * item.quantity, 0) * 100) / 100
      : Number(owned.subtotal);
    const tax = body?.tax !== undefined ? amount(body.tax) : Number(owned.tax);
    const shipping = body?.shipping !== undefined ? amount(body.shipping) : Number(owned.shipping);
    const total = Math.round((subtotal + tax + shipping) * 100) / 100;

    let validUntil = owned.validUntil;
    if (body?.validUntil !== undefined) {
      const validUntilInput = String(body.validUntil ?? "").trim();
      validUntil = validUntilInput ? new Date(`${validUntilInput}T23:59:59`) : null;
    }

    const currency =
      body?.currency !== undefined
        ? String(body.currency ?? "USD").toUpperCase().slice(0, 3) || owned.currency
        : owned.currency;
    const notes =
      body?.notes !== undefined
        ? String(body.notes ?? "").trim() || null
        : owned.notes;

    const quote = await prisma.quote.update({
      where: { id },
      data: {
        customerId,
        customerEmail,
        ...(nextStatus ? { status: nextStatus } : {}),
        subtotal,
        tax,
        shipping,
        total,
        currency,
        notes,
        validUntil,
        ...(nextItems
          ? {
              items: {
                deleteMany: {},
                create: nextItems,
              },
            }
          : {}),
      },
      select: { id: true, quoteNumber: true, status: true, total: true },
    });

    return NextResponse.json({
      ...quote,
      total: quote.total.toString(),
    });
  } catch (error) {
    console.error("[QUOTES_PATCH_ERROR]", error);
    return NextResponse.json({ error: "Failed to update quote" }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: Context) {
  const { id } = await context.params;
  const quote = await findOwnedQuote(request, id);
  if (!quote) return NextResponse.json({ error: "Quote not found" }, { status: 404 });
  if (quote.status === "CONVERTED") {
    return NextResponse.json({ error: "Converted quotes cannot be deleted" }, { status: 409 });
  }
  await prisma.quote.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
