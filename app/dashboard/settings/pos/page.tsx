import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import { resolvePosSettings, getDefaultPosSettings } from "@/lib/pos/settings";
import { getPlanLimits, getPlanOrDefault } from "@/lib/subscription";
import { PosLockedView } from "@/components/pos/PosLockedView";
import { PosSettingsClient } from "./pos-settings-client";

type PosSettingsPageProps = {
  searchParams?: Promise<{
    storeId?: string;
  }>;
};

export default async function SettingsPosPage({ searchParams }: PosSettingsPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const limits = getPlanLimits(getPlanOrDefault(user.plan));
  if (!limits.allowPos) {
    return <PosLockedView returnHref="/dashboard/settings" />;
  }

  try {
    const stores = await prisma.store.findMany({
      where: { ownerUserId: user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        currency: true,
        customDomain: true,
        logoUrl: true,
        posSettings: true,
      },
    });

    const selectedStore =
      stores.find((s) => s.id === resolvedSearchParams?.storeId) ?? stores[0] ?? null;
    const selectedStoreId = selectedStore?.id ?? null;
    const initialSettings = selectedStore
      ? resolvePosSettings(selectedStore.posSettings, user)
      : getDefaultPosSettings(user);

    return (
      <PosSettingsClient
        stores={stores.map(({ posSettings: _unused, ...s }) => s)}
        initialStoreId={selectedStoreId}
        initialSettings={initialSettings}
        userName={user.name}
        userEmail={user.email}
      />
    );
  } catch (error) {
    console.error("[SETTINGS_POS_PAGE_ERROR]", error);
    return (
      <PosSettingsClient
        stores={[]}
        initialStoreId={null}
        initialSettings={getDefaultPosSettings(user)}
        userName={user.name}
        userEmail={user.email}
      />
    );
  }
}
