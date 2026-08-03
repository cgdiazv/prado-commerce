import Link from "next/link";
import { Footer } from "@/components/footer";

const stackPillars = [
  {
    title: "Merchant Control",
    detail: "Launch stores, issue keys, and manage pricing from one admin plane.",
  },
  {
    title: "API and CDN Split",
    detail: "Keep integration latency low with dedicated API and script delivery surfaces.",
  },
  {
    title: "Cart Engine",
    detail: "Drop in cart.js with data attributes and get a working cart drawer in minutes.",
  },
];

export default function Home() {
  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-[#0c1624] text-slate-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_10%,rgba(14,165,233,0.33),transparent_36%),radial-gradient(circle_at_84%_0%,rgba(45,212,191,0.27),transparent_32%),linear-gradient(160deg,#0c1624_0%,#111827_48%,#1f2937_100%)]" />
      <div className="pointer-events-none absolute -left-28 top-28 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-10 h-80 w-80 rounded-full bg-teal-300/20 blur-3xl" />

      <div className="relative w-full pb-0">
        <header className="prado-fade-up w-full border-b border-white/20 bg-white/8 px-6 py-3 backdrop-blur-md sm:px-8 lg:px-10">
          <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="h-2.5 w-2.5 rounded-full bg-cyan-300 shadow-[0_0_20px_rgba(103,232,249,0.8)]" />
            <span className="text-xs font-semibold uppercase tracking-[0.25em] text-cyan-100">
              Prado Commerce
            </span>
          </div>

            <div className="flex items-center gap-2">
              <Link
                href="/signup"
                className="rounded-full border border-cyan-200/40 bg-cyan-300/12 px-4 py-1.5 text-xs font-semibold text-cyan-100 transition hover:bg-cyan-300/20"
              >
                Create account
              </Link>
              <Link
                href="/stores"
                className="rounded-full bg-cyan-300 px-4 py-1.5 text-xs font-semibold text-slate-900 transition hover:bg-cyan-200"
              >
                Dashboard
              </Link>
            </div>
          </div>
        </header>

        <section className="mx-auto mt-8 grid w-full max-w-6xl gap-8 px-6 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-start lg:px-10">
          <div className="prado-fade-up prado-delay-1">
            <p className="inline-flex rounded-full border border-teal-100/30 bg-teal-200/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-teal-100">
              One platform, many storefronts
            </p>
            <h1 className="mt-5 max-w-xl text-balance text-4xl font-semibold leading-[1.05] tracking-tight text-white sm:text-6xl lg:text-7xl">
              Build storefront velocity without platform chaos.
            </h1>
            <p className="mt-6 max-w-xl text-pretty text-lg leading-8 text-slate-200/90">
              Prado Commerce gives you one control plane for stores, products, and embeddable cart flows. Ship features faster while keeping every merchant isolated.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center rounded-full bg-cyan-300 px-6 py-3 text-sm font-semibold text-slate-900 transition hover:bg-cyan-200"
              >
                Create account
              </Link>
              <Link
                href="/products"
                className="inline-flex items-center justify-center rounded-full border border-white/25 bg-transparent px-6 py-3 text-sm font-semibold text-slate-100 transition hover:border-white/40 hover:bg-white/8"
              >
                Open products studio
              </Link>
            </div>
          </div>

          <aside className="prado-fade-up prado-delay-2 rounded-3xl border border-white/18 bg-slate-950/45 p-5 shadow-[0_24px_60px_rgba(2,6,23,0.45)] backdrop-blur-md sm:p-6">
            <div className="flex items-center justify-between border-b border-white/12 pb-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">Live Storefront</p>
              <span className="rounded-full border border-emerald-300/35 bg-emerald-300/15 px-2.5 py-1 text-xs font-medium text-emerald-100">
                Powered by Prado Commerce
              </span>
            </div>

            <div className="mt-4 overflow-hidden rounded-2xl border border-white/18 bg-slate-900/55">
              <img
                src="/prado-storefront.svg"
                alt="Storefront dashboard running on Prado Commerce"
                className="h-auto w-full"
              />
            </div>

            <p className="mt-4 text-sm leading-6 text-slate-200/85">
              A merchant storefront, catalog, and customer flow all running on one Prado Commerce platform.
            </p>
          </aside>
        </section>

        <section className="prado-fade-up mx-auto mt-10 w-full max-w-6xl px-6 sm:px-8 lg:px-10">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold tracking-tight text-cyan-100 sm:text-xl">Features</h2>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-300">Built for speed</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {stackPillars.map((pillar) => (
              <article
                key={pillar.title}
                className="rounded-2xl border border-white/18 bg-white/8 p-4 backdrop-blur-sm"
              >
                <h3 className="text-sm font-semibold text-cyan-100">{pillar.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-200/85">{pillar.detail}</p>
              </article>
            ))}
          </div>
        </section>

        <Footer />
      </div>
    </main>
  );
}
