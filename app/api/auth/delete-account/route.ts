import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getCurrentUserFromRequest, SESSION_COOKIE } from "@/lib/session";

export async function DELETE(request: Request) {
  try {
    const user = await getCurrentUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => null) as { reason?: string; details?: string } | null;
    console.info("[DELETE_ACCOUNT_SURVEY]", {
      userId: user.id,
      reason: body?.reason ?? "not_provided",
      details: body?.details ?? "",
    });

    await prisma.$transaction(async (tx) => {
      await tx.store.deleteMany({ where: { ownerUserId: user.id } });
      await tx.merchantUser.delete({ where: { id: user.id } });
    });

    const cookieStore = await cookies();
    cookieStore.delete(SESSION_COOKIE);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE_ACCOUNT_ERROR]", error);
    return NextResponse.json({ error: "Unable to delete account right now." }, { status: 500 });
  }
}
