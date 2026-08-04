import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import CheckoutForm from "./checkout-form";

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

  const subtotal = cart.items.reduce((sum, item) => {
    const price = Number(item.variant.price);
    return sum + price * item.quantity;
  }, 0);

  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: cart.currency || "USD",
  });

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-16 text-slate-100">
      <div className="w-full max-w-5xl rounded-3xl border border-white/10 bg-white/10 p-8 shadow-[0_24px_60px_rgba(2,6,23,0.35)] backdrop-blur-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-200">Checkout</p>
        <h1 className="mt-4 text-3xl font-semibold text-white">Review your order</h1>
        <p className="mt-3 text-base leading-7 text-slate-300">
          Complete your details below to submit a real order for this storefront cart.
        </p>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-white">{cart.store.name}</p>
                <p className="text-sm text-slate-400">Cart token: {cart.token}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-400">Subtotal</p>
                <p className="text-lg font-semibold text-white">{formatter.format(subtotal)}</p>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {cart.items.length === 0 ? (
                <p className="text-sm text-slate-400">Your cart is empty.</p>
              ) : (
                cart.items.map((item, index) => (
                  <div key={`${item.variant.title}-${index}`} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                    <div>
                      <p className="font-medium text-white">{item.variant.title}</p>
                      <p className="text-sm text-slate-400">Qty {item.quantity}</p>
                    </div>
                    <p className="text-sm font-semibold text-cyan-200">
                      {formatter.format(Number(item.variant.price) * item.quantity)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          <CheckoutForm cartId={cart.id} currency={cart.currency || "USD"} subtotal={subtotal} storeId={cart.storeId} />
        </div>
      </div>
    </main>
  );
}
