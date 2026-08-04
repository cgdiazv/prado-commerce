import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getShopperSessionCookieValueFromRequest } from "@/lib/shopper-auth";

function normalizeAddress(value: unknown) {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as {
    line1?: unknown;
    line2?: unknown;
    city?: unknown;
    state?: unknown;
    postalCode?: unknown;
    country?: unknown;
  };

  const line1 = String(candidate.line1 ?? "").trim();
  const line2 = String(candidate.line2 ?? "").trim();
  const city = String(candidate.city ?? "").trim();
  const state = String(candidate.state ?? "").trim();
  const postalCode = String(candidate.postalCode ?? "").trim();
  const country = String(candidate.country ?? "").trim();

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

type AddressRecord = {
  line1: string | null;
  line2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
};

function normalizeAddressList(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as AddressRecord[];
  }

  return value
    .map((entry) => normalizeAddress(entry))
    .filter((entry): entry is AddressRecord => Boolean(entry));
}

export async function GET(request: Request) {
  try {
    const shopperSession = getShopperSessionCookieValueFromRequest(request);

    if (!shopperSession?.storeId || !shopperSession.customerId) {
      return NextResponse.json({ error: "Please sign in to view your account" }, { status: 401 });
    }

    const customer = await prisma.customer.findFirst({
      where: {
        id: shopperSession.customerId,
        storeId: shopperSession.storeId,
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
        savedAddresses: true,
        updatedAt: true,
      },
    });

    if (!customer) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    return NextResponse.json({
      customer: {
        id: customer.id,
        storeId: customer.storeId,
        email: customer.email,
        firstName: customer.firstName,
        lastName: customer.lastName,
        phone: customer.phone,
        shippingAddress: customer.shippingAddress,
        billingAddress: customer.billingAddress,
        savedAddresses: customer.savedAddresses,
        updatedAt: customer.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("[SHOPPER_ACCOUNT_GET_ERROR]", error);
    return NextResponse.json({ error: "Failed to load your account" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const shopperSession = getShopperSessionCookieValueFromRequest(request);

    if (!shopperSession?.storeId || !shopperSession.customerId) {
      return NextResponse.json({ error: "Please sign in to update your account" }, { status: 401 });
    }

    const body = await request.json();
    const firstName = String(body?.firstName ?? "").trim() || null;
    const lastName = String(body?.lastName ?? "").trim() || null;
    const phone = String(body?.phone ?? "").trim() || null;
    const shippingAddress = normalizeAddress(body?.shippingAddress);
    const billingAddress = normalizeAddress(body?.billingAddress);
    const savedAddresses = normalizeAddressList(body?.savedAddresses);
    const hasSavedAddresses = Object.prototype.hasOwnProperty.call(body ?? {}, "savedAddresses");

    const customer = await prisma.customer.update({
      where: {
        id: shopperSession.customerId,
      },
      data: {
        firstName,
        lastName,
        phone,
        shippingAddress: shippingAddress ?? undefined,
        billingAddress: billingAddress ?? undefined,
        savedAddresses: hasSavedAddresses ? savedAddresses : undefined,
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
        savedAddresses: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      customer: {
        id: customer.id,
        storeId: customer.storeId,
        email: customer.email,
        firstName: customer.firstName,
        lastName: customer.lastName,
        phone: customer.phone,
        shippingAddress: customer.shippingAddress,
        billingAddress: customer.billingAddress,
        savedAddresses: customer.savedAddresses,
        updatedAt: customer.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("[SHOPPER_ACCOUNT_PATCH_ERROR]", error);
    return NextResponse.json({ error: "Failed to update your account" }, { status: 500 });
  }
}
