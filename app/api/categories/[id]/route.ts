import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserFromRequest } from "@/lib/session";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function toSlug(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function isPrismaError(error: unknown, code: string) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === code
  );
}

async function canUserAccessCategory(
  categoryId: string,
  userId: string,
): Promise<
  | { exists: false; authorized: false }
  | { exists: true; authorized: boolean; storeId: string }
> {
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    select: { id: true, storeId: true, store: { select: { ownerUserId: true } } },
  });

  if (!category) {
    return { exists: false, authorized: false };
  }

  return {
    exists: true,
    authorized: category.store.ownerUserId === userId,
    storeId: category.storeId,
  };
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const user = await getCurrentUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const access = await canUserAccessCategory(id, user.id);

    if (!access.exists) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    if (!access.authorized) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const name = typeof body?.name === "string" ? body.name.trim() : undefined;
    const slug = typeof body?.slug === "string" ? body.slug.trim() : undefined;
    const description = body?.description === undefined
      ? undefined
      : String(body.description || "").trim() || null;
    const parentCategoryId =
      typeof body?.parentCategoryId === "string"
        ? body.parentCategoryId.trim() || null
        : body?.parentCategoryId === null
          ? null
          : undefined;

    const updates: {
      name?: string;
      slug?: string;
      description?: string | null;
      parentCategoryId?: string | null;
    } = {};

    if (name !== undefined) {
      if (!name) {
        return NextResponse.json({ error: "Category name cannot be empty" }, { status: 400 });
      }
      updates.name = name;
    }

    if (slug !== undefined) {
      const parsedSlug = toSlug(slug);
      if (!parsedSlug) {
        return NextResponse.json({ error: "Category slug cannot be empty" }, { status: 400 });
      }
      updates.slug = parsedSlug;
    }

    if (description !== undefined) {
      updates.description = description;
    }

    if (body?.parentCategoryId !== undefined) {
      if (parentCategoryId === undefined) {
        return NextResponse.json({ error: "parentCategoryId must be a category ID or null" }, { status: 400 });
      }

      if (parentCategoryId) {
        if (parentCategoryId === id) {
          return NextResponse.json({ error: "A category cannot be its own parent" }, { status: 400 });
        }

        const visited = new Set<string>();
        let ancestorId: string | null = parentCategoryId;
        while (ancestorId) {
          if (ancestorId === id) {
            return NextResponse.json({ error: "A category cannot be moved beneath one of its descendants" }, { status: 400 });
          }
          if (visited.has(ancestorId)) {
            return NextResponse.json({ error: "The selected parent has an invalid category hierarchy" }, { status: 400 });
          }
          visited.add(ancestorId);

          const ancestor = await prisma.category.findFirst({
            where: { id: ancestorId, storeId: access.storeId },
            select: { parentCategoryId: true },
          });
          if (!ancestor) {
            return NextResponse.json(
              { error: "Parent category must belong to this store" },
              { status: 400 },
            );
          }
          ancestorId = ancestor.parentCategoryId;
        }
      }

      updates.parentCategoryId = parentCategoryId;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "At least one field is required" }, { status: 400 });
    }

    const updatedCategory = await prisma.category.update({
      where: { id },
      data: updates,
      select: {
        id: true,
        storeId: true,
        name: true,
        slug: true,
        description: true,
        parentCategoryId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(updatedCategory);
  } catch (error) {
    if (isPrismaError(error, "P2002")) {
      return NextResponse.json(
        { error: "A category with this slug already exists in this store" },
        { status: 409 },
      );
    }

    console.error("[CATEGORY_PATCH_ERROR]", error);
    return NextResponse.json({ error: "Failed to update category" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  try {
    const user = await getCurrentUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const access = await canUserAccessCategory(id, user.id);

    if (!access.exists) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    if (!access.authorized) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.category.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[CATEGORY_DELETE_ERROR]", error);
    return NextResponse.json({ error: "Failed to delete category" }, { status: 500 });
  }
}