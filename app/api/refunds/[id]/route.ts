import { NextResponse } from "next/server";
import {
  deleteRefundById,
  findRefundWithStoreOwner,
  updateRefundReasonById,
} from "@/lib/refunds-db";
import { getCurrentUserFromRequest, getCurrentCashierFromRequest } from "@/lib/session";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(req: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const user = await getCurrentUserFromRequest(req);
    const cashier = getCurrentCashierFromRequest(req);

    if (!user && !cashier) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const existing = await findRefundWithStoreOwner(id);

    if (!existing) {
      return NextResponse.json({ error: "Refund not found" }, { status: 404 });
    }

    if (cashier && existing.storeId !== cashier.storeId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!cashier && user && existing.ownerUserId !== user.id && existing.ownerId !== user.id) {
      return NextResponse.json({ error: "Refund not found" }, { status: 404 });
    }

    const body = (await req.json()) as { reason?: string | null };
    const updatedReason = await updateRefundReasonById(
      id,
      typeof body.reason === "string" ? body.reason : null,
    );

    return NextResponse.json({
      ok: true,
      id: existing.id,
      reason: updatedReason,
    });
  } catch (error) {
    console.error("[REFUND_PATCH_ERROR]", error);
    return NextResponse.json({ error: "Failed to update refund" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const user = await getCurrentUserFromRequest(req);
    const cashier = getCurrentCashierFromRequest(req);

    if (!user && !cashier) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const existing = await findRefundWithStoreOwner(id);

    if (!existing) {
      return NextResponse.json({ error: "Refund not found" }, { status: 404 });
    }

    if (cashier && existing.storeId !== cashier.storeId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!cashier && user && existing.ownerUserId !== user.id && existing.ownerId !== user.id) {
      return NextResponse.json({ error: "Refund not found" }, { status: 404 });
    }

    await deleteRefundById(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[REFUND_DELETE_ERROR]", error);
    return NextResponse.json({ error: "Failed to delete refund" }, { status: 500 });
  }
}
