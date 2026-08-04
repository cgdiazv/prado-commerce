-- AlterTable
ALTER TABLE "MerchantUser" ADD COLUMN IF NOT EXISTS "passwordResetTokenId" TEXT;
ALTER TABLE "MerchantUser" ADD COLUMN IF NOT EXISTS "passwordResetTokenHash" TEXT;
ALTER TABLE "MerchantUser" ADD COLUMN IF NOT EXISTS "passwordResetTokenExpiresAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "MerchantUser_passwordResetTokenId_key" ON "MerchantUser"("passwordResetTokenId");
