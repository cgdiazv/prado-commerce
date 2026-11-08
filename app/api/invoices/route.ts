import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserFromRequest } from "@/lib/session";
import { resolvePosSettings } from "@/lib/pos/settings";
import { WALK_IN_EMAIL } from "@/lib/pos/customer";
import { calculateTax } from "@/lib/tax";

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
      select: { id: true, currency: true, posSettings: true, taxSettings: true },
    });

    if (!store) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }
    const allowZeroInventorySales = resolvePosSettings(store.posSettings).allowZeroInventorySales === true;

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
      rate: Number(line.rate),
    }));

    if (lines.some((line) => !line.productId || !Number.isFinite(line.quantity) || line.quantity < 1 || !Number.isFinite(line.rate) || line.rate < 0)) {
      return NextResponse.json({ error: "Each invoice line must have a product and a positive whole-number quantity." }, { status: 400 });
    }
    const subtotal = Math.round(lines.reduce((sum, line) => sum + line.rate * line.quantity, 0) * 100) / 100;

    // Verify variants to attach and deduct inventory
    const variantIds = lines.map((l) => l.productId).filter(Boolean);
    const existingVariants = await prisma.productVariant.findMany({
      where: { id: { in: variantIds } },
      select: {
        id: true,
        stockStatus: true,
        inventory: true,
        product: { select: { storeId: true, taxable: true, taxCategoryCode: true } },
      },
    });
    if (existingVariants.some((variant) => variant.product.storeId !== storeId)) {
      return NextResponse.json({ error: "Invoice items must belong to the selected store." }, { status: 400 });
    }
    const validVariantMap = new Map(
      existingVariants.map(({ id, stockStatus, inventory, product }) => [
        id,
        { id, stockStatus, inventory, taxable: product.taxable, taxCategoryCode: product.taxCategoryCode },
      ]),
    );
    const taxCustomer = typeof body.customerId === "string"
      ? await prisma.customer.findFirst({
          where: { id: body.customerId, storeId },
          select: { id: true, email: true, taxExempt: true, creditDays: true },
        })
      : null;
    if (body.customerId && !taxCustomer) {
      return NextResponse.json({ error: "Customer not found in the selected store." }, { status: 400 });
    }
    const taxDestination = body.taxDestination && typeof body.taxDestination === "object"
      ? body.taxDestination as { country?: unknown; region?: unknown }
      : {};
    const calculatedTax = calculateTax(
      store.taxSettings,
      taxDestination,
      lines.map((line) => {
        const product = validVariantMap.get(line.productId);
        return {
          price: line.rate,
          quantity: line.quantity,
          taxable: product?.taxable ?? true,
          taxCategoryCode: product?.taxCategoryCode,
        };
      }),
      0,
      taxCustomer?.taxExempt ?? false,
    );
    const tax = calculatedTax.total;
    const convenienceFee = Math.max(0, Number(body.convenienceFee) || 0);
    const total = Math.round((subtotal + calculatedTax.additionalTax + convenienceFee) * 100) / 100;
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

    let dueDate: Date | null = null;
    if (isCredit) {
      if (body.dueDate) {
        dueDate = new Date(body.dueDate);
      } else {
        const days = taxCustomer?.creditDays || 30;
        dueDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
      }
    }

    // Create Order in database
    let order;
    try {
      order = await prisma.$transaction(async (tx) => {
        let customer = taxCustomer;
        if (!customer) {
          await tx.customer.createMany({
            data: [{ storeId, email: WALK_IN_EMAIL, firstName: "Walk-in Customer" }],
            skipDuplicates: true,
          });
          customer = await tx.customer.findUniqueOrThrow({
            where: { storeId_email: { storeId, email: WALK_IN_EMAIL } },
            select: { id: true, email: true, taxExempt: true, creditDays: true },
          });
        }

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
            customerId: customer.id,
            customerEmail: customer.email,
            status: "COMPLETED",
            paymentStatus: isCredit ? "UNPAID" : "PAID",
            paymentProvider: "pos",
            paymentMethod: rawPaymentMethod,
            fulfillmentStatus: "SHIPPED",
            subtotal,
            tax,
            taxIncluded: calculatedTax.pricesIncludeTax,
            shipping: 0,
            total,
            dueDate,
            currency: store.currency || "USD",
            items: {
              create: lines.map((line, index) => ({
                variantId: validVariantMap.has(line.productId) ? line.productId : null,
                title: line.productName || line.description || "POS Item",
                price: Number(line.rate) || 0,
                quantity: line.quantity,
                tax: calculatedTax.lineTaxes[index],
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
      subtotal,
      tax,
    }, { status: 201 });
  } catch (error) {
    console.error("[POS_INVOICE_CREATE_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to process POS invoice" },
      { status: 500 }
    );
  }
}
