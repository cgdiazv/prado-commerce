import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserFromRequest } from "@/lib/session";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUserFromRequest(request);
    const body = await request.json();

    let storeId = typeof body.storeId === "string" && body.storeId.trim() ? body.storeId.trim() : null;

    if (!storeId && user) {
      const firstStore = await prisma.store.findFirst({
        where: { ownerUserId: user.id },
        select: { id: true },
      });
      storeId = firstStore?.id ?? null;
    }

    if (!storeId) {
      const anyStore = await prisma.store.findFirst({
        select: { id: true },
      });
      storeId = anyStore?.id ?? null;
    }

    if (!storeId) {
      return NextResponse.json({ error: "Store not found" }, { status: 400 });
    }

    const store = await prisma.store.findUnique({
      where: { id: storeId },
      select: { id: true, currency: true },
    });

    if (!store) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }

    const subtotal = Math.max(0, Number(body.subtotal) || 0);
    const tax = Math.max(0, Number(body.isv15) || 0);
    const total = Math.max(0, Number(body.total) || subtotal + tax);
    const rawPaymentMethod = String(body.paymentMethod || "Efectivo").trim();
    const isCredit = body.status === "Pendiente" || rawPaymentMethod.toLowerCase() === "crédito" || rawPaymentMethod.toLowerCase() === "credito";

    // Resolve or upsert customer
    let customerId: string | null = null;
    let customerEmail = "walkin@pos.local";

    if (body.customerId) {
      const existing = await prisma.customer.findFirst({
        where: { id: body.customerId, storeId },
        select: { id: true, email: true },
      });
      if (existing) {
        customerId = existing.id;
        customerEmail = existing.email;
      }
    }

    if (!customerId) {
      const cleanName = String(body.customerName || "Consumidor Final").trim();
      const slugName = cleanName.toLowerCase().replace(/[^a-z0-9]/g, "");
      const generatedEmail = `${slugName || "pos"}-${Date.now().toString().slice(-6)}@pos.local`;
      customerEmail = generatedEmail;

      const newCustomer = await prisma.customer.create({
        data: {
          storeId,
          email: customerEmail,
          firstName: cleanName,
          phone: body.customerPhone || null,
        },
        select: { id: true },
      });
      customerId = newCustomer.id;
    }

    const lines: Array<{
      productId: string;
      sku?: string;
      productName?: string;
      description?: string;
      quantity: number;
      rate: number;
    }> = Array.isArray(body.lines) ? body.lines : [];

    // Verify variants to attach and deduct inventory
    const variantIds = lines.map((l) => l.productId).filter(Boolean);
    const existingVariants = await prisma.productVariant.findMany({
      where: { id: { in: variantIds } },
      select: { id: true, trackInventory: true, inventory: true },
    });
    const validVariantMap = new Map(existingVariants.map((v) => [v.id, v]));

    let dueDate: Date | null = null;
    if (isCredit) {
      if (body.dueDate) {
        dueDate = new Date(body.dueDate);
      } else {
        const custRecord = customerId
          ? await prisma.customer.findUnique({
              where: { id: customerId },
              select: { creditDays: true },
            })
          : null;
        const days = custRecord?.creditDays || 30;
        dueDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
      }
    }

    // Create Order in database
    const order = await prisma.order.create({
      data: {
        storeId,
        customerId,
        customerEmail,
        status: "COMPLETED",
        paymentStatus: isCredit ? "UNPAID" : "PAID",
        paymentProvider: "pos",
        paymentMethod: rawPaymentMethod,
        fulfillmentStatus: "SHIPPED",
        subtotal,
        tax,
        shipping: 0,
        total,
        dueDate,
        currency: store.currency || "USD",
        items: {
          create: lines.map((line) => {
            const hasVariant = validVariantMap.has(line.productId);
            return {
              variantId: hasVariant ? line.productId : null,
              title: line.productName || line.description || "POS Item",
              price: Number(line.rate) || 0,
              quantity: Math.max(1, Number(line.quantity) || 1),
            };
          }),
        },
      },
      select: {
        id: true,
        orderNumber: true,
        total: true,
        createdAt: true,
      },
    });

    // Decrement stock for tracked variants
    for (const line of lines) {
      const variant = validVariantMap.get(line.productId);
      if (variant && variant.trackInventory) {
        try {
          await prisma.productVariant.update({
            where: { id: variant.id },
            data: {
              inventory: {
                decrement: Math.max(1, Number(line.quantity) || 1),
              },
            },
          });
        } catch (stockErr) {
          console.warn("[POS_STOCK_DECREMENT_WARNING]", stockErr);
        }
      }
    }

    return NextResponse.json({
      success: true,
      ticketNumber: body.invoiceNumber || `POS-${order.orderNumber}`,
      orderId: order.id,
      orderNumber: order.orderNumber,
      total: order.total.toString(),
    }, { status: 201 });
  } catch (error) {
    console.error("[POS_INVOICE_CREATE_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to process POS invoice" },
      { status: 500 }
    );
  }
}
