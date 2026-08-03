import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#0c1624] px-6 py-16 text-slate-100 sm:px-8 lg:px-10">
      <div className="mx-auto w-full max-w-3xl">
        <Link href="/" className="text-sm font-medium text-cyan-100 transition hover:text-cyan-50">
          Back to home
        </Link>

        <h1 className="mt-6 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
          Privacy Policy
        </h1>
        <p className="mt-3 text-xs font-medium uppercase tracking-[0.14em] text-slate-300">Effective date: August 3, 2026</p>
        <p className="mt-4 text-base leading-7 text-slate-200/90">
          This Privacy Policy explains how Prado Commerce collects, uses, stores, and protects information when merchants
          and their teams use the website, dashboard, APIs, and embedded cart experiences.
        </p>

        <div className="mt-10 space-y-6 text-sm leading-7 text-slate-200/88">
          <section className="rounded-xl border border-white/12 bg-white/6 p-5">
            <h2 className="text-lg font-semibold text-cyan-100">1. Scope of this policy</h2>
            <p className="mt-2">This policy applies to all Prado Commerce surfaces, including:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Public website pages such as home, pricing, privacy, terms, login, signup, and password reset.</li>
              <li>Dashboard modules including stores, products, categories, orders, customers, and settings.</li>
              <li>Settings features including store profile, currencies, payments, shipping, tax, security, and API access.</li>
              <li>Storefront rendering routes by slug or mapped domain.</li>
              <li>API routes used for authentication, catalog management, cart, checkout, uploads, and key management.</li>
              <li>Embed scripts and storefront events that send data to platform APIs.</li>
            </ul>
          </section>

          <section className="rounded-xl border border-white/12 bg-white/6 p-5">
            <h2 className="text-lg font-semibold text-cyan-100">2. Information we collect</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Account data: name, email, password hash, onboarding records, and account status metadata.</li>
              <li>Authentication data: session cookies, session version values, login events, and security events.</li>
              <li>Store data: store ID, store name, slug, domain settings, allowed frontend domains, and branding fields.</li>
              <li>Catalog data: products, variants, categories, media URLs, pricing, and inventory attributes.</li>
              <li>Customer data: customer profiles and related order history stored by the merchant.</li>
              <li>Order data: cart contents, checkout context, order totals, status transitions, and fulfillment metadata.</li>
              <li>Payment and tax configuration data: provider settings, tax preferences, and region-level rules.</li>
              <li>Shipping configuration data: origin, zones, methods, and carrier integration states.</li>
              <li>API access data: publishable keys, secret keys, key metadata, and revocation history.</li>
              <li>Operational data: request logs, error traces, and performance telemetry needed for reliability and security.</li>
            </ul>
          </section>

          <section className="rounded-xl border border-white/12 bg-white/6 p-5">
            <h2 className="text-lg font-semibold text-cyan-100">3. How we use information</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Provide dashboard and storefront functionality for merchant operations.</li>
              <li>Authenticate users, enforce access control, and protect accounts from unauthorized use.</li>
              <li>Process catalog, cart, and checkout workflows requested by merchants and storefront users.</li>
              <li>Support configuration features for shipping, tax, payment, currency, and domain controls.</li>
              <li>Issue, validate, and revoke API keys for integrations and headless storefront use cases.</li>
              <li>Monitor platform performance, troubleshoot issues, and improve service reliability.</li>
            </ul>
          </section>

          <section className="rounded-xl border border-white/12 bg-white/6 p-5">
            <h2 className="text-lg font-semibold text-cyan-100">4. Cookies and sessions</h2>
            <p className="mt-2">
              Prado Commerce uses cookies and related session mechanisms to keep users signed in, protect secure routes,
              and support account-level controls such as changing passwords and signing out other devices.
            </p>
          </section>

          <section className="rounded-xl border border-white/12 bg-white/6 p-5">
            <h2 className="text-lg font-semibold text-cyan-100">5. API keys and integration safety</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Publishable keys are intended for client-side or public integration contexts.</li>
              <li>Secret keys are intended for trusted server-side environments only.</li>
              <li>Merchants can create and revoke keys in Dashboard Settings under API access.</li>
              <li>Allowed frontend domain controls are used to reduce misuse of browser-side integrations.</li>
            </ul>
          </section>

          <section className="rounded-xl border border-white/12 bg-white/6 p-5">
            <h2 className="text-lg font-semibold text-cyan-100">6. Data sharing and disclosures</h2>
            <p className="mt-2">Prado Commerce does not sell merchant data. Information may be shared only when required to:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Operate requested platform features through service providers.</li>
              <li>Comply with legal obligations, lawful requests, or enforcement requirements.</li>
              <li>Protect the rights, security, and integrity of Prado Commerce, merchants, and users.</li>
            </ul>
          </section>

          <section className="rounded-xl border border-white/12 bg-white/6 p-5">
            <h2 className="text-lg font-semibold text-cyan-100">7. Data retention</h2>
            <p className="mt-2">
              Data is retained for as long as needed to provide services, maintain legitimate business records, enforce
              security controls, and satisfy legal or contractual requirements.
            </p>
          </section>

          <section className="rounded-xl border border-white/12 bg-white/6 p-5">
            <h2 className="text-lg font-semibold text-cyan-100">8. Security practices</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Access controls and authentication checks on protected dashboard and API routes.</li>
              <li>Password change and active-session invalidation controls.</li>
              <li>Key lifecycle management with creation and revocation endpoints.</li>
              <li>Operational monitoring for platform stability and abnormal usage detection.</li>
            </ul>
          </section>

          <section className="rounded-xl border border-white/12 bg-white/6 p-5">
            <h2 className="text-lg font-semibold text-cyan-100">9. International use</h2>
            <p className="mt-2">
              Merchants may access Prado Commerce from multiple regions. By using the service, you understand that data may
              be processed in jurisdictions where our infrastructure or vendors operate.
            </p>
          </section>

          <section className="rounded-xl border border-white/12 bg-white/6 p-5">
            <h2 className="text-lg font-semibold text-cyan-100">10. Policy updates</h2>
            <p className="mt-2">
              This policy may be updated as platform features evolve, including updates to dashboard modules, API behavior,
              or security controls. Continued use of Prado Commerce after updates indicates acceptance of the revised policy.
            </p>
          </section>

          <section className="rounded-xl border border-cyan-200/40 bg-cyan-300/10 p-5">
            <h2 className="text-lg font-semibold text-cyan-100">11. Contact</h2>
            <p className="mt-2">For privacy questions or requests, contact: support@pradocommerce.com</p>
          </section>
        </div>
      </div>
    </main>
  );
}