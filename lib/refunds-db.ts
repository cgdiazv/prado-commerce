import { randomBytes } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type RefundItemSnapshot = {
  itemId?: string;
  variantId?: string | null;
  title: string;
  quantity: number;
  price: number;
};

export type RefundListEntry = {
  id: string;
  refundNumber: number;
  storeId: string;
  storeName: string;
  orderId: string;
  orderNumber: number;
  customerEmail: string;
  customerName: string | null;
  orderTotal: string;
  orderStatus: string;
  type: "FULL" | "PARTIAL";
  amount: string;
  currency: string;
  restockedUnits: number;
  reason: string | null;
  items: RefundItemSnapshot[];
  processedBy: string | null;
  createdAt: string;
};

type RawRefundJoinedRow = {
  id: string;
  refundNumber: number;
  storeId: string;
  storeName: string;
  orderId: string;
  orderNumber: number;
  customerEmail: string;
  customerFirstName: string | null;
  customerLastName: string | null;
  orderTotal: Prisma.Decimal | number | string;
  orderStatus: string;
  type: "FULL" | "PARTIAL";
  amount: Prisma.Decimal | number | string;
  currency: string;
  restockedUnits: number;
  reason: string | null;
  items: unknown;
  processedBy: string | null;
  createdAt: Date | string;
};

type SqlExecutor = {
  $queryRaw: typeof prisma.$queryRaw;
  $executeRaw: typeof prisma.$executeRaw;
};

function generateRefundId(): string {
  return `ref_${Date.now().toString(36)}_${randomBytes(6).toString("hex")}`;
}

export async function insertRefundRecord(
  executor: SqlExecutor,
  input: {
    storeId: string;
    orderId: string;
    type: "FULL" | "PARTIAL";
    amount: number | string | Prisma.Decimal;
    currency: string;
    restockedUnits: number;
    reason?: string | null;
    items?: RefundItemSnapshot[];
    processedBy?: string | null;
    createdAt?: Date;
  },
): Promise<{
  id: string;
  refundNumber: number;
  storeId: string;
  orderId: string;
  type: "FULL" | "PARTIAL";
  amount: string;
  currency: string;
  restockedUnits: number;
  reason: string | null;
  items: RefundItemSnapshot[];
  processedBy: string | null;
  createdAt: Date;
}> {
  const id = generateRefundId();
  const amountNum = Number(input.amount) || 0;
  const itemsJson = JSON.stringify(input.items ?? []);
  const createdAt = input.createdAt ?? new Date();
  const reason = input.reason && input.reason.trim() ? input.reason.trim() : null;
  const processedBy = input.processedBy ?? null;

  const rows = await executor.$queryRaw<
    Array<{
      id: string;
      refundNumber: number;
      storeId: string;
      orderId: string;
      type: "FULL" | "PARTIAL";
      amount: Prisma.Decimal | number | string;
      currency: string;
      restockedUnits: number;
      reason: string | null;
      items: unknown;
      processedBy: string | null;
      createdAt: Date;
    }>
  >`
    INSERT INTO "Refund" (
      "id",
      "storeId",
      "orderId",
      "type",
      "amount",
      "currency",
      "restockedUnits",
      "reason",
      "items",
      "processedBy",
      "createdAt",
      "updatedAt"
    )
    VALUES (
      ${id},
      ${input.storeId},
      ${input.orderId},
      CAST(${input.type} AS "RefundType"),
      ${amountNum},
      ${input.currency || "USD"},
      ${Math.trunc(input.restockedUnits) || 0},
      ${reason},
      CAST(${itemsJson} AS JSONB),
      ${processedBy},
      ${createdAt},
      NOW()
    )
    RETURNING
      "id",
      "refundNumber",
      "storeId",
      "orderId",
      "type",
      "amount",
      "currency",
      "restockedUnits",
      "reason",
      "items",
      "processedBy",
      "createdAt"
  `;

  const row = rows[0];
  return {
    id: row.id,
    refundNumber: Number(row.refundNumber),
    storeId: row.storeId,
    orderId: row.orderId,
    type: row.type,
    amount: Number(row.amount).toFixed(2),
    currency: row.currency,
    restockedUnits: Number(row.restockedUnits) || 0,
    reason: row.reason,
    items: Array.isArray(row.items) ? (row.items as RefundItemSnapshot[]) : [],
    processedBy: row.processedBy,
    createdAt: row.createdAt instanceof Date ? row.createdAt : new Date(row.createdAt),
  };
}

export async function backfillLegacyRefundedOrders(
  storeIds: string[],
  processedBy?: string | null,
): Promise<void> {
  if (storeIds.length === 0) return;

  const refundedOrders = await prisma.order.findMany({
    where: {
      storeId: { in: storeIds },
      paymentStatus: "REFUNDED",
    },
    include: {
      items: {
        select: {
          id: true,
          variantId: true,
          title: true,
          price: true,
          quantity: true,
        },
      },
    },
  });

  if (refundedOrders.length === 0) return;

  const existingRows = await prisma.$queryRaw<Array<{ orderId: string }>>`
    SELECT DISTINCT "orderId"
    FROM "Refund"
    WHERE "storeId" IN (${Prisma.join(storeIds)})
  `;

  const existingOrderIds = new Set(existingRows.map((r) => r.orderId));

  for (const order of refundedOrders) {
    if (existingOrderIds.has(order.id)) continue;
    const totalUnits = order.items.reduce((sum, item) => sum + item.quantity, 0);
    await insertRefundRecord(prisma, {
      storeId: order.storeId,
      orderId: order.id,
      type: "FULL",
      amount: Number(order.total),
      currency: order.currency,
      restockedUnits: totalUnits,
      reason: null,
      items: order.items.map((item) => ({
        itemId: item.id,
        variantId: item.variantId ?? null,
        title: item.title,
        quantity: item.quantity,
        price: Number(item.price),
      })),
      processedBy: processedBy ?? null,
      createdAt: order.updatedAt,
    });
  }
}

export async function listRefundsForStores(storeIds: string[]): Promise<RefundListEntry[]> {
  if (storeIds.length === 0) return [];

  const rows = await prisma.$queryRaw<RawRefundJoinedRow[]>`
    SELECT
      r."id",
      r."refundNumber",
      r."storeId",
      s."name" AS "storeName",
      r."orderId",
      o."orderNumber",
      o."customerEmail",
      c."firstName" AS "customerFirstName",
      c."lastName" AS "customerLastName",
      o."total" AS "orderTotal",
      CAST(o."status" AS TEXT) AS "orderStatus",
      CAST(r."type" AS TEXT) AS "type",
      r."amount",
      r."currency",
      r."restockedUnits",
      r."reason",
      r."items",
      r."processedBy",
      r."createdAt"
    FROM "Refund" r
    INNER JOIN "Store" s ON s."id" = r."storeId"
    INNER JOIN "Order" o ON o."id" = r."orderId"
    LEFT JOIN "Customer" c ON c."id" = o."customerId"
    WHERE r."storeId" IN (${Prisma.join(storeIds)})
    ORDER BY r."createdAt" DESC
  `;

  return rows.map((row) => ({
    id: row.id,
    refundNumber: Number(row.refundNumber),
    storeId: row.storeId,
    storeName: row.storeName,
    orderId: row.orderId,
    orderNumber: Number(row.orderNumber),
    customerEmail: row.customerEmail,
    customerName:
      [row.customerFirstName, row.customerLastName].filter(Boolean).join(" ") || null,
    orderTotal: Number(row.orderTotal).toFixed(2),
    orderStatus: row.orderStatus,
    type: row.type === "PARTIAL" ? "PARTIAL" : "FULL",
    amount: Number(row.amount).toFixed(2),
    currency: row.currency,
    restockedUnits: Number(row.restockedUnits) || 0,
    reason: row.reason,
    items: Array.isArray(row.items) ? (row.items as RefundItemSnapshot[]) : [],
    processedBy: row.processedBy,
    createdAt:
      row.createdAt instanceof Date
        ? row.createdAt.toISOString()
        : new Date(row.createdAt).toISOString(),
  }));
}

export async function findRefundWithStoreOwner(id: string): Promise<{
  id: string;
  storeId: string;
  ownerUserId: string | null;
  ownerId: string;
} | null> {
  const rows = await prisma.$queryRaw<
    Array<{
      id: string;
      storeId: string;
      ownerUserId: string | null;
      ownerId: string;
    }>
  >`
    SELECT
      r."id",
      r."storeId",
      s."ownerUserId",
      s."ownerId"
    FROM "Refund" r
    INNER JOIN "Store" s ON s."id" = r."storeId"
    WHERE r."id" = ${id}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function updateRefundReasonById(
  id: string,
  reason: string | null,
): Promise<string | null> {
  const normalized = reason && reason.trim() ? reason.trim() : null;
  await prisma.$executeRaw`
    UPDATE "Refund"
    SET "reason" = ${normalized}, "updatedAt" = NOW()
    WHERE "id" = ${id}
  `;
  return normalized;
}

export async function deleteRefundById(id: string): Promise<void> {
  await prisma.$executeRaw`
    DELETE FROM "Refund"
    WHERE "id" = ${id}
  `;
}
