import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createTokenPair, hashSecret } from "@/lib/credentials";
import { sendPasswordResetEmail } from "@/lib/email-notifications";

const PASSWORD_RESET_TTL_MS = 1000 * 60 * 60 * 2;

function resolveAppOrigin(request: Request) {
  const configured =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    process.env.VERCEL_URL;
  const value = configured || new URL(request.url).origin;

  return new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`).origin;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body?.email || "").trim().toLowerCase();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const merchantUser = await prisma.merchantUser.findUnique({
      where: { email },
      select: { id: true, email: true },
    });

    if (!merchantUser) {
      return NextResponse.json(
        { error: "No account found for this email" },
        { status: 404 },
      );
    }

    const token = createTokenPair();
    const passwordResetTokenExpiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS);
    const passwordResetTokenHash = hashSecret(token.tokenSecret);

    await prisma.merchantUser.update({
      where: { id: merchantUser.id },
      data: {
        passwordResetTokenId: token.tokenId,
        passwordResetTokenHash,
        passwordResetTokenExpiresAt,
      },
    });

    await sendPasswordResetEmail({
      to: merchantUser.email,
      resetUrl: `${resolveAppOrigin(request)}/reset/${token.token}`,
      brandName: "Prado Commerce",
    });

    return NextResponse.json({
      ok: true,
    });
  } catch (error) {
    console.error("[AUTH_PASSWORD_RESET_REQUEST_ERROR]", error);

    return NextResponse.json(
      { error: "Could not send password reset email" },
      { status: 500 },
    );
  }
}
