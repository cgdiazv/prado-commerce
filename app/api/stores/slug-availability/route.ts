import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserFromRequest } from "@/lib/session";
import { isReservedStoreSlug, normalizeStoreSlug } from "@/lib/store-slug";

export async function GET(request: Request) {
  const user = await getCurrentUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const slug = normalizeStoreSlug(new URL(request.url).searchParams.get("slug") ?? "");

  if (!slug) {
    return NextResponse.json({ slug, available: false, reason: "Enter a valid store URL." });
  }

  if (isReservedStoreSlug(slug)) {
    return NextResponse.json({ slug, available: false, reason: "This store URL is reserved." });
  }

  const existingStore = await prisma.store.findUnique({
    where: { slug },
    select: { id: true },
  });

  return NextResponse.json({
    slug,
    available: !existingStore,
    reason: existingStore ? "This store URL is already in use." : null,
  });
}