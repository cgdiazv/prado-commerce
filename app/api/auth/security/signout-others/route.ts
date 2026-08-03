import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildSessionCookieValue, getCurrentUserFromRequest } from "@/lib/session";

const SESSION_COOKIE = "prado_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export async function POST(request: Request) {
  try {
    const user = await getCurrentUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const updated = await prisma.merchantUser.update({
      where: { id: user.id },
      data: { sessionVersion: { increment: 1 } },
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
    console.error("[AUTH_SIGNOUT_OTHERS_ERROR]", error);
    return NextResponse.json({ error: "Could not sign out other devices" }, { status: 500 });
  }
}
