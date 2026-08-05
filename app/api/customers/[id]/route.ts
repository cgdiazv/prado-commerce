import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserFromRequest } from "@/lib/session";

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

export async function PATCH(req: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const user = await getCurrentUserFromRequest(req);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        store: {
          select: { ownerUserId: true },
        },
      },
    });

    if (!customer || customer.store.ownerUserId !== user.id) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    const body = await req.json();
    const email = String(body?.email || "").trim().toLowerCase();
    const firstName = String(body?.firstName || "").trim() || null;
    const lastName = String(body?.lastName || "").trim() || null;
    const phone = String(body?.phone || "").trim() || null;
    const shippingAddress = normalizeAddress(body?.shippingAddress as AddressInput | undefined);
    const billingAddress = normalizeAddress(body?.billingAddress as AddressInput | undefined);

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
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

    return NextResponse.json({
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
    return NextResponse.json({ error: "Failed to update customer" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const user = await getCurrentUserFromRequest(req);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        store: {
          select: { ownerUserId: true },
        },
      },
    });

    if (!customer || customer.store.ownerUserId !== user.id) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    await prisma.customer.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    if (isPrismaError(error, "P2025")) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    console.error("[CUSTOMER_DELETE_ERROR]", error);
    return NextResponse.json({ error: "Failed to delete customer" }, { status: 500 });
  }
}
