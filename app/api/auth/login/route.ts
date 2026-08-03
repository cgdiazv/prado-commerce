import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySecret } from "@/lib/credentials";

const SESSION_COOKIE = "prado_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

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

    const merchantUser = await prisma.merchantUser.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        passwordSetAt: true,
      },
    });

    if (!merchantUser) {
      return NextResponse.json(
        {
          error: "No merchant account found for this email. Request access first.",
        },
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
        { error: "Invalid email or password" },
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

    return response;
  } catch (error) {
    console.error("[AUTH_LOGIN_ERROR]", error);

    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
