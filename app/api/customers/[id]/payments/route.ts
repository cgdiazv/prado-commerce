import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getCurrentUserFromRequest, getCurrentCashierFromRequest } from "@/lib/session";
import { corsJson, withCorsHeaders } from "@/lib/api-cors";

export async function OPTIONS() {
  return withCorsHeaders(new Response(null, { status: 204 }));
}

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

async function verifyAccess(request: Request, customerStoreId: string, storeOwnerUserId: string | null) {
  // 1. Cashier Session
  const cashier = getCurrentCashierFromRequest(request);
  if (cashier && cashier.storeId === customerStoreId) {
    return { authorized: true, userOrCashierName: cashier.cashierName };
  }

  // 2. Secret Key or Header Key
  const authHeader = request.headers.get("authorization") || request.headers.get("Authorization");
  const secretKeyHeader = request.headers.get("x-secret-key") || request.headers.get("x-api-key");
  let token: string | null = null;

  if (authHeader?.startsWith("Bearer ") || authHeader?.startsWith("bearer ")) {
    token = authHeader.slice(7).trim();
  } else if (secretKeyHeader) {
    token = secretKeyHeader.trim();
  }

  if (token) {
    const apiKey = await prisma.apiKey.findFirst({
      where: { key: token, type: "SECRET" },
      select: { id: true, storeId: true, name: true, expiresAt: true },
    });

    if (apiKey && apiKey.storeId === customerStoreId && (!apiKey.expiresAt || apiKey.expiresAt > new Date())) {
      prisma.apiKey.update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } }).catch(() => {});
      return { authorized: true, userOrCashierName: `API: ${apiKey.name}` };
    }
  }

  // 3. Merchant Session
  const user = await getCurrentUserFromRequest(request);
  if (user && storeOwnerUserId === user.id) {
    return { authorized: true, userOrCashierName: user.name || user.email };
  }

  return { authorized: false, userOrCashierName: null };
}

export async function POST(req: Request, { params }: RouteContext) {
  try {
    const { id: customerId } = await params;

    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        store: {
          select: {
            id: true,
            ownerUserId: true,
          },
        },
      },
    });

    if (!customer) {
      return corsJson({ error: "Customer not found" }, { status: 404 });
    }

    const auth = await verifyAccess(req, customer.storeId, customer.store.ownerUserId);
    if (!auth.authorized) {
      return corsJson({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const rawAmount = parseFloat(body.amount);
    const rawInterest = parseFloat(body.interestAmount || body.interestPaid || "0");
    const paymentMethod = String(body.paymentMethod || "CASH").toUpperCase();
    const reference = body.reference ? String(body.reference).trim() : null;
    const notes = body.notes ? String(body.notes).trim() : null;
    const orderId = body.orderId ? String(body.orderId).trim() : null;
    const paidAt = body.paidAt ? new Date(body.paidAt) : new Date();
    const receivedBy = String(body.receivedBy || auth.userOrCashierName || "").trim() || null;

    if (isNaN(rawAmount) || rawAmount <= 0) {
      return corsJson({ error: "El monto del pago debe ser mayor que cero." }, { status: 400 });
    }

    const interestAmount = isNaN(rawInterest) || rawInterest < 0 ? 0 : rawInterest;

    // SCENARIO 1: Pago dirigido a una orden específica
    if (orderId) {
      const order = await prisma.order.findFirst({
        where: {
          id: orderId,
          customerId: customer.id,
          storeId: customer.storeId,
        },
        include: {
          payments: true,
        },
      });

      if (!order) {
        return corsJson({ error: "Factura u orden no encontrada para este cliente." }, { status: 404 });
      }

      const createdPayment = await prisma.customerPayment.create({
        data: {
          storeId: customer.storeId,
          customerId: customer.id,
          orderId: order.id,
          amount: new Prisma.Decimal(rawAmount),
          interestAmount: new Prisma.Decimal(interestAmount),
          paymentMethod,
          reference,
          notes,
          receivedBy,
          paidAt,
        },
      });

      // Recalculate order status
      const existingPaid = order.payments.reduce((sum, p) => sum + Number(p.amount), 0);
      const newTotalPaid = existingPaid + rawAmount;
      const orderTotal = Number(order.total);

      let newPaymentStatus: "PAID" | "PARTIAL" = "PARTIAL";
      if (newTotalPaid >= orderTotal - 0.01) {
        newPaymentStatus = "PAID";
      }

      await prisma.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: newPaymentStatus,
          interestAmount: new Prisma.Decimal(Number(order.interestAmount || 0) + interestAmount),
        },
      });

      return corsJson({
        ok: true,
        payment: {
          id: createdPayment.id,
          amount: Number(createdPayment.amount),
          interestAmount: Number(createdPayment.interestAmount),
          paymentMethod: createdPayment.paymentMethod,
          orderId: createdPayment.orderId,
          orderNumber: order.orderNumber,
          paidAt: createdPayment.paidAt.toISOString(),
        },
        newPaymentStatus,
      }, { status: 201 });
    }

    // SCENARIO 2: Abono general a cuenta (FIFO sobre órdenes pendientes)
    const unpaidOrders = await prisma.order.findMany({
      where: {
        customerId: customer.id,
        storeId: customer.storeId,
        paymentStatus: { in: ["UNPAID", "PARTIAL"] },
        status: { not: "CANCELLED" },
      },
      orderBy: { createdAt: "asc" },
      include: {
        payments: true,
      },
    });

    let remainingToApply = rawAmount;
    let remainingInterest = interestAmount;
    const createdPayments = [];

    for (const ord of unpaidOrders) {
      if (remainingToApply <= 0) break;

      const totalPaidAlready = ord.payments.reduce((sum, p) => sum + Number(p.amount), 0);
      const balance = Math.max(0, Number(ord.total) - totalPaidAlready);

      if (balance <= 0.01) continue;

      const appliedToThisOrder = Math.min(remainingToApply, balance);
      const interestForThis = remainingInterest > 0 ? remainingInterest : 0;
      remainingInterest = 0; // attach all interest to the first applied payment

      const pmt = await prisma.customerPayment.create({
        data: {
          storeId: customer.storeId,
          customerId: customer.id,
          orderId: ord.id,
          amount: new Prisma.Decimal(appliedToThisOrder),
          interestAmount: new Prisma.Decimal(interestForThis),
          paymentMethod,
          reference,
          notes: notes ? `${notes} (Aplicado a Factura #${ord.orderNumber})` : `Aplicado a Factura #${ord.orderNumber}`,
          receivedBy,
          paidAt,
        },
      });

      createdPayments.push(pmt);
      remainingToApply -= appliedToThisOrder;

      const orderUpdatedPaid = totalPaidAlready + appliedToThisOrder;
      const orderTotal = Number(ord.total);
      const isNowFullyPaid = orderUpdatedPaid >= orderTotal - 0.01;

      await prisma.order.update({
        where: { id: ord.id },
        data: {
          paymentStatus: isNowFullyPaid ? "PAID" : "PARTIAL",
          interestAmount: new Prisma.Decimal(Number(ord.interestAmount || 0) + interestForThis),
        },
      });
    }

    // If there is still remaining payment that exceeds all pending debt:
    if (remainingToApply > 0 || createdPayments.length === 0) {
      const pmt = await prisma.customerPayment.create({
        data: {
          storeId: customer.storeId,
          customerId: customer.id,
          orderId: null,
          amount: new Prisma.Decimal(remainingToApply),
          interestAmount: new Prisma.Decimal(remainingInterest),
          paymentMethod,
          reference,
          notes: notes ? `${notes} (Abono anticipado / Saldo a favor)` : "Abono general a cuenta",
          receivedBy,
          paidAt,
        },
      });
      createdPayments.push(pmt);
    }

    return corsJson({
      ok: true,
      paymentsCount: createdPayments.length,
      totalApplied: rawAmount,
      payments: createdPayments.map((p) => ({
        id: p.id,
        amount: Number(p.amount),
        interestAmount: Number(p.interestAmount),
        orderId: p.orderId,
        paymentMethod: p.paymentMethod,
        paidAt: p.paidAt.toISOString(),
      })),
    }, { status: 201 });
  } catch (error) {
    console.error("[CUSTOMER_PAYMENT_POST_ERROR]", error);
    return corsJson({ error: "Failed to record customer payment" }, { status: 500 });
  }
}
