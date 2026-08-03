import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserFromRequest } from "@/lib/session";
import { getPlanLimits, getPlanOrDefault } from "@/lib/subscription";

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
        productType: true,
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
    const user = await getCurrentUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      storeId,
      title,
      slug,
      description,
      images,
      status,
      productType,
      categoryId,
      variants,
    } = body as {
      storeId?: string;
      title?: string;
      slug?: string;
      description?: string | null;
      images?: string[];
      status?: "DRAFT" | "ACTIVE" | "ARCHIVED";
      productType?: "PHYSICAL" | "DIGITAL" | "SERVICE";
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

    const ownedStore = await prisma.store.findFirst({
      where: {
        id: storeId,
        ownerUserId: user.id,
      },
      select: {
        id: true,
        ownerUser: {
          select: {
            plan: true,
          },
        },
      },
    });

    if (!ownedStore) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }

    const ownerPlan = getPlanOrDefault(ownedStore.ownerUser?.plan);
    const limits = getPlanLimits(ownerPlan);

    if (Number.isFinite(limits.maxProductsPerStore)) {
      const productCount = await prisma.product.count({ where: { storeId } });

      if (productCount >= limits.maxProductsPerStore) {
        return NextResponse.json(
          {
            error:
              "Product limit reached for your current plan. Upgrade your Prado Commerce plan to add more products.",
          },
          { status: 403 },
        );
      }
    }

    const createdProduct = await prisma.product.create({
      data: {
        storeId,
        title: title.trim(),
        slug: slug.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
        description: description?.trim() || null,
        images: Array.isArray(images) ? images.filter((image) => typeof image === "string") : [],
        status: status ?? "DRAFT",
        productType: productType ?? "PHYSICAL",
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

    if (typeof error === "object" && error !== null && "message" in error) {
      const message = String((error as { message?: string }).message ?? "");

      if (message.includes("productType")) {
        return NextResponse.json(
          {
            error:
              "Product type is not available in the database yet. Run migrations and try again.",
          },
          { status: 500 },
        );
      }

      if (message.includes("Invalid value for argument `status`")) {
        return NextResponse.json(
          { error: "Invalid product status value. Please choose Draft or Published." },
          { status: 400 },
        );
      }
    }

    console.error("[PRODUCTS_POST_ERROR]", error);

    return NextResponse.json(
      { error: "Failed to create product" },
      { status: 500 },
    );
  }
}