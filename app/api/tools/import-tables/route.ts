import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUserFromRequest } from "@/lib/session";
import { getPlanLimits, getPlanOrDefault } from "@/lib/subscription";

type SupportedTable = "categories" | "products" | "customers";

type ImportRow = Record<string, unknown>;

type ImportError = {
  row: number;
  message: string;
};

type ImportSummary = {
  table: SupportedTable;
  totalRows: number;
  processed: number;
  created: number;
  updated: number;
  skipped: number;
  errors: ImportError[];
};

const SUPPORTED_TABLES: SupportedTable[] = ["categories", "products", "customers"];
const IMPORT_CONCURRENCY = 50;

function isSupportedTable(value: unknown): value is SupportedTable {
  return typeof value === "string" && SUPPORTED_TABLES.includes(value as SupportedTable);
}

function toSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function normalizeRow(row: ImportRow) {
  const normalized = new Map<string, unknown>();

  for (const [key, value] of Object.entries(row)) {
    normalized.set(normalizeKey(key), value);
  }

  return normalized;
}

async function processRowsInBatches(
  rows: ImportRow[],
  getKey: (row: ImportRow, index: number) => string,
  processRow: (row: ImportRow, index: number) => Promise<void>,
) {
  const groupedRows = new Map<string, Array<{ row: ImportRow; index: number }>>();

  rows.forEach((row, index) => {
    const key = getKey(row, index);
    const group = groupedRows.get(key) ?? [];
    group.push({ row, index });
    groupedRows.set(key, group);
  });

  const groups = [...groupedRows.values()];

  for (let index = 0; index < groups.length; index += IMPORT_CONCURRENCY) {
    const batch = groups.slice(index, index + IMPORT_CONCURRENCY);
    await Promise.all(
      batch.map(async (group) => {
        for (const item of group) {
          await processRow(item.row, item.index);
        }
      }),
    );
  }
}

function rowValue(row: Map<string, unknown>, aliases: string[]) {
  for (const alias of aliases) {
    const value = row.get(normalizeKey(alias));

    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return value;
    }
  }

  return null;
}

function hasRowValue(row: Map<string, unknown>, aliases: string[]) {
  return aliases.some((alias) => row.has(normalizeKey(alias)));
}

function asString(value: unknown) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim();
}

function asOptionalString(value: unknown) {
  const parsed = asString(value);
  return parsed ? parsed : null;
}

function parseLookupCodes(value: unknown) {
  const codes = asString(value)
    .split(";")
    .map((code) => code.trim())
    .filter(Boolean);
  const uniqueCodes = [...new Set(codes)];
  return uniqueCodes.length > 0 ? uniqueCodes.join(";") : null;
}

function asNumber(value: unknown, fallback = 0) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : fallback;
  }

  const parsed = Number.parseFloat(asString(value));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function asInteger(value: unknown, fallback = 0) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? Math.trunc(value) : fallback;
  }

  const parsed = Number.parseInt(asString(value), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function asBoolean(value: unknown, fallback = false) {
  const parsed = asString(value).toLowerCase();

  if (!parsed) {
    return fallback;
  }

  if (["true", "1", "yes", "y", "on"].includes(parsed)) {
    return true;
  }

  if (["false", "0", "no", "n", "off"].includes(parsed)) {
    return false;
  }

  return fallback;
}

function buildAddress(row: Map<string, unknown>, prefix: "shipping" | "billing") {
  const line1 = asOptionalString(rowValue(row, [`${prefix}AddressLine1`, `${prefix}_address_line1`, `${prefix}Line1`]));
  const line2 = asOptionalString(rowValue(row, [`${prefix}AddressLine2`, `${prefix}_address_line2`, `${prefix}Line2`]));
  const city = asOptionalString(rowValue(row, [`${prefix}AddressCity`, `${prefix}_address_city`, `${prefix}City`]));
  const state = asOptionalString(rowValue(row, [`${prefix}AddressState`, `${prefix}_address_state`, `${prefix}State`, `${prefix}Province`]));
  const postalCode = asOptionalString(rowValue(row, [`${prefix}AddressPostalCode`, `${prefix}_address_postal_code`, `${prefix}PostalCode`, `${prefix}Zip`]));
  const country = asOptionalString(rowValue(row, [`${prefix}AddressCountry`, `${prefix}_address_country`, `${prefix}Country`]));

  const hasAnyValue = Boolean(line1 || line2 || city || state || postalCode || country);

  if (!hasAnyValue) {
    return null;
  }

  return {
    line1,
    line2,
    city,
    state,
    postalCode,
    country,
  };
}

function parseProductStatus(value: unknown): "DRAFT" | "ACTIVE" | "ARCHIVED" {
  const parsed = asString(value).toUpperCase();

  if (parsed === "ACTIVE" || parsed === "ARCHIVED") {
    return parsed;
  }

  return "DRAFT";
}

function parseProductType(value: unknown): "PHYSICAL" | "DIGITAL" | "SERVICE" {
  const parsed = asString(value).toUpperCase();

  if (parsed === "DIGITAL" || parsed === "SERVICE") {
    return parsed;
  }

  return "PHYSICAL";
}

function parseImages(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map(asString).filter((url) => Boolean(url));
  }

  const str = asString(value);
  if (!str) {
    return [];
  }

  return str
    .split(/[,|\n\r]+/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

async function importCategories(storeId: string, rows: ImportRow[]): Promise<ImportSummary> {
  const summary: ImportSummary = {
    table: "categories",
    totalRows: rows.length,
    processed: 0,
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [],
  };

  await processRowsInBatches(
    rows,
    (sourceRow, index) => {
      const row = normalizeRow(sourceRow);
      const name = asString(rowValue(row, ["name", "category", "title"]));
      const slugInput = asString(rowValue(row, ["slug"]));
      const slug = toSlug(slugInput || name);
      return slug ? `category:${slug}` : `row:${index}`;
    },
    async (sourceRow, index) => {
      const row = normalizeRow(sourceRow);
      const rowNumber = index + 1;

      try {
        const name = asString(rowValue(row, ["name", "category", "title"]));
        const slugInput = asString(rowValue(row, ["slug"]));
        const description = asOptionalString(rowValue(row, ["description", "details"]));

        if (!name) {
          summary.skipped += 1;
          summary.errors.push({ row: rowNumber, message: "Missing required field: name" });
          return;
        }

        const slug = toSlug(slugInput || name);

        if (!slug) {
          summary.skipped += 1;
          summary.errors.push({ row: rowNumber, message: "Could not derive a valid slug" });
          return;
        }

        const existing = await prisma.category.findUnique({
          where: { storeId_slug: { storeId, slug } },
          select: { id: true },
        });

        await prisma.category.upsert({
          where: { storeId_slug: { storeId, slug } },
          create: {
            storeId,
            name,
            slug,
            description,
          },
          update: {
            name,
            description,
          },
        });

        if (existing) {
          summary.updated += 1;
        } else {
          summary.created += 1;
        }

        summary.processed += 1;
      } catch (error) {
        summary.skipped += 1;
        summary.errors.push({
          row: rowNumber,
          message: error instanceof Error ? error.message : "Failed to import category row",
        });
      }
    },
  );

  summary.errors.sort((a, b) => a.row - b.row);
  return summary;
}

async function importCustomers(storeId: string, rows: ImportRow[]): Promise<ImportSummary> {
  const summary: ImportSummary = {
    table: "customers",
    totalRows: rows.length,
    processed: 0,
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [],
  };

  await processRowsInBatches(
    rows,
    (sourceRow, index) => {
      const row = normalizeRow(sourceRow);
      const email = asString(rowValue(row, ["email", "customeremail"])).toLowerCase();
      return email ? `customer:${email}` : `row:${index}`;
    },
    async (sourceRow, index) => {
      const row = normalizeRow(sourceRow);
      const rowNumber = index + 1;

      try {
        const email = asString(rowValue(row, ["email", "customeremail"])).toLowerCase();
        const firstName = asOptionalString(rowValue(row, ["firstname", "first_name", "givenname"]));
        const lastName = asOptionalString(rowValue(row, ["lastname", "last_name", "surname"]));
        const phone = asOptionalString(rowValue(row, ["phone", "phonenumber"]));
        const shippingAddress = buildAddress(row, "shipping");
        const billingAddress = buildAddress(row, "billing");

        if (!email) {
          summary.skipped += 1;
          summary.errors.push({ row: rowNumber, message: "Missing required field: email" });
          return;
        }

        const existing = await prisma.customer.findUnique({
          where: { storeId_email: { storeId, email } },
          select: { id: true },
        });

        await prisma.customer.upsert({
          where: { storeId_email: { storeId, email } },
          create: {
            storeId,
            email,
            firstName,
            lastName,
            phone,
            ...(shippingAddress ? { shippingAddress } : {}),
            ...(billingAddress ? { billingAddress } : {}),
          },
          update: {
            firstName,
            lastName,
            phone,
            ...(shippingAddress ? { shippingAddress } : {}),
            ...(billingAddress ? { billingAddress } : {}),
          },
        });

        if (existing) {
          summary.updated += 1;
        } else {
          summary.created += 1;
        }

        summary.processed += 1;
      } catch (error) {
        summary.skipped += 1;
        summary.errors.push({
          row: rowNumber,
          message: error instanceof Error ? error.message : "Failed to import customer row",
        });
      }
    },
  );

  summary.errors.sort((a, b) => a.row - b.row);
  return summary;
}

async function resolveCategoryId(storeId: string, row: Map<string, unknown>) {
  const categorySlugInput = asString(rowValue(row, ["categoryslug", "category_slug"]));
  const categoryNameInput = asString(rowValue(row, ["category", "categoryname", "category_name"]));

  if (!categorySlugInput && !categoryNameInput) {
    return null;
  }

  const slug = toSlug(categorySlugInput || categoryNameInput);

  if (!slug) {
    return null;
  }

  const category = await prisma.category.upsert({
    where: { storeId_slug: { storeId, slug } },
    create: {
      storeId,
      slug,
      name: categoryNameInput || categorySlugInput,
    },
    update: {
      name: categoryNameInput || categorySlugInput,
    },
    select: { id: true },
  });

  return category.id;
}

async function importProducts(storeId: string, ownerUserId: string, rows: ImportRow[]): Promise<ImportSummary> {
  const summary: ImportSummary = {
    table: "products",
    totalRows: rows.length,
    processed: 0,
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [],
  };

  const merchant = await prisma.merchantUser.findUnique({
    where: { id: ownerUserId },
    select: { plan: true },
  });

  const limits = getPlanLimits(getPlanOrDefault(merchant?.plan));
  let currentProductCount = await prisma.product.count({ where: { storeId } });

  await processRowsInBatches(
    rows,
    (sourceRow, index) => {
      const row = normalizeRow(sourceRow);
      const title = asString(rowValue(row, ["title", "name", "product"]));
      const slugInput = asString(rowValue(row, ["slug"]));
      const slug = toSlug(slugInput || title);
      return slug ? `product:${slug}` : `row:${index}`;
    },
    async (sourceRow, index) => {
      const row = normalizeRow(sourceRow);
      const rowNumber = index + 1;
      let reservedProductSlot = false;
      let productCreated = false;

      try {
        const title = asString(rowValue(row, ["title", "name", "product"]));
        const slugInput = asString(rowValue(row, ["slug"]));

        if (!title) {
          summary.skipped += 1;
          summary.errors.push({ row: rowNumber, message: "Missing required field: title" });
          return;
        }

        const slug = toSlug(slugInput || title);

        if (!slug) {
          summary.skipped += 1;
          summary.errors.push({ row: rowNumber, message: "Could not derive a valid slug" });
          return;
        }

        const existing = await prisma.product.findUnique({
          where: { storeId_slug: { storeId, slug } },
          select: { id: true },
        });

        if (!existing && Number.isFinite(limits.maxProductsPerStore) && currentProductCount >= limits.maxProductsPerStore) {
          summary.skipped += 1;
          summary.errors.push({
            row: rowNumber,
            message: "Product limit reached for current plan. Upgrade to import more products.",
          });
          return;
        }

        if (!existing) {
          currentProductCount += 1;
          reservedProductSlot = true;
        }

        const description = asOptionalString(rowValue(row, ["description", "details"]));
        const dimension = asOptionalString(rowValue(row, ["dimension", "dimensions", "size"]));
        const weight = asOptionalString(rowValue(row, ["weight"]));
        const manufacturer = asOptionalString(rowValue(row, ["manufacturer", "brand", "vendor", "maker"]));
        const condition = asOptionalString(rowValue(row, ["condition", "itemcondition", "productcondition"]));
        const conditionNotes = asOptionalString(rowValue(row, ["conditionnotes", "condition_notes", "conditionnote", "condition_note", "notes"]));
        const imageInput = rowValue(row, ["imageurl", "image_url", "image", "images", "img", "photo", "picture", "featuredimage", "featured_image"]);
        const images = parseImages(imageInput);
        const status = parseProductStatus(rowValue(row, ["status"]));
        const featured = asBoolean(rowValue(row, ["featured", "isfeatured"]), false);
        const productType = parseProductType(rowValue(row, ["producttype", "type"]));
        const categoryId = await resolveCategoryId(storeId, row);
        const barcodeAliases = ["barcode", "barcodenumber", "barcodes", "upc", "ean", "lookup", "lookups"];
        const costAliases = ["cost", "costprice", "unitcost", "purchasecost"];
        const sku = asOptionalString(rowValue(row, ["sku"]));
        const hasVariantFields =
          rowValue(row, ["price", "price3", "p3", "sku", ...barcodeAliases, ...costAliases, "inventory", "varianttitle", "variant_title"]) !== null;
        const barcode = parseLookupCodes(rowValue(row, barcodeAliases));
        const costInput = rowValue(row, costAliases);
        const costAmount = costInput === null ? null : Number.parseFloat(asString(costInput));
        if (costAmount !== null && (!Number.isFinite(costAmount) || costAmount < 0)) {
          throw new Error("Cost must be a non-negative number");
        }
        const costPrice = costAmount === null ? null : new Prisma.Decimal(String(costAmount));

        const imported = await prisma.product.upsert({
          where: { storeId_slug: { storeId, slug } },
          create: {
            storeId,
            title,
            slug,
            description,
            dimension,
            weight,
            manufacturer,
            condition,
            conditionNotes,
            status,
            featured,
            productType,
            categoryId,
            images,
          },
          update: {
            title,
            description,
            dimension,
            weight,
            manufacturer,
            condition,
            conditionNotes,
            status,
            featured,
            productType,
            categoryId,
            ...(images.length > 0 ? { images } : {}),
          },
          select: {
            id: true,
          },
        });
        productCreated = !existing;

        if (hasVariantFields) {
          const variantTitle = asString(rowValue(row, ["varianttitle", "variant_title", "variant", "variantname"])) || "Default";
          const price = new Prisma.Decimal(String(asNumber(rowValue(row, ["price"]), 0)));
          const compareAtNumber = asNumber(rowValue(row, ["compareatprice", "compare_at_price"]), Number.NaN);
          const compareAtPrice = Number.isFinite(compareAtNumber)
            ? new Prisma.Decimal(String(compareAtNumber))
            : null;
          const price3Number = asNumber(rowValue(row, ["price3", "price_3", "p3"]), Number.NaN);
          const price3 = Number.isFinite(price3Number)
            ? new Prisma.Decimal(String(price3Number))
            : null;
          const inventory = asInteger(rowValue(row, ["inventory", "stock"]), 0);

          const existingVariants = await prisma.productVariant.findMany({
            where: { productId: imported.id },
            orderBy: { createdAt: "asc" },
            select: { id: true, sku: true, barcode: true, title: true },
          });
          const importedLookupCodes = new Set(barcode?.split(";") ?? []);
          const matchingVariant =
            (importedLookupCodes.size > 0
              ? existingVariants.find((variant) =>
                  (variant.barcode ?? "").split(";").some((code) => importedLookupCodes.has(code.trim())),
                )
              : null) ??
            (sku ? existingVariants.find((variant) => variant.sku === sku) : null) ??
            existingVariants.find((variant) => variant.title === variantTitle) ??
            (existingVariants.length === 1 && !barcode && !sku ? existingVariants[0] : null);

          if (matchingVariant) {
            await prisma.productVariant.update({
              where: { id: matchingVariant.id },
              data: {
                title: variantTitle,
                sku,
                ...(hasRowValue(row, barcodeAliases) ? { barcode } : {}),
                ...(hasRowValue(row, costAliases) ? { costPrice } : {}),
                price,
                compareAtPrice,
                price3,
                inventory,
                trackInventory: true,
              },
            });
          } else {
            await prisma.productVariant.create({
              data: {
                productId: imported.id,
                title: variantTitle,
                sku,
                barcode,
                costPrice,
                price,
                compareAtPrice,
                price3,
                inventory,
                trackInventory: true,
              },
            });
          }
        }

        if (existing) {
          summary.updated += 1;
        } else {
          summary.created += 1;
        }

        summary.processed += 1;
      } catch (error) {
        summary.skipped += 1;
        summary.errors.push({
          row: rowNumber,
          message: error instanceof Error ? error.message : "Failed to import product row",
        });
        if (reservedProductSlot && !productCreated) {
          currentProductCount -= 1;
        }
      }
    },
  );

  summary.errors.sort((a, b) => a.row - b.row);
  return summary;
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json() as {
      table?: unknown;
      storeId?: unknown;
      rows?: unknown;
    };

    if (!isSupportedTable(body.table)) {
      return NextResponse.json({ error: "Unsupported table. Use categories, products, or customers." }, { status: 400 });
    }

    const storeId = typeof body.storeId === "string" ? body.storeId.trim() : "";

    if (!storeId) {
      return NextResponse.json({ error: "storeId is required" }, { status: 400 });
    }

    if (!Array.isArray(body.rows)) {
      return NextResponse.json({ error: "rows must be an array of objects" }, { status: 400 });
    }

    if (body.rows.length === 0) {
      return NextResponse.json({ error: "No rows were provided" }, { status: 400 });
    }

    if (body.rows.length > 5000) {
      return NextResponse.json({ error: "Import is limited to 5,000 rows per request" }, { status: 400 });
    }

    const rows = body.rows.filter((row) => row && typeof row === "object") as ImportRow[];

    if (rows.length === 0) {
      return NextResponse.json({ error: "rows must contain objects" }, { status: 400 });
    }

    const ownedStore = await prisma.store.findFirst({
      where: {
        id: storeId,
        ownerUserId: user.id,
      },
      select: {
        id: true,
        ownerUserId: true,
      },
    });

    if (!ownedStore?.ownerUserId) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }

    let summary: ImportSummary;

    if (body.table === "categories") {
      summary = await importCategories(storeId, rows);
    } else if (body.table === "customers") {
      summary = await importCustomers(storeId, rows);
    } else {
      summary = await importProducts(storeId, ownedStore.ownerUserId, rows);
    }

    return NextResponse.json({ summary });
  } catch (error) {
    console.error("[TOOLS_IMPORT_TABLES_POST_ERROR]", error);

    return NextResponse.json(
      { error: "Failed to import rows" },
      { status: 500 },
    );
  }
}
