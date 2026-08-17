import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashSecret, verifySecret } from "@/lib/credentials";
import { buildSessionCookieValue } from "@/lib/session";
import { sendMerchantSubscriptionWelcomeEmail } from "@/lib/email-notifications";

const SESSION_COOKIE = "prado_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const token = String(body?.token || "");
    const password = String(body?.password || "");

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    if (!password || password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 },
      );
    }

    const [tokenId, tokenSecret] = token.split(".");

    if (!tokenId || !tokenSecret) {
      return NextResponse.json(
        { error: "Invalid onboarding token" },
        { status: 400 },
      );
    }

    const merchantUser = await prisma.merchantUser.findUnique({
      where: { onboardingTokenId: tokenId },
      select: {
        id: true,
        email: true,
        name: true,
        plan: true,
        sessionVersion: true,
        onboardingTokenHash: true,
        onboardingTokenExpiresAt: true,
      },
    });

    if (
      !merchantUser ||
      !merchantUser.onboardingTokenHash ||
      !merchantUser.onboardingTokenExpiresAt ||
      merchantUser.onboardingTokenExpiresAt < new Date() ||
      !verifySecret(tokenSecret, merchantUser.onboardingTokenHash)
    ) {
      return NextResponse.json(
        { error: "This onboarding link is invalid or expired" },
        { status: 401 },
      );
    }

    await prisma.merchantUser.update({
      where: { id: merchantUser.id },
      data: {
        passwordHash: hashSecret(password),
        passwordSetAt: new Date(),
        onboardingTokenId: null,
        onboardingTokenHash: null,
        onboardingTokenExpiresAt: null,
      },
    });

    if (merchantUser.plan === "STARTER") {
      try {
        await sendMerchantSubscriptionWelcomeEmail({
          email: merchantUser.email,
          name: merchantUser.name,
          plan: "STARTER",
        });
      } catch (emailError) {
        console.error("[MERCHANT_WELCOME_EMAIL_ERROR]", emailError);
      }
    }

    const response = NextResponse.json({ ok: true });
    response.cookies.set({
      name: SESSION_COOKIE,
      value: buildSessionCookieValue(merchantUser.email, merchantUser.sessionVersion),
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS,
    });

    return response;
  } catch (error) {
    console.error("[AUTH_ONBOARD_ERROR]", error);

    return NextResponse.json({ error: "Could not set password" }, { status: 500 });
  }
}
