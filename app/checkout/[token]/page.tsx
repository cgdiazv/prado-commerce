import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import CheckoutForm from "./checkout-form";
import StorefrontNavbar from "../../storefront/storefront-navbar";
import StorefrontFooter from "../../storefront/storefront-footer";

type PageProps = {
  params: Promise<{ token: string }>;
};

export default async function CheckoutTokenPage({ params }: PageProps) {
  const { token } = await params;
  const normalizedToken = decodeURIComponent(token).trim();

  const cart = await prisma.cart.findFirst({
    where: {
      OR: [
        { token: normalizedToken },
        { id: normalizedToken },
      ],
    },
    select: {
      id: true,
      token: true,
      currency: true,
      storeId: true,
      store: {
        select: {
          name: true,
          slug: true,
          categories: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      },
      items: {
        select: {
          quantity: true,
          variant: {
            select: {
              title: true,
              price: true,
            },
          },
        },
      },
    },
  });

  if (!cart) {
    notFound();
  }

  const hdrs = await headers();
  const isSubdomain = hdrs.get("x-storefront-subdomain") === "1";
  const base = isSubdomain ? "" : `/storefront/${cart.store.slug}`;

  const subtotal = cart.items.reduce((sum, item) => {
    const price = Number(item.variant.price);
    return sum + price * item.quantity;
  }, 0);

  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: cart.currency || "USD",
  });

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <StorefrontNavbar
        storeName={cart.store.name}
        basePath={base}
        categories={cart.store.categories}
      />

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-12">
        <div className="w-full rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-700">Checkout</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">Review your order</h1>
          <p className="mt-2 text-base leading-7 text-slate-600">
            Complete your details below to submit an order.
          </p>

          <div className="mt-8 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
            {/* Form on the left */}
            <CheckoutForm cartId={cart.id} currency={cart.currency || "USD"} subtotal={subtotal} storeId={cart.storeId} />

            {/* Order details on the right */}
            <div className="h-fit rounded-2xl border border-slate-200 bg-slate-50 p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-base font-semibold text-slate-900">{cart.store.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Subtotal</p>
                  <p className="text-xl font-bold text-slate-900">{formatter.format(subtotal)}</p>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                {cart.items.length === 0 ? (
                  <p className="text-sm text-slate-500">Your cart is empty.</p>
                ) : (
                  cart.items.map((item, index) => (
                    <div key={`${item.variant.title}-${index}`} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-xs">
                      <div>
                        <p className="font-medium text-slate-900">{item.variant.title}</p>
                        <p className="text-sm text-slate-500">Qty {item.quantity}</p>
                      </div>
                      <p className="text-sm font-semibold text-slate-900">
                        {formatter.format(Number(item.variant.price) * item.quantity)}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      <StorefrontFooter storeName={cart.store.name} />
    </div>
  );
}
