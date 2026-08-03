import Link from "next/link";

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
        <p className="mt-4 text-base leading-7 text-slate-200/90">
          These terms describe the basic rules for using Prado Commerce and its merchant tools.
        </p>

        <div className="mt-10 space-y-6 text-sm leading-7 text-slate-200/88">
          <section className="rounded-xl border border-white/12 bg-white/6 p-5">
            <h2 className="text-lg font-semibold text-cyan-100">Acceptable use</h2>
            <p className="mt-2">
              You agree to use Prado Commerce only for lawful business purposes and to protect account credentials,
              API keys, and storefront settings.
            </p>
          </section>

          <section className="rounded-xl border border-white/12 bg-white/6 p-5">
            <h2 className="text-lg font-semibold text-cyan-100">Accounts and data</h2>
            <p className="mt-2">
              You are responsible for the information you submit, the stores you create, and the content you publish through
              the platform.
            </p>
          </section>

          <section className="rounded-xl border border-white/12 bg-white/6 p-5">
            <h2 className="text-lg font-semibold text-cyan-100">Service changes</h2>
            <p className="mt-2">
              Prado Commerce may change features, pricing, or availability as the product evolves.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}