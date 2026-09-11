"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertCircle, RefreshCw, Home } from "lucide-react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[DASHBOARD_ERROR_BOUNDARY]", error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center p-6 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 border border-amber-200">
        <AlertCircle className="h-7 w-7" />
      </div>

      <h2 className="mt-4 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
        Something went wrong
      </h2>
      <p className="mt-2 max-w-md text-sm text-slate-600 leading-relaxed">
        We encountered a temporary issue while loading this dashboard view. This can happen during high database concurrency or connectivity reconnects.
      </p>

      {error.message ? (
        <p className="mt-3 max-w-lg rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-mono text-slate-700 break-all">
          {error.message}
        </p>
      ) : null}

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
        >
          <RefreshCw className="h-4 w-4" />
          Try again
        </button>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          <Home className="h-4 w-4" />
          Dashboard Overview
        </Link>
      </div>
    </div>
  );
}
