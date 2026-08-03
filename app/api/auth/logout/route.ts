import { NextResponse } from "next/server";

const SESSION_COOKIE = "prado_session";
const PLAN_COOKIE = "prado_plan";

function clearSession(response: NextResponse) {
  response.cookies.set({
    name: SESSION_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  response.cookies.set({
    name: PLAN_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export async function GET(request: Request) {
  const { origin } = new URL(request.url);
  const response = NextResponse.redirect(`${origin}/login`);
  clearSession(response);
  return response;
}

export async function POST() {
  const response = NextResponse.json({ ok: true });
  clearSession(response);
  return response;
}
