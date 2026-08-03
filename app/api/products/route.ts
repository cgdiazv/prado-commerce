import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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

    if (!candidate.title || candidate.price === undefined) {
      continue;
    }

    parsed.push({
      sku: candidate.sku ?? null,
      title: candidate.title,
      price: candidate.price,
      compareAtPrice: candidate.compareAtPrice ?? null,
      inventory: candidate.inventory ?? 0,
      trackInventory: candidate.trackInventory ?? true,
      options: candidate.options ?? null,
    });
  }

  return parsed;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get("storeId");
    const categoryId = searchParams.get("categoryId");
    const status = searchParams.get("status");
    const validStatus = status === "DRAFT" || status === "ACTIVE" || status === "ARCHIVED"
      ? status
      : null;

    if (!storeId) {
      return NextResponse.json(
        { error: "storeId is required" },
        { status: 400 },
      );
    }

    const products = await prisma.product.findMany({
      where: {
        storeId,
        ...(categoryId ? { categoryId } : {}),
        ...(validStatus ? { status: validStatus } : {}),
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        title: true,
        slug: true,
        description: true,
        images: true,
        status: true,
        categoryId: true,
        createdAt: true,
        updatedAt: true,
        variants: {
          select: {
            id: true,
            sku: true,
            title: true,
            price: true,
            compareAtPrice: true,
            inventory: true,
            trackInventory: true,
            options: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    return NextResponse.json(products);
  } catch (error) {
    console.error("[PRODUCTS_GET_ERROR]", error);

    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      storeId,
      title,
      slug,
      description,
      images,
      status,
      categoryId,
      variants,
    } = body as {
      storeId?: string;
      title?: string;
      slug?: string;
      description?: string | null;
      images?: string[];
      status?: "DRAFT" | "ACTIVE" | "ARCHIVED";
      categoryId?: string | null;
      variants?: unknown;
    };

    if (!storeId || !title || !slug) {
      return NextResponse.json(
        { error: "storeId, title, and slug are required" },
        { status: 400 },
      );
    }

    const parsedVariants = parseVariants(variants);

    const createdProduct = await prisma.product.create({
      data: {
        storeId,
        title: title.trim(),
        slug: slug.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
        description: description?.trim() || null,
        images: Array.isArray(images) ? images.filter((image) => typeof image === "string") : [],
        status: status ?? "DRAFT",
        categoryId: categoryId ?? null,
        variants: parsedVariants.length
          ? {
              create: parsedVariants.map((variant) => ({
                sku: variant.sku ?? null,
                title: variant.title,
                price: variant.price,
                compareAtPrice:
                  variant.compareAtPrice === null || variant.compareAtPrice === undefined
                    ? null
                    : variant.compareAtPrice,
                inventory: variant.inventory ?? 0,
                trackInventory: variant.trackInventory ?? true,
                ...(variant.options === null || variant.options === undefined
                  ? {}
                  : { options: variant.options }),
              })),
            }
          : undefined,
      },
      include: {
        variants: true,
      },
    });

    return NextResponse.json(createdProduct, { status: 201 });
  } catch (error) {
    if (isPrismaError(error, "P2002")) {
      return NextResponse.json(
        { error: "A product with this slug already exists for this store" },
        { status: 409 },
      );
    }

    console.error("[PRODUCTS_POST_ERROR]", error);

    return NextResponse.json(
      { error: "Failed to create product" },
      { status: 500 },
    );
  }
}