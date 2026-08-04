import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE = "prado_session";
const PLAN_COOKIE = "prado_plan";
const protectedPaths = ["/dashboard", "/products"];
const reservedSubdomains = ["app", "api", "cdn", "www"];

type RateBucket = {
  count: number;
  resetAt: number;
};

const rateLimitStore = globalThis as typeof globalThis & {
  __pradoRateBuckets?: Map<string, RateBucket>;
};

const rateBuckets = rateLimitStore.__pradoRateBuckets ?? new Map<string, RateBucket>();

if (!rateLimitStore.__pradoRateBuckets) {
  rateLimitStore.__pradoRateBuckets = rateBuckets;
}

function getRateLimitForPlan(plan: string | undefined) {
  if (plan === "PRO") {
    return 1000;
  }

  if (plan === "ENTERPRISE") {
    return Number.POSITIVE_INFINITY;
  }

  return 60;
}

function shouldRateLimit(pathname: string) {
  return pathname.startsWith("/api/") &&
    !pathname.startsWith("/api/auth/") &&
    pathname !== "/api/health";
}

function readClientIp(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for");

  if (forwardedFor) {
    const [first] = forwardedFor.split(",");
    return first.trim() || "unknown";
  }

  return request.headers.get("x-real-ip") ?? "unknown";
}

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

function isPlatformHostname(hostname: string) {
  return (
    hostname === "" ||
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname.endsWith(".localhost") ||
    hostname === "pradocommerce.com" ||
    hostname.endsWith(".pradocommerce.com") ||
    hostname.endsWith(".vercel.app")
  );
}

export function middleware(request: NextRequest) {
  const hostname = getHostname(request.headers.get("host"));
  const { pathname } = request.nextUrl;
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);

  if (shouldRateLimit(pathname)) {
    const plan = request.cookies.get(PLAN_COOKIE)?.value;
    const limit = getRateLimitForPlan(plan);

    if (Number.isFinite(limit)) {
      const now = Date.now();
      const key = `${readClientIp(request)}:${plan ?? "STARTER"}:${pathname}`;
      const current = rateBuckets.get(key);

      if (!current || now >= current.resetAt) {
        rateBuckets.set(key, { count: 1, resetAt: now + 60_000 });
      } else {
        current.count += 1;
        rateBuckets.set(key, current);

        if (current.count > limit) {
          const retryAfter = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
          return NextResponse.json(
            {
              error:
                "Rate limit exceeded for your current Prado Commerce plan. Upgrade for higher throughput.",
            },
            {
              status: 429,
              headers: {
                "Retry-After": String(retryAfter),
                "X-RateLimit-Limit": String(limit),
                "X-RateLimit-Remaining": "0",
              },
            },
          );
        }
      }
    }
  }

  // {slug}.pradocommerce.com -> tenant storefront
  const parts = hostname.split(".");
  if (parts.length >= 3) {
    const slug = parts[0];
    if (slug && !reservedSubdomains.includes(slug)) {
      const url = request.nextUrl.clone();
      url.pathname = `/storefront/${slug}${pathname === "/" ? "" : pathname}`;
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set("x-storefront-subdomain", "1");
      return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
    }
  }

  // Custom domain (for example, from GoDaddy) -> tenant storefront by domain lookup.
  if (!isPlatformHostname(hostname)) {
    const url = request.nextUrl.clone();
    url.pathname = `/storefront/domain/${hostname}${pathname === "/" ? "" : pathname}`;
    return NextResponse.rewrite(url);
  }

  // Keep product management URLs canonical under /dashboard for merchant portal.
  if (pathname === "/products" || pathname.startsWith("/products/")) {
    const url = request.nextUrl.clone();
    const suffix = pathname.slice("/products".length);
    url.pathname = `/dashboard/products${suffix}`;
    return NextResponse.redirect(url);
  }

  if (isProtectedPath(pathname) && !hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (pathname === "/login" && hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // app.pradocommerce.com -> merchant admin surface
  if (hostname.startsWith("app.")) {
    if (pathname === "/") {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
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
  const response = NextResponse.next();

  if (shouldRateLimit(pathname)) {
    const plan = request.cookies.get(PLAN_COOKIE)?.value;
    const limit = getRateLimitForPlan(plan);

    if (Number.isFinite(limit)) {
      const key = `${readClientIp(request)}:${plan ?? "STARTER"}:${pathname}`;
      const current = rateBuckets.get(key);
      const remaining = current ? Math.max(0, limit - current.count) : limit;
      response.headers.set("X-RateLimit-Limit", String(limit));
      response.headers.set("X-RateLimit-Remaining", String(remaining));
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
