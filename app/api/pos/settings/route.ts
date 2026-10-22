import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, getCurrentUserFromRequest, getCurrentCashier, getCurrentCashierFromRequest } from "@/lib/session";
import { resolvePosRoleModules, resolvePosSettings } from "@/lib/pos/settings";
import { getPlanLimits, getPlanOrDefault } from "@/lib/subscription";
import type { PosStoreSettings, PosTerminal, PosCashier } from "@/types/dashboard";

export async function GET(request: Request) {
  try {
    const user = (await getCurrentUser()) ?? (await getCurrentUserFromRequest(request));
    const cashier = (await getCurrentCashier()) ?? getCurrentCashierFromRequest(request);
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get("storeId");

    if (!user && !cashier) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (cashier && storeId && storeId !== cashier.storeId) {
      return NextResponse.json(
        { error: "Forbidden: You are only authorized to view POS settings for your assigned store." },
        { status: 403 },
      );
    }

    const limits = getPlanLimits(getPlanOrDefault(user?.plan));
    if (!limits.allowPos) {
      return NextResponse.json(
        { error: "Point of Sale (POS) requires a Prado Commerce Pro or Enterprise subscription." },
        { status: 403 },
      );
    }

    let targetStoreId = cashier ? cashier.storeId : storeId;
    if (!targetStoreId && user) {
      const firstStore = await prisma.store.findFirst({
        where: { ownerUserId: user.id },
        select: { id: true },
      });
      targetStoreId = firstStore?.id ?? null;
    }

    if (!targetStoreId) {
      return NextResponse.json({ error: "No store found" }, { status: 404 });
    }

    const store = await prisma.store.findFirst({
      where: cashier
        ? { id: cashier.storeId }
        : {
            id: targetStoreId,
            ownerUserId: user!.id,
          },
      select: {
        id: true,
        name: true,
        posSettings: true,
      },
    });

    if (!store) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }

    const finalSettings = resolvePosSettings(store.posSettings, user ?? undefined);

    return NextResponse.json({
      success: true,
      storeId: store.id,
      storeName: store.name,
      settings: finalSettings,
    });
  } catch (error) {
    console.error("[POS_SETTINGS_GET_ERROR]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = (await getCurrentUser()) ?? (await getCurrentUserFromRequest(request));
    const cashier = (await getCurrentCashier()) ?? getCurrentCashierFromRequest(request);

    if (!user && !cashier) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (cashier && cashier.cashierRole !== "MANAGER") {
      return NextResponse.json(
        { error: "Forbidden: Only store managers or store owners can modify POS settings." },
        { status: 403 },
      );
    }

    const limits = getPlanLimits(getPlanOrDefault(user?.plan));
    if (!limits.allowPos) {
      return NextResponse.json(
        { error: "Point of Sale (POS) requires a Prado Commerce Pro or Enterprise subscription." },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { storeId, settings } = body;

    if (!storeId || typeof storeId !== "string") {
      return NextResponse.json({ error: "Missing storeId" }, { status: 400 });
    }

    if (cashier && storeId !== cashier.storeId) {
      return NextResponse.json(
        { error: "Forbidden: You can only modify POS settings for your assigned store." },
        { status: 403 },
      );
    }

    // Verify ownership or cashier store assignment
    const store = await prisma.store.findFirst({
      where: cashier
        ? { id: cashier.storeId }
        : {
            id: storeId,
            ownerUserId: user!.id,
          },
      select: { id: true },
    });

    if (!store) {
      return NextResponse.json({ error: "Store not found or unauthorized" }, { status: 404 });
    }

    // Sanitize terminals
    const terminals: PosTerminal[] = (Array.isArray(settings?.terminals) ? settings.terminals : [])
      .map((t: any, index: number) => ({
        id: String(t.id || `term-${Date.now()}-${index}`),
        name: String(t.name || `Register ${index + 1}`).trim(),
        code: String(t.code || `REG-${String(index + 1).padStart(2, "0")}`).trim().toUpperCase(),
        location: t.location ? String(t.location).trim() : null,
        receiptPrefix: t.receiptPrefix ? String(t.receiptPrefix).trim().toUpperCase() : null,
        status: t.status === "INACTIVE" ? "INACTIVE" : "ACTIVE",
        notes: t.notes ? String(t.notes).trim() : null,
        createdAt: t.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }))
      .filter((t: PosTerminal) => t.name.length > 0);

    // Sanitize cashiers
    const cashiers: PosCashier[] = (Array.isArray(settings?.cashiers) ? settings.cashiers : [])
      .map((c: any, index: number) => ({
        id: String(c.id || `csh-${Date.now()}-${index}`),
        name: String(c.name || `Cashier ${index + 1}`).trim(),
        email: c.email ? String(c.email).trim() : null,
        phone: c.phone ? String(c.phone).trim() : null,
        pin: c.pin ? String(c.pin).trim() : null,
        role: ["MANAGER", "SUPERVISOR", "CASHIER"].includes(c.role) ? c.role : "CASHIER",
        status: c.status === "INACTIVE" ? "INACTIVE" : "ACTIVE",
        assignedTerminalId: c.assignedTerminalId ? String(c.assignedTerminalId) : null,
        createdAt: c.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }))
      .filter((c: PosCashier) => c.name.length > 0);

    const sanitizedSettings: PosStoreSettings = {
      terminals,
      cashiers,
      roleModules: resolvePosRoleModules(settings?.roleModules),
      requireCashierPin: Boolean(settings?.requireCashierPin),
      defaultTerminalId: settings?.defaultTerminalId ? String(settings.defaultTerminalId) : (terminals[0]?.id || null),
      receiptFooterText: settings?.receiptFooterText ? String(settings.receiptFooterText).trim() : null,
      allowManualDiscounts: settings?.allowManualDiscounts !== false,
      allowCustomCashierName: settings?.allowCustomCashierName !== false,
    };

    await prisma.store.update({
      where: { id: storeId },
      data: {
        posSettings: sanitizedSettings as any,
      },
    });

    return NextResponse.json({
      success: true,
      settings: sanitizedSettings,
    });
  } catch (error) {
    console.error("[POS_SETTINGS_POST_ERROR]", error);
    return NextResponse.json({ error: "Failed to save POS settings" }, { status: 500 });
  }
}
