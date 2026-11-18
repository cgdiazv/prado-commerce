import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentCashierFromRequest, getCurrentUserFromRequest } from "@/lib/session";
import { parseTaxSettings } from "@/lib/tax";

type RouteContext = {
  params: Promise<{ id: string }>;
};

async function getOwnedStoreId(request: Request, id: string) {
  const cashier = getCurrentCashierFromRequest(request);
  if (cashier?.storeId === id) return id;

  const user = await getCurrentUserFromRequest(request);
  if (!user) return null;

  const store = await prisma.store.findFirst({
    where: { id, ownerUserId: user.id },
    select: { id: true },
  });
  return store?.id ?? null;
}

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const storeId = await getOwnedStoreId(request, id);
    if (!storeId) return NextResponse.json({ error: "Store not found" }, { status: 404 });

    const store = await prisma.store.findUnique({
      where: { id: storeId },
      select: { taxSettings: true },
    });

    return NextResponse.json({ settings: store?.taxSettings ?? null });
  } catch (error) {
    console.error("[TAX_SETTINGS_GET_ERROR]", error);
    return NextResponse.json({ error: "Failed to fetch tax settings" }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    if (getCurrentCashierFromRequest(request)) {
      return NextResponse.json({ error: "Cashiers cannot change tax settings." }, { status: 403 });
    }
    const storeId = await getOwnedStoreId(request, id);
    if (!storeId) return NextResponse.json({ error: "Store not found" }, { status: 404 });

    const body: unknown = await request.json();
    if (
      typeof body !== "object" ||
      body === null ||
      !Array.isArray((body as Record<string, unknown>).nexusRegions) ||
      !Array.isArray((body as Record<string, unknown>).taxCategories)
    ) {
      return NextResponse.json({ error: "Invalid tax settings" }, { status: 400 });
    }

    const rawSettings = body as Record<string, unknown>;
    const rawRegions = rawSettings.nexusRegions as unknown[];
    const rawCategories = rawSettings.taxCategories as unknown[];
    const settings = parseTaxSettings(rawSettings);
    if (
      settings.nexusRegions.length !== rawRegions.length ||
      settings.taxCategories.length !== rawCategories.length
    ) {
      return NextResponse.json({ error: "Each tax region and category must include its required fields." }, { status: 400 });
    }
    const invalidRegion = settings.nexusRegions.some((region) =>
      !region.country.trim() ||
      !region.region.trim() ||
      (region.defaultRate !== undefined && (!Number.isFinite(Number(region.defaultRate)) || Number(region.defaultRate) < 0 || Number(region.defaultRate) > 100)),
    );
    const invalidCategory = settings.taxCategories.some((category) =>
      !category.code.trim() ||
      !Number.isFinite(Number(category.defaultRate)) ||
      Number(category.defaultRate) < 0 ||
      Number(category.defaultRate) > 100,
    );
    const categoryNamesMissing = rawCategories.some((category) =>
      typeof category !== "object" ||
      category === null ||
      !("name" in category) ||
      typeof category.name !== "string" ||
      !category.name.trim(),
    );
    const duplicateRegions = new Set(
      settings.nexusRegions.map((region) => `${region.country.trim().toLowerCase()}|${region.region.trim().toLowerCase()}`),
    ).size !== settings.nexusRegions.length;
    const duplicateCategories = new Set(
      settings.taxCategories.map((category) => category.code.trim().toLowerCase()),
    ).size !== settings.taxCategories.length;
    if (invalidRegion || invalidCategory || categoryNamesMissing || duplicateRegions || duplicateCategories) {
      return NextResponse.json({ error: "Tax rates must be between 0 and 100 and regions/categories must be named." }, { status: 400 });
    }

    await prisma.store.update({
      where: { id: storeId },
      data: { taxSettings: rawSettings as Prisma.InputJsonValue },
    });
    return NextResponse.json({ settings: rawSettings });
  } catch (error) {
    console.error("[TAX_SETTINGS_SAVE_ERROR]", error);
    return NextResponse.json({ error: "Failed to save tax settings" }, { status: 500 });
  }
}
