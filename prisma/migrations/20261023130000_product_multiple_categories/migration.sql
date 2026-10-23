CREATE TABLE "_ProductCategories" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_ProductCategories_AB_pkey" PRIMARY KEY ("A", "B")
);

INSERT INTO "_ProductCategories" ("A", "B")
SELECT "categoryId", "id"
FROM "Product"
WHERE "categoryId" IS NOT NULL
ON CONFLICT DO NOTHING;

CREATE INDEX "_ProductCategories_B_index" ON "_ProductCategories"("B");

ALTER TABLE "_ProductCategories"
ADD CONSTRAINT "_ProductCategories_A_fkey"
FOREIGN KEY ("A") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "_ProductCategories"
ADD CONSTRAINT "_ProductCategories_B_fkey"
FOREIGN KEY ("B") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
