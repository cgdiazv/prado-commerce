import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashSecret, verifySecret } from "@/lib/credentials";
import { buildShopperSessionCookieValue } from "@/lib/shopper-auth";

const SHOPPER_SESSION_COOKIE = "prado_shop_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const token = String(body?.token || "").trim();
    const password = String(body?.password || "");

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    if (!password || password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    const [tokenId, tokenSecret] = token.split(".");

    if (!tokenId || !tokenSecret) {
      return NextResponse.json({ error: "Invalid password reset token" }, { status: 400 });
    }

    const customer = await prisma.customer.findFirst({
      where: { passwordResetTokenId: tokenId },
      select: {
        id: true,
        storeId: true,
        email: true,
        passwordResetTokenHash: true,
        passwordResetTokenExpiresAt: true,
      },
    });

    if (
      !customer ||
      !customer.passwordResetTokenHash ||
      !customer.passwordResetTokenExpiresAt ||
      customer.passwordResetTokenExpiresAt < new Date() ||
      !verifySecret(tokenSecret, customer.passwordResetTokenHash)
    ) {
      return NextResponse.json({ error: "This password reset link is invalid or expired" }, { status: 401 });
    }

    await prisma.customer.update({
      where: { id: customer.id },
      data: {
        passwordHash: hashSecret(password),
        passwordResetTokenId: null,
        passwordResetTokenHash: null,
        passwordResetTokenExpiresAt: null,
      },
    });

    const response = NextResponse.json({ ok: true });
    response.cookies.set({
      name: SHOPPER_SESSION_COOKIE,
      value: buildShopperSessionCookieValue(customer.storeId, customer.id, 1),
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS,
    });

    return response;
  } catch (error) {
    console.error("[SHOPPER_PASSWORD_RESET_CONFIRM_ERROR]", error);
    return NextResponse.json({ error: "Could not update password" }, { status: 500 });
  }
}