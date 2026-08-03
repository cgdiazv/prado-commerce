import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function isPrismaError(error: unknown, code: string) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === code
  );
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, company } = body as {
      name?: string;
      email?: string;
      company?: string;
    };

    if (!name || !email) {
      return NextResponse.json(
        { error: "name and email are required" },
        { status: 400 },
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(normalizedEmail)) {
      return NextResponse.json(
        { error: "Enter a valid email address" },
        { status: 400 },
      );
    }

    const accountRequest = await prisma.accountRequest.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        company: company?.trim() || null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        company: true,
        createdAt: true,
      },
    });

    return NextResponse.json(accountRequest, { status: 201 });
  } catch (error) {
    if (isPrismaError(error, "P2002")) {
      return NextResponse.json(
        { error: "An account request already exists for this email" },
        { status: 409 },
      );
    }

    console.error("[ACCOUNT_REQUESTS_POST_ERROR]", error);

    return NextResponse.json(
      { error: "Failed to submit account request" },
      { status: 500 },
    );
  }
}