"use client";

import { useState } from "react";

export function RequestActions({ requestId }: { requestId: string }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [setupUrl, setSetupUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerateLink() {
    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch(`/api/account-requests/approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: requestId }),
      });

      const result = (await response.json()) as {
        error?: string;
        setupPath?: string;
      };

      if (!response.ok || !result.setupPath) {
        throw new Error(result.error || "Could not generate onboarding link");
      }

      setSetupUrl(new URL(result.setupPath, window.location.origin).toString());
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Could not generate onboarding link",
      );
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleCopyLink() {
    if (!setupUrl) {
      return;
    }

    await navigator.clipboard.writeText(setupUrl);
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleGenerateLink}
        disabled={isGenerating}
        className="inline-flex rounded-full border border-cyan-200/40 bg-cyan-50 px-3 py-1.5 text-xs font-semibold text-cyan-800 transition hover:bg-cyan-100 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isGenerating ? "Generating..." : setupUrl ? "Resend onboarding link" : "Generate onboarding link"}
      </button>

      {setupUrl ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
          <p className="font-semibold text-slate-900">Onboarding link</p>
          <p className="mt-1 break-all">{setupUrl}</p>
          <button
            type="button"
            onClick={handleCopyLink}
            className="mt-2 text-xs font-semibold text-cyan-700 transition hover:text-cyan-900"
          >
            Copy link
          </button>
        </div>
      ) : null}

      {error ? <p className="text-xs text-rose-600">{error}</p> : null}
    </div>
  );
}