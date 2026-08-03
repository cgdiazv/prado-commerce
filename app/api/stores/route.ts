import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const stores = await prisma.store.findMany({
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        name: true,
        slug: true,
        customDomain: true,
        currency: true,
        timezone: true,
        allowedDomains: true,
        createdAt: true,
        updatedAt: true,
        apiKeys: {
          select: {
            id: true,
            name: true,
            type: true,
            key: true,
          },
        },
      },
    });

    return NextResponse.json(stores);
  } catch (error) {
    console.error("[STORES_GET_ERROR]", error);

    return NextResponse.json(
      { error: "Failed to fetch stores" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, slug, ownerId } = body as {
      name?: string;
      slug?: string;
      ownerId?: string;
    };

    if (!name || !slug || !ownerId) {
      return NextResponse.json(
        { error: "Name, slug, and ownerId are required fields" },
        { status: 400 },
      );
    }

    const formattedSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, "-");

    const newStore = await prisma.store.create({
      data: {
        name,
        slug: formattedSlug,
        ownerId,
        apiKeys: {
          create: {
            name: "Default Storefront Key",
            type: "PUBLISHABLE",
            key: `pk_live_${crypto.randomUUID().replace(/-/g, "")}`,
          },
        },
      },
      include: {
        apiKeys: true,
      },
    });

    return NextResponse.json(newStore, { status: 201 });
  } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "A store with this slug or domain already exists" },
        { status: 409 },
      );
    }

    console.error("[STORES_POST_ERROR]", error);

    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}