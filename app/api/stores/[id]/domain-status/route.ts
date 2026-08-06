import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserFromRequest } from "@/lib/session";
import { getVercelDomainStatus } from "@/lib/vercel-domains";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(req: Request, { params }: RouteContext) {
  try {
    const user = await getCurrentUserFromRequest(req);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const ownedStore = await prisma.store.findFirst({
      where: {
        id,
        ownerUserId: user.id,
      },
      select: {
        id: true,
        name: true,
        customDomain: true,
      },
    });

    if (!ownedStore) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }

    if (!ownedStore.customDomain) {
      return NextResponse.json({ error: "This store does not have a custom domain yet." }, { status: 400 });
    }

    const status = await getVercelDomainStatus(ownedStore.customDomain);

    return NextResponse.json({
      storeId: ownedStore.id,
      storeName: ownedStore.name,
      domain: ownedStore.customDomain,
      status,
    });
  } catch (error) {
    console.error("[STORE_DOMAIN_STATUS_GET_ERROR]", error);
    return NextResponse.json({ error: "Failed to check domain status" }, { status: 500 });
  }
}
