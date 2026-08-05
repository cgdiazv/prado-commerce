CREATE TYPE "StorefrontTheme" AS ENUM ('MINIMAL', 'BOLD', 'CLASSIC');

ALTER TABLE "Store"
ADD COLUMN "activeTheme" "StorefrontTheme" NOT NULL DEFAULT 'MINIMAL';
