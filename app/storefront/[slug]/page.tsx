import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import StorefrontNavbar from "../storefront-navbar";
import StorefrontFooter from "../storefront-footer";

type PageProps = { params: Promise<{ slug: string }>; searchParams: Promise<{ category?: string }> };

export default async function StorefrontPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { category: activeCategory } = await searchParams;

  const store = await prisma.store.findUnique({
    where: { slug },
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

  // root-relative when on a subdomain, prefixed when on the main domain
  const hdrs = await headers();
  const isSubdomain = hdrs.get("x-storefront-subdomain") === "1";
  const base = isSubdomain ? "" : `/storefront/${store.slug}`;

  const [products, categories] = await Promise.all([    prisma.product.findMany({
      where: {
        storeId: store.id,
        status: "ACTIVE",
        ...(activeCategory ? { category: { slug: activeCategory } } : {}),
      },
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
    }),
    prisma.category.findMany({
      where: { storeId: store.id },
      orderBy: { name: "asc" },
      select: { id: true, name: true, slug: true },
    }),
  ]);

  const initialCustomer = null;

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <StorefrontNavbar
        storeName={store.name}
        basePath={base}
        categories={categories}
        activeCategory={activeCategory}
      />

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-12">
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
                  className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md"
                >
                  {/* stretched link covers the whole card; button sits above it */}
                  <Link
                    href={`${base}/products/${product.id}`}
                    className="absolute inset-0 z-0"
                    aria-label={product.title}
                  />
                  {product.images[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={product.images[0]}
                      alt={product.title}
                      className="h-48 w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-48 items-center justify-center bg-slate-100 text-slate-300 text-sm">
                      No image
                    </div>
                  )}
                  <div className="p-4">
                    <h2 className="font-semibold text-slate-900">{product.title}</h2>
                    {product.description ? (
                      <p className="mt-1 text-sm text-slate-500 line-clamp-2">{product.description}</p>
                    ) : null}
                    <div className="mt-3 flex items-center justify-between">
                      {price != null ? (
                        <span className="text-sm font-semibold text-slate-700">
                          {store.currency} {Number(price).toFixed(2)}
                        </span>
                      ) : <span className="text-sm text-slate-400">Select options</span>}
                      {variantId ? (
                        <button
                          type="button"
                          data-prado-add={variantId}
                          data-prado-add-to-cart={variantId}
                          className="relative z-10 rounded-full bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-700"
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

      <script dangerouslySetInnerHTML={{ __html: `window.PRADO_STORE_CONFIG={storeId:${JSON.stringify(store.id)}};if(!window.__pradoCart){window.__pradoCart=1;var s=document.createElement('script');s.src='/cart.js';document.head.appendChild(s);}` }} />
      <StorefrontFooter storeName={store.name} />
    </div>
  );
}
