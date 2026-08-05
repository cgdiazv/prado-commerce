import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashSecret, verifySecret } from "@/lib/credentials";
import { getStoreEmailConfig, sendWelcomeEmail } from "@/lib/email-notifications";
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
    const password = String(body?.password || "").trim();

    if (!storeId) {
      return NextResponse.json({ error: "storeId is required" }, { status: 400 });
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Please provide a valid email address" }, { status: 400 });
    }

    if (!password || password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    const storeConfig = await getStoreEmailConfig(storeId);

    if (!storeConfig) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }

    let customer: CustomerPayload | null = null;

    if (action === "signup") {
      const existing = await prisma.customer.findUnique({
        where: { storeId_email: { storeId, email } },
        select: { id: true, storeId: true, email: true, firstName: true, lastName: true, phone: true, createdAt: true, updatedAt: true },
      });

      if (existing) {
        return NextResponse.json({ error: "An account with that email already exists. Please sign in." }, { status: 409 });
      }

      customer = await prisma.customer.create({
        data: { storeId, email, firstName, lastName, passwordHash: hashSecret(password) },
        select: { id: true, storeId: true, email: true, firstName: true, lastName: true, phone: true, createdAt: true, updatedAt: true },
      });

      if (storeConfig.welcomeEmailEnabled) {
        try {
          await sendWelcomeEmail({
            store: storeConfig,
            to: email,
            firstName,
          });
        } catch (emailError) {
          console.error("[SHOPPER_WELCOME_EMAIL_ERROR]", emailError);
        }
      }
    } else {
      const found = await prisma.customer.findUnique({
        where: { storeId_email: { storeId, email } },
        select: { id: true, storeId: true, email: true, firstName: true, lastName: true, phone: true, passwordHash: true, createdAt: true, updatedAt: true },
      });

      if (!found) {
        return NextResponse.json({ error: "No account found for that email. Please create an account." }, { status: 404 });
      }

      if (found.passwordHash && !verifySecret(password, found.passwordHash)) {
        return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
      }

      // allow legacy passwordless accounts to set a password on first sign in
      if (!found.passwordHash) {
        await prisma.customer.update({ where: { id: found.id }, data: { passwordHash: hashSecret(password) } });
      }

      customer = found;
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
