import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createOnboardingToken, hashSecret } from "@/lib/credentials";

const ONBOARDING_TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 3;

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const accountRequest = await prisma.accountRequest.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        company: true,
      },
    });

    if (!accountRequest) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    const token = createOnboardingToken();
    const onboardingTokenExpiresAt = new Date(Date.now() + ONBOARDING_TOKEN_TTL_MS);
    const onboardingTokenHash = hashSecret(token.tokenSecret);

    await prisma.$transaction([
      prisma.merchantUser.upsert({
        where: { email: accountRequest.email },
        create: {
          email: accountRequest.email,
          name: accountRequest.name,
          company: accountRequest.company,
          onboardingTokenId: token.tokenId,
          onboardingTokenHash,
          onboardingTokenExpiresAt,
        },
        update: {
          name: accountRequest.name,
          company: accountRequest.company,
          onboardingTokenId: token.tokenId,
          onboardingTokenHash,
          onboardingTokenExpiresAt,
        },
      }),
      prisma.accountRequest.update({
        where: { id: accountRequest.id },
        data: { approvedAt: new Date() },
      }),
    ]);

    return NextResponse.json({
      ok: true,
      setupPath: `/onboard/${token.token}`,
      email: accountRequest.email,
    });
  } catch (error) {
    console.error("[ACCOUNT_REQUESTS_APPROVE_ERROR]", error);

    return NextResponse.json(
      { error: "Could not generate onboarding link" },
      { status: 500 },
    );
  }
}
