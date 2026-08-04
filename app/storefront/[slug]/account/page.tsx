import Link from "next/link";
import { cookies, headers } from "next/headers";
import { notFound } from "next/navigation";
import { ShoppingCart, User } from "lucide-react";
import { prisma } from "@/lib/prisma";
import AuthPanel from "../auth-panel";
import AccountPanel from "../account-panel";
import OrdersPanel from "../orders-panel";
import StorefrontFooter from "../../storefront-footer";

const SHOPPER_SESSION_COOKIE = "prado_shop_session";

type PageProps = { params: Promise<{ slug: string }> };

export default async function StorefrontAccountPage({ params }: PageProps) {
  const { slug } = await params;

  const store = await prisma.store.findUnique({
    where: { slug },
    select: { id: true, name: true, slug: true, currency: true },
  });

  if (!store) notFound();

  const hdrs = await headers();
  const isSubdomain = hdrs.get("x-storefront-subdomain") === "1";
  const base = isSubdomain ? "" : `/storefront/${store.slug}`;

  const cookieStore = await cookies();
  const sessionRaw = cookieStore.get(SHOPPER_SESSION_COOKIE)?.value ?? "";
  const parts = decodeURIComponent(sessionRaw).split("::");
  const isLoggedIn = parts.length === 3 && parts[0] === store.id && Boolean(parts[1]);

  const Header = (
    <header className="border-b border-slate-200 bg-white px-6 py-4">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center justify-between gap-6">
          <Link href={`${base}/`} className="shrink-0 text-xl font-semibold tracking-tight hover:opacity-75 transition-opacity">
            {store.name}
          </Link>
          <div className="flex shrink-0 items-center gap-3">
            <Link
              href={`${base}/account`}
              aria-label="Account"
              className="flex h-9 w-9 items-center justify-center rounded-full text-slate-900 bg-slate-100"
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
  );

  if (!isLoggedIn) {
    return (
      <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
        {Header}
        <main className="mx-auto w-full max-w-md flex-1 px-6 py-16">
          <p className="mb-6 text-center text-sm text-slate-500">Sign in to view your account and orders.</p>
          <AuthPanel storeId={store.id} initialCustomer={null} />
        </main>
        <script dangerouslySetInnerHTML={{ __html: `window.PRADO_STORE_CONFIG={storeId:${JSON.stringify(store.id)}};if(!window.__pradoCart){window.__pradoCart=1;var s=document.createElement('script');s.src='/cart.js';document.head.appendChild(s);}` }} />
        <StorefrontFooter storeName={store.name} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {Header}
      <main className="mx-auto w-full max-w-2xl flex-1 space-y-6 px-6 py-12">
        <AccountPanel />
        <OrdersPanel />
      </main>
      <script dangerouslySetInnerHTML={{ __html: `window.PRADO_STORE_CONFIG={storeId:${JSON.stringify(store.id)}};if(!window.__pradoCart){window.__pradoCart=1;var s=document.createElement('script');s.src='/cart.js';document.head.appendChild(s);}` }} />
      <StorefrontFooter storeName={store.name} />
    </div>
  );
}
