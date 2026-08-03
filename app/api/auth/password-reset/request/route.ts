import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createTokenPair, hashSecret } from "@/lib/credentials";

const PASSWORD_RESET_TTL_MS = 1000 * 60 * 60 * 2;

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

    return NextResponse.json({
      ok: true,
      resetPath: `/reset/${token.token}`,
      email: merchantUser.email,
    });
  } catch (error) {
    console.error("[AUTH_PASSWORD_RESET_REQUEST_ERROR]", error);

    return NextResponse.json(
      { error: "Could not create password reset link" },
      { status: 500 },
    );
  }
}
