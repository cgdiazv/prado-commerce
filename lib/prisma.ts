import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const rawConnectionString = process.env.DATABASE_URL;

if (!rawConnectionString) {
  throw new Error("DATABASE_URL is not set");
}

function getEffectiveConnectionString(url: string): string {
  // If Supabase pooler is used on port 5432 (session mode), redirect to port 6543 (transaction mode)
  // to avoid hitting EMAXCONNSESSION (pool_size: 15 limit) in serverless environments like Vercel.
  if (url.includes(".pooler.supabase.com:5432")) {
    let normalized = url.replace(".pooler.supabase.com:5432", ".pooler.supabase.com:6543");
    if (!normalized.includes("pgbouncer=true")) {
      const sep = normalized.includes("?") ? "&" : "?";
      normalized = `${normalized}${sep}pgbouncer=true`;
    }
    return normalized;
  }
  return url;
}

const connectionString = getEffectiveConnectionString(rawConnectionString);

const defaultPoolMax = process.env.NODE_ENV === "production" ? 1 : 5;
const poolMax = process.env.DATABASE_POOL_MAX
  ? Number.parseInt(process.env.DATABASE_POOL_MAX, 10)
  : defaultPoolMax;

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  adapter?: PrismaPg;
};

const adapter =
  globalForPrisma.adapter ??
  new PrismaPg(
    {
      connectionString,
      max: Number.isFinite(poolMax) && poolMax > 0 ? poolMax : defaultPoolMax,
      idleTimeoutMillis: process.env.NODE_ENV === "production" ? 2_000 : 10_000,
      connectionTimeoutMillis: 5_000,
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

