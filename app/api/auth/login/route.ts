import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySecret } from "@/lib/credentials";

const SESSION_COOKIE = "prado_session";
const PLAN_COOKIE = "prado_plan";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

function isUnknownPlanSelectFieldError(error: unknown): boolean {
  return error instanceof Error && /Unknown field `plan` for select statement/.test(error.message);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body?.email || "").trim().toLowerCase();
    const password = String(body?.password || "");

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    if (!password) {
      return NextResponse.json({ error: "Password is required" }, { status: 400 });
    }

    let merchantUser: {
      id: string;
      email: string;
      plan: "STARTER" | "PRO" | "ENTERPRISE";
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
          }
        : null;
    }

    if (!merchantUser) {
      return NextResponse.json(
        { error: "Account does not exist for this email. Please create an account first." },
        { status: 401 },
      );
    }

    if (!merchantUser.passwordHash || !merchantUser.passwordSetAt) {
      return NextResponse.json(
        {
          error: "Set your password from the onboarding link before signing in.",
        },
        { status: 401 },
      );
    }

    if (!verifySecret(password, merchantUser.passwordHash)) {
      return NextResponse.json(
        { error: "Incorrect password. Please try again." },
        { status: 401 },
      );
    }

    const response = NextResponse.json({ ok: true });
    response.cookies.set({
      name: SESSION_COOKIE,
      value: email,
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

    return response;
  } catch (error) {
    console.error("[AUTH_LOGIN_ERROR]", error);

    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
