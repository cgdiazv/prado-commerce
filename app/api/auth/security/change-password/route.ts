import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashSecret, verifySecret } from "@/lib/credentials";
import { buildSessionCookieValue, getCurrentUserFromRequest } from "@/lib/session";

const SESSION_COOKIE = "prado_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export async function POST(request: Request) {
  try {
    const user = await getCurrentUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const currentPassword = String(body?.currentPassword || "");
    const newPassword = String(body?.newPassword || "");

    if (!currentPassword) {
      return NextResponse.json({ error: "Current password is required" }, { status: 400 });
    }

    if (!newPassword || newPassword.length < 8) {
      return NextResponse.json({ error: "New password must be at least 8 characters" }, { status: 400 });
    }

    const merchantUser = await prisma.merchantUser.findUnique({
      where: { id: user.id },
      select: { id: true, email: true, passwordHash: true, sessionVersion: true },
    });

    if (!merchantUser || !merchantUser.passwordHash) {
      return NextResponse.json({ error: "Could not validate your account password" }, { status: 400 });
    }

    if (!verifySecret(currentPassword, merchantUser.passwordHash)) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 401 });
    }

    const updated = await prisma.merchantUser.update({
      where: { id: merchantUser.id },
      data: {
        passwordHash: hashSecret(newPassword),
        passwordSetAt: new Date(),
        sessionVersion: { increment: 1 },
      },
      select: { email: true, sessionVersion: true },
    });

    const response = NextResponse.json({ ok: true });
    response.cookies.set({
      name: SESSION_COOKIE,
      value: buildSessionCookieValue(updated.email, updated.sessionVersion),
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS,
    });

    return response;
  } catch (error) {
    console.error("[AUTH_CHANGE_PASSWORD_ERROR]", error);
    return NextResponse.json({ error: "Could not change password" }, { status: 500 });
  }
}
