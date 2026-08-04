"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const cancellationReasons = [
  { value: "too_expensive", label: "Too expensive" },
  { value: "missing_features", label: "Missing features" },
  { value: "switching_platform", label: "Switching to another platform" },
  { value: "just_testing", label: "Just testing" },
  { value: "other", label: "Other" },
] as const;

export function DeleteAccountPanel() {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedReason, setSelectedReason] = useState<(typeof cancellationReasons)[number]["value"]>("other");
  const [details, setDetails] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDeleteAccount() {
    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/delete-account", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reason: selectedReason,
          details: details.trim(),
        }),
      });

      if (!response.ok) {
        const result = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(result?.error ?? "Unable to delete your account right now.");
      }

      router.replace("/login");
      router.refresh();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Unable to delete your account right now.");
      setIsDeleting(false);
    }
  }

  return (
    <article className="rounded-xl border border-rose-200 bg-rose-50/70 p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-2xl">
          <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-rose-700">Delete account</h2>
          <p className="mt-2 text-sm text-rose-800">
            Permanently remove your Prado Commerce account and all associated storefront data. This action cannot be undone.
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-rose-200 bg-white/80 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-600">
            If you no longer need this workspace, you can delete your account from here.
          </p>

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            disabled={isDeleting}
            className="inline-flex items-center justify-center rounded-full border border-rose-300 bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isDeleting ? "Deleting account..." : "Delete account"}
          </button>
        </div>
      </div>

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 py-6">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-950">Why are you leaving Prado Commerce?</h3>
                <p className="mt-2 text-sm text-slate-600">
                  Help us improve by sharing the main reason for canceling. This is optional, but it helps us understand what to improve.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="mt-5 space-y-3">
              {cancellationReasons.map((reason) => (
                <label key={reason.value} className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700">
                  <input
                    type="radio"
                    name="cancel-reason"
                    checked={selectedReason === reason.value}
                    onChange={() => setSelectedReason(reason.value)}
                    className="h-4 w-4 border-slate-300 text-rose-600 focus:ring-rose-500"
                  />
                  <span>{reason.label}</span>
                </label>
              ))}
            </div>

            <label className="mt-5 block text-sm text-slate-700">
              <span className="font-medium">Tell us more</span>
              <textarea
                value={details}
                onChange={(event) => setDetails(event.target.value)}
                rows={4}
                placeholder="Share any details that would help us improve."
                className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-400"
              />
            </label>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-full border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={isDeleting}
                className="rounded-full border border-rose-300 bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isDeleting ? "Deleting account..." : "Delete account permanently"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </div>
      ) : null}
    </article>
  );
}
