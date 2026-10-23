import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentCashierFromRequest } from "@/lib/session";
import { parseStockStatus } from "@/lib/product-stock";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type ProductVariantInput = {
  sku?: string | null;
  barcode?: string | null;
  title: string;
  price: string | number;
  compareAtPrice?: string | number | null;
  price3?: string | number | null;
  costPrice?: string | number | null;
  inventory?: number;
  stockStatus?: "IN_STOCK" | "OUT_OF_STOCK" | "ON_BACKORDER";
  options?: unknown;
};

function isPrismaError(error: unknown, code: string) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === code
  );
}

function toDecimal(input: string | number | null | undefined, fallback: string | number | null = null) {
  if (input === null || input === undefined || input === "") {
    if (fallback === null || fallback === undefined || fallback === "") {
      return null;
    }

    return new Prisma.Decimal(String(fallback));
  }

  return new Prisma.Decimal(String(input));
}

function parseVariants(variants: unknown): ProductVariantInput[] {
  if (!Array.isArray(variants)) {
    return [];
  }

  const parsed: ProductVariantInput[] = [];

  for (const variant of variants) {
    if (!variant || typeof variant !== "object") {
      continue;
    }

    const candidate = variant as Partial<ProductVariantInput>;

    if (candidate.price === undefined) {
      continue;
    }

    parsed.push({
      sku: candidate.sku ?? null,
      barcode: candidate.barcode ?? null,
      title: typeof candidate.title === "string" && candidate.title.trim() ? candidate.title : "Default",
      price: candidate.price,
      compareAtPrice: candidate.compareAtPrice ?? null,
      price3: candidate.price3 ?? null,
      costPrice: candidate.costPrice ?? null,
      inventory: candidate.inventory ?? 0,
      stockStatus: parseStockStatus(candidate.stockStatus),
      options: candidate.options ?? null,
    });
  }

  return parsed;
}

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;

    const product = await prisma.product.findUnique({
      where: {
        id,
      },
      include: {
        variants: true,
      },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const cashier = getCurrentCashierFromRequest(_request);
    if (cashier && product.storeId !== cashier.storeId) {
      return NextResponse.json(
        { error: "Forbidden: You are not authorized to access products from another store." },
        { status: 403 },
      );
    }

    return NextResponse.json(product);
  } catch (error) {
    console.error("[PRODUCT_GET_ERROR]", error);

    return NextResponse.json(
      { error: "Failed to fetch product" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const cashier = getCurrentCashierFromRequest(request);

    if (cashier) {
      const existingProduct = await prisma.product.findUnique({
        where: { id },
        select: { storeId: true },
      });
      if (!existingProduct) {
        return NextResponse.json({ error: "Product not found" }, { status: 404 });
      }
      if (existingProduct.storeId !== cashier.storeId) {
        return NextResponse.json(
          { error: "Forbidden: You can only edit products in your assigned store." },
          { status: 403 },
        );
      }
    }

    const body = await request.json();
    const {
      title,
      slug,
      description,
      dimension,
      weight,
      manufacturer,
      condition,
      conditionNotes,
      images,
      status,
      featured,
      taxable,
      productType,
      categoryId,
      brandId,
      variants,
    } = body as {
      title?: string;
      slug?: string;
      description?: string | null;
      dimension?: string | null;
      weight?: string | null;
      manufacturer?: string | null;
      condition?: string | null;
      conditionNotes?: string | null;
      images?: string[];
      status?: "DRAFT" | "ACTIVE" | "ARCHIVED";
      featured?: boolean;
      taxable?: boolean;
      productType?: "PHYSICAL" | "DIGITAL" | "SERVICE";
      categoryId?: string | null;
      brandId?: string | null;
      variants?: unknown;
    };

    const updates = {} as Parameters<typeof prisma.product.update>[0]["data"];

    if (typeof title === "string" && title.trim()) {
      updates.title = title.trim();
    }

    if (typeof slug === "string" && slug.trim()) {
      updates.slug = slug.toLowerCase().replace(/[^a-z0-9-]/g, "-");
    }

    if (description !== undefined) {
      updates.description = description?.trim() || null;
    }

    if (dimension !== undefined) {
      updates.dimension = dimension?.trim() || null;
    }

    if (weight !== undefined) {
      updates.weight = weight?.trim() || null;
    }

    if (manufacturer !== undefined) {
      updates.manufacturer = manufacturer?.trim() || null;
    }

    if (condition !== undefined) {
      updates.condition = condition?.trim() || null;
    }

    if (conditionNotes !== undefined) {
      updates.conditionNotes = conditionNotes?.trim() || null;
    }

    if (images !== undefined) {
      if (!Array.isArray(images)) {
        return NextResponse.json(
          { error: "images must be an array of strings" },
          { status: 400 },
        );
      }

      updates.images = images.filter((image): image is string => typeof image === "string");
    }

    if (status) {
      updates.status = status;
    }

    if (typeof featured === "boolean") {
      updates.featured = featured;
    }

    if (typeof taxable === "boolean") {
      updates.taxable = taxable;
    } else if (typeof taxable === "string") {
      updates.taxable = taxable !== "false" && taxable !== "0";
    }

    if (productType) {
      updates.productType = productType;
    }

    if (categoryId !== undefined) {
      updates.category = categoryId
        ? {
            connect: {
              id: categoryId,
            },
          }
        : {
            disconnect: true,
          };
    }

    if (brandId !== undefined) {
      updates.brand = brandId
        ? {
            connect: {
              id: brandId,
            },
          }
        : {
            disconnect: true,
          };
    }

    const parsedVariants = parseVariants(variants);

    if (parsedVariants.length) {
      updates.variants = {
        deleteMany: {},
        create: parsedVariants.map((variant) => ({
          sku: variant.sku ?? null,
          barcode: variant.barcode ?? null,
          title: variant.title,
          price: toDecimal(variant.price, 0) ?? new Prisma.Decimal("0"),
          compareAtPrice: toDecimal(variant.compareAtPrice, null),
          price3: toDecimal(variant.price3, null),
          costPrice: toDecimal(variant.costPrice, null),
          inventory: variant.inventory ?? 0,
          stockStatus: variant.stockStatus ?? "IN_STOCK",
          ...(variant.options === null || variant.options === undefined
            ? {}
            : { options: variant.options }),
        })),
      };
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "At least one field must be provided for update" },
        { status: 400 },
      );
    }

    const updatedProduct = await prisma.product.update({
      where: {
        id,
      },
      data: updates,
      include: {
        variants: true,
      },
    });

    return NextResponse.json(updatedProduct);
  } catch (error) {
    if (isPrismaError(error, "P2025")) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    if (isPrismaError(error, "P2002")) {
      return NextResponse.json(
        { error: "A product with this slug already exists for this store" },
        { status: 409 },
      );
    }

    console.error("[PRODUCT_PATCH_ERROR]", error);

    return NextResponse.json(
      { error: "Failed to update product" },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const cashier = getCurrentCashierFromRequest(_request);
    if (cashier) {
      return NextResponse.json(
        { error: "Forbidden: Cashiers cannot delete catalog products." },
        { status: 403 },
      );
    }

    await prisma.product.delete({
      where: {
        id,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (isPrismaError(error, "P2025")) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    console.error("[PRODUCT_DELETE_ERROR]", error);

    return NextResponse.json(
      { error: "Failed to delete product" },
      { status: 500 },
    );
  }
}