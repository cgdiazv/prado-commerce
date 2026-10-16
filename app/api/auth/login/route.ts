import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySecret } from "@/lib/credentials";
import { buildSessionCookieValue, CASHIER_COOKIE, CashierSessionData } from "@/lib/session";
import { resolvePosSettings } from "@/lib/pos/settings";
import type { PosCashier } from "@/types/dashboard";

const SESSION_COOKIE = "prado_session";
const PLAN_COOKIE = "prado_plan";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

function isUnknownPlanSelectFieldError(error: unknown): boolean {
  return (
    error instanceof Error &&
    /Unknown field `(plan|sessionVersion)` for select statement/.test(error.message)
  );
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body?.email || "").trim().toLowerCase();
    const password = String(body?.password || "").trim();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    if (!password) {
      return NextResponse.json({ error: "Password or PIN is required" }, { status: 400 });
    }

    let merchantUser: {
      id: string;
      email: string;
      plan: "STARTER" | "PRO" | "ENTERPRISE";
      sessionVersion?: number;
      passwordHash: string | null;
      passwordSetAt: Date | null;
    } | null = null;

    try {
      merchantUser = await prisma.merchantUser.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          plan: true,
          sessionVersion: true,
          passwordHash: true,
          passwordSetAt: true,
        },
      });
    } catch (error) {
      if (!isUnknownPlanSelectFieldError(error)) {
        throw error;
      }

      const fallbackUser = await prisma.merchantUser.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          passwordHash: true,
          passwordSetAt: true,
        },
      });

      merchantUser = fallbackUser
        ? {
            ...fallbackUser,
            plan: "STARTER",
            sessionVersion: 0,
          }
        : null;
    }

    // 1. Check if valid Merchant password was provided
    if (
      merchantUser &&
      merchantUser.passwordHash &&
      merchantUser.passwordSetAt &&
      verifySecret(password, merchantUser.passwordHash)
    ) {
      const response = NextResponse.json({
        ok: true,
        isCashier: false,
        redirectTo: "/dashboard",
      });
      response.cookies.set({
        name: SESSION_COOKIE,
        value: buildSessionCookieValue(email, merchantUser.sessionVersion ?? 0),
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: SESSION_MAX_AGE_SECONDS,
      });
      response.cookies.set({
        name: PLAN_COOKIE,
        value: merchantUser.plan,
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: SESSION_MAX_AGE_SECONDS,
      });
      // Clear any previous cashier session
      response.cookies.set({
        name: CASHIER_COOKIE,
        value: "",
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 0,
      });

      return response;
    }

    // 2. Check if credentials correspond to a POS Cashier (email + PIN)
    const stores = await prisma.store.findMany({
      select: {
        id: true,
        name: true,
        posSettings: true,
        ownerUserId: true,
        ownerUser: {
          select: {
            id: true,
            email: true,
            name: true,
            plan: true,
            sessionVersion: true,
          },
        },
      },
    });

    let matchedCashier: PosCashier | null = null;
    let matchedStore: (typeof stores)[number] | null = null;
    let emailFoundInAnyCashier = false;

    for (const store of stores) {
      const settings = resolvePosSettings(store.posSettings, store.ownerUser ?? undefined);
      if (Array.isArray(settings.cashiers)) {
        for (const cashier of settings.cashiers) {
          if (cashier.email && cashier.email.trim().toLowerCase() === email) {
            emailFoundInAnyCashier = true;
            if (
              cashier.status !== "INACTIVE" &&
              cashier.pin &&
              cashier.pin.trim() === password
            ) {
              matchedCashier = cashier;
              matchedStore = store;
              break;
            }
          }
        }
      }
      if (matchedCashier) break;
    }

    if (matchedCashier && matchedStore) {
      const ownerUser = matchedStore.ownerUser;
      const ownerEmail = ownerUser?.email || email;
      const ownerSessionVersion = ownerUser?.sessionVersion ?? 0;
      const ownerPlan = ownerUser?.plan || "STARTER";

      const cashierSession: CashierSessionData = {
        cashierId: matchedCashier.id,
        cashierName: matchedCashier.name,
        cashierEmail: matchedCashier.email ? matchedCashier.email.trim().toLowerCase() : email,
        cashierRole: matchedCashier.role || "CASHIER",
        storeId: matchedStore.id,
        storeName: matchedStore.name,
        ownerEmail,
      };

      const redirectPosUrl = `/dashboard/orders/pos?storeId=${matchedStore.id}`;
      const response = NextResponse.json({
        ok: true,
        isCashier: true,
        cashier: cashierSession,
        redirectTo: redirectPosUrl,
      });

      response.cookies.set({
        name: SESSION_COOKIE,
        value: buildSessionCookieValue(ownerEmail, ownerSessionVersion),
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: SESSION_MAX_AGE_SECONDS,
      });

      response.cookies.set({
        name: PLAN_COOKIE,
        value: ownerPlan,
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: SESSION_MAX_AGE_SECONDS,
      });

      response.cookies.set({
        name: CASHIER_COOKIE,
        value: encodeURIComponent(JSON.stringify(cashierSession)),
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: SESSION_MAX_AGE_SECONDS,
      });

      return response;
    }

    // 3. Handle descriptive error responses
    if (emailFoundInAnyCashier) {
      return NextResponse.json(
        { error: "Incorrect PIN for cashier. Please try again." },
        { status: 401 },
      );
    }

    if (merchantUser) {
      if (!merchantUser.passwordHash || !merchantUser.passwordSetAt) {
        return NextResponse.json(
          {
            error: "Set your password from the onboarding link before signing in.",
          },
          { status: 401 },
        );
      }

      return NextResponse.json(
        { error: "Incorrect password. Please try again." },
        { status: 401 },
      );
    }

    return NextResponse.json(
      { error: "Account does not exist for this email. Please check your email or contact your administrator." },
      { status: 401 },
    );
  } catch (error) {
    console.error("[AUTH_LOGIN_ERROR]", error);

    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
