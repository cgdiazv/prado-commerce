import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserFromRequest } from "@/lib/session";
import { getPlanLimits, getPlanOrDefault } from "@/lib/subscription";
import { normalizeMainColor } from "@/lib/branding";

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
        logoUrl: true,
        activeTheme: true,
        customDomain: true,
        mainColor: true,
        ownerId: true,
        currency: true,
        timezone: true,
        allowedDomains: true,
        offlinePaymentsEnabled: true,
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

    const user = await getCurrentUserFromRequest(req);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const owned = await prisma.store.findFirst({
      where: { id, ownerUserId: user.id },
      select: {
        id: true,
        ownerUser: {
          select: {
            plan: true,
          },
        },
      },
    });

    if (!owned) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }

    const body = await req.json();
    const {
      name,
      slug,
      logoUrl,
      activeTheme,
      customDomain,
      mainColor,
      currency,
      timezone,
      allowedDomains,
      offlinePaymentsEnabled,
    } = body as {
      name?: string;
      slug?: string;
      logoUrl?: string | null;
      activeTheme?: "MINIMAL" | "BOLD" | "CLASSIC";
      customDomain?: string | null;
      mainColor?: string;
      currency?: string;
      timezone?: string;
      allowedDomains?: string[];
      offlinePaymentsEnabled?: boolean;
    };

    const updates: {
      name?: string;
      slug?: string;
      logoUrl?: string | null;
      activeTheme?: "MINIMAL" | "BOLD" | "CLASSIC";
      customDomain?: string | null;
      mainColor?: string;
      currency?: string;
      timezone?: string;
      allowedDomains?: string[];
      offlinePaymentsEnabled?: boolean;
    } = {};

    if (typeof name === "string" && name.trim()) {
      updates.name = name.trim();
    }

    if (typeof slug === "string" && slug.trim()) {
      updates.slug = slug.toLowerCase().replace(/[^a-z0-9-]/g, "-");
    }

    if (logoUrl !== undefined) {
      updates.logoUrl = typeof logoUrl === "string" && logoUrl.trim() ? logoUrl.trim() : null;
    }

    if (activeTheme !== undefined) {
      updates.activeTheme = activeTheme;
    }

    if (customDomain !== undefined) {
      updates.customDomain = customDomain?.trim().toLowerCase() || null;
    }

    if (mainColor !== undefined) {
      updates.mainColor = normalizeMainColor(mainColor);
    }

    if (updates.customDomain) {
      const ownerPlan = getPlanOrDefault(owned.ownerUser?.plan);
      const limits = getPlanLimits(ownerPlan);

      if (!limits.allowCustomDomains) {
        return NextResponse.json(
          { error: "Custom domains require a Prado Commerce Pro or Enterprise subscription." },
          { status: 403 },
        );
      }
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

      updates.allowedDomains = allowedDomains
        .map((domain) => domain.trim().toLowerCase())
        .filter(Boolean);
    }

    if (typeof offlinePaymentsEnabled === "boolean") {
      updates.offlinePaymentsEnabled = offlinePaymentsEnabled;
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
        logoUrl: true,
        activeTheme: true,
        customDomain: true,
        mainColor: true,
        ownerId: true,
        currency: true,
        timezone: true,
        allowedDomains: true,
        offlinePaymentsEnabled: true,
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

export async function DELETE(req: Request, { params }: RouteContext) {
  try {
    const { id } = await params;

    const user = await getCurrentUserFromRequest(req);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const owned = await prisma.store.findFirst({ where: { id, ownerUserId: user.id } });

    if (!owned) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }

    await prisma.store.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[STORE_DELETE_ERROR]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}