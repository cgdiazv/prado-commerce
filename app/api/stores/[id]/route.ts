import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserFromRequest } from "@/lib/session";
import { getPlanLimits, getPlanOrDefault } from "@/lib/subscription";
import { normalizeMainColor } from "@/lib/branding";
import { encryptStoredSecret } from "@/lib/credentials";
import { addVercelDomain, getVercelDomainStatus, removeVercelDomain } from "@/lib/vercel-domains";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_req: Request, { params }: RouteContext) {
  try {
    const { id } = await params;

    let store;

    try {
      store = await prisma.store.findUnique({
        where: {
          id,
        },
        select: {
          id: true,
          name: true,
          slug: true,
          logoUrl: true,
          heroImageUrl: true,
          heroEyebrow: true,
          heroTitle: true,
          heroSubtitle: true,
          heroButtonText: true,
          activeTheme: true,
          customDomain: true,
          stripeConnectAccountId: true,
          stripeChargesEnabled: true,
          stripePayoutsEnabled: true,
          stripeDetailsSubmitted: true,
          authNetLoginId: true,
          authNetClientKey: true,
          authNetTransKeyEncrypted: true,
          authNetEnv: true,
          mainColor: true,
          ownerId: true,
          currency: true,
          timezone: true,
          allowedDomains: true,
          offlinePaymentsEnabled: true,
          welcomeEmailEnabled: true,
          orderConfirmationEmailEnabled: true,
          invoiceEmailEnabled: true,
          senderName: true,
          senderEmail: true,
          replyToEmail: true,
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
    } catch (error: unknown) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "P2022"
      ) {
        const legacyStore = await prisma.store.findUnique({
          where: {
            id,
          },
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
            heroImageUrl: true,
            heroEyebrow: true,
            heroTitle: true,
            heroSubtitle: true,
            heroButtonText: true,
            activeTheme: true,
            customDomain: true,
            mainColor: true,
            ownerId: true,
            currency: true,
            timezone: true,
            allowedDomains: true,
            offlinePaymentsEnabled: true,
            authNetLoginId: true,
            authNetClientKey: true,
            authNetEnv: true,
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

        store = legacyStore
          ? {
              ...legacyStore,
              stripeConnectAccountId: null,
              stripeChargesEnabled: false,
              stripePayoutsEnabled: false,
              stripeDetailsSubmitted: false,
              authNetLoginId: null,
              authNetClientKey: null,
              authNetTransKeyEncrypted: null,
              authNetEnv: "sandbox",
              welcomeEmailEnabled: false,
              orderConfirmationEmailEnabled: false,
              invoiceEmailEnabled: false,
              senderName: null,
              senderEmail: null,
              replyToEmail: null,
            }
          : null;
      } else {
        throw error;
      }
    }

    if (!store) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }

    const { authNetTransKeyEncrypted, ...safeStore } = store;

    return NextResponse.json({
      ...safeStore,
      authNetConfigured: Boolean(store.authNetLoginId && store.authNetClientKey && authNetTransKeyEncrypted),
    });
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
        customDomain: true,
        authNetLoginId: true,
        authNetClientKey: true,
        authNetTransKeyEncrypted: true,
        authNetEnv: true,
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
      heroImageUrl,
      heroEyebrow,
      heroTitle,
      heroSubtitle,
      heroButtonText,
      activeTheme,
      customDomain,
      mainColor,
      currency,
      timezone,
      allowedDomains,
      offlinePaymentsEnabled,
      authNetLoginId,
      authNetClientKey,
      authNetTransKey,
      authNetEnv,
      welcomeEmailEnabled,
      orderConfirmationEmailEnabled,
      invoiceEmailEnabled,
      senderName,
      senderEmail,
      replyToEmail,
    } = body as {
      name?: string;
      slug?: string;
      logoUrl?: string | null;
      heroImageUrl?: string | null;
      heroEyebrow?: string | null;
      heroTitle?: string | null;
      heroSubtitle?: string | null;
      heroButtonText?: string | null;
      activeTheme?: "MINIMAL" | "BOLD" | "CLASSIC";
      customDomain?: string | null;
      mainColor?: string;
      currency?: string;
      timezone?: string;
      allowedDomains?: string[];
      offlinePaymentsEnabled?: boolean;
      authNetLoginId?: string | null;
      authNetClientKey?: string | null;
      authNetTransKey?: string | null;
      authNetEnv?: "sandbox" | "production" | string;
      welcomeEmailEnabled?: boolean;
      orderConfirmationEmailEnabled?: boolean;
      invoiceEmailEnabled?: boolean;
      senderName?: string | null;
      senderEmail?: string | null;
      replyToEmail?: string | null;
    };

    const updates: {
      name?: string;
      slug?: string;
      logoUrl?: string | null;
      heroImageUrl?: string | null;
      heroEyebrow?: string | null;
      heroTitle?: string | null;
      heroSubtitle?: string | null;
      heroButtonText?: string | null;
      activeTheme?: "MINIMAL" | "BOLD" | "CLASSIC";
      customDomain?: string | null;
      mainColor?: string;
      currency?: string;
      timezone?: string;
      allowedDomains?: string[];
      offlinePaymentsEnabled?: boolean;
      authNetLoginId?: string | null;
      authNetClientKey?: string | null;
      authNetTransKeyEncrypted?: string | null;
      authNetEnv?: string;
      welcomeEmailEnabled?: boolean;
      orderConfirmationEmailEnabled?: boolean;
      invoiceEmailEnabled?: boolean;
      senderName?: string | null;
      senderEmail?: string | null;
      replyToEmail?: string | null;
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

    if (heroImageUrl !== undefined) {
      updates.heroImageUrl = typeof heroImageUrl === "string" && heroImageUrl.trim() ? heroImageUrl.trim() : null;
    }

    if (heroEyebrow !== undefined) {
      updates.heroEyebrow = typeof heroEyebrow === "string" && heroEyebrow.trim() ? heroEyebrow.trim() : null;
    }

    if (heroTitle !== undefined) {
      updates.heroTitle = typeof heroTitle === "string" && heroTitle.trim() ? heroTitle.trim() : null;
    }

    if (heroSubtitle !== undefined) {
      updates.heroSubtitle = typeof heroSubtitle === "string" && heroSubtitle.trim() ? heroSubtitle.trim() : null;
    }

    if (heroButtonText !== undefined) {
      updates.heroButtonText = typeof heroButtonText === "string" && heroButtonText.trim() ? heroButtonText.trim() : null;
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

    if (authNetLoginId !== undefined) {
      updates.authNetLoginId = typeof authNetLoginId === "string" && authNetLoginId.trim()
        ? authNetLoginId.trim()
        : null;
    }

    if (authNetClientKey !== undefined) {
      updates.authNetClientKey = typeof authNetClientKey === "string" && authNetClientKey.trim()
        ? authNetClientKey.trim()
        : null;
    }

    if (authNetTransKey !== undefined) {
      updates.authNetTransKeyEncrypted = typeof authNetTransKey === "string" && authNetTransKey.trim()
        ? encryptStoredSecret(authNetTransKey.trim())
        : null;
    }

    if (authNetEnv !== undefined) {
      const normalizedAuthNetEnv = String(authNetEnv).trim().toLowerCase();
      if (normalizedAuthNetEnv !== "sandbox" && normalizedAuthNetEnv !== "production") {
        return NextResponse.json(
          { error: "Authorize.net environment must be sandbox or production." },
          { status: 400 },
        );
      }
      updates.authNetEnv = normalizedAuthNetEnv;
    }

    const hasAuthNetPartialConfig = [
      updates.authNetLoginId !== undefined ? updates.authNetLoginId : owned.authNetLoginId,
      updates.authNetClientKey !== undefined ? updates.authNetClientKey : owned.authNetClientKey,
      updates.authNetTransKeyEncrypted !== undefined ? updates.authNetTransKeyEncrypted : owned.authNetTransKeyEncrypted,
    ].some((value) => value !== null && value !== undefined && value !== "");

    if (hasAuthNetPartialConfig) {
      const nextAuthNetLoginId = updates.authNetLoginId !== undefined ? updates.authNetLoginId : owned.authNetLoginId;
      const nextAuthNetClientKey = updates.authNetClientKey !== undefined ? updates.authNetClientKey : owned.authNetClientKey;
      const nextAuthNetTransKeyEncrypted = updates.authNetTransKeyEncrypted !== undefined
        ? updates.authNetTransKeyEncrypted
        : owned.authNetTransKeyEncrypted;

      const authNetFieldCount = [nextAuthNetLoginId, nextAuthNetClientKey, nextAuthNetTransKeyEncrypted]
        .filter(Boolean)
        .length;

      if (authNetFieldCount > 0 && authNetFieldCount < 3) {
        return NextResponse.json(
          { error: "Authorize.net setup requires API Login ID, Public Client Key, and Transaction Key." },
          { status: 400 },
        );
      }
    }

    if (typeof welcomeEmailEnabled === "boolean") {
      updates.welcomeEmailEnabled = welcomeEmailEnabled;
    }

    if (typeof orderConfirmationEmailEnabled === "boolean") {
      updates.orderConfirmationEmailEnabled = orderConfirmationEmailEnabled;
    }

    if (typeof invoiceEmailEnabled === "boolean") {
      updates.invoiceEmailEnabled = invoiceEmailEnabled;
    }

    if (senderName !== undefined) {
      updates.senderName = typeof senderName === "string" && senderName.trim() ? senderName.trim() : null;
    }

    if (senderEmail !== undefined) {
      updates.senderEmail = typeof senderEmail === "string" && senderEmail.trim() ? senderEmail.trim().toLowerCase() : null;
    }

    if (replyToEmail !== undefined) {
      updates.replyToEmail = typeof replyToEmail === "string" && replyToEmail.trim() ? replyToEmail.trim().toLowerCase() : null;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "At least one field must be provided for update" },
        { status: 400 },
      );
    }

    const previousDomain = owned.customDomain ?? null;
    const nextDomain = updates.customDomain !== undefined ? (updates.customDomain ?? null) : previousDomain;

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
        heroImageUrl: true,
        heroEyebrow: true,
        heroTitle: true,
        heroSubtitle: true,
        heroButtonText: true,
        activeTheme: true,
        customDomain: true,
        stripeConnectAccountId: true,
        stripeChargesEnabled: true,
        stripePayoutsEnabled: true,
        stripeDetailsSubmitted: true,
        authNetLoginId: true,
        authNetClientKey: true,
        authNetTransKeyEncrypted: true,
        authNetEnv: true,
        mainColor: true,
        ownerId: true,
        currency: true,
        timezone: true,
        allowedDomains: true,
        offlinePaymentsEnabled: true,
        welcomeEmailEnabled: true,
        orderConfirmationEmailEnabled: true,
        invoiceEmailEnabled: true,
        senderName: true,
        senderEmail: true,
        replyToEmail: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Sync domain registration with Vercel after the DB update succeeds
    if (nextDomain !== previousDomain) {
      try {
        if (previousDomain) await removeVercelDomain(previousDomain);
        if (nextDomain) await addVercelDomain(nextDomain);
      } catch (domainError) {
        console.error("[VERCEL_DOMAIN_SYNC_ERROR]", domainError);
        // Domain sync failure is non-fatal — the store is saved; merchant should retry
      }
    }

    const domainStatus = updatedStore.customDomain
      ? await getVercelDomainStatus(updatedStore.customDomain)
      : null;

    const { authNetTransKeyEncrypted, ...safeUpdatedStore } = updatedStore;

    return NextResponse.json({
      ...safeUpdatedStore,
      authNetConfigured: Boolean(
        updatedStore.authNetLoginId && updatedStore.authNetClientKey && authNetTransKeyEncrypted,
      ),
      domainStatus,
    });
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

    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2022"
    ) {
      return NextResponse.json(
        { error: "Some store settings columns are not available yet. Run the latest database migrations and try again." },
        { status: 400 },
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