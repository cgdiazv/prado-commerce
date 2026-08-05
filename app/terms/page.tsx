import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#0c1624] px-6 py-16 text-slate-100 sm:px-8 lg:px-10">
      <div className="mx-auto w-full max-w-3xl">
        <Link href="/" className="text-sm font-medium text-cyan-100 transition hover:text-cyan-50">
          Back to home
        </Link>

        <h1 className="mt-6 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
          Terms of Service
        </h1>
        <p className="mt-3 text-xs font-medium uppercase tracking-[0.14em] text-slate-300">Effective date: August 3, 2026</p>
        <p className="mt-4 text-base leading-7 text-slate-200/90">
          These Terms of Service govern access to and use of Prado Commerce, including the website, merchant dashboard,
          API services, storefront routes, and embedded cart integrations.
        </p>

        <div className="mt-10 space-y-6 text-sm leading-7 text-slate-200/88">
          <section className="rounded-xl border border-white/12 bg-white/6 p-5">
            <h2 className="text-lg font-semibold text-cyan-100">1. Services covered by these terms</h2>
            <p className="mt-2">These terms apply to all product areas, including:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Public pages such as home, pricing, login, signup, privacy, and terms.</li>
              <li>Merchant dashboard modules: dashboard, stores, products, categories, orders, and customers.</li>
              <li>Dashboard settings: store profile, currencies, payments, shipping, tax, security, and API access.</li>
              <li>Storefront pages served by slug and custom domain routes.</li>
              <li>APIs for authentication, catalog management, cart, checkout, uploads, and key management.</li>
              <li>Embed and headless usage with publishable keys, variant IDs, and API host configuration.</li>
            </ul>
          </section>

          <section className="rounded-xl border border-white/12 bg-white/6 p-5">
            <h2 className="text-lg font-semibold text-cyan-100">2. Eligibility and account responsibilities</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>You must provide accurate account and store information.</li>
              <li>You are responsible for all actions under your account and team access.</li>
              <li>You must protect passwords, session access, API keys, and domain configuration settings.</li>
              <li>You must promptly update credentials or revoke keys if unauthorized access is suspected.</li>
            </ul>
          </section>

          <section className="rounded-xl border border-white/12 bg-white/6 p-5">
            <h2 className="text-lg font-semibold text-cyan-100">3. Acceptable use and prohibited conduct</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Use Prado Commerce only for lawful commercial activity.</li>
              <li>Do not attempt to bypass access controls or security mechanisms.</li>
              <li>Do not scrape, abuse, overload, or disrupt service infrastructure.</li>
              <li>Do not use the platform to distribute harmful, fraudulent, or infringing content.</li>
              <li>Do not expose secret keys in client-side code or publicly accessible repositories.</li>
            </ul>
          </section>

          <section className="rounded-xl border border-white/12 bg-white/6 p-5">
            <h2 className="text-lg font-semibold text-cyan-100">4. Merchant content and operational data</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>You retain responsibility for product, pricing, customer, and order data entered in your workspace.</li>
              <li>You are responsible for the legality and accuracy of catalog and marketing content.</li>
              <li>You are responsible for taxes, shipping rules, and compliance settings configured in your account.</li>
            </ul>
          </section>

          <section className="rounded-xl border border-white/12 bg-white/6 p-5">
            <h2 className="text-lg font-semibold text-cyan-100">5. API and integration terms</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Publishable keys may be used in approved frontend integration contexts.</li>
              <li>Secret keys must be stored securely and used only in trusted server environments.</li>
              <li>You must configure allowed frontend domains accurately for browser-side safety controls.</li>
              <li>You are responsible for requests made by your scripts, applications, and third-party integrations.</li>
              <li>Prado Commerce may limit or revoke API access to protect platform integrity.</li>
            </ul>
          </section>

          <section className="rounded-xl border border-white/12 bg-white/6 p-5">
            <h2 className="text-lg font-semibold text-cyan-100">6. Payment, shipping, and tax features</h2>
            <p className="mt-2">
              Dashboard configuration tools are provided as operational features. You remain responsible for business policy,
              legal compliance, provider contracts, settlement outcomes, and tax filing obligations.
            </p>
          </section>

          <section className="rounded-xl border border-white/12 bg-white/6 p-5">
            <h2 className="text-lg font-semibold text-cyan-100">7. Availability and updates</h2>
            <p className="mt-2">
              Prado Commerce may add, remove, or modify features over time, including changes to dashboard workflows, API
              routes, and storefront capabilities. Scheduled or emergency maintenance may affect availability.
            </p>
          </section>

          <section className="rounded-xl border border-white/12 bg-white/6 p-5">
            <h2 className="text-lg font-semibold text-cyan-100">8. Suspension and termination</h2>
            <p className="mt-2">
              Access may be suspended or terminated for violations of these terms, suspected abuse, legal requirements, or
              security risks. Upon termination, API keys and active sessions may be revoked.
            </p>
          </section>

          <section className="rounded-xl border border-white/12 bg-white/6 p-5">
            <h2 className="text-lg font-semibold text-cyan-100">9. Disclaimers and limitation of liability</h2>
            <p className="mt-2">
              Prado Commerce is provided on an as-available basis. To the maximum extent permitted by law, Prado Commerce is
              not liable for indirect, incidental, special, consequential, or punitive damages arising from service use.
            </p>
          </section>

          <section className="rounded-xl border border-white/12 bg-white/6 p-5">
            <h2 className="text-lg font-semibold text-cyan-100">10. Changes to these terms</h2>
            <p className="mt-2">
              These terms may be updated as Prado Commerce evolves. Continued use of the service after updates means you
              accept the revised terms.
            </p>
          </section>

          <section className="rounded-xl border border-cyan-200/40 bg-cyan-300/10 p-5">
            <h2 className="text-lg font-semibold text-cyan-100">11. Contact</h2>
            <p className="mt-2">For terms questions or additional assistance, contact support@pradocommerce.com</p>
          </section>
        </div>
      </div>
    </main>
  );
}