import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type ProductVariantInput = {
  sku?: string | null;
  title: string;
  price: string | number;
  compareAtPrice?: string | number | null;
  inventory?: number;
  trackInventory?: boolean;
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
      title: typeof candidate.title === "string" && candidate.title.trim() ? candidate.title : "Default",
      price: candidate.price,
      compareAtPrice: candidate.compareAtPrice ?? null,
      inventory: candidate.inventory ?? 0,
      trackInventory: candidate.trackInventory ?? true,
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
      productType,
      categoryId,
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
      productType?: "PHYSICAL" | "DIGITAL" | "SERVICE";
      categoryId?: string | null;
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

    const parsedVariants = parseVariants(variants);

    if (parsedVariants.length) {
      updates.variants = {
        deleteMany: {},
        create: parsedVariants.map((variant) => ({
          sku: variant.sku ?? null,
          title: variant.title,
          price: toDecimal(variant.price, 0) ?? new Prisma.Decimal("0"),
          compareAtPrice: toDecimal(variant.compareAtPrice, null),
          inventory: variant.inventory ?? 0,
          trackInventory: variant.trackInventory ?? true,
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