ALTER TABLE "Customer"
ADD COLUMN "passwordResetTokenId" TEXT,
ADD COLUMN "passwordResetTokenHash" TEXT,
ADD COLUMN "passwordResetTokenExpiresAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "Customer_passwordResetTokenId_key" ON "Customer"("passwordResetTokenId");