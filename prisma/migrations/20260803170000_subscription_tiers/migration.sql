-- Add subscription tier and billing identifiers to merchant users.
ALTER TABLE "MerchantUser"
ADD COLUMN "plan" TEXT NOT NULL DEFAULT 'STARTER',
ADD COLUMN "stripeCustomerId" TEXT,
ADD COLUMN "stripeSubId" TEXT;

CREATE UNIQUE INDEX "MerchantUser_stripeCustomerId_key" ON "MerchantUser"("stripeCustomerId");
CREATE UNIQUE INDEX "MerchantUser_stripeSubId_key" ON "MerchantUser"("stripeSubId");
