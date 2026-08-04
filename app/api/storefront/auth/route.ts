import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  SHOPPER_SESSION_COOKIE,
  buildShopperSessionCookieValue,
  getShopperSessionCookieValueFromRequest,
} from "@/lib/shopper-auth";

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

type CustomerPayload = {
  id: string;
  storeId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  createdAt: Date;
  updatedAt: Date;
};

function normalizeEmail(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function normalizeName(value: unknown) {
  return String(value ?? "").trim() || null;
}

function toCustomerPayload(customer: CustomerPayload) {
  return {
    id: customer.id,
    storeId: customer.storeId,
    email: customer.email,
    firstName: customer.firstName,
    lastName: customer.lastName,
    phone: customer.phone,
    createdAt: customer.createdAt.toISOString(),
    updatedAt: customer.updatedAt.toISOString(),
  };
}

export async function GET(request: Request) {
  try {
    const parsedCookie = getShopperSessionCookieValueFromRequest(request);

    if (!parsedCookie) {
      return NextResponse.json({ customer: null });
    }

    const customer = await prisma.customer.findFirst({
      where: {
        id: parsedCookie.customerId,
        storeId: parsedCookie.storeId,
      },
      select: {
        id: true,
        storeId: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ customer: customer ? toCustomerPayload(customer) : null });
  } catch (error) {
    console.error("[SHOPPER_AUTH_GET_ERROR]", error);
    return NextResponse.json({ error: "Failed to load shopper account" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const action = String(body?.action || "signin").trim();
    const storeId = String(body?.storeId || "").trim();
    const email = normalizeEmail(body?.email);
    const firstName = normalizeName(body?.firstName);
    const lastName = normalizeName(body?.lastName);

    if (!storeId) {
      return NextResponse.json({ error: "storeId is required" }, { status: 400 });
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Please provide a valid email address" }, { status: 400 });
    }

    const storeExists = await prisma.store.findUnique({
      where: { id: storeId },
      select: { id: true },
    });

    if (!storeExists) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }

    let customer: CustomerPayload | null = null;

    if (action === "signup") {
      const existing = await prisma.customer.findUnique({
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
          createdAt: true,
          updatedAt: true,
        },
      });

      if (existing) {
        customer = existing;
      } else {
        customer = await prisma.customer.create({
          data: {
            storeId,
            email,
            firstName,
            lastName,
          },
          select: {
            id: true,
            storeId: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            createdAt: true,
            updatedAt: true,
          },
        });
      }
    } else {
      customer = await prisma.customer.findUnique({
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
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!customer) {
        return NextResponse.json(
          { error: "No shopper account exists for that email yet. Create an account to continue." },
          { status: 404 },
        );
      }
    }

    const response = NextResponse.json({ customer: toCustomerPayload(customer) });
    response.cookies.set({
      name: SHOPPER_SESSION_COOKIE,
      value: buildShopperSessionCookieValue(storeId, customer.id, 1),
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS,
    });

    return response;
  } catch (error) {
    console.error("[SHOPPER_AUTH_POST_ERROR]", error);
    return NextResponse.json({ error: "Failed to sign in to this storefront" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const response = NextResponse.json({ ok: true });
    response.cookies.set({
      name: SHOPPER_SESSION_COOKIE,
      value: "",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0,
      expires: new Date(0),
    });

    return response;
  } catch (error) {
    console.error("[SHOPPER_AUTH_DELETE_ERROR]", error);
    return NextResponse.json({ error: "Failed to sign out" }, { status: 500 });
  }
}
