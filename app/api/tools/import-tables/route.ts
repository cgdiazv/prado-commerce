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

function rowValue(row: Map<string, unknown>, aliases: string[]) {
  for (const alias of aliases) {
    const value = row.get(normalizeKey(alias));

    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return value;
    }
  }

  return null;
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

  for (let index = 0; index < rows.length; index += 1) {
    const row = normalizeRow(rows[index]);
    const rowNumber = index + 1;

    try {
      const name = asString(rowValue(row, ["name", "category", "title"]));
      const slugInput = asString(rowValue(row, ["slug"]));
      const description = asOptionalString(rowValue(row, ["description", "details"]));

      if (!name) {
        summary.skipped += 1;
        summary.errors.push({ row: rowNumber, message: "Missing required field: name" });
        continue;
      }

      const slug = toSlug(slugInput || name);

      if (!slug) {
        summary.skipped += 1;
        summary.errors.push({ row: rowNumber, message: "Could not derive a valid slug" });
        continue;
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
  }

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

  for (let index = 0; index < rows.length; index += 1) {
    const row = normalizeRow(rows[index]);
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
        continue;
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
  }

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

  for (let index = 0; index < rows.length; index += 1) {
    const row = normalizeRow(rows[index]);
    const rowNumber = index + 1;

    try {
      const title = asString(rowValue(row, ["title", "name", "product"]));
      const slugInput = asString(rowValue(row, ["slug"]));

      if (!title) {
        summary.skipped += 1;
        summary.errors.push({ row: rowNumber, message: "Missing required field: title" });
        continue;
      }

      const slug = toSlug(slugInput || title);

      if (!slug) {
        summary.skipped += 1;
        summary.errors.push({ row: rowNumber, message: "Could not derive a valid slug" });
        continue;
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
        continue;
      }

      const description = asOptionalString(rowValue(row, ["description", "details"]));
      const status = parseProductStatus(rowValue(row, ["status"]));
      const featured = asBoolean(rowValue(row, ["featured", "isfeatured"]), false);
      const productType = parseProductType(rowValue(row, ["producttype", "type"]));
      const categoryId = await resolveCategoryId(storeId, row);

      const imported = await prisma.product.upsert({
        where: { storeId_slug: { storeId, slug } },
        create: {
          storeId,
          title,
          slug,
          description,
          status,
          featured,
          productType,
          categoryId,
          images: [],
        },
        update: {
          title,
          description,
          status,
          featured,
          productType,
          categoryId,
        },
        select: {
          id: true,
        },
      });

      const hasVariantFields =
        rowValue(row, ["price", "sku", "inventory", "varianttitle", "variant_title"]) !== null;

      if (hasVariantFields) {
        const variantTitle = asString(rowValue(row, ["varianttitle", "variant_title", "variant", "variantname"])) || "Default";
        const sku = asOptionalString(rowValue(row, ["sku"]));
        const price = new Prisma.Decimal(String(asNumber(rowValue(row, ["price"]), 0)));
        const compareAtNumber = asNumber(rowValue(row, ["compareatprice", "compare_at_price"]), Number.NaN);
        const compareAtPrice = Number.isFinite(compareAtNumber)
          ? new Prisma.Decimal(String(compareAtNumber))
          : null;
        const inventory = asInteger(rowValue(row, ["inventory", "stock"]), 0);

        const firstVariant = await prisma.productVariant.findFirst({
          where: { productId: imported.id },
          orderBy: { createdAt: "asc" },
          select: { id: true },
        });

        if (firstVariant) {
          await prisma.productVariant.update({
            where: { id: firstVariant.id },
            data: {
              title: variantTitle,
              sku,
              price,
              compareAtPrice,
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
              price,
              compareAtPrice,
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
        currentProductCount += 1;
      }

      summary.processed += 1;
    } catch (error) {
      summary.skipped += 1;
      summary.errors.push({
        row: rowNumber,
        message: error instanceof Error ? error.message : "Failed to import product row",
      });
    }
  }

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
