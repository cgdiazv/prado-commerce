import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import AuthPanel from "../auth-panel";
import AccountSidebarLayout from "../account-sidebar-layout";

const SHOPPER_SESSION_COOKIE = "prado_shop_session";

type PageProps = { params: Promise<{ slug: string }> };

export default async function StorefrontAccountPage({ params }: PageProps) {
  const { slug } = await params;

  const store = await prisma.store.findUnique({
    where: { slug },
    select: { id: true, name: true, slug: true, logoUrl: true, activeTheme: true, mainColor: true, currency: true },
  });

  if (!store) notFound();

  const cookieStore = await cookies();
  const sessionRaw = cookieStore.get(SHOPPER_SESSION_COOKIE)?.value ?? "";
  const parts = decodeURIComponent(sessionRaw).split("::");
  const isLoggedIn = parts.length === 3 && parts[0] === store.id && Boolean(parts[1]);

  if (!isLoggedIn) {
    return (
      <div className="contents">
        <main className="mx-auto w-full max-w-md flex-1 px-6 py-16">
          <p className="mb-6 text-center text-sm text-slate-500">Sign in to view your account and orders.</p>
          <AuthPanel storeId={store.id} mainColor={store.mainColor} />
        </main>
      </div>
    );
  }

  return (
    <div className="contents">
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-12">
        <AccountSidebarLayout />
      </main>
    </div>
  );
}
