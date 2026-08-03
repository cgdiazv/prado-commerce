import { NextResponse } from "next/server";
import { SubscriptionPlan } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUserFromRequest } from "@/lib/session";

const PLAN_COOKIE = "prado_plan";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function isSubscriptionPlan(value: string): value is SubscriptionPlan {
  return value === "STARTER" || value === "PRO" || value === "ENTERPRISE";
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const { id } = await params;
  const isProduction = process.env.NODE_ENV === "production";
  const adminApiKey = process.env.ADMIN_API_KEY;
  const incomingKey = request.headers.get("x-admin-api-key");
  let authorized = Boolean(adminApiKey && incomingKey === adminApiKey);

  if (!authorized && !isProduction) {
    const currentUser = await getCurrentUserFromRequest(request);
    authorized = Boolean(currentUser && currentUser.id === id);
  }

  if (!authorized) {
    if (isProduction && !adminApiKey) {
      return NextResponse.json(
        { error: "ADMIN_API_KEY is not configured." },
        { status: 503 },
      );
    }

    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const plan = String(body?.plan ?? "").trim().toUpperCase();

  if (!isSubscriptionPlan(plan)) {
    return NextResponse.json(
      { error: "plan must be one of STARTER, PRO, or ENTERPRISE" },
      { status: 400 },
    );
  }

  try {
    const updatedMerchant = await prisma.merchantUser.update({
      where: { id },
      data: { plan },
      select: {
        id: true,
        email: true,
        name: true,
        company: true,
        plan: true,
        updatedAt: true,
      },
    });

    const response = NextResponse.json(updatedMerchant);
    response.cookies.set({
      name: PLAN_COOKIE,
      value: updatedMerchant.plan,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS,
    });
    return response;
  } catch (error: unknown) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2025") {
      return NextResponse.json({ error: "Merchant not found" }, { status: 404 });
    }

    console.error("[ADMIN_MERCHANT_PLAN_PATCH_ERROR]", error);
    return NextResponse.json({ error: "Failed to update merchant plan" }, { status: 500 });
  }
}
