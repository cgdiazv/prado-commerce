import { prisma } from "@/lib/prisma";
import { getCurrentUserFromRequest } from "@/lib/session";
import { corsJson, withCorsHeaders } from "@/lib/api-cors";

export async function OPTIONS() {
  return withCorsHeaders(new Response(null, { status: 204 }));
}

function isPrismaError(error: unknown, code: string) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === code
  );
}

export async function GET(request: Request) {
  try {
    const user = await getCurrentUserFromRequest(request);
    if (!user) {
      return corsJson({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get("storeId");

    if (!storeId) {
      return corsJson({ error: "storeId is required" }, { status: 400 });
    }

    const ownedStore = await prisma.store.findFirst({
      where: { id: storeId, ownerUserId: user.id },
      select: { id: true },
    });

    if (!ownedStore) {
      return corsJson({ error: "Store not found" }, { status: 404 });
    }

    const groups = await prisma.customerGroup.findMany({
      where: { storeId },
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: { customers: true },
        },
      },
    });

    return corsJson(groups);
  } catch (error) {
    console.error("[CUSTOMER_GROUPS_GET_ERROR]", error);
    return corsJson({ error: "Failed to fetch customer groups" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUserFromRequest(request);
    if (!user) {
      return corsJson({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const storeId = String(body?.storeId || "").trim();
    const name = String(body?.name || "").trim();
    const description = String(body?.description || "").trim() || null;

    if (!storeId || !name) {
      return corsJson({ error: "storeId and name are required" }, { status: 400 });
    }

    const ownedStore = await prisma.store.findFirst({
      where: { id: storeId, ownerUserId: user.id },
      select: { id: true },
    });

    if (!ownedStore) {
      return corsJson({ error: "Store not found or unauthorized" }, { status: 404 });
    }

    const createdGroup = await prisma.customerGroup.create({
      data: {
        storeId,
        name,
        description,
      },
      include: {
        _count: {
          select: { customers: true },
        },
      },
    });

    return corsJson(createdGroup, { status: 201 });
  } catch (error) {
    if (isPrismaError(error, "P2002")) {
      return corsJson(
        { error: "A customer group with this name already exists in this store" },
        { status: 409 },
      );
    }

    console.error("[CUSTOMER_GROUPS_POST_ERROR]", error);
    return corsJson({ error: "Failed to create customer group" }, { status: 500 });
  }
}
