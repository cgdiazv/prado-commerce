import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentCashierFromRequest, getCurrentUserFromRequest } from "@/lib/session";

type Context = { params: Promise<{ id: string }> };

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
  const { id } = await context.params;
  const owned = await findOwnedQuote(request, id);
  if (!owned) return NextResponse.json({ error: "Quote not found" }, { status: 404 });
  const body = await request.json();
  const allowed = ["DRAFT", "SENT", "ACCEPTED", "REJECTED", "EXPIRED"] as const;
  const status = String(body?.status ?? "");
  if (!allowed.includes(status as (typeof allowed)[number])) {
    return NextResponse.json({ error: "Invalid quote status" }, { status: 400 });
  }
  const quote = await prisma.quote.update({
    where: { id },
    data: { status: status as (typeof allowed)[number] },
    select: { id: true, status: true },
  });
  return NextResponse.json(quote);
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
