import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendQuoteEmail } from "@/lib/email-notifications";
import { getCurrentCashierFromRequest, getCurrentUserFromRequest } from "@/lib/session";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const user = await getCurrentUserFromRequest(request);
    const cashier = getCurrentCashierFromRequest(request);
    if (!user && !cashier) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const quote = await prisma.quote.findFirst({
      where: cashier
        ? { id, storeId: cashier.storeId }
        : { id, store: { ownerUserId: user!.id } },
      include: {
        customer: { select: { firstName: true, lastName: true } },
        store: {
          select: {
            name: true,
            senderName: true,
            senderEmail: true,
            replyToEmail: true,
          },
        },
        items: true,
      },
    });
    if (!quote) return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    if (quote.status === "CONVERTED") {
      return NextResponse.json({ error: "Converted quotes cannot be sent" }, { status: 409 });
    }

    await sendQuoteEmail({
      to: quote.customerEmail,
      customerName: [quote.customer?.firstName, quote.customer?.lastName]
        .filter(Boolean)
        .join(" "),
      store: quote.store,
      quoteNumber: quote.quoteNumber,
      currency: quote.currency,
      subtotal: Number(quote.subtotal),
      tax: Number(quote.tax),
      shipping: Number(quote.shipping),
      total: Number(quote.total),
      validUntil: quote.validUntil,
      notes: quote.notes,
      items: quote.items.map((item) => ({
        title: item.title,
        quantity: item.quantity,
        price: Number(item.price),
      })),
    });

    await prisma.quote.update({
      where: { id: quote.id },
      data: { status: "SENT" },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[QUOTE_SEND_ERROR]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not send quote email" },
      { status: 500 },
    );
  }
}
