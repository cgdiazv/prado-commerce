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
        <p className="mt-4 text-base leading-7 text-slate-200/90">
          Prado Commerce is designed to help merchants manage stores, products, and embedded checkout experiences.
          This page summarizes how we handle data in the application.
        </p>

        <div className="mt-10 space-y-6 text-sm leading-7 text-slate-200/88">
          <section className="rounded-2xl border border-white/12 bg-white/6 p-5">
            <h2 className="text-lg font-semibold text-cyan-100">Information we store</h2>
            <p className="mt-2">
              We may store account details, store configuration, product data, cart sessions, and request logs needed to
              operate Prado Commerce.
            </p>
          </section>

          <section className="rounded-2xl border border-white/12 bg-white/6 p-5">
            <h2 className="text-lg font-semibold text-cyan-100">How we use data</h2>
            <p className="mt-2">
              Data is used to authenticate merchants, manage storefronts, support integrations, and keep platform features
              functioning correctly.
            </p>
          </section>

          <section className="rounded-2xl border border-white/12 bg-white/6 p-5">
            <h2 className="text-lg font-semibold text-cyan-100">Contact</h2>
            <p className="mt-2">
              If you have privacy questions, contact the Prado Commerce team through the merchant dashboard or your project
              administrator.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}