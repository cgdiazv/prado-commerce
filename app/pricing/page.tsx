"use client";

import { useState, type MouseEvent } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { PradoLogo } from "@/components/PradoLogo";

type Tier = {
  name: "Starter" | "Pro" | "Enterprise";
  monthlyPriceLabel: string;
  annualPriceLabel: string;
  annualBillingLabel: string;
  feeLabel: string;
  audience: string;
  stores: string;
  products: string;
  customDomains: string;
  checkoutExperience: string;
  apiRateLimits: string;
  integrations: string;
  ctaHref: string;
  ctaLabel: string;
  ctaSubLabel?: string;
  highlighted?: boolean;
};

type BillingMode = "monthly" | "annual";

const STRIPE_PRICE_MAP = {
  PRO: {
    month: "price_1U0XARCXrIvkbezejpM4WVVJ",
    year: "price_1U0XBhCXrIvkbezewGe2bIyL",
  },
  ENTERPRISE: {
    month: "price_1U0XDnCXrIvkbezesLCOvRau",
    year: "price_1U0XETCXrIvkbeze6GNZYBDt",
  },
};

const tiers: Tier[] = [
  {
    name: "Starter",
    monthlyPriceLabel: "$0 / mo",
    annualPriceLabel: "$0 / yr",
    annualBillingLabel: "Free on annual billing",
    feeLabel: "+ 2% platform transaction fee",
    audience: "Individual creators and small shops testing custom sites.",
    stores: "1 store",
    products: "Up to 50 products",
    customDomains: "Not included (Prado Commerce subdomains only)",
    checkoutExperience: "Basic embedded checkout",
    apiRateLimits: "60 requests / minute",
    integrations: "Basic webhooks",
    ctaHref: "/signup",
    ctaLabel: "Start free",
    ctaSubLabel: "No credit card required",
  },
  {
    name: "Pro",
    monthlyPriceLabel: "$49 / mo",
    annualPriceLabel: "$39 / mo",
    annualBillingLabel: "Billed yearly as $468",
    feeLabel: "+ 0.5% transaction fee",
    audience: "Scaling merchants, agencies, and medium storefront teams.",
    stores: "Up to 5 stores",
    products: "Unlimited products",
    customDomains: "Included (for example checkout.yourbrand.com)",
    checkoutExperience: "Embedded checkout + custom CSS styling",
    apiRateLimits: "1,000 requests / minute",
    integrations: "Stripe Connect, webhooks, CSV sync",
    ctaHref: "/signup",
    ctaLabel: "Choose Pro",
    highlighted: true,
  },
  {
    name: "Enterprise",
    monthlyPriceLabel: "$199 / mo",
    annualPriceLabel: "$159 / mo",
    annualBillingLabel: "Billed yearly as $1,908",
    feeLabel: "0% transaction fee",
    audience: "High-volume brands and POS-integrated operations.",
    stores: "Unlimited stores",
    products: "Unlimited products",
    customDomains: "Multiple custom domains",
    checkoutExperience: "White-labeled and headless checkout workflows",
    apiRateLimits: "Dedicated edge throughput",
    integrations: "Payment, POS and Carriers",
    ctaHref: "/signup",
    ctaLabel: "Choose Enterprise",
  },
];

const comparisonRows: Array<{ label: string; values: [string, string, string] }> = [
  { label: "Monthly billing", values: ["$0", "$49", "$199"] },
  { label: "Annual billing", values: ["$0", "$39/mo ($468/yr)", "$159/mo ($1,908/yr)"] },
  { label: "Platform fee", values: ["2%", "0.5%", "0%"] },
  { label: "Active stores", values: ["1", "Up to 5", "Unlimited"] },
  { label: "Products", values: ["Up to 50", "Unlimited", "Unlimited"] },
  {
    label: "Custom domains",
    values: ["Not included", "Included", "Included (multiple)"],
  },
  {
    label: "API limits",
    values: ["60 req/min", "1,000 req/min", "Dedicated throughput"],
  },
];

export default function PricingPage() {
  const [billingMode, setBillingMode] = useState<BillingMode>("monthly");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const handleUpgrade = async (event: MouseEvent<HTMLAnchorElement>, tier: Tier) => {
    if (tier.name === "Starter") {
      return;
    }

    event.preventDefault();

    const plan = tier.name.toUpperCase() as keyof typeof STRIPE_PRICE_MAP;
    const interval = billingMode === "annual" ? "year" : "month";

    const response = await fetch("/api/billing/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan, interval }),
    });

    const data = await response.json();

    if (data?.url) {
      window.location.assign(data.url);
    } else {
      const query = new URLSearchParams({
        plan: tier.name,
        interval,
        status: data?.error ? "unavailable" : "pending",
      });
      window.location.assign(`/checkout?${query.toString()}`);
    }
  };

  return (
    <main data-route-kind="pricing" className="relative isolate min-h-screen overflow-hidden bg-[#0c1624] text-slate-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_10%,rgba(14,165,233,0.33),transparent_36%),radial-gradient(circle_at_84%_0%,rgba(45,212,191,0.27),transparent_32%),linear-gradient(160deg,#0c1624_0%,#111827_48%,#1f2937_100%)]" />
      <div className="pointer-events-none absolute -left-28 top-28 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-10 h-80 w-80 rounded-full bg-teal-300/20 blur-3xl" />

      <div className="relative mx-auto w-full max-w-6xl px-6 pb-12 pt-8 sm:px-8 lg:px-10">
        <header className="prado-fade-up relative flex items-center justify-between gap-3">
          <Link href="/" className="inline-flex items-center">
            <PradoLogo theme="dark" subtitle="Unified E-Commerce" size="md" />
          </Link>

          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-cyan-300/10 text-cyan-100 outline-none ring-0 ring-offset-0 transition hover:bg-cyan-300/20 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 sm:hidden"
            aria-label="Open menu"
            aria-expanded={isMobileMenuOpen}
            aria-controls="pricing-mobile-menu"
            onClick={() => setIsMobileMenuOpen(true)}
          >
            <Menu size={18} />
          </button>

          <div className="hidden items-center gap-2 sm:flex">
            <Link
              href="/"
              className="rounded-full border border-cyan-200/40 bg-cyan-300/12 px-4 py-1.5 text-xs font-semibold text-cyan-100 transition hover:bg-cyan-300/20"
              onClick={closeMobileMenu}
            >
              Home
            </Link>
            <Link
              href="/signup"
              className="rounded-full bg-cyan-300 px-4 py-1.5 text-xs font-semibold text-slate-900 transition hover:bg-cyan-200"
              onClick={closeMobileMenu}
            >
              Start free
            </Link>
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
          id="pricing-mobile-menu"
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
              href="/"
              className="rounded-xl border border-cyan-100/20 bg-cyan-300/10 px-4 py-3 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/20"
              onClick={closeMobileMenu}
            >
              Home
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

        <section className="prado-fade-up prado-delay-1 mt-10 max-w-5xl">
          <p className="inline-flex rounded-full border border-teal-100/30 bg-teal-200/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-teal-100">
            Pricing
          </p>
          <h1 className="mt-5 max-w-4xl text-balance text-4xl font-semibold leading-[1.05] tracking-tight text-white sm:text-6xl">
            Plans that scale with every Prado Commerce storefront.
          </h1>
          <p className="mt-5 max-w-4xl text-base leading-8 text-slate-200/90 sm:text-lg">
            Start for free with Starter, unlock growth with Pro, and run advanced operations with Enterprise.
            Every tier includes core checkout and storefront capabilities.
          </p>

          <div className="mt-24 inline-flex items-center gap-1 rounded-full border border-cyan-200/35 bg-cyan-300/10 p-1">
            <button
              type="button"
              onClick={() => setBillingMode("monthly")}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] transition ${
                billingMode === "monthly"
                  ? "bg-cyan-300 text-slate-900"
                  : "text-cyan-100 hover:bg-cyan-300/20"
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setBillingMode("annual")}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] transition ${
                billingMode === "annual"
                  ? "bg-cyan-300 text-slate-900"
                  : "text-cyan-100 hover:bg-cyan-300/20"
              }`}
            >
              Annual
            </button>
            <span className="px-2 text-xs font-semibold text-teal-100">Save about 20% (2 months free)</span>
          </div>
        </section>

        <section className="mt-8 mb-24 grid gap-4 lg:grid-cols-3">
          {tiers.map((tier) => (
            <article
              key={tier.name}
              className={`flex h-full flex-col rounded-xl border p-5 shadow-[0_16px_40px_rgba(2,6,23,0.35)] backdrop-blur-sm ${
                tier.highlighted
                  ? "border-cyan-200/50 bg-cyan-300/10"
                  : "border-white/20 bg-white/8"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xl font-semibold text-white">{tier.name}</h2>
                {tier.highlighted ? (
                  <span className="rounded-full border border-cyan-200/40 bg-cyan-300/20 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-cyan-100">
                    Most popular
                  </span>
                ) : null}
              </div>

              <p className="mt-4 text-3xl font-semibold tracking-tight text-white">
                {billingMode === "monthly" ? tier.monthlyPriceLabel : tier.annualPriceLabel}
              </p>
              {billingMode === "annual" ? (
                <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-teal-100">{tier.annualBillingLabel}</p>
              ) : null}
              <p className="mt-1 text-sm text-slate-200/85">{tier.feeLabel}</p>
              <p className="mt-4 text-sm leading-6 text-slate-200/90">{tier.audience}</p>

              <dl className="mt-5 space-y-3 text-sm">
                <div className="grid grid-cols-[9rem_1fr] gap-3 border-b border-white/12 pb-2">
                  <dt className="text-slate-300">Active stores</dt>
                  <dd className="text-slate-100">{tier.stores}</dd>
                </div>
                <div className="grid grid-cols-[9rem_1fr] gap-3 border-b border-white/12 pb-2">
                  <dt className="text-slate-300">Products</dt>
                  <dd className="text-slate-100">{tier.products}</dd>
                </div>
                <div className="grid grid-cols-[9rem_1fr] gap-3 border-b border-white/12 pb-2">
                  <dt className="text-slate-300">Custom domains</dt>
                  <dd className="text-slate-100">{tier.customDomains}</dd>
                </div>
                <div className="grid grid-cols-[9rem_1fr] gap-3 border-b border-white/12 pb-2">
                  <dt className="text-slate-300">Embeddable checkout</dt>
                  <dd className="text-slate-100">{tier.checkoutExperience}</dd>
                </div>
                <div className="grid grid-cols-[9rem_1fr] gap-3 border-b border-white/12 pb-2">
                  <dt className="text-slate-300">API rate limits</dt>
                  <dd className="text-slate-100">{tier.apiRateLimits}</dd>
                </div>
                <div className="grid grid-cols-[9rem_1fr] gap-3">
                  <dt className="text-slate-300">Integrations</dt>
                  <dd className="text-slate-100">{tier.integrations}</dd>
                </div>
              </dl>

              <Link
                href={tier.ctaHref}
                onClick={(event) => {
                  void handleUpgrade(event, tier);
                }}
                className={`mt-auto inline-flex w-full items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold transition ${
                  tier.highlighted
                    ? "bg-cyan-300 text-slate-900 hover:bg-cyan-200"
                    : "border border-white/25 text-slate-100 hover:border-white/40 hover:bg-white/8"
                }`}
              >
                {tier.ctaSubLabel ? (
                  <span className="flex flex-col items-center leading-tight">
                    <span>{tier.ctaLabel}</span>
                    <span className="mt-0.5 text-[11px] font-medium uppercase tracking-[0.08em] opacity-85">
                      {tier.ctaSubLabel}
                    </span>
                  </span>
                ) : (
                  tier.ctaLabel
                )}
              </Link>
            </article>
          ))}
        </section>

        <section className="mt-8 overflow-hidden rounded-xl border border-white/20 bg-white/8 shadow-[0_18px_45px_rgba(8,47,73,0.35)] backdrop-blur-sm">
          <div className="border-b border-white/15 px-4 py-3 sm:px-6">
            <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-cyan-100">Quick comparison</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-white/15 text-sm">
              <thead className="bg-slate-950/35">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-300 sm:px-6">Feature</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-300">Starter</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-300">Pro</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-300">Enterprise</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10 bg-white/[0.03]">
                {comparisonRows.map((row) => (
                  <tr key={row.label}>
                    <td className="px-4 py-3 text-slate-200 sm:px-6">{row.label}</td>
                    <td className="px-4 py-3 text-slate-100">{row.values[0]}</td>
                    <td className="px-4 py-3 text-slate-100">{row.values[1]}</td>
                    <td className="px-4 py-3 text-slate-100">{row.values[2]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

      </div>
    </main>
  );
}
