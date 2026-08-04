import Link from "next/link";

type SuccessPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CheckoutSuccessPage({ searchParams }: SuccessPageProps) {
  const resolvedSearchParams = await searchParams;
  const orderNumber = resolvedSearchParams.orderNumber;
  const total = resolvedSearchParams.total;
  const currency = resolvedSearchParams.currency;

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-16 text-slate-100">
      <div className="w-full max-w-xl rounded-3xl border border-emerald-500/20 bg-emerald-500/10 p-8 shadow-[0_24px_60px_rgba(2,6,23,0.35)] backdrop-blur-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-emerald-200">Order confirmed</p>
        <h1 className="mt-4 text-3xl font-semibold text-white">Thank you for your purchase</h1>
        <p className="mt-3 text-base leading-7 text-slate-300">
          Your order has been placed successfully. We’ll keep you updated by email as it moves through fulfillment.
        </p>

        <div className="mt-8 rounded-2xl border border-white/10 bg-slate-900/60 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Order number</p>
              <p className="text-lg font-semibold text-white">#{orderNumber ?? "—"}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-400">Total paid</p>
              <p className="text-lg font-semibold text-white">{currency ?? "USD"} {total ?? "0.00"}</p>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/" className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-100">
            Back to storefront
          </Link>
        </div>
      </div>
    </main>
  );
}
