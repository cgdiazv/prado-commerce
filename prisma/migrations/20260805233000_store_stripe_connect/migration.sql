ALTER TABLE "Store"
ADD COLUMN IF NOT EXISTS "stripeConnectAccountId" TEXT,
ADD COLUMN IF NOT EXISTS "stripeChargesEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "stripePayoutsEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "stripeDetailsSubmitted" BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS "Store_stripeConnectAccountId_key" ON "Store"("stripeConnectAccountId");
