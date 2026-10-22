ALTER TABLE "ProductVariant"
ADD COLUMN IF NOT EXISTS "barcode" TEXT;

CREATE INDEX IF NOT EXISTS "ProductVariant_barcode_idx" ON "ProductVariant"("barcode");
