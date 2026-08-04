import { cookies, headers } from "next/headers";
import type { CSSProperties } from "react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getStoreBrandingCssVars } from "@/lib/branding";
import AuthPanel from "../auth-panel";
import AccountSidebarLayout from "../account-sidebar-layout";
import StorefrontNavbar from "../../storefront-navbar";
import StorefrontFooter from "../../storefront-footer";

const SHOPPER_SESSION_COOKIE = "prado_shop_session";

type PageProps = { params: Promise<{ slug: string }> };

export default async function StorefrontAccountPage({ params }: PageProps) {
  const { slug } = await params;

  const store = await prisma.store.findUnique({
    where: { slug },
    select: { id: true, name: true, slug: true, mainColor: true, currency: true },
  });

  if (!store) notFound();

  const hdrs = await headers();
  const isSubdomain = hdrs.get("x-storefront-subdomain") === "1";
  const base = isSubdomain ? "" : `/storefront/${store.slug}`;

  const cookieStore = await cookies();
  const sessionRaw = cookieStore.get(SHOPPER_SESSION_COOKIE)?.value ?? "";
  const parts = decodeURIComponent(sessionRaw).split("::");
  const isLoggedIn = parts.length === 3 && parts[0] === store.id && Boolean(parts[1]);

  if (!isLoggedIn) {
    return (
      <div
        style={getStoreBrandingCssVars(store.mainColor) as CSSProperties}
        className="flex min-h-screen flex-col bg-slate-50 text-slate-900"
      >
        <StorefrontNavbar storeName={store.name} basePath={base} isAccountActive mainColor={store.mainColor} />
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
    <div
      style={getStoreBrandingCssVars(store.mainColor) as CSSProperties}
      className="flex min-h-screen flex-col bg-slate-50 text-slate-900"
    >
      <StorefrontNavbar storeName={store.name} basePath={base} isAccountActive mainColor={store.mainColor} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-12">
        <AccountSidebarLayout />
      </main>
      <script dangerouslySetInnerHTML={{ __html: `window.PRADO_STORE_CONFIG={storeId:${JSON.stringify(store.id)}};if(!window.__pradoCart){window.__pradoCart=1;var s=document.createElement('script');s.src='/cart.js';document.head.appendChild(s);}` }} />
      <StorefrontFooter storeName={store.name} />
    </div>
  );
}
