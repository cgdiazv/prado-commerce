-- Add product type support for physical, digital, and service products.
CREATE TYPE "ProductType" AS ENUM ('PHYSICAL', 'DIGITAL', 'SERVICE');

ALTER TABLE "Product"
ADD COLUMN "productType" "ProductType" NOT NULL DEFAULT 'PHYSICAL';
