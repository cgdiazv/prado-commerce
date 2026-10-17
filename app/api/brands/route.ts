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

    const brands = await prisma.brand.findMany({
      where: { storeId },
      orderBy: { name: "asc" },
      select: {
        id: true,
        storeId: true,
        name: true,
        slug: true,
        description: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            products: true,
          },
        },
      },
    });

    return NextResponse.json(brands);
  } catch (error) {
    console.error("[BRANDS_GET_ERROR]", error);
    return NextResponse.json({ error: "Failed to fetch brands" }, { status: 500 });
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
      return NextResponse.json({ error: "A valid brand name is required" }, { status: 400 });
    }

    const existingBrand = await prisma.brand.findUnique({
      where: {
        storeId_slug: {
          storeId,
          slug,
        },
      },
      select: { id: true },
    });

    if (existingBrand) {
      return NextResponse.json(
        { error: "A brand with this name or slug already exists for this store" },
        { status: 409 },
      );
    }

    const createdBrand = await prisma.brand.create({
      data: {
        storeId,
        name,
        slug,
        description,
      },
      select: {
        id: true,
        storeId: true,
        name: true,
        slug: true,
        description: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            products: true,
          },
        },
      },
    });

    return NextResponse.json(createdBrand, { status: 201 });
  } catch (error) {
    if (isPrismaError(error, "P2002")) {
      return NextResponse.json(
        { error: "A brand with this name or slug already exists for this store" },
        { status: 409 },
      );
    }

    console.error("[BRANDS_POST_ERROR]", error);
    return NextResponse.json({ error: "Failed to create brand" }, { status: 500 });
  }
}
