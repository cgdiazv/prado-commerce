import { cookies } from "next/headers";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const SESSION_COOKIE = "prado_session";
export const SESSION_SEPARATOR = "::";

type SessionUser = {
  id: string;
  email: string;
  name: string | null;
  company: string | null;
  phone: string | null;
  address: string | null;
  addressType: string | null;
  plan: "STARTER" | "PRO" | "ENTERPRISE";
  sessionVersion: number;
};

function isDatabaseConnectionError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return error.code === "P1000" || error.code === "P1001";
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    return true;
  }

  if (error instanceof Error) {
    return /can't reach database server|database server at|authentication failed against the database server/i.test(error.message);
  }

  return false;
}

function isUnknownSessionSelectFieldError(error: unknown): boolean {
  return (
    error instanceof Error &&
    /Unknown field `[^`]+` for select statement/.test(error.message)
  );
}

type ParsedSessionCookie = {
  email: string;
  sessionVersion: number;
};

function parseSessionCookieValue(rawValue: string | undefined): ParsedSessionCookie | null {
  if (!rawValue) {
    return null;
  }

  const decoded = decodeURIComponent(rawValue);
  const separatorIndex = decoded.lastIndexOf(SESSION_SEPARATOR);

  if (separatorIndex === -1) {
    return {
      email: decoded.trim().toLowerCase(),
      sessionVersion: 0,
    };
  }

  const email = decoded.slice(0, separatorIndex).trim().toLowerCase();
  const versionRaw = decoded.slice(separatorIndex + SESSION_SEPARATOR.length);
  const parsedVersion = Number.parseInt(versionRaw, 10);

  if (!email) {
    return null;
  }

  return {
    email,
    sessionVersion: Number.isNaN(parsedVersion) ? 0 : parsedVersion,
  };
}

export function buildSessionCookieValue(email: string, sessionVersion: number) {
  return `${email.toLowerCase()}${SESSION_SEPARATOR}${sessionVersion}`;
}

async function findSessionUser(email: string, sessionVersion: number): Promise<SessionUser | null> {
  try {
    const user = await prisma.merchantUser.findUnique({
      where: { email },
      select: { id: true, email: true, name: true, company: true, phone: true, address: true, addressType: true, plan: true, sessionVersion: true },
    });

    if (!user) {
      return null;
    }

    if (user.sessionVersion !== sessionVersion) {
      return null;
    }

    return user;
  } catch (error) {
    if (!isUnknownSessionSelectFieldError(error)) {
      throw error;
    }

    // Backward-compatible fallback when an old in-memory Prisma client is still active during hot-reloading.
    const user = await prisma.merchantUser.findUnique({
      where: { email },
      select: { id: true, email: true, name: true, company: true },
    });

    if (!user) {
      return null;
    }

    return {
      ...user,
      phone: null,
      address: null,
      addressType: null,
      plan: "STARTER",
      sessionVersion: 0,
    };
  }
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const parsedCookie = parseSessionCookieValue(cookieStore.get(SESSION_COOKIE)?.value);

  if (!parsedCookie?.email) {
    return null;
  }

  try {
    return await findSessionUser(parsedCookie.email, parsedCookie.sessionVersion);
  } catch (error) {
    if (isDatabaseConnectionError(error)) {
      console.error("[SESSION_DB_UNREACHABLE]", error);
      return null;
    }
    throw error;
  }
}

export function getUserEmailFromRequest(request: Request): string | null {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]+)`));
  return parseSessionCookieValue(match?.[1])?.email ?? null;
}

export async function getCurrentUserFromRequest(request: Request) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]+)`));
  const parsedCookie = parseSessionCookieValue(match?.[1]);

  if (!parsedCookie?.email) {
    return null;
  }

  try {
    return await findSessionUser(parsedCookie.email, parsedCookie.sessionVersion);
  } catch (error) {
    if (isDatabaseConnectionError(error)) {
      console.error("[SESSION_DB_UNREACHABLE]", error);
      return null;
    }
    throw error;
  }
}
