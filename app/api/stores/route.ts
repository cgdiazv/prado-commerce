import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserFromRequest } from "@/lib/session";
import { getPlanLimits, getPlanOrDefault } from "@/lib/subscription";
import { normalizeMainColor } from "@/lib/branding";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const stores = await prisma.store.findMany({
      where: { ownerUserId: user.id },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        name: true,
        slug: true,
        customDomain: true,
        mainColor: true,
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
    const user = await getCurrentUserFromRequest(req);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, slug, customDomain, mainColor, currency, timezone, allowedDomains } = body as {
      name?: string;
      slug?: string;
      customDomain?: string | null;
      mainColor?: string;
      currency?: string;
      timezone?: string;
      allowedDomains?: string[];
    };

    if (!name || !slug) {
      return NextResponse.json(
        { error: "Name and slug are required fields" },
        { status: 400 },
      );
    }

    if (allowedDomains !== undefined && !Array.isArray(allowedDomains)) {
      return NextResponse.json(
        { error: "allowedDomains must be an array of strings" },
        { status: 400 },
      );
    }

    const formattedSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, "-");
    const formattedCustomDomain = customDomain?.trim().toLowerCase() || null;
    const formattedMainColor = normalizeMainColor(mainColor ?? "#0f172a");
    const formattedAllowedDomains = (allowedDomains ?? [])
      .map((domain) => domain.trim().toLowerCase())
      .filter(Boolean);

    const merchant = await prisma.merchantUser.findUnique({
      where: { id: user.id },
      select: { plan: true },
    });

    if (!merchant) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const plan = getPlanOrDefault(merchant.plan);
    const limits = getPlanLimits(plan);

    if (formattedCustomDomain && !limits.allowCustomDomains) {
      return NextResponse.json(
        { error: "Custom domains require a Prado Commerce Pro or Enterprise subscription." },
        { status: 403 },
      );
    }

    const storeCount = await prisma.store.count({ where: { ownerUserId: user.id } });

    if (storeCount >= limits.maxStores) {
      return NextResponse.json(
        {
          error:
            "Store limit reached for your current plan. Upgrade your Prado Commerce plan to add more stores.",
        },
        { status: 403 },
      );
    }

    const newStore = await prisma.store.create({
      data: {
        name: name.trim(),
        slug: formattedSlug,
        customDomain: formattedCustomDomain,
        mainColor: formattedMainColor,
        ownerId: user.id,
        ownerUserId: user.id,
        currency: typeof currency === "string" && currency.trim() ? currency.trim().toUpperCase() : undefined,
        timezone: typeof timezone === "string" && timezone.trim() ? timezone.trim() : undefined,
        allowedDomains: formattedAllowedDomains,
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