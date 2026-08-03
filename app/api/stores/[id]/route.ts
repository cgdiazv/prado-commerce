import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_req: Request, { params }: RouteContext) {
  try {
    const { id } = await params;

    const store = await prisma.store.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        customDomain: true,
        ownerId: true,
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
            lastUsedAt: true,
            expiresAt: true,
            createdAt: true,
          },
        },
      },
    });

    if (!store) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }

    return NextResponse.json(store);
  } catch (error) {
    console.error("[STORE_GET_ERROR]", error);

    return NextResponse.json(
      { error: "Failed to fetch store" },
      { status: 500 },
    );
  }
}

export async function PATCH(req: Request, { params }: RouteContext) {
  try {
    const { id } = await params;

    const body = await req.json();
    const {
      name,
      slug,
      customDomain,
      currency,
      timezone,
      allowedDomains,
    } = body as {
      name?: string;
      slug?: string;
      customDomain?: string | null;
      currency?: string;
      timezone?: string;
      allowedDomains?: string[];
    };

    const updates: {
      name?: string;
      slug?: string;
      customDomain?: string | null;
      currency?: string;
      timezone?: string;
      allowedDomains?: string[];
    } = {};

    if (typeof name === "string" && name.trim()) {
      updates.name = name.trim();
    }

    if (typeof slug === "string" && slug.trim()) {
      updates.slug = slug.toLowerCase().replace(/[^a-z0-9-]/g, "-");
    }

    if (customDomain !== undefined) {
      updates.customDomain = customDomain?.trim() || null;
    }

    if (typeof currency === "string" && currency.trim()) {
      updates.currency = currency.trim().toUpperCase();
    }

    if (typeof timezone === "string" && timezone.trim()) {
      updates.timezone = timezone.trim();
    }

    if (allowedDomains !== undefined) {
      if (!Array.isArray(allowedDomains)) {
        return NextResponse.json(
          { error: "allowedDomains must be an array of strings" },
          { status: 400 },
        );
      }

      updates.allowedDomains = allowedDomains.map((domain) => domain.trim()).filter(Boolean);
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "At least one field must be provided for update" },
        { status: 400 },
      );
    }

    const updatedStore = await prisma.store.update({
      where: {
        id,
      },
      data: updates,
      select: {
        id: true,
        name: true,
        slug: true,
        customDomain: true,
        ownerId: true,
        currency: true,
        timezone: true,
        allowedDomains: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(updatedStore);
  } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2025"
    ) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }

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

    console.error("[STORE_PATCH_ERROR]", error);

    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}