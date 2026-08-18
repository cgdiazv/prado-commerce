import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserFromRequest } from "@/lib/session";
import { corsJson, withCorsHeaders } from "@/lib/api-cors";

export async function OPTIONS() {
  return withCorsHeaders(new Response(null, { status: 204 }));
}

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

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

async function verifyCustomerAccess(request: Request, customerStoreId: string, storeOwnerUserId: string | null) {
  // 1. Secret Key or Header Key
  const authHeader = request.headers.get("authorization") || request.headers.get("Authorization");
  const secretKeyHeader = request.headers.get("x-secret-key") || request.headers.get("x-api-key");
  let token: string | null = null;

  if (authHeader?.startsWith("Bearer ") || authHeader?.startsWith("bearer ")) {
    token = authHeader.slice(7).trim();
  } else if (secretKeyHeader) {
    token = secretKeyHeader.trim();
  }

  if (token) {
    const apiKey = await prisma.apiKey.findFirst({
      where: { key: token, type: "SECRET" },
      select: { id: true, storeId: true, expiresAt: true },
    });

    if (apiKey && apiKey.storeId === customerStoreId && (!apiKey.expiresAt || apiKey.expiresAt > new Date())) {
      prisma.apiKey.update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } }).catch(() => {});
      return true;
    }
  }

  // 2. Merchant Session
  const user = await getCurrentUserFromRequest(request);
  if (user && storeOwnerUserId === user.id) {
    return true;
  }

  return false;
}

export async function PATCH(req: Request, { params }: RouteContext) {
  try {
    const { id } = await params;

    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        store: {
          select: { id: true, ownerUserId: true },
        },
      },
    });

    if (!customer) {
      return corsJson({ error: "Customer not found" }, { status: 404 });
    }

    const hasAccess = await verifyCustomerAccess(req, customer.storeId, customer.store.ownerUserId);
    if (!hasAccess) {
      return corsJson({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const email = String(body?.email || "").trim().toLowerCase();
    const firstName = String(body?.firstName || "").trim() || null;
    const lastName = String(body?.lastName || "").trim() || null;
    const phone = String(body?.phone || "").trim() || null;
    const shippingAddress = normalizeAddress(body?.shippingAddress as AddressInput | undefined);
    const billingAddress = normalizeAddress(body?.billingAddress as AddressInput | undefined);

    if (!email) {
      return corsJson({ error: "Email is required" }, { status: 400 });
    }

    const updatedCustomer = await prisma.customer.update({
      where: { id },
      data: {
        email,
        firstName,
        lastName,
        phone,
        shippingAddress: (shippingAddress ?? null) as any,
        billingAddress: (billingAddress ?? null) as any,
      },
    });

    return corsJson({
      ok: true,
      customer: {
        id: updatedCustomer.id,
        email: updatedCustomer.email,
        firstName: updatedCustomer.firstName,
        lastName: updatedCustomer.lastName,
        phone: updatedCustomer.phone,
      },
    });
  } catch (error) {
    console.error("[CUSTOMER_PATCH_ERROR]", error);
    return corsJson({ error: "Failed to update customer" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: RouteContext) {
  try {
    const { id } = await params;

    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        store: {
          select: { id: true, ownerUserId: true },
        },
      },
    });

    if (!customer) {
      return corsJson({ error: "Customer not found" }, { status: 404 });
    }

    const hasAccess = await verifyCustomerAccess(req, customer.storeId, customer.store.ownerUserId);
    if (!hasAccess) {
      return corsJson({ error: "Unauthorized" }, { status: 401 });
    }

    await prisma.customer.delete({ where: { id } });

    return corsJson({ ok: true });
  } catch (error: unknown) {
    if (isPrismaError(error, "P2025")) {
      return corsJson({ error: "Customer not found" }, { status: 404 });
    }

    console.error("[CUSTOMER_DELETE_ERROR]", error);
    return corsJson({ error: "Failed to delete customer" }, { status: 500 });
  }
}

