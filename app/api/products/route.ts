import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUserFromRequest, getCurrentCashierFromRequest } from "@/lib/session";
import { getPlanLimits, getPlanOrDefault } from "@/lib/subscription";
import { parseStockStatus } from "@/lib/product-stock";

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

function parseCategoryIds(categoryIds: unknown, categoryId: unknown): string[] | null {
  if (categoryIds !== undefined) {
    if (!Array.isArray(categoryIds) || categoryIds.some((id) => typeof id !== "string")) {
      return null;
    }

    return [...new Set(categoryIds.map((id: string) => id.trim()).filter(Boolean))];
  }

  if (categoryId === undefined || categoryId === null || categoryId === "") {
    return [];
  }

  return typeof categoryId === "string" && categoryId.trim() ? [categoryId.trim()] : null;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get("storeId");
    const cashier = getCurrentCashierFromRequest(request);

    if (cashier && storeId && storeId !== cashier.storeId) {
      return NextResponse.json(
        { error: "Forbidden: You are only authorized to view products for your assigned store." },
        { status: 403 },
      );
    }

    const targetStoreId = cashier?.storeId || storeId;

    const categoryId = searchParams.get("categoryId");
    const status = searchParams.get("status");
    const validStatus = status === "DRAFT" || status === "ACTIVE" || status === "ARCHIVED"
      ? status
      : null;

    if (!targetStoreId) {
      return NextResponse.json(
        { error: "storeId is required" },
        { status: 400 },
      );
    }

    let storeCondition: { in: string[] } | string = targetStoreId;
    if (targetStoreId === "ALL") {
      const user = await getCurrentUserFromRequest(request);
      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const ownedStores = await prisma.store.findMany({
        where: { ownerUserId: user.id },
        select: { id: true },
      });
      storeCondition = { in: ownedStores.map((s) => s.id) };
    }

    const products = await prisma.product.findMany({
      where: {
        storeId: storeCondition,
        ...(categoryId
          ? {
              OR: [
                { categoryId },
                { categories: { some: { id: categoryId } } },
              ],
            }
          : {}),
        ...(validStatus ? { status: validStatus } : {}),
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        storeId: true,
        title: true,
        slug: true,
        description: true,
        dimension: true,
        weight: true,
        manufacturer: true,
        condition: true,
        conditionNotes: true,
        images: true,
        featured: true,
        taxable: true,
        status: true,
        productType: true,
        categoryId: true,
        brandId: true,
        createdAt: true,
        updatedAt: true,
        category: {
          select: {
            id: true,
            name: true,
          },
        },
        categories: {
          select: {
            id: true,
            name: true,
          },
        },
        brand: {
          select: {
            id: true,
            name: true,
          },
        },
        variants: {
          select: {
            id: true,
            sku: true,
            barcode: true,
            title: true,
            price: true,
            compareAtPrice: true,
            price3: true,
            costPrice: true,
            inventory: true,
            stockStatus: true,
            options: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    return NextResponse.json(
      products.map((product) => ({
        ...product,
        categoryName:
          product.categories.map((category) => category.name).join(", ") ||
          product.category?.name ||
          null,
        brandName: product.brand?.name ?? null,
      })),
    );
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
    const cashier = getCurrentCashierFromRequest(request);

    if (!user && !cashier) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      storeId,
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
      categoryIds,
      brandId,
      variants,
    } = body as {
      storeId?: string;
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
      categoryIds?: unknown;
      brandId?: string | null;
      variants?: unknown;
    };

    if (cashier && (!storeId || cashier.storeId !== storeId)) {
      return NextResponse.json(
        { error: "Forbidden: Cashiers can only manage products in their assigned store." },
        { status: 403 },
      );
    }

    if (!storeId || !title || !slug) {
      return NextResponse.json(
        { error: "storeId, title, and slug are required" },
        { status: 400 },
      );
    }

    const parsedCategoryIds = parseCategoryIds(categoryIds, categoryId);
    if (!parsedCategoryIds) {
      return NextResponse.json({ error: "categoryIds must be an array of category IDs" }, { status: 400 });
    }

    const parsedVariants = parseVariants(variants);

    const ownedStore = await prisma.store.findFirst({
      where: cashier
        ? { id: cashier.storeId }
        : {
            id: storeId,
            ownerUserId: user!.id,
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

    if (parsedCategoryIds.length > 0) {
      const matchingCategories = await prisma.category.findMany({
        where: { storeId: ownedStore.id, id: { in: parsedCategoryIds } },
        select: { id: true },
      });
      if (matchingCategories.length !== parsedCategoryIds.length) {
        return NextResponse.json(
          { error: "All categories must belong to this store" },
          { status: 400 },
        );
      }
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
        store: { connect: { id: storeId } },
        title: title.trim(),
        slug: slug.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
        description: description?.trim() || null,
        dimension: dimension?.trim() || null,
        weight: weight?.trim() || null,
        manufacturer: manufacturer?.trim() || null,
        condition: condition?.trim() || null,
        conditionNotes: conditionNotes?.trim() || null,
        images: Array.isArray(images) ? images.filter((image) => typeof image === "string") : [],
        status: status ?? "DRAFT",
        featured: typeof featured === "boolean" ? featured : false,
        taxable: typeof taxable === "boolean" ? taxable : true,
        productType: productType ?? "PHYSICAL",
        category: parsedCategoryIds[0]
          ? { connect: { id: parsedCategoryIds[0] } }
          : undefined,
        categories: parsedCategoryIds.length
          ? { connect: parsedCategoryIds.map((id) => ({ id })) }
          : undefined,
        brand: brandId ? { connect: { id: brandId } } : undefined,
        variants: parsedVariants.length
          ? {
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