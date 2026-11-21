import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createTokenPair, hashSecret } from "@/lib/credentials";
import { sendPasswordResetEmail } from "@/lib/email-notifications";

const PASSWORD_RESET_TTL_MS = 1000 * 60 * 60 * 2;

function resolveStorefrontResetUrl(
  request: Request,
  store: { slug: string; customDomain: string | null },
  token: string,
) {
  const requestUrl = new URL(request.url);
  const requestHost = (request.headers.get("x-forwarded-host") || request.headers.get("host") || "")
    .split(",")[0]
    .trim()
    .toLowerCase()
    .split(":")[0];
  const customDomain = store.customDomain
    ? [store.customDomain, `www.${store.customDomain}`].map((host) => host.toLowerCase())
    : [];
  const isCustomDomain = customDomain.includes(requestHost);
  const isSubdomain = requestHost === `${store.slug}.pradocommerce.com`;
  const isTenantHost = isCustomDomain || isSubdomain;
  const configuredOrigin =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    requestUrl.origin;
  const origin = isTenantHost
    ? `https://${requestHost}`
    : new URL(
        /^https?:\/\//i.test(configuredOrigin)
          ? configuredOrigin
          : `https://${configuredOrigin}`,
      ).origin;
  const resetPath = isTenantHost
    ? `/reset/${token}`
    : `/storefront/${store.slug}/reset/${token}`;

  return `${origin}${resetPath}`;
}

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
      select: {
        id: true,
        name: true,
        slug: true,
        customDomain: true,
        senderName: true,
        replyToEmail: true,
        senderEmail: true,
      },
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

    await sendPasswordResetEmail({
      to: email,
      resetUrl: resolveStorefrontResetUrl(request, store, token.token),
      brandName: store.name,
      senderName: store.senderName || store.name,
      replyTo: store.replyToEmail || store.senderEmail,
    });

    return NextResponse.json({
      ok: true,
    });
  } catch (error) {
    console.error("[SHOPPER_PASSWORD_RESET_REQUEST_ERROR]", error);
    return NextResponse.json({ error: "Could not send password reset email" }, { status: 500 });
  }
}