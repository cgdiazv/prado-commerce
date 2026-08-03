-- AlterTable
ALTER TABLE "MerchantUser" ADD COLUMN "passwordResetTokenId" TEXT;
ALTER TABLE "MerchantUser" ADD COLUMN "passwordResetTokenHash" TEXT;
ALTER TABLE "MerchantUser" ADD COLUMN "passwordResetTokenExpiresAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "MerchantUser_passwordResetTokenId_key" ON "MerchantUser"("passwordResetTokenId");
