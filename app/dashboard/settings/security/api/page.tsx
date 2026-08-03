import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { ApiAccessClient } from "./api-access-client";

export default async function SecurityApiPage() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <section className="space-y-4">
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Could not verify your session. Please sign in again.
        </div>
      </section>
    );
  }

  const stores = await prisma.store.findMany({
    where: { ownerUserId: user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      slug: true,
      allowedDomains: true,
      apiKeys: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          type: true,
          key: true,
          expiresAt: true,
          createdAt: true,
        },
      },
      products: {
        orderBy: { createdAt: "desc" },
        select: {
          title: true,
          variants: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      },
    },
  });

  const normalizedStores = stores.map((store) => ({
    id: store.id,
    name: store.name,
    slug: store.slug,
    allowedDomains: store.allowedDomains,
    apiKeys: store.apiKeys.map((key) => ({
      ...key,
      createdAt: key.createdAt.toISOString(),
      expiresAt: key.expiresAt ? key.expiresAt.toISOString() : null,
    })),
    variantRefs: store.products.flatMap((product) =>
      product.variants.map((variant) => ({
        id: variant.id,
        title: variant.title,
        productTitle: product.title,
      })),
    ),
  }));

  const vercelUrl = process.env.VERCEL_URL;
  const derivedVercelHost = !vercelUrl
    ? null
    : vercelUrl.startsWith("http")
      ? vercelUrl
      : `https://${vercelUrl}`;

  const apiHost =
    process.env.NEXT_PUBLIC_API_HOST ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    derivedVercelHost ||
    "http://localhost:3000";

  return (
    <section className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
            Settings
          </p>
          <h1 className="mt-4 text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">API access</h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-slate-600 sm:text-lg">
            Retrieve your publishable and secret API keys for each store.
          </p>
        </div>

        <Link
          href="/dashboard/settings"
          className="inline-flex shrink-0 items-center rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          ← Back to settings
        </Link>
      </div>

      <ApiAccessClient initialStores={normalizedStores} apiHost={apiHost} />
    </section>
  );
}
