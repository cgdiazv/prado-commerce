import { prisma } from "@/lib/prisma";
import { getCurrentUserFromRequest } from "@/lib/session";
import { corsJson, withCorsHeaders } from "@/lib/api-cors";

export async function OPTIONS() {
  return withCorsHeaders(new Response(null, { status: 204 }));
}

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function isPrismaError(error: unknown, code: string) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === code
  );
}

async function canUserAccessGroup(groupId: string, userId: string) {
  const group = await prisma.customerGroup.findUnique({
    where: { id: groupId },
    select: { id: true, storeId: true, store: { select: { ownerUserId: true } } },
  });

  if (!group) {
    return { exists: false, authorized: false, group: null };
  }

  return {
    exists: true,
    authorized: group.store.ownerUserId === userId,
    group,
  };
}

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const user = await getCurrentUserFromRequest(request);
    if (!user) {
      return corsJson({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const access = await canUserAccessGroup(id, user.id);

    if (!access.exists) {
      return corsJson({ error: "Customer group not found" }, { status: 404 });
    }

    if (!access.authorized) {
      return corsJson({ error: "Forbidden" }, { status: 403 });
    }

    const group = await prisma.customerGroup.findUnique({
      where: { id },
      include: {
        _count: {
          select: { customers: true },
        },
      },
    });

    return corsJson(group);
  } catch (error) {
    console.error("[CUSTOMER_GROUP_GET_ERROR]", error);
    return corsJson({ error: "Failed to fetch customer group" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const user = await getCurrentUserFromRequest(request);
    if (!user) {
      return corsJson({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const access = await canUserAccessGroup(id, user.id);

    if (!access.exists) {
      return corsJson({ error: "Customer group not found" }, { status: 404 });
    }

    if (!access.authorized) {
      return corsJson({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const name = typeof body?.name === "string" ? body.name.trim() : undefined;
    const description =
      body?.description === undefined
        ? undefined
        : String(body.description || "").trim() || null;

    const updates: {
      name?: string;
      description?: string | null;
    } = {};

    if (name !== undefined) {
      if (!name) {
        return corsJson({ error: "Group name cannot be empty" }, { status: 400 });
      }
      updates.name = name;
    }

    if (description !== undefined) {
      updates.description = description;
    }

    if (Object.keys(updates).length === 0) {
      return corsJson({ error: "At least one field is required" }, { status: 400 });
    }

    const updated = await prisma.customerGroup.update({
      where: { id },
      data: updates,
      include: {
        _count: {
          select: { customers: true },
        },
      },
    });

    return corsJson(updated);
  } catch (error) {
    if (isPrismaError(error, "P2002")) {
      return corsJson(
        { error: "A customer group with this name already exists in this store" },
        { status: 409 },
      );
    }

    console.error("[CUSTOMER_GROUP_PATCH_ERROR]", error);
    return corsJson({ error: "Failed to update customer group" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  try {
    const user = await getCurrentUserFromRequest(request);
    if (!user) {
      return corsJson({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const access = await canUserAccessGroup(id, user.id);

    if (!access.exists) {
      return corsJson({ error: "Customer group not found" }, { status: 404 });
    }

    if (!access.authorized) {
      return corsJson({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.customerGroup.delete({ where: { id } });

    return corsJson({ ok: true });
  } catch (error) {
    if (isPrismaError(error, "P2025")) {
      return corsJson({ error: "Customer group not found" }, { status: 404 });
    }

    console.error("[CUSTOMER_GROUP_DELETE_ERROR]", error);
    return corsJson({ error: "Failed to delete customer group" }, { status: 500 });
  }
}
