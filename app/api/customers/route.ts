import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserFromRequest } from "@/lib/session";
import { corsJson, withCorsHeaders } from "@/lib/api-cors";
import { hashSecret } from "@/lib/credentials";

export async function OPTIONS() {
  return withCorsHeaders(new Response(null, { status: 204 }));
}

type AddressInput = {
  line1?: unknown;
  line2?: unknown;
  city?: unknown;
  state?: unknown;
  postalCode?: unknown;
  country?: unknown;
};

function normalizeAddress(address: AddressInput | null | undefined) {
  const line1 = String(address?.line1 ?? "").trim();
  const line2 = String(address?.line2 ?? "").trim();
  const city = String(address?.city ?? "").trim();
  const state = String(address?.state ?? "").trim();
  const postalCode = String(address?.postalCode ?? "").trim();
  const country = String(address?.country ?? "").trim();

  if (!line1 && !line2 && !city && !state && !postalCode && !country) {
    return null;
  }

  return {
    line1: line1 || null,
    line2: line2 || null,
    city: city || null,
    state: state || null,
    postalCode: postalCode || null,
    country: country || null,
  };
}

function isPrismaError(error: unknown, code: string) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === code
  );
}

async function getAuthenticatedStoreId(
  request: Request,
  bodyOrParamStoreId?: string,
): Promise<{ storeId: string; authMethod: string } | null> {
  const storeIdInput = bodyOrParamStoreId?.trim() || request.headers.get("x-store-id")?.trim() || null;

  // 1. Check Authorization Bearer header or X-Secret-Key / X-API-Key header
  const authHeader = request.headers.get("authorization") || request.headers.get("Authorization");
  const secretKeyHeader = request.headers.get("x-secret-key") || request.headers.get("x-api-key");
  let bearerOrHeaderKey: string | null = null;

  if (authHeader?.startsWith("Bearer ")) {
    bearerOrHeaderKey = authHeader.slice(7).trim();
  } else if (authHeader?.startsWith("bearer ")) {
    bearerOrHeaderKey = authHeader.slice(7).trim();
  } else if (secretKeyHeader) {
    bearerOrHeaderKey = secretKeyHeader.trim();
  }

  if (bearerOrHeaderKey) {
    // Check if it matches a SECRET API key in database
    const apiKey = await prisma.apiKey.findFirst({
      where: {
        key: bearerOrHeaderKey,
        type: "SECRET",
      },
      select: {
        id: true,
        storeId: true,
        expiresAt: true,
      },
    });

    if (apiKey && (!apiKey.expiresAt || apiKey.expiresAt > new Date())) {
      if (storeIdInput && storeIdInput !== apiKey.storeId) {
        return null;
      }
      prisma.apiKey.update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } }).catch(() => {});
      return { storeId: apiKey.storeId, authMethod: "SECRET_KEY" };
    }

    // Check if it matches a PUBLISHABLE API key
    const pubKey = await prisma.apiKey.findFirst({
      where: {
        key: bearerOrHeaderKey,
        type: "PUBLISHABLE",
      },
      select: {
        id: true,
        storeId: true,
        expiresAt: true,
      },
    });

    if (pubKey && (!pubKey.expiresAt || pubKey.expiresAt > new Date())) {
      if (storeIdInput && storeIdInput !== pubKey.storeId) {
        return null;
      }
      prisma.apiKey.update({ where: { id: pubKey.id }, data: { lastUsedAt: new Date() } }).catch(() => {});
      return { storeId: pubKey.storeId, authMethod: "PUBLISHABLE_KEY" };
    }
  }

  // 2. Check X-Publishable-Key header
  const publishableKeyHeader = request.headers.get("x-publishable-key")?.trim();
  if (publishableKeyHeader) {
    const pubKey = await prisma.apiKey.findFirst({
      where: {
        key: publishableKeyHeader,
        type: "PUBLISHABLE",
      },
      select: {
        id: true,
        storeId: true,
        expiresAt: true,
      },
    });

    if (pubKey && (!pubKey.expiresAt || pubKey.expiresAt > new Date())) {
      if (storeIdInput && storeIdInput !== pubKey.storeId) {
        return null;
      }
      prisma.apiKey.update({ where: { id: pubKey.id }, data: { lastUsedAt: new Date() } }).catch(() => {});
      return { storeId: pubKey.storeId, authMethod: "PUBLISHABLE_KEY_HEADER" };
    }
  }

  // 3. Check Merchant Admin User session cookie
  const user = await getCurrentUserFromRequest(request);
  if (user) {
    if (storeIdInput) {
      const ownedStore = await prisma.store.findFirst({
        where: { id: storeIdInput, ownerUserId: user.id },
        select: { id: true },
      });
      if (ownedStore) {
        return { storeId: ownedStore.id, authMethod: "MERCHANT_SESSION" };
      }
    } else {
      const firstOwnedStore = await prisma.store.findFirst({
        where: { ownerUserId: user.id },
        select: { id: true },
      });
      if (firstOwnedStore) {
        return { storeId: firstOwnedStore.id, authMethod: "MERCHANT_SESSION" };
      }
    }
  }

  // 4. Fallback for storefront buyer registration when storeId / X-Store-ID points to a valid store
  if (storeIdInput) {
    const validStore = await prisma.store.findUnique({
      where: { id: storeIdInput },
      select: { id: true },
    });
    if (validStore) {
      return { storeId: validStore.id, authMethod: "PUBLIC_STOREFRONT" };
    }
  }

  return null;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const storeIdParam = searchParams.get("storeId") || undefined;

    const auth = await getAuthenticatedStoreId(request, storeIdParam);

    if (!auth) {
      return corsJson({ error: "Unauthorized" }, { status: 401 });
    }

    const customers = await prisma.customer.findMany({
      where: { storeId: auth.storeId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        storeId: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        shippingAddress: true,
        billingAddress: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return corsJson(customers);
  } catch (error) {
    console.error("[CUSTOMERS_GET_ERROR]", error);
    return corsJson({ error: "Failed to fetch customers" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));

    const storeIdRaw = String(body?.storeId || "").trim();
    const email = String(body?.email || "").trim().toLowerCase();
    const firstName = String(body?.firstName || "").trim() || null;
    const lastName = String(body?.lastName || "").trim() || null;
    const phone = String(body?.phone || "").trim() || null;
    const password = String(body?.password || "").trim();
    const passwordHashInput = String(body?.passwordHash || "").trim();
    const shippingAddress = normalizeAddress(body?.shippingAddress as AddressInput | undefined);
    const billingAddress = normalizeAddress(body?.billingAddress as AddressInput | undefined);

    if (!email) {
      return corsJson({ error: "email is required" }, { status: 400 });
    }

    const auth = await getAuthenticatedStoreId(request, storeIdRaw || undefined);

    if (!auth) {
      return corsJson({ error: "Unauthorized or invalid storeId" }, { status: 401 });
    }

    const storeId = auth.storeId;

    // Check if customer already exists for this store and email
    const existingCustomer = await prisma.customer.findUnique({
      where: {
        storeId_email: {
          storeId,
          email,
        },
      },
      select: {
        id: true,
        storeId: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        passwordHash: true,
        shippingAddress: true,
        billingAddress: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (existingCustomer) {
      const updateData: Record<string, unknown> = {};
      if (firstName && !existingCustomer.firstName) updateData.firstName = firstName;
      if (lastName && !existingCustomer.lastName) updateData.lastName = lastName;
      if (phone && !existingCustomer.phone) updateData.phone = phone;
      if (password) updateData.passwordHash = hashSecret(password);
      else if (passwordHashInput && !existingCustomer.passwordHash) updateData.passwordHash = passwordHashInput;
      if (shippingAddress && !existingCustomer.shippingAddress) updateData.shippingAddress = shippingAddress;
      if (billingAddress && !existingCustomer.billingAddress) updateData.billingAddress = billingAddress;

      if (Object.keys(updateData).length > 0) {
        const updated = await prisma.customer.update({
          where: { id: existingCustomer.id },
          data: updateData,
          select: {
            id: true,
            storeId: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            shippingAddress: true,
            billingAddress: true,
            createdAt: true,
            updatedAt: true,
          },
        });
        return corsJson(updated, { status: 200 });
      }

      return corsJson(
        {
          id: existingCustomer.id,
          storeId: existingCustomer.storeId,
          email: existingCustomer.email,
          firstName: existingCustomer.firstName,
          lastName: existingCustomer.lastName,
          phone: existingCustomer.phone,
          shippingAddress: existingCustomer.shippingAddress,
          billingAddress: existingCustomer.billingAddress,
          createdAt: existingCustomer.createdAt,
          updatedAt: existingCustomer.updatedAt,
        },
        { status: 200 },
      );
    }

    const computedPasswordHash = password
      ? hashSecret(password)
      : passwordHashInput || undefined;

    const createdCustomer = await prisma.customer.create({
      data: {
        storeId,
        email,
        firstName,
        lastName,
        phone,
        passwordHash: computedPasswordHash,
        shippingAddress: shippingAddress ?? undefined,
        billingAddress: billingAddress ?? undefined,
      },
      select: {
        id: true,
        storeId: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        shippingAddress: true,
        billingAddress: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return corsJson(createdCustomer, { status: 201 });
  } catch (error) {
    if (isPrismaError(error, "P2002")) {
      return corsJson(
        { error: "A customer with this email already exists for this store" },
        { status: 409 },
      );
    }

    console.error("[CUSTOMERS_POST_ERROR]", error);
    return corsJson({ error: "Failed to create customer" }, { status: 500 });
  }
}

