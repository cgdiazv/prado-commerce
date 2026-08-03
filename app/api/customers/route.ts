import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserFromRequest } from "@/lib/session";

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

export async function GET(request: Request) {
  try {
    const user = await getCurrentUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get("storeId");

    if (!storeId) {
      return NextResponse.json({ error: "storeId is required" }, { status: 400 });
    }

    const ownedStore = await prisma.store.findFirst({
      where: { id: storeId, ownerUserId: user.id },
      select: { id: true },
    });

    if (!ownedStore) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }

    const customers = await prisma.customer.findMany({
      where: { storeId },
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

    return NextResponse.json(customers);
  } catch (error) {
    console.error("[CUSTOMERS_GET_ERROR]", error);
    return NextResponse.json({ error: "Failed to fetch customers" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    const storeId = String(body?.storeId || "").trim();
    const email = String(body?.email || "").trim().toLowerCase();
    const firstName = String(body?.firstName || "").trim() || null;
    const lastName = String(body?.lastName || "").trim() || null;
    const phone = String(body?.phone || "").trim() || null;
    const shippingAddress = normalizeAddress(body?.shippingAddress as AddressInput | undefined);
    const billingAddress = normalizeAddress(body?.billingAddress as AddressInput | undefined);

    if (!storeId || !email) {
      return NextResponse.json({ error: "storeId and email are required" }, { status: 400 });
    }

    const ownedStore = await prisma.store.findFirst({
      where: { id: storeId, ownerUserId: user.id },
      select: { id: true },
    });

    if (!ownedStore) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }

    const createdCustomer = await prisma.customer.create({
      data: {
        storeId,
        email,
        firstName,
        lastName,
        phone,
        shippingAddress,
        billingAddress,
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

    return NextResponse.json(createdCustomer, { status: 201 });
  } catch (error) {
    if (isPrismaError(error, "P2002")) {
      return NextResponse.json(
        { error: "A customer with this email already exists for this store" },
        { status: 409 },
      );
    }

    console.error("[CUSTOMERS_POST_ERROR]", error);
    return NextResponse.json({ error: "Failed to create customer" }, { status: 500 });
  }
}
