import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserFromRequest } from "@/lib/session";

type RouteContext = {
  params: Promise<{
    id: string;
    keyId: string;
  }>;
};

export async function DELETE(request: Request, { params }: RouteContext) {
  try {
    const user = await getCurrentUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: storeId, keyId } = await params;

    const key = await prisma.apiKey.findFirst({
      where: {
        id: keyId,
        storeId,
        store: {
          ownerUserId: user.id,
        },
      },
      select: {
        id: true,
      },
    });

    if (!key) {
      return NextResponse.json({ error: "API key not found" }, { status: 404 });
    }

    await prisma.apiKey.delete({ where: { id: keyId } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[STORE_KEY_DELETE_ERROR]", error);
    return NextResponse.json({ error: "Failed to revoke API key" }, { status: 500 });
  }
}
