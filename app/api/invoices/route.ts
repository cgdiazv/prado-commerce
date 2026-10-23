import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserFromRequest } from "@/lib/session";
import { resolvePosSettings } from "@/lib/pos/settings";

class InsufficientInventoryError extends Error {}

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
      select: { id: true, currency: true, posSettings: true },
    });

    if (!store) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }
    const allowZeroInventorySales = resolvePosSettings(store.posSettings).allowZeroInventorySales === true;

    const subtotal = Math.max(0, Number(body.subtotal) || 0);
    const tax = Math.max(0, Number(body.isv15) || 0);
    const total = Math.max(0, Number(body.total) || subtotal + tax);
    const rawPaymentMethod = String(body.paymentMethod || "Efectivo").trim();
    const isCredit = body.status === "Pendiente" || rawPaymentMethod.toLowerCase() === "crédito" || rawPaymentMethod.toLowerCase() === "credito";

    const rawLines: Array<{
      productId: string;
      sku?: string;
      productName?: string;
      description?: string;
      quantity: number;
      rate: number;
    }> = Array.isArray(body.lines) ? body.lines : [];
    const lines = rawLines.map((line) => ({
      ...line,
      quantity: Math.trunc(Number(line.quantity)),
    }));

    if (lines.some((line) => !line.productId || !Number.isFinite(line.quantity) || line.quantity < 1)) {
      return NextResponse.json({ error: "Each invoice line must have a product and a positive whole-number quantity." }, { status: 400 });
    }

    // Verify variants to attach and deduct inventory
    const variantIds = lines.map((l) => l.productId).filter(Boolean);
    const existingVariants = await prisma.productVariant.findMany({
      where: { id: { in: variantIds } },
      select: {
        id: true,
        stockStatus: true,
        inventory: true,
        product: { select: { storeId: true } },
      },
    });
    if (existingVariants.some((variant) => variant.product.storeId !== storeId)) {
      return NextResponse.json({ error: "Invoice items must belong to the selected store." }, { status: 400 });
    }
    const validVariantMap = new Map(
      existingVariants.map(({ id, stockStatus, inventory }) => [
        id,
        { id, stockStatus, inventory },
      ]),
    );
    const requestedQuantities = new Map<string, number>();
    for (const line of lines) {
      if (validVariantMap.has(line.productId)) {
        requestedQuantities.set(
          line.productId,
          (requestedQuantities.get(line.productId) ?? 0) + line.quantity,
        );
      }
    }

    if (!allowZeroInventorySales) {
      for (const [variantId, quantity] of requestedQuantities) {
        const variant = validVariantMap.get(variantId)!;
        if (variant.inventory < quantity) {
          return NextResponse.json(
            { error: `${variant.inventory <= 0 ? "This product is out of stock." : "Insufficient inventory for this product."} Enable zero-inventory sales in POS settings to sell out-of-stock items.` },
            { status: 409 },
          );
        }
      }
    }

    // Resolve or upsert customer only after validating inventory.
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
    let order;
    try {
      order = await prisma.$transaction(async (tx) => {
        for (const [variantId, quantity] of requestedQuantities) {
          const variant = validVariantMap.get(variantId)!;
          if (variant.stockStatus !== "IN_STOCK") continue;

          const decremented = await tx.productVariant.updateMany({
            where: { id: variantId, inventory: { gte: quantity } },
            data: { inventory: { decrement: quantity } },
          });

          if (decremented.count === 0 && !allowZeroInventorySales) {
            throw new InsufficientInventoryError("Insufficient inventory for this product.");
          }

          if (decremented.count === 0 && allowZeroInventorySales) {
            await tx.productVariant.updateMany({
              where: { id: variantId, inventory: { gt: 0 } },
              data: { inventory: 0 },
            });
          }
        }

        return tx.order.create({
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
              create: lines.map((line) => ({
                variantId: validVariantMap.has(line.productId) ? line.productId : null,
                title: line.productName || line.description || "POS Item",
                price: Number(line.rate) || 0,
                quantity: line.quantity,
              })),
            },
          },
          select: {
            id: true,
            orderNumber: true,
            total: true,
            createdAt: true,
          },
        });
      });
    } catch (error) {
      if (error instanceof InsufficientInventoryError) {
        return NextResponse.json({ error: error.message }, { status: 409 });
      }
      throw error;
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
