import { OnboardForm } from "./onboard-form";

export default async function OnboardPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <OnboardForm token={token} />;
}