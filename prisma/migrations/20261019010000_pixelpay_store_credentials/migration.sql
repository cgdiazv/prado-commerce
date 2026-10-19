-- AlterTable
ALTER TABLE "Store" ADD COLUMN "pixelpayKey" TEXT,
ADD COLUMN "pixelpayAppId" TEXT,
ADD COLUMN "pixelpaySecretEncrypted" TEXT,
ADD COLUMN "pixelpayEnv" TEXT NOT NULL DEFAULT 'sandbox',
ADD COLUMN "pixelpayEndpoint" TEXT;
