import { OnboardForm } from "./onboard-form";

export default async function OnboardPage({ params }: { params: { token: string } }) {
  return <OnboardForm token={params.token} />;
}