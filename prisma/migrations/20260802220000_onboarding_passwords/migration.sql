-- AlterTable
ALTER TABLE "MerchantUser" ADD COLUMN "company" TEXT;
ALTER TABLE "MerchantUser" ADD COLUMN "passwordHash" TEXT;
ALTER TABLE "MerchantUser" ADD COLUMN "passwordSetAt" TIMESTAMP(3);
ALTER TABLE "MerchantUser" ADD COLUMN "onboardingTokenId" TEXT;
ALTER TABLE "MerchantUser" ADD COLUMN "onboardingTokenHash" TEXT;
ALTER TABLE "MerchantUser" ADD COLUMN "onboardingTokenExpiresAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "MerchantUser_onboardingTokenId_key" ON "MerchantUser"("onboardingTokenId");

-- AlterTable
ALTER TABLE "AccountRequest" ADD COLUMN "approvedAt" TIMESTAMP(3);
