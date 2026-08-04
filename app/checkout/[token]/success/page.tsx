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
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-16 text-slate-900">
      <div className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-emerald-700">Order confirmed</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">Thank you for your purchase</h1>
        <p className="mt-2 text-base leading-7 text-slate-600">
          Your order has been placed successfully. We’ll keep you updated by email as it moves through fulfillment.
        </p>

        <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Order number</p>
              <p className="text-lg font-semibold text-slate-900">#{orderNumber ?? "—"}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-500">Total paid</p>
              <p className="text-lg font-semibold text-slate-900">{currency ?? "USD"} {total ?? "0.00"}</p>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/" className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800">
            Back to storefront
          </Link>
        </div>
      </div>
    </main>
  );
}
