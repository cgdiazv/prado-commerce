import { getCurrentUser } from "@/lib/session";
import Link from "next/link";
import { ManagePlanPanel } from "./manage-plan-panel";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  const isDevMode = process.env.NODE_ENV !== "production";

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
      title: "Locations",
      detail: "Define where inventory is stored and fulfilled from.",
    },
    {
      title: "Pickup methods",
      detail: "Create and manage in-person pickup options for orders.",
    },
    {
      title: "Shipping",
      detail: "Set origin address, shipping zones, and delivery services.",
    },
    {
      title: "Tax",
      detail: "Configure tax rules and recommended tax services.",
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
            <ul className="mt-4 space-y-3 text-sm text-slate-600">
              <li className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">Password reset and login history</li>
              <li className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">Session management</li>
              <li className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">Two-factor authentication</li>
            </ul>
          </article>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          Settings actions are placeholders for now and will be connected in a future update.
        </div>

        {isDevMode && user ? (
          <ManagePlanPanel merchantId={user.id} currentPlan={user.plan} />
        ) : null}
      </div>
    </section>
  );
}
