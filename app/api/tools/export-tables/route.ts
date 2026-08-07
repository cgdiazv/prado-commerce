import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserFromRequest } from "@/lib/session";

type SupportedTable = "categories" | "products" | "customers";
type ExportFormat = "csv" | "json";

const SUPPORTED_TABLES: SupportedTable[] = ["categories", "products", "customers"];
const SUPPORTED_FORMATS: ExportFormat[] = ["csv", "json"];

function isSupportedTable(value: string | null): value is SupportedTable {
  return Boolean(value && SUPPORTED_TABLES.includes(value as SupportedTable));
}

function isSupportedFormat(value: string | null): value is ExportFormat {
  return Boolean(value && SUPPORTED_FORMATS.includes(value as ExportFormat));
}

function escapeCsvCell(value: unknown) {
  const text = value === null || value === undefined ? "" : String(value);

  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

function toCsv(rows: Array<Record<string, unknown>>) {
  if (!rows.length) {
    return "";
  }

  const headers = Object.keys(rows[0]);
  const headerLine = headers.map(escapeCsvCell).join(",");
  const lines = rows.map((row) => headers.map((header) => escapeCsvCell(row[header])).join(","));

  return [headerLine, ...lines].join("\n");
}

async function exportCategories(storeId: string) {
  const categories = await prisma.category.findMany({
    where: { storeId },
    orderBy: { createdAt: "desc" },
    select: {
      name: true,
      slug: true,
      description: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return categories.map((category) => ({
    name: category.name,
    slug: category.slug,
    description: category.description,
    createdAt: category.createdAt.toISOString(),
    updatedAt: category.updatedAt.toISOString(),
  }));
}

async function exportCustomers(storeId: string) {
  const customers = await prisma.customer.findMany({
    where: { storeId },
    orderBy: { createdAt: "desc" },
    select: {
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      shippingAddress: true,
      billingAddress: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return customers.map((customer) => ({
    const shippingAddress =
      customer.shippingAddress && typeof customer.shippingAddress === "object"
        ? (customer.shippingAddress as Record<string, unknown>)
        : {};
    const billingAddress =
      customer.billingAddress && typeof customer.billingAddress === "object"
        ? (customer.billingAddress as Record<string, unknown>)
        : {};

    const readAddressField = (address: Record<string, unknown>, keys: string[]) => {
      for (const key of keys) {
        const value = address[key];
        if (value !== undefined && value !== null && String(value).trim() !== "") {
          return String(value);
        }
      }
      return null;
    };

    return {
    email: customer.email,
    firstName: customer.firstName,
    lastName: customer.lastName,
    phone: customer.phone,
    shippingAddressLine1: readAddressField(shippingAddress, ["line1", "address1", "street", "street1"]),
    shippingAddressLine2: readAddressField(shippingAddress, ["line2", "address2", "street2"]),
    shippingAddressCity: readAddressField(shippingAddress, ["city"]),
    shippingAddressState: readAddressField(shippingAddress, ["state", "province", "region"]),
    shippingAddressPostalCode: readAddressField(shippingAddress, ["postalCode", "zip", "zipCode", "postal_code"]),
    shippingAddressCountry: readAddressField(shippingAddress, ["country", "countryCode"]),
    billingAddressLine1: readAddressField(billingAddress, ["line1", "address1", "street", "street1"]),
    billingAddressLine2: readAddressField(billingAddress, ["line2", "address2", "street2"]),
    billingAddressCity: readAddressField(billingAddress, ["city"]),
    billingAddressState: readAddressField(billingAddress, ["state", "province", "region"]),
    billingAddressPostalCode: readAddressField(billingAddress, ["postalCode", "zip", "zipCode", "postal_code"]),
    billingAddressCountry: readAddressField(billingAddress, ["country", "countryCode"]),
    createdAt: customer.createdAt.toISOString(),
    updatedAt: customer.updatedAt.toISOString(),
    };
  });
}

async function exportProducts(storeId: string) {
  const products = await prisma.product.findMany({
    where: { storeId },
    orderBy: { createdAt: "desc" },
    select: {
      title: true,
      slug: true,
      description: true,
      status: true,
      productType: true,
      featured: true,
      createdAt: true,
      updatedAt: true,
      category: {
        select: {
          name: true,
          slug: true,
        },
      },
      variants: {
        orderBy: { createdAt: "asc" },
        select: {
          title: true,
          sku: true,
          price: true,
          compareAtPrice: true,
          inventory: true,
        },
      },
    },
  });

  return products.map((product) => {
    const firstVariant = product.variants[0] ?? null;

    return {
      title: product.title,
      slug: product.slug,
      description: product.description,
      status: product.status,
      productType: product.productType,
      featured: product.featured,
      category: product.category?.name ?? null,
      categorySlug: product.category?.slug ?? null,
      variantTitle: firstVariant?.title ?? null,
      sku: firstVariant?.sku ?? null,
      price: firstVariant ? String(firstVariant.price) : null,
      compareAtPrice: firstVariant?.compareAtPrice ? String(firstVariant.compareAtPrice) : null,
      inventory: firstVariant?.inventory ?? null,
      createdAt: product.createdAt.toISOString(),
      updatedAt: product.updatedAt.toISOString(),
    };
  });
}

export async function GET(request: Request) {
  try {
    const user = await getCurrentUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get("storeId");
    const table = searchParams.get("table");
    const format = searchParams.get("format") ?? "csv";

    if (!storeId) {
      return NextResponse.json({ error: "storeId is required" }, { status: 400 });
    }

    if (!isSupportedTable(table)) {
      return NextResponse.json({ error: "Unsupported table" }, { status: 400 });
    }

    if (!isSupportedFormat(format)) {
      return NextResponse.json({ error: "Unsupported format" }, { status: 400 });
    }

    const ownedStore = await prisma.store.findFirst({
      where: {
        id: storeId,
        ownerUserId: user.id,
      },
      select: { id: true },
    });

    if (!ownedStore) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }

    let rows: Array<Record<string, unknown>>;

    if (table === "categories") {
      rows = await exportCategories(storeId);
    } else if (table === "customers") {
      rows = await exportCustomers(storeId);
    } else {
      rows = await exportProducts(storeId);
    }

    if (format === "json") {
      return NextResponse.json({ table, rowCount: rows.length, rows });
    }

    const csv = toCsv(rows);
    const fileName = `${table}-${new Date().toISOString().slice(0, 10)}.csv`;

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename=\"${fileName}\"`,
      },
    });
  } catch (error) {
    console.error("[TOOLS_EXPORT_TABLES_GET_ERROR]", error);
    return NextResponse.json({ error: "Failed to export table" }, { status: 500 });
  }
}
