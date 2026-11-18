CREATE TYPE "QuoteStatus" AS ENUM (
  'DRAFT',
  'SENT',
  'ACCEPTED',
  'REJECTED',
  'EXPIRED',
  'CONVERTED'
);

CREATE TABLE "Quote" (
  "id" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "quoteNumber" SERIAL NOT NULL,
  "customerId" TEXT,
  "customerEmail" TEXT NOT NULL,
  "status" "QuoteStatus" NOT NULL DEFAULT 'DRAFT',
  "subtotal" DECIMAL(10, 2) NOT NULL,
  "tax" DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  "shipping" DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  "total" DECIMAL(10, 2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "notes" TEXT,
  "validUntil" TIMESTAMP(3),
  "convertedOrderId" TEXT,
  "convertedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Quote_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "QuoteItem" (
  "id" TEXT NOT NULL,
  "quoteId" TEXT NOT NULL,
  "variantId" TEXT,
  "title" TEXT NOT NULL,
  "price" DECIMAL(10, 2) NOT NULL,
  "quantity" INTEGER NOT NULL,
  CONSTRAINT "QuoteItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Quote_quoteNumber_key" ON "Quote"("quoteNumber");
CREATE INDEX "Quote_storeId_idx" ON "Quote"("storeId");
CREATE INDEX "Quote_customerId_idx" ON "Quote"("customerId");
CREATE INDEX "Quote_status_idx" ON "Quote"("status");
CREATE INDEX "Quote_validUntil_idx" ON "Quote"("validUntil");
CREATE INDEX "QuoteItem_quoteId_idx" ON "QuoteItem"("quoteId");
CREATE INDEX "QuoteItem_variantId_idx" ON "QuoteItem"("variantId");

ALTER TABLE "Quote"
  ADD CONSTRAINT "Quote_storeId_fkey"
  FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Quote"
  ADD CONSTRAINT "Quote_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "QuoteItem"
  ADD CONSTRAINT "QuoteItem_quoteId_fkey"
  FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QuoteItem"
  ADD CONSTRAINT "QuoteItem_variantId_fkey"
  FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
