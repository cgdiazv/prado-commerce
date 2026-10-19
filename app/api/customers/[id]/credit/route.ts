import { prisma } from "@/lib/prisma";
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
    return true;
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
      select: { id: true, storeId: true, expiresAt: true },
    });

    if (apiKey && apiKey.storeId === customerStoreId && (!apiKey.expiresAt || apiKey.expiresAt > new Date())) {
      prisma.apiKey.update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } }).catch(() => {});
      return true;
    }
  }

  // 3. Merchant Session
  const user = await getCurrentUserFromRequest(request);
  if (user && storeOwnerUserId === user.id) {
    return true;
  }

  return false;
}

export async function GET(req: Request, { params }: RouteContext) {
  try {
    const { id } = await params;

    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        store: {
          select: {
            id: true,
            name: true,
            currency: true,
            ownerUserId: true,
            lateInterestRate: true,
            lateInterestGraceDays: true,
          },
        },
      },
    });

    if (!customer) {
      return corsJson({ error: "Customer not found" }, { status: 404 });
    }

    const hasAccess = await verifyAccess(req, customer.storeId, customer.store.ownerUserId);
    if (!hasAccess) {
      return corsJson({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch all non-cancelled orders for this customer
    const orders = await prisma.order.findMany({
      where: {
        customerId: customer.id,
        status: { not: "CANCELLED" },
      },
      orderBy: { createdAt: "desc" },
      include: {
        payments: {
          orderBy: { paidAt: "desc" },
        },
      },
    });

    // Fetch all payments made by this customer
    const payments = await prisma.customerPayment.findMany({
      where: { customerId: customer.id },
      orderBy: { paidAt: "desc" },
      include: {
        order: {
          select: { orderNumber: true },
        },
      },
    });

    const now = new Date();
    const effectiveMonthlyRate =
      Number(customer.creditInterestRate) > 0
        ? Number(customer.creditInterestRate)
        : Number(customer.store.lateInterestRate ?? 0);

    const creditDays = customer.creditDays > 0 ? customer.creditDays : (customer.store.lateInterestGraceDays || 30);

    let totalDebt = 0;
    let totalInterestDue = 0;
    let overdueInvoicesCount = 0;

    const calculatedInvoices = orders.map((order) => {
      const total = Number(order.total);
      const totalPaid = order.payments.reduce((sum, p) => sum + Number(p.amount), 0);
      const balance = Math.max(0, Math.round((total - totalPaid) * 100) / 100);

      const issueDate = new Date(order.createdAt);
      const dueDate = order.dueDate
        ? new Date(order.dueDate)
        : new Date(issueDate.getTime() + creditDays * 24 * 60 * 60 * 1000);

      let daysOverdue = 0;
      let isOverdue = false;
      let interestDue = 0;

      if (balance > 0.01 && now.getTime() > dueDate.getTime()) {
        isOverdue = true;
        daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (24 * 60 * 60 * 1000));

        if (daysOverdue > 0 && effectiveMonthlyRate > 0) {
          // Monthly interest: (Annual / 12) or flat monthly rate pro-rated by days (days / 30)
          interestDue = Math.round(balance * (effectiveMonthlyRate / 100) * (daysOverdue / 30) * 100) / 100;
        }
        overdueInvoicesCount++;
      }

      const totalDue = Math.round((balance + interestDue) * 100) / 100;

      if (balance > 0.01) {
        totalDebt += balance;
        totalInterestDue += interestDue;
      }

      return {
        orderId: order.id,
        orderNumber: order.orderNumber,
        issueDate: issueDate.toISOString(),
        dueDate: dueDate.toISOString(),
        daysOverdue,
        isOverdue,
        total,
        totalPaid,
        balance,
        interestDue,
        totalDue,
        currency: order.currency,
        status: order.status,
        paymentStatus: order.paymentStatus,
      };
    });

    const creditLimit = Number(customer.creditLimit);
    const availableCredit = Math.max(0, Math.round((creditLimit - totalDebt) * 100) / 100);

    const serializedPayments = payments.map((p) => ({
      id: p.id,
      storeId: p.storeId,
      customerId: p.customerId,
      orderId: p.orderId,
      orderNumber: p.order?.orderNumber ?? null,
      amount: Number(p.amount),
      interestAmount: Number(p.interestAmount),
      paymentMethod: p.paymentMethod,
      reference: p.reference,
      notes: p.notes,
      receivedBy: p.receivedBy,
      paidAt: p.paidAt.toISOString(),
      createdAt: p.createdAt.toISOString(),
    }));

    return corsJson({
      allowCredit: customer.allowCredit,
      creditLimit,
      creditDays,
      creditInterestRate: Number(customer.creditInterestRate),
      storeDefaultLateRate: Number(customer.store.lateInterestRate ?? 0),
      totalDebt: Math.round(totalDebt * 100) / 100,
      totalInterestDue: Math.round(totalInterestDue * 100) / 100,
      availableCredit,
      overdueInvoicesCount,
      invoices: calculatedInvoices,
      payments: serializedPayments,
    });
  } catch (error) {
    console.error("[CUSTOMER_CREDIT_GET_ERROR]", error);
    return corsJson({ error: "Failed to fetch customer credit summary" }, { status: 500 });
  }
}
