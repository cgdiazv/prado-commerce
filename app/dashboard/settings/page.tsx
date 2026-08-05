import { getCurrentUser } from "@/lib/session";
import Link from "next/link";
import { DeleteAccountPanel } from "./delete-account-panel";
import { ManagePlanPanel } from "./manage-plan-panel";

export default async function SettingsPage() {
  const user = await getCurrentUser();

  const accountProfileItems = [
    {
      title: "Store profile",
      detail: "Basic information about your business and storefront identity.",
      href: "/dashboard/settings/store-profile",
    },
    {
      title: "Currencies",
      detail: "Choose which currencies customers can browse and pay with.",
      href: "/dashboard/settings/currencies",
    },
    {
      title: "Payments",
      detail: "Manage payment methods available for supported currencies.",
      href: "/dashboard/settings/payments",
    },
    {
      title: "Emails",
      detail: "Configure buyer welcome, order confirmation, and invoice emails.",
      href: "/dashboard/settings/emails",
    },
    {
      title: "Shipping",
      detail: "Set origin address, shipping zones, and delivery services.",
      href: "/dashboard/settings/shipping",
    },
    {
      title: "Tax",
      detail: "Configure tax rules and recommended tax services.",
      href: "/dashboard/settings/tax",
    },
  ];

  const securityItems = [
    {
      title: "Change password",
      detail: "Update your current password for this account.",
      href: "/dashboard/settings/security/change-password",
    },
    {
      title: "Sign out of all other devices",
      detail: "Keep this device signed in and end all other active sessions.",
      href: "/dashboard/settings/security/devices",
    },
  ];

  return (
    <section>
      <div className="space-y-4">
        <div>
          <p className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
            Settings
          </p>
          <h1 className="mt-4 text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">
            Account Settings
          </h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-slate-600 sm:text-lg">
            Manage your profile, security, and notification preferences.
          </p>
        </div>

        <div className="mt-8 space-y-5">
          <article className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Account profile</h2>
            <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
              {accountProfileItems.map((item) => (
                <Link
                  href={item.href ?? "#"}
                  key={item.title}
                  className="grid w-full grid-cols-[1.3fr_2fr_auto] items-center gap-4 border-b border-slate-200 px-4 py-3 text-left last:border-b-0 hover:bg-slate-50"
                >
                  <span className="text-sm font-semibold text-slate-900">{item.title}</span>
                  <span className="text-sm text-slate-500">{item.detail}</span>
                  <span className="text-lg text-slate-400" aria-hidden>
                    ›
                  </span>
                </Link>
              ))}
            </div>
          </article>

          <article className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Security</h2>
            <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
              {securityItems.map((item) => (
                <Link
                  href={item.href}
                  key={item.title}
                  className="grid w-full grid-cols-[1.3fr_2fr_auto] items-center gap-4 border-b border-slate-200 px-4 py-3 text-left last:border-b-0 hover:bg-slate-50"
                >
                  <span className="text-sm font-semibold text-slate-900">{item.title}</span>
                  <span className="text-sm text-slate-500">{item.detail}</span>
                  <span className="text-lg text-slate-400" aria-hidden>
                    ›
                  </span>
                </Link>
              ))}
            </div>
          </article>

          <article className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">API access</h2>
            <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
              <Link
                href="/dashboard/settings/security/api"
                className="grid w-full grid-cols-[1.3fr_2fr_auto] items-center gap-4 px-4 py-3 text-left hover:bg-slate-50"
              >
                <span className="text-sm font-semibold text-slate-900">API keys</span>
                <span className="text-sm text-slate-500">View your publishable and secret API keys by store.</span>
                <span className="text-lg text-slate-400" aria-hidden>
                  ›
                </span>
              </Link>
            </div>
          </article>
        </div>

        {user ? (
          <div className="space-y-5">
            <ManagePlanPanel merchantId={user.id} currentPlan={user.plan} />
            <DeleteAccountPanel />
          </div>
        ) : null}
      </div>
    </section>
  );
}
