ALTER TABLE "Store"
ADD COLUMN "welcomeEmailEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "orderConfirmationEmailEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "invoiceEmailEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "senderName" TEXT,
ADD COLUMN "senderEmail" TEXT,
ADD COLUMN "replyToEmail" TEXT;
