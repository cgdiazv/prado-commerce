import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createOnboardingToken, hashSecret } from "@/lib/credentials";

const TOKEN_TTL_MS = 1000 * 60 * 60 * 48; // 48 hours

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = String(body?.name || "").trim();
    const email = String(body?.email || "").trim().toLowerCase();
    const company = String(body?.company || "").trim() || null;
    const businessCategory = String(body?.businessCategory || "").trim() || null;
    const catalogSize = String(body?.catalogSize || "").trim() || null;
    const salesChannels = Array.isArray(body?.salesChannels)
      ? body.salesChannels.map((ch: unknown) => String(ch).trim()).filter(Boolean)
      : [];
    const preferredTheme = ["MINIMAL", "BOLD", "CLASSIC"].includes(body?.preferredTheme)
      ? body.preferredTheme
      : null;
    const questionnaireAnswers = body?.questionnaireAnswers && typeof body.questionnaireAnswers === "object"
      ? body.questionnaireAnswers
      : null;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "A valid email is required" }, { status: 400 });
    }

    const existing = await prisma.merchantUser.findUnique({ where: { email } });

    if (existing) {
      return NextResponse.json(
        { error: "An account with that email already exists" },
        { status: 409 },
      );
    }

    const { tokenId, tokenSecret, token } = createOnboardingToken();

    await prisma.merchantUser.create({
      data: {
        name,
        email,
        company,
        businessCategory,
        catalogSize,
        salesChannels,
        preferredTheme,
        questionnaireAnswers: questionnaireAnswers ?? Prisma.DbNull,
        onboardingTokenId: tokenId,
        onboardingTokenHash: hashSecret(tokenSecret),
        onboardingTokenExpiresAt: new Date(Date.now() + TOKEN_TTL_MS),
      },
    });

    const onboardUrl = `/onboard/${token}`;

    return NextResponse.json({ onboardUrl }, { status: 201 });
  } catch (error) {
    console.error("[SIGNUP_ERROR]", error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return NextResponse.json(
          { error: "An account with that email already exists" },
          { status: 409 },
        );
      }

      if (error.code === "P1001") {
        return NextResponse.json(
          {
            error:
              "Could not create account because the database is unreachable. Please try again later.",
          },
          { status: 503 },
        );
      }
    }

    if (error instanceof Prisma.PrismaClientInitializationError) {
      return NextResponse.json(
        {
          error:
            "Could not create account because the database is unreachable. Please try again later.",
        },
        { status: 503 },
      );
    }

    return NextResponse.json({ error: "Could not create account" }, { status: 500 });
  }
}
