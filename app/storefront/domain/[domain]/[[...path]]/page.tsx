import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

type PageProps = {
  params: Promise<{ domain: string; path?: string[] }>;
};

export default async function CustomDomainStorefrontPage({ params }: PageProps) {
  const { domain } = await params;
  const normalizedDomain = decodeURIComponent(domain).toLowerCase();

  const candidateDomains = normalizedDomain.startsWith("www.")
    ? [normalizedDomain, normalizedDomain.slice(4)]
    : [normalizedDomain, `www.${normalizedDomain}`];

  const store = await prisma.store.findFirst({
    where: {
      customDomain: {
        in: candidateDomains,
      },
    },
    select: {
      id: true,
      name: true,
      slug: true,
      currency: true,
    },
  });

  if (!store) {
    notFound();
  }

  const products = await prisma.product.findMany({
    where: { storeId: store.id, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      slug: true,
      description: true,
      images: true,
      variants: {
        select: { id: true, title: true, price: true },
        take: 1,
        orderBy: { price: "asc" },
      },
    },
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white px-6 py-4">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-xl font-semibold tracking-tight">{store.name}</h1>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-12">
        {products.length === 0 ? (
          <p className="text-center text-slate-500">No products available yet.</p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => {
              const price = product.variants[0]?.price;
              const variantId = product.variants[0]?.id;
              return (
                <div
                  key={product.id}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md"
                >
                  {product.images[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={product.images[0]}
                      alt={product.title}
                      className="h-48 w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-48 items-center justify-center bg-slate-100 text-sm text-slate-300">
                      No image
                    </div>
                  )}
                  <div className="p-4">
                    <h2 className="font-semibold text-slate-900">{product.title}</h2>
                    {product.description ? (
                      <p className="mt-1 line-clamp-2 text-sm text-slate-500">{product.description}</p>
                    ) : null}
                    <div className="mt-3 flex items-center justify-between">
                      {price != null ? (
                        <span className="text-sm font-semibold">
                          {store.currency} {Number(price).toFixed(2)}
                        </span>
                      ) : null}
                      {variantId ? (
                        <button
                          type="button"
                          data-prado-add-to-cart={variantId}
                          className="rounded-full bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-700"
                        >
                          Add to cart
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white px-6 py-4 text-center text-xs text-slate-400">
        Powered by Prado Commerce
      </footer>
    </div>
  );
}