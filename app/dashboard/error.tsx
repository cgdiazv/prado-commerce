"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, RefreshCw, Home, Copy, Check } from "lucide-react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    console.error("[DASHBOARD_ERROR_BOUNDARY]", error);
  }, [error]);

  const isGenericServerComponentError =
    !error?.message ||
    error.message.includes("Server Components render") ||
    error.message.includes("omitted in production");

  const displayMessage = isGenericServerComponentError
    ? "We encountered a temporary connection issue while loading this view. This usually resolves in a few moments after a quick refresh."
    : error.message;

  const handleCopyDigest = () => {
    if (error.digest) {
      void navigator.clipboard.writeText(error.digest);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRetry = () => {
    try {
      reset();
    } catch {
      window.location.reload();
    }
  };

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center p-6 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 shadow-sm">
        <AlertCircle className="h-7 w-7" />
      </div>

      <h2 className="mt-4 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
        Temporary Connection Delay
      </h2>
      <p className="mt-2 max-w-md text-sm text-slate-600 leading-relaxed">
        {displayMessage}
      </p>

      {error.digest ? (
        <div className="mt-3 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-500">
          <span>
            Error Reference: <code className="font-mono font-semibold text-slate-700">{error.digest}</code>
          </span>
          <button
            type="button"
            onClick={handleCopyDigest}
            className="inline-flex items-center text-slate-400 hover:text-slate-700 transition"
            title="Copy reference code"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
        </div>
      ) : null}

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={handleRetry}
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

