import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserFromRequest } from "@/lib/session";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const user = await getCurrentUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: storeId } = await params;
    const body = await request.json().catch(() => ({}));
    const type = body?.type === "SECRET" ? "SECRET" : "PUBLISHABLE";
    const nameRaw = typeof body?.name === "string" ? body.name.trim() : "";

    const store = await prisma.store.findFirst({
      where: { id: storeId, ownerUserId: user.id },
      select: { id: true },
    });

    if (!store) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }

    const keyPrefix = type === "SECRET" ? "sk_live_" : "pk_live_";

    const apiKey = await prisma.apiKey.create({
      data: {
        storeId,
        name: nameRaw || (type === "SECRET" ? "Secret Key" : "Publishable Key"),
        type,
        key: `${keyPrefix}${crypto.randomUUID().replace(/-/g, "")}`,
      },
      select: {
        id: true,
        name: true,
        type: true,
        key: true,
        expiresAt: true,
        createdAt: true,
      },
    });

    return NextResponse.json(apiKey, { status: 201 });
  } catch (error) {
    console.error("[STORE_KEYS_POST_ERROR]", error);
    return NextResponse.json({ error: "Failed to create API key" }, { status: 500 });
  }
}
