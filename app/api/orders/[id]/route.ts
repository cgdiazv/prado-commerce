import { after, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserFromRequest, getCurrentCashierFromRequest } from "@/lib/session";
import { getStoreEmailConfig, sendInvoiceEmail } from "@/lib/email-notifications";
import { syncPaidOrderToShipStation } from "@/lib/shipstation";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(req: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const user = await getCurrentUserFromRequest(req);
    const cashier = getCurrentCashierFromRequest(req);

    if (!user && !cashier) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        store: {
          select: { id: true, ownerUserId: true },
        },
        items: {
          select: {
            variantId: true,
            quantity: true,
            variant: {
              select: {
                id: true,
                stockStatus: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (cashier && order.storeId !== cashier.storeId) {
      return NextResponse.json(
        { error: "Forbidden: You are not authorized to modify orders from another store." },
        { status: 403 },
      );
    }

    if (!cashier && user && order.store.ownerUserId !== user.id) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const body = await req.json();
    const {
      status,
      paymentStatus,
      fulfillmentStatus,
      restock,
      shippingAddress,
      billingAddress,
      shipping,
      tax,
      items,
      sendInvoice,
    } = body as {
      status?: string;
      paymentStatus?: string;
      fulfillmentStatus?: string;
      restock?: boolean;
      shippingAddress?: unknown;
      billingAddress?: unknown;
      shipping?: number | string;
      tax?: number | string;
      sendInvoice?: boolean;
      items?: Array<{
        variantId?: string | null;
        title?: unknown;
        price?: number | string;
        quantity?: number | string;
      }>;
    };

    const isEditingOrderContents =
      items !== undefined ||
      shipping !== undefined ||
      tax !== undefined ||
      shippingAddress !== undefined ||
      billingAddress !== undefined;

    if (isEditingOrderContents) {
      const provider = (order as unknown as { paymentProvider?: string | null }).paymentProvider;
      const hasGatewayTx = Boolean(
        (order as unknown as { stripeSessionId?: string | null }).stripeSessionId ||
          (order as unknown as { stripePaymentId?: string | null }).stripePaymentId ||
          (order as unknown as { gatewayTransactionId?: string | null }).gatewayTransactionId,
      );
      if (provider === "pos" || provider === "stripe" || provider === "authorize_net" || hasGatewayTx) {
        return NextResponse.json(
          { error: "Online gateway and POS orders cannot have their items or totals edited." },
          { status: 403 },
        );
      }
    }

    const updates: Record<string, unknown> = {};

    const validStatuses = ["PENDING", "PROCESSING", "COMPLETED", "CANCELLED"] as const;
    const validPaymentStatuses = ["UNPAID", "PARTIAL", "PAID", "REFUNDED", "FAILED"] as const;
    const validFulfillmentStatuses = ["UNFULFILLED", "SHIPPED"] as const;

    const isOrderStatus = (value: string): value is (typeof validStatuses)[number] =>
      validStatuses.some((statusValue) => statusValue === value);
    const isPaymentStatus = (value: string): value is (typeof validPaymentStatuses)[number] =>
      validPaymentStatuses.some((statusValue) => statusValue === value);
    const isFulfillmentStatus = (value: string): value is (typeof validFulfillmentStatuses)[number] =>
      validFulfillmentStatuses.some((statusValue) => statusValue === value);

    if (status !== undefined) {
      const upperStatus = status.toUpperCase();
      if (!isOrderStatus(upperStatus)) {
        return NextResponse.json({ error: "Invalid order status" }, { status: 400 });
      }
      updates.status = upperStatus;
      if (upperStatus === "COMPLETED" && order.fulfillmentStatus === "UNFULFILLED" && !fulfillmentStatus) {
        updates.fulfillmentStatus = "SHIPPED";
        if (!order.shippedAt) {
          updates.shippedAt = new Date();
        }
      }
    }

    if (paymentStatus !== undefined) {
      const upperPaymentStatus = paymentStatus.toUpperCase();
      if (!isPaymentStatus(upperPaymentStatus)) {
        return NextResponse.json({ error: "Invalid payment status" }, { status: 400 });
      }
      updates.paymentStatus = upperPaymentStatus;
    }

    if (fulfillmentStatus !== undefined) {
      const upperFulfillment = fulfillmentStatus.toUpperCase();
      if (!isFulfillmentStatus(upperFulfillment)) {
        return NextResponse.json({ error: "Invalid fulfillment status" }, { status: 400 });
      }
      updates.fulfillmentStatus = upperFulfillment;
      if (upperFulfillment === "SHIPPED" && !order.shippedAt) {
        updates.shippedAt = new Date();
      }
    }

    if (shippingAddress !== undefined) {
      updates.shippingAddress = shippingAddress ?? null;
    }

    if (billingAddress !== undefined) {
      updates.billingAddress = billingAddress ?? null;
    }

    type ParsedEditItem = {
      variantId: string | null;
      title: string;
      price: number;
      quantity: number;
      costPrice: number | null;
    };
    let parsedEditItems: ParsedEditItem[] | null = null;

    if (items !== undefined) {
      if (!Array.isArray(items) || items.length === 0) {
        return NextResponse.json({ error: "Order must have at least one item" }, { status: 400 });
      }

      const rawParsed: Array<{ variantId: string | null; title: string; price: number; quantity: number }> = [];
      for (const item of items) {
        const title = String(item?.title ?? "").trim();
        const price = Math.round((Number(item?.price ?? 0) || 0) * 100) / 100;
        const quantity = Math.trunc(Number(item?.quantity ?? 0) || 0);
        if (!title || price < 0 || quantity < 1) {
          return NextResponse.json(
            { error: "Each item requires a title, a valid non-negative price, and quantity of at least 1." },
            { status: 400 },
          );
        }
        rawParsed.push({
          variantId: typeof item?.variantId === "string" && item.variantId.trim() ? item.variantId.trim() : null,
          title,
          price,
          quantity,
        });
      }

      const variantIds = Array.from(
        new Set(rawParsed.map((i) => i.variantId).filter((v): v is string => Boolean(v))),
      );
      const variants = variantIds.length > 0
        ? await prisma.productVariant.findMany({
            where: { id: { in: variantIds }, product: { storeId: order.storeId } },
            select: { id: true, costPrice: true },
          })
        : [];
      if (variants.length !== variantIds.length) {
        return NextResponse.json({ error: "One or more selected products do not belong to this store." }, { status: 400 });
      }
      const variantCostMap = new Map(
        variants.map((v) => [v.id, v.costPrice !== null && v.costPrice !== undefined ? Number(v.costPrice) : null]),
      );

      parsedEditItems = rawParsed.map((i) => ({
        ...i,
        costPrice: i.variantId ? (variantCostMap.get(i.variantId) ?? null) : null,
      }));
    }

    const nextSubtotal = parsedEditItems
      ? Math.round(parsedEditItems.reduce((sum, item) => sum + item.price * item.quantity, 0) * 100) / 100
      : Number(order.subtotal);

    const nextShipping = shipping !== undefined
      ? Math.round(Math.max(0, Number(shipping) || 0) * 100) / 100
      : Number(order.shipping);

    const nextTax = tax !== undefined
      ? Math.round(Math.max(0, Number(tax) || 0) * 100) / 100
      : Number(order.tax);

    if (parsedEditItems || shipping !== undefined || tax !== undefined) {
      const taxToAdd = (order as unknown as { taxIncluded?: boolean }).taxIncluded ? 0 : nextTax;
      updates.subtotal = nextSubtotal;
      updates.shipping = nextShipping;
      updates.tax = nextTax;
      updates.total = Math.round((nextSubtotal + nextShipping + taxToAdd) * 100) / 100;
    }

    if (Object.keys(updates).length === 0 && !restock && !parsedEditItems && !sendInvoice) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    let restockedCount = 0;
    const updatedOrder = await prisma.$transaction(async (tx) => {
      if (parsedEditItems) {
        const isCancelledOrRefunded =
          order.status === "CANCELLED" ||
          order.paymentStatus === "REFUNDED" ||
          updates.status === "CANCELLED" ||
          updates.paymentStatus === "REFUNDED";

        if (!isCancelledOrRefunded) {
          const oldQtyByVariant = new Map<string, number>();
          for (const item of order.items) {
            if (item.variantId) {
              oldQtyByVariant.set(item.variantId, (oldQtyByVariant.get(item.variantId) ?? 0) + item.quantity);
            }
          }
          const newQtyByVariant = new Map<string, number>();
          for (const item of parsedEditItems) {
            if (item.variantId) {
              newQtyByVariant.set(item.variantId, (newQtyByVariant.get(item.variantId) ?? 0) + item.quantity);
            }
          }
          const allVariantIds = new Set([...oldQtyByVariant.keys(), ...newQtyByVariant.keys()]);
          for (const variantId of allVariantIds) {
            const delta = (newQtyByVariant.get(variantId) ?? 0) - (oldQtyByVariant.get(variantId) ?? 0);
            if (delta > 0) {
              await tx.productVariant.updateMany({
                where: { id: variantId, stockStatus: "IN_STOCK" },
                data: { inventory: { decrement: delta } },
              });
            } else if (delta < 0) {
              await tx.productVariant.updateMany({
                where: { id: variantId, stockStatus: "IN_STOCK" },
                data: { inventory: { increment: Math.abs(delta) } },
              });
            }
          }
        }

        await tx.orderItem.deleteMany({ where: { orderId: id } });
        await tx.orderItem.createMany({
          data: parsedEditItems.map((item) => ({
            orderId: id,
            variantId: item.variantId,
            title: item.title,
            price: item.price,
            quantity: item.quantity,
            costPrice: item.costPrice ?? null,
          })),
        });
      }

      const saved = Object.keys(updates).length > 0
        ? await tx.order.update({
            where: { id },
            data: updates,
            include: { items: true },
          })
        : await tx.order.findUniqueOrThrow({
            where: { id },
            include: { items: true },
          });

      if (restock) {
        for (const item of order.items) {
          if (item.variantId && item.variant?.stockStatus !== "ON_BACKORDER") {
            await tx.productVariant.update({
              where: { id: item.variantId },
              data: {
                inventory: {
                  increment: item.quantity,
                },
              },
            });
            restockedCount += item.quantity;
          }
        }
      }

      return saved;
    });

    const becamePaid = updates.paymentStatus === "PAID" && order.paymentStatus !== "PAID";
    const becameCompleted = updates.status === "COMPLETED" && order.status !== "COMPLETED";

    if (sendInvoice || becamePaid || becameCompleted) {
      const storeConfig = await getStoreEmailConfig(order.storeId);

      if (storeConfig && (sendInvoice || storeConfig.invoiceEmailEnabled)) {
        try {
          await sendInvoiceEmail({
            store: storeConfig,
            to: order.customerEmail,
            orderNumber: updatedOrder.orderNumber,
            subtotal: Number(updatedOrder.subtotal),
            tax: Number(updatedOrder.tax),
            shipping: Number(updatedOrder.shipping),
            total: Number(updatedOrder.total),
            currency: updatedOrder.currency,
            items: updatedOrder.items.map((item) => ({
              title: item.title,
              quantity: item.quantity,
              price: Number(item.price),
            })),
          });
        } catch (emailError) {
          console.error("[INVOICE_EMAIL_ERROR]", emailError);
          if (sendInvoice) {
            return NextResponse.json(
              { error: emailError instanceof Error ? emailError.message : "Failed to send invoice email" },
              { status: 500 },
            );
          }
        }
      }
    }

    if (becamePaid) {
      after(() => syncPaidOrderToShipStation(updatedOrder.id).catch((error) => {
        console.error("[SHIPSTATION_ORDER_SYNC_ERROR]", error);
      }));
    }

    return NextResponse.json({
      ok: true,
      order: {
        id: updatedOrder.id,
        status: updatedOrder.status,
        paymentStatus: updatedOrder.paymentStatus,
        fulfillmentStatus: updatedOrder.fulfillmentStatus,
        subtotal: updatedOrder.subtotal.toString(),
        tax: updatedOrder.tax.toString(),
        shipping: updatedOrder.shipping.toString(),
        total: updatedOrder.total.toString(),
        shippingAddress: updatedOrder.shippingAddress,
        billingAddress: updatedOrder.billingAddress,
        items: updatedOrder.items.map((item) => ({
          id: item.id,
          variantId: item.variantId ?? null,
          title: item.title,
          price: item.price.toString(),
          quantity: item.quantity,
        })),
      },
      restocked: Boolean(restock),
      restockedCount,
    });
  } catch (error) {
    console.error("[ORDER_PATCH_ERROR]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
