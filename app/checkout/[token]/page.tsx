import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import CheckoutExperience from "./checkout-experience";
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
          offlinePaymentsEnabled: true,
          stripeChargesEnabled: true,
          stripePayoutsEnabled: true,
          authNetLoginId: true,
          authNetClientKey: true,
          authNetTransKeyEncrypted: true,
          authNetEnv: true,
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
          variantId: true,
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
  const host = (hdrs.get("host") || "").split(":")[0].toLowerCase();
  const isSubdomain = hdrs.get("x-storefront-subdomain") === "1" || Boolean(hdrs.get("x-storefront-custom-domain"));
  const isTenantDomain = isSubdomain || (host !== "" && host !== "localhost" && host !== "127.0.0.1" && host !== "pradocommerce.com" && host !== "www.pradocommerce.com");

  const base = isTenantDomain ? "" : `/storefront/${cart.store.slug}`;

  const initialItems = cart.items.map((item) => ({
    variantId: item.variantId,
    title: item.variant.title,
    price: Number(item.variant.price),
    quantity: item.quantity,
  }));

  const stripeOnlinePaymentsEnabled = Boolean(cart.store.stripeChargesEnabled && cart.store.stripePayoutsEnabled);
  const authorizeNetReady = Boolean(
    cart.store.authNetLoginId && cart.store.authNetClientKey && cart.store.authNetTransKeyEncrypted,
  );
  const onlinePaymentProvider = stripeOnlinePaymentsEnabled
    ? "stripe"
    : authorizeNetReady
      ? "authorize_net"
      : null;

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

          <CheckoutExperience
            cartId={cart.id}
            currency={cart.currency || "USD"}
            storeId={cart.storeId}
            storeName={cart.store.name}
            basePath={base}
            offlinePaymentsEnabled={Boolean(cart.store.offlinePaymentsEnabled)}
            stripeOnlinePaymentsEnabled={stripeOnlinePaymentsEnabled}
            onlinePaymentProvider={onlinePaymentProvider}
            authorizeNetConfig={authorizeNetReady ? {
              loginId: cart.store.authNetLoginId ?? "",
              clientKey: cart.store.authNetClientKey ?? "",
              environment: cart.store.authNetEnv === "production" ? "production" : "sandbox",
            } : null}
            initialItems={initialItems}
          />
        </div>
      </main>

      <StorefrontFooter storeName={cart.store.name} />
    </div>
  );
}
