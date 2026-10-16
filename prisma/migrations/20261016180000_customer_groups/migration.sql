-- CreateTable
CREATE TABLE IF NOT EXISTS "CustomerGroup" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerGroup_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "groupId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "CustomerGroup_storeId_name_key" ON "CustomerGroup"("storeId", "name");
CREATE INDEX IF NOT EXISTS "CustomerGroup_storeId_idx" ON "CustomerGroup"("storeId");
CREATE INDEX IF NOT EXISTS "Customer_groupId_idx" ON "Customer"("groupId");

-- AddForeignKey
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'CustomerGroup_storeId_fkey'
    ) THEN
        ALTER TABLE "CustomerGroup" ADD CONSTRAINT "CustomerGroup_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Customer_groupId_fkey'
    ) THEN
        ALTER TABLE "Customer" ADD CONSTRAINT "Customer_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "CustomerGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
