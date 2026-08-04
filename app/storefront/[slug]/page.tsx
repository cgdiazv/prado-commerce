import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { ShoppingCart, User } from "lucide-react";
import { prisma } from "@/lib/prisma";
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
        ...(activeCategory ? { categories: { some: { slug: activeCategory } } } : {}),
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
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white px-6 py-4">
        <div className="mx-auto max-w-6xl">
          <div className="flex items-center justify-between gap-6">
            <h1 className="shrink-0 text-xl font-semibold tracking-tight">{store.name}</h1>
            {categories.length > 0 && (
              <nav className="flex flex-1 flex-wrap items-center gap-x-5 gap-y-1">
                <Link
                  href={`${base}/`}
                  className={`text-sm font-medium transition-colors ${
                    !activeCategory ? "text-slate-900 font-semibold" : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  All
                </Link>
                {categories.map((cat) => (
                  <Link
                    key={cat.id}
                    href={`${base}/?category=${cat.slug}`}
                    className={`text-sm font-medium transition-colors ${
                      activeCategory === cat.slug ? "text-slate-900 font-semibold" : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    {cat.name}
                  </Link>
                ))}
              </nav>
            )}
            <div className="flex shrink-0 items-center gap-3">
              <Link
                href={`${base}/account`}
                aria-label="Account"
                className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
              >
                <User size={20} />
              </Link>
              <button
                type="button"
                data-prado-cart-toggle
                aria-label="Cart"
                className="relative flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
              >
                <ShoppingCart size={20} />
                <span
                  data-prado-cart-count
                  className="absolute -right-0.5 -top-0.5 hidden min-w-[18px] rounded-full bg-slate-900 px-1 text-center text-[10px] font-bold leading-[18px] text-white [&:not(:empty)]:block"
                />
              </button>
            </div>
          </div>
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
