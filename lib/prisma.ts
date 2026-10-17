import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const poolMax = process.env.DATABASE_POOL_MAX
  ? Number.parseInt(process.env.DATABASE_POOL_MAX, 10)
  : 5;

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  adapter?: PrismaPg;
};

const adapter =
  globalForPrisma.adapter ??
  new PrismaPg(
    {
      connectionString,
      max: Number.isFinite(poolMax) && poolMax > 0 ? poolMax : 5,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 10_000,
    },
    {
      onPoolError: (err) => {
        console.error("[PRISMA_POOL_ERROR]", err);
      },
      onConnectionError: (err) => {
        console.error("[PRISMA_CONNECTION_ERROR]", err);
      },
    },
  );

const existingPrisma = globalForPrisma.prisma;
const isStalePrisma =
  Boolean(existingPrisma) &&
  (typeof (existingPrisma as unknown as Record<string, unknown>).customerGroup === "undefined" ||
    typeof (existingPrisma as unknown as Record<string, unknown>).purchaseOrder === "undefined" ||
    typeof (existingPrisma as unknown as Record<string, unknown>).vendor === "undefined");

if (isStalePrisma) {
  (existingPrisma as unknown as { $disconnect?: () => Promise<void> }).$disconnect?.().catch(() => {});
}

export const prisma =
  existingPrisma && !isStalePrisma
    ? existingPrisma
    : new PrismaClient({
        adapter,
        log:
          process.env.NODE_ENV === "development"
            ? ["query", "error", "warn"]
            : ["error"],
      });

globalForPrisma.adapter = adapter;
globalForPrisma.prisma = prisma;

