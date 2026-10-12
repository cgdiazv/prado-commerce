import { getCurrentUser } from "@/lib/session";
import { SettingsView } from "./settings-view";

export default async function SettingsPage() {
  const user = await getCurrentUser();

  return <SettingsView user={user ? { id: user.id, plan: user.plan } : null} />;
}
