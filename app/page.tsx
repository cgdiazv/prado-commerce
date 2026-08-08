"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";

const frictionStories = [
  {
    title: "Sales stop after a campaign goes live",
    detail:
      "A maker launches a flash promo, traffic spikes, and checkout starts dropping buyers at the worst possible moment.",
    image: "/conflict1.webp",
  },
  {
    title: "Inventory says one thing, customer expectations say another",
    detail:
      "Store teams update products in multiple tools and still end up with mismatched stock, pricing, and fulfillment details.",
    image: "/conflict2.webp",
  },
  {
    title: "Growth exposes an operations bottleneck",
    detail:
      "As new channels get added, teams spend more time patching systems than improving the buying experience.",
    image: "/conflict3.webp",
  },
];

const businessBenefits = [
  {
    title: "Built For Every Business Type",
    detail:
      "From independent makers and local stores to fast-scaling brands, Prado Commerce adapts to physical, digital, and service-based catalogs.",
    image: "/whyus1.webp",
    layout: "vertical",
  },
  {
    title: "Global Product Reach",
    detail:
      "Publish products once and connect them to the world through embedded storefront experiences, faster APIs, and flexible domain setup.",
    image: "/whyus2.webp",
    layout: "horizontal",
  },
  {
    title: "Stronger Online Presence",
    detail:
      "Unify your brand across your site, checkout flows, and product pages so customers trust what they see and buy with confidence.",
    image: "/whyus3.webp",
    layout: "horizontal",
  },
];

export default function Home() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const activeBenefit = businessBenefits[activeIndex];

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current === businessBenefits.length - 1 ? 0 : current + 1));
    }, 5000);

    return () => window.clearInterval(timer);
  }, []);

  const goToPrevious = () => {
    setActiveIndex((current) =>
      current === 0 ? businessBenefits.length - 1 : current - 1,
    );
  };

  const goToNext = () => {
    setActiveIndex((current) =>
      current === businessBenefits.length - 1 ? 0 : current + 1,
    );
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-[#0c1624] text-slate-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_10%,rgba(14,165,233,0.33),transparent_36%),radial-gradient(circle_at_84%_0%,rgba(45,212,191,0.27),transparent_32%),linear-gradient(160deg,#0c1624_0%,#111827_48%,#1f2937_100%)]" />
      <div className="pointer-events-none absolute -left-28 top-28 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-10 h-80 w-80 rounded-full bg-teal-300/20 blur-3xl" />

      <div className="relative w-full pb-0">
        <header className="prado-fade-up relative w-full border-b border-white/20 bg-white/8 px-6 py-3 backdrop-blur-md sm:px-8 lg:px-10">
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3">
            <div className="flex items-center">
              <img src="/logo.webp" alt="Prado Commerce" className="h-5 w-auto" />
            </div>

            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-cyan-300/10 text-cyan-100 outline-none ring-0 ring-offset-0 transition hover:bg-cyan-300/20 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 sm:hidden"
              aria-label="Open menu"
              aria-expanded={isMobileMenuOpen}
              aria-controls="public-mobile-menu"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu size={18} />
            </button>

            <div className="hidden items-center gap-2 sm:flex">
              <Link
                href="/pricing"
                className="px-2 py-1.5 text-xs font-semibold text-cyan-100/90 transition hover:text-cyan-50"
                onClick={closeMobileMenu}
              >
                Pricing
              </Link>
              <Link
                href="/dashboard"
                className="px-2 py-1.5 text-xs font-semibold text-cyan-100/90 transition hover:text-cyan-50"
                onClick={closeMobileMenu}
              >
                Dashboard
              </Link>
              <Link
                href="/signup"
                className="rounded-full bg-cyan-300 px-4 py-1.5 text-xs font-semibold text-slate-900 transition hover:bg-cyan-200"
                onClick={closeMobileMenu}
              >
                Start free
              </Link>
            </div>
          </div>
        </header>

        <button
          type="button"
          onClick={closeMobileMenu}
          aria-label="Close mobile menu overlay"
          className={`fixed inset-0 z-40 bg-slate-950/45 transition-opacity sm:hidden ${
            isMobileMenuOpen ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
        />

        <aside
          id="public-mobile-menu"
          aria-hidden={!isMobileMenuOpen}
          className={`fixed right-0 top-0 z-50 flex h-full w-[84vw] max-w-xs flex-col border-l border-cyan-100/20 bg-[#020617] p-5 opacity-100 shadow-[0_28px_80px_rgba(2,6,23,0.55)] transition-transform duration-300 sm:hidden ${
            isMobileMenuOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100">Menu</span>
            <button
              type="button"
              onClick={closeMobileMenu}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-cyan-200/45 bg-cyan-300/10 text-cyan-100 transition hover:bg-cyan-300/20"
              aria-label="Close menu"
            >
              <X size={18} />
            </button>
          </div>

          <nav className="mt-6 flex flex-1 flex-col gap-2">
            <Link
              href="/pricing"
              className="px-1 py-2 text-sm font-semibold text-cyan-100/90 transition hover:text-cyan-50"
              onClick={closeMobileMenu}
            >
              Pricing
            </Link>
            <Link
              href="/dashboard"
              className="px-1 py-2 text-sm font-semibold text-cyan-100/90 transition hover:text-cyan-50"
              onClick={closeMobileMenu}
            >
              Dashboard
            </Link>
            <Link
              href="/signup"
              className="rounded-xl bg-cyan-300 px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-cyan-200"
              onClick={closeMobileMenu}
            >
              Start free
            </Link>
          </nav>
        </aside>

        <section className="mt-14 w-full px-6 sm:px-8 lg:px-10">
          <div className="mx-auto grid w-full max-w-6xl gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
            <div className="prado-fade-up prado-delay-1">
              <p className="inline-flex rounded-full border border-teal-100/30 bg-teal-200/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-teal-100">
                Free Starter plan · $0/month
              </p>
              <h1 className="mt-5 max-w-xl text-balance text-4xl font-semibold leading-[1.05] tracking-tight text-white sm:text-6xl lg:text-7xl">
                Build storefront velocity without platform chaos.
              </h1>
              <p className="mt-6 max-w-xl text-pretty text-lg leading-8 text-slate-200/90">
                Prado Commerce gives you one control plane for stores, products, and embeddable cart flows. Ship features faster and more secure checkouts.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Link
                  href="/pricing"
                  className="inline-flex items-center justify-center rounded-full border border-cyan-200/35 bg-cyan-300/10 px-6 py-3 text-sm font-semibold text-cyan-100 transition hover:border-cyan-200/55 hover:bg-cyan-300/20"
                >
                  View pricing
                </Link>
                <Link
                  href="/signup"
                  className="inline-flex items-center justify-center rounded-full bg-cyan-300 px-6 py-3 text-sm font-semibold text-slate-900 transition hover:bg-cyan-200"
                >
                  Start free
                </Link>
              </div>
            </div>

            <aside className="prado-fade-up prado-delay-2">
              <img
                src="/laptop.webp"
                alt="Storefront dashboard running on Prado Commerce"
                className="ml-auto h-auto w-[118%] max-w-none -translate-x-14 sm:w-[126%] sm:-translate-x-20 lg:w-[138%] lg:-translate-x-32"
              />
            </aside>
          </div>
        </section>

        <section className="prado-fade-up mx-auto mt-24 w-full max-w-6xl px-6 sm:px-8 lg:px-10">
          <div className="max-w-3xl">
            <p className="inline-flex rounded-full border border-teal-100/40 bg-teal-200/12 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-teal-100">
              The friction most teams hit
            </p>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              Growth should increase confidence, not operational chaos.
            </h2>
            <p className="mt-3 text-sm leading-7 text-slate-200/85 sm:text-base">
              Most commerce teams are not blocked by ideas. They are blocked by fragile systems, disconnected data, and checkout friction that quietly kills conversions.
            </p>
          </div>

          <div className="mt-7 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {frictionStories.map((story) => (
              <article
                key={story.title}
                className="overflow-hidden rounded-xl border border-white/12 bg-white/8 backdrop-blur-sm"
              >
                <div className="overflow-hidden border border-white/20 bg-slate-900/40">
                  <img
                    src={story.image}
                    alt={story.title}
                    className="h-44 w-full object-cover object-center"
                    loading="lazy"
                  />
                </div>
                <div className="p-4">
                  <h3 className="text-base font-semibold text-teal-100">{story.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-200/85">{story.detail}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="prado-fade-up mx-auto mt-24 w-full max-w-6xl px-6 pb-8 sm:px-8 lg:px-10">
          <div className="rounded-xl border border-cyan-200/25 bg-cyan-300/8 p-6 backdrop-blur-sm sm:p-8">
            <p className="inline-flex rounded-full border border-cyan-100/35 bg-cyan-200/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-cyan-100">
              Why Prado Commerce
            </p>
            <h2 className="mt-4 max-w-3xl text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              Helping all kinds of businesses connect products to the world, strengthen online presence, and grow revenue.
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-200/85 sm:text-base">
              Prado Commerce gives teams the tools to launch faster, sell smarter, and scale without rebuilding their commerce stack each time they grow.
            </p>

            <div className="mt-6">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-100">
                  Why customers choose us
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={goToPrevious}
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-cyan-200/35 bg-cyan-300/10 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/20"
                    aria-label="View previous story"
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    onClick={goToNext}
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-cyan-200/35 bg-cyan-300/10 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/20"
                    aria-label="View next story"
                  >
                    →
                  </button>
                </div>
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
                <div className="overflow-hidden rounded-xl bg-slate-900/40">
                  <div className="h-56 w-full animate-[fadeIn_0.45s_ease-out] sm:h-72 lg:h-[320px]">
                    <img
                      key={activeBenefit.title}
                      src={activeBenefit.image}
                      alt={`${activeBenefit.title} illustration`}
                      className="h-full w-full object-cover object-center"
                      loading="lazy"
                    />
                  </div>
                </div>

                <div className="flex flex-col justify-start animate-[fadeIn_0.45s_ease-out]">
                  <h3 className="text-lg font-semibold text-cyan-100">{activeBenefit.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-200/85">{activeBenefit.detail}</p>

                  <div className="mt-6 flex items-center gap-2">
                    {businessBenefits.map((benefit, index) => (
                      <button
                        key={benefit.title}
                        type="button"
                        onClick={() => setActiveIndex(index)}
                        className={`h-2.5 rounded-full transition ${
                          index === activeIndex ? "w-8 bg-cyan-300" : "w-2.5 bg-white/35"
                        }`}
                        aria-label={`View ${benefit.title}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="prado-fade-up mx-auto mt-24 w-full max-w-6xl px-6 pb-12 sm:px-8 lg:px-10">
          <div className="rounded-xl border border-teal-200/30 bg-gradient-to-r from-cyan-300/15 via-teal-300/12 to-emerald-300/12 p-6 shadow-[0_18px_45px_rgba(8,47,73,0.35)] sm:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-3xl">
                <p className="inline-flex rounded-full border border-teal-100/35 bg-teal-200/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-teal-100">
                  Start Today
                </p>
                <h2 className="mt-4 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                  Ready to grow with Prado Commerce?
                </h2>
                <p className="mt-3 text-sm leading-7 text-slate-100/90 sm:text-base">
                  Launch your storefront, connect your products to global customers, and build a stronger online presence with Prado Commerce.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link
                  href="/signup"
                  className="inline-flex items-center justify-center rounded-full bg-cyan-300 px-6 py-3 text-sm font-semibold text-slate-900 transition hover:bg-cyan-200"
                >
                  Start free
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
