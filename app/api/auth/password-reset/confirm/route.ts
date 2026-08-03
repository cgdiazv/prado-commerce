import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashSecret, verifySecret } from "@/lib/credentials";

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
        { error: "Invalid password reset token" },
        { status: 400 },
      );
    }

    const merchantUser = await prisma.merchantUser.findUnique({
      where: { passwordResetTokenId: tokenId },
      select: {
        id: true,
        email: true,
        passwordResetTokenHash: true,
        passwordResetTokenExpiresAt: true,
      },
    });

    if (
      !merchantUser ||
      !merchantUser.passwordResetTokenHash ||
      !merchantUser.passwordResetTokenExpiresAt ||
      merchantUser.passwordResetTokenExpiresAt < new Date() ||
      !verifySecret(tokenSecret, merchantUser.passwordResetTokenHash)
    ) {
      return NextResponse.json(
        { error: "This password reset link is invalid or expired" },
        { status: 401 },
      );
    }

    await prisma.merchantUser.update({
      where: { id: merchantUser.id },
      data: {
        passwordHash: hashSecret(password),
        passwordSetAt: new Date(),
        passwordResetTokenId: null,
        passwordResetTokenHash: null,
        passwordResetTokenExpiresAt: null,
      },
    });

    const response = NextResponse.json({ ok: true });
    response.cookies.set({
      name: SESSION_COOKIE,
      value: merchantUser.email,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS,
    });

    return response;
  } catch (error) {
    console.error("[AUTH_PASSWORD_RESET_CONFIRM_ERROR]", error);

    return NextResponse.json(
      { error: "Could not update password" },
      { status: 500 },
    );
  }
}
