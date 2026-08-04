import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

type PageProps = {
  params: Promise<{ slug: string; productSlug: string }>;
};

export default async function StorefrontProductPage({ params }: PageProps) {
  const { slug, productSlug } = await params;

  const store = await prisma.store.findUnique({
    where: { slug },
    select: { id: true, name: true, slug: true, currency: true },
  });

  if (!store) {
    notFound();
  }

  const product = await prisma.product.findFirst({
    where: {
      storeId: store.id,
      slug: productSlug,
      status: "ACTIVE",
    },
    select: {
      id: true,
      title: true,
      slug: true,
      description: true,
      images: true,
      variants: {
        select: {
          id: true,
          title: true,
          price: true,
        },
        orderBy: { price: "asc" },
      },
    },
  });

  if (!product) {
    notFound();
  }

  const primaryVariant = product.variants[0];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white px-6 py-4">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-xl font-semibold tracking-tight">{store.name}</h1>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-12">
        <div className="grid gap-10 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            {product.images[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={product.images[0]} alt={product.title} className="h-80 w-full rounded-2xl object-cover" />
            ) : (
              <div className="flex h-80 items-center justify-center rounded-2xl bg-slate-100 text-sm text-slate-400">
                No image available
              </div>
            )}
          </div>

          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-700">Product details</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight">{product.title}</h2>
            <p className="mt-4 text-base leading-7 text-slate-600">{product.description}</p>

            <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">Starting at</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-900">
                    {store.currency} {Number(primaryVariant?.price ?? 0).toFixed(2)}
                  </p>
                </div>
                {primaryVariant ? (
                  <button
                    type="button"
                    data-prado-add={primaryVariant.id}
                    data-prado-add-to-cart={primaryVariant.id}
                    className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700"
                  >
                    Add to cart
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </main>
      <footer className="border-t border-slate-200 bg-white px-6 py-4 text-center text-xs text-slate-400">
        Powered by Prado Commerce
      </footer>
    </div>
  );
}
