import Link from "next/link";

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await searchParams;
  const plan = typeof resolvedSearchParams.plan === "string" ? resolvedSearchParams.plan : "Pro";
  const interval = typeof resolvedSearchParams.interval === "string" ? resolvedSearchParams.interval : "month";
  const status = typeof resolvedSearchParams.status === "string" ? resolvedSearchParams.status : "pending";

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0c1624] px-6 py-16 text-slate-100">
      <div className="w-full max-w-xl rounded-2xl border border-white/15 bg-white/10 p-8 shadow-[0_24px_60px_rgba(2,6,23,0.35)] backdrop-blur-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-100">
          {status === "unavailable" ? "Checkout setup pending" : "Checkout"}
        </p>
        <h1 className="mt-4 text-3xl font-semibold text-white">
          Your {plan} plan checkout is being prepared.
        </h1>
        <p className="mt-4 text-base leading-7 text-slate-200/90">
          We’re routing your selection through the checkout flow now. If Stripe credentials are not configured yet,
          this page will keep the experience in place until the billing connection is ready.
        </p>
        <p className="mt-3 text-sm text-slate-300">
          Selected billing: <span className="font-semibold text-white">{interval === "year" ? "Annual" : "Monthly"}</span>
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/pricing"
            className="rounded-full bg-cyan-300 px-5 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-cyan-200"
          >
            Back to pricing
          </Link>
          <Link
            href="/signup"
            className="rounded-full border border-white/20 px-5 py-2.5 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
          >
            Create account
          </Link>
        </div>
      </div>
    </main>
  );
}
