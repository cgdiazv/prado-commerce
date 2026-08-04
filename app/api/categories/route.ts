import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserFromRequest } from "@/lib/session";

function toSlug(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function isPrismaError(error: unknown, code: string) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === code
  );
}

export async function GET(request: Request) {
  try {
    const user = await getCurrentUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get("storeId");

    if (!storeId) {
      return NextResponse.json({ error: "storeId is required" }, { status: 400 });
    }

    const ownedStore = await prisma.store.findFirst({
      where: { id: storeId, ownerUserId: user.id },
      select: { id: true },
    });

    if (!ownedStore) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }

    const categories = await prisma.category.findMany({
      where: { storeId },
      orderBy: { name: "asc" },
      select: {
        id: true,
        storeId: true,
        name: true,
        slug: true,
        description: true,
        parentCategoryId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(categories);
  } catch (error) {
    console.error("[CATEGORIES_GET_ERROR]", error);
    return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const storeId = String(body?.storeId || "").trim();
    const name = String(body?.name || "").trim();
    const slugInput = String(body?.slug || "").trim();
    const description = String(body?.description || "").trim() || null;
    const parentCategoryId =
      typeof body?.parentCategoryId === "string" ? body.parentCategoryId.trim() || null : null;

    if (!storeId || !name) {
      return NextResponse.json({ error: "storeId and name are required" }, { status: 400 });
    }

    const ownedStore = await prisma.store.findFirst({
      where: { id: storeId, ownerUserId: user.id },
      select: { id: true },
    });

    if (!ownedStore) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }

    const slug = toSlug(slugInput || name);

    if (!slug) {
      return NextResponse.json({ error: "A valid category name is required" }, { status: 400 });
    }

    if (parentCategoryId) {
      const parentCategory = await prisma.category.findFirst({
        where: {
          id: parentCategoryId,
          storeId,
        },
        select: { id: true },
      });

      if (!parentCategory) {
        return NextResponse.json(
          { error: "Parent category must belong to this store" },
          { status: 400 },
        );
      }
    }

    const createdCategory = await prisma.category.create({
      data: {
        storeId,
        name,
        slug,
        description,
        parentCategoryId,
      },
      select: {
        id: true,
        storeId: true,
        name: true,
        slug: true,
        description: true,
        parentCategoryId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(createdCategory, { status: 201 });
  } catch (error) {
    if (isPrismaError(error, "P2002")) {
      return NextResponse.json(
        { error: "A category with this slug already exists in this store" },
        { status: 409 },
      );
    }

    console.error("[CATEGORIES_POST_ERROR]", error);
    return NextResponse.json({ error: "Failed to create category" }, { status: 500 });
  }
}