import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE = "prado_session";
const protectedPaths = ["/stores", "/products", "/account-requests"];

function isProtectedPath(pathname: string) {
  return protectedPaths.some(
    (protectedPath) => pathname === protectedPath || pathname.startsWith(`${protectedPath}/`),
  );
}

function getHostname(hostHeader: string | null) {
  if (!hostHeader) {
    return "";
  }

  return hostHeader.split(":")[0].toLowerCase();
}

export function middleware(request: NextRequest) {
  const hostname = getHostname(request.headers.get("host"));
  const { pathname } = request.nextUrl;
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);

  if (isProtectedPath(pathname) && !hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (pathname === "/login" && hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = "/stores";
    return NextResponse.redirect(url);
  }

  // app.pradocommerce.com -> merchant admin surface
  if (hostname.startsWith("app.")) {
    if (pathname === "/") {
      const url = request.nextUrl.clone();
      url.pathname = "/stores";
      return NextResponse.rewrite(url);
    }

    return NextResponse.next();
  }

  // api.pradocommerce.com -> core edge APIs only
  if (hostname.startsWith("api.")) {
    if (pathname === "/") {
      const url = request.nextUrl.clone();
      url.pathname = "/api/health";
      return NextResponse.rewrite(url);
    }

    if (!pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Not Found" }, { status: 404 });
    }

    return NextResponse.next();
  }

  // cdn.pradocommerce.com -> static embed script delivery
  if (hostname.startsWith("cdn.")) {
    if (pathname === "/") {
      const url = request.nextUrl.clone();
      url.pathname = "/cart.js";
      return NextResponse.rewrite(url);
    }

    return NextResponse.next();
  }

  // Default: pradocommerce.com (marketing/landing)
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
