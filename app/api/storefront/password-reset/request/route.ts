import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createTokenPair, hashSecret } from "@/lib/credentials";

const PASSWORD_RESET_TTL_MS = 1000 * 60 * 60 * 2;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const storeId = String(body?.storeId || "").trim();
    const email = String(body?.email || "").trim().toLowerCase();

    if (!storeId) {
      return NextResponse.json({ error: "storeId is required" }, { status: 400 });
    }

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const store = await prisma.store.findUnique({
      where: { id: storeId },
      select: { id: true, slug: true },
    });

    if (!store) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }

    const customer = await prisma.customer.findUnique({
      where: { storeId_email: { storeId, email } },
      select: { id: true },
    });

    if (!customer) {
      return NextResponse.json({ error: "No account found for that email" }, { status: 404 });
    }

    const token = createTokenPair();
    const passwordResetTokenExpiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS);
    const passwordResetTokenHash = hashSecret(token.tokenSecret);

    await prisma.customer.update({
      where: { id: customer.id },
      data: {
        passwordResetTokenId: token.tokenId,
        passwordResetTokenHash,
        passwordResetTokenExpiresAt,
      },
    });

    return NextResponse.json({
      ok: true,
      resetPath: `/reset/${token.token}`,
      email,
      storeSlug: store.slug,
    });
  } catch (error) {
    console.error("[SHOPPER_PASSWORD_RESET_REQUEST_ERROR]", error);
    return NextResponse.json({ error: "Could not create password reset link" }, { status: 500 });
  }
}