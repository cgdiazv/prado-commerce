import { cookies } from "next/headers";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const SESSION_COOKIE = "prado_session";

type SessionUser = {
  id: string;
  email: string;
  name: string | null;
  company: string | null;
  plan: "STARTER" | "PRO" | "ENTERPRISE";
};

function isDatabaseConnectionError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return error.code === "P1001";
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    return true;
  }

  if (error instanceof Error) {
    return /can't reach database server|database server at/i.test(error.message);
  }

  return false;
}

function isUnknownPlanSelectFieldError(error: unknown): boolean {
  return error instanceof Error && /Unknown field `plan` for select statement/.test(error.message);
}

async function findSessionUser(email: string): Promise<SessionUser | null> {
  try {
    const user = await prisma.merchantUser.findUnique({
      where: { email },
      select: { id: true, email: true, name: true, company: true, plan: true },
    });

    if (!user) {
      return null;
    }

    return user;
  } catch (error) {
    if (!isUnknownPlanSelectFieldError(error)) {
      throw error;
    }

    // Backward-compatible fallback when an old in-memory Prisma client is still active.
    const user = await prisma.merchantUser.findUnique({
      where: { email },
      select: { id: true, email: true, name: true, company: true },
    });

    if (!user) {
      return null;
    }

    return {
      ...user,
      plan: "STARTER",
    };
  }
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const email = cookieStore.get(SESSION_COOKIE)?.value;

  if (!email) {
    return null;
  }

  try {
    return await findSessionUser(email);
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
  return match ? decodeURIComponent(match[1]) : null;
}

export async function getCurrentUserFromRequest(request: Request) {
  const email = getUserEmailFromRequest(request);

  if (!email) {
    return null;
  }

  try {
    return await findSessionUser(email);
  } catch (error) {
    if (isDatabaseConnectionError(error)) {
      console.error("[SESSION_DB_UNREACHABLE]", error);
      return null;
    }
    throw error;
  }
}
