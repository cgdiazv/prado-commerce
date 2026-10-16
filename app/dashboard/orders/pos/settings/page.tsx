import { redirect } from "next/navigation";

type PosSettingsPageProps = {
  searchParams?: Promise<{
    storeId?: string;
  }>;
};

export default async function PosSettingsRedirectPage({ searchParams }: PosSettingsPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const storeId = resolvedSearchParams?.storeId;
  redirect(storeId ? `/dashboard/settings/pos?storeId=${storeId}` : "/dashboard/settings/pos");
}
