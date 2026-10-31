import { cookies } from "next/headers";
import AuthPanel from "./[slug]/auth-panel";
import AccountSidebarLayout from "./[slug]/account-sidebar-layout";

const SHOPPER_SESSION_COOKIE = "prado_shop_session";

type StorefrontAccountContentProps = {
  store: {
    id: string;
    mainColor: string;
  };
};

export default async function StorefrontAccountContent({ store }: StorefrontAccountContentProps) {
  const cookieStore = await cookies();
  const sessionRaw = cookieStore.get(SHOPPER_SESSION_COOKIE)?.value ?? "";
  const parts = decodeURIComponent(sessionRaw).split("::");
  const isLoggedIn = parts.length === 3 && parts[0] === store.id && Boolean(parts[1]);

  if (!isLoggedIn) {
    return (
      <div className="contents">
        <main className="mx-auto w-full max-w-md flex-1 px-6 py-16">
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
