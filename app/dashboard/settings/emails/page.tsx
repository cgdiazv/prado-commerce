"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type StoreEmailSettings = {
  id: string;
  welcomeEmailEnabled?: boolean;
  orderConfirmationEmailEnabled?: boolean;
  invoiceEmailEnabled?: boolean;
  senderName?: string | null;
  senderEmail?: string | null;
  replyToEmail?: string | null;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function EmailSettingsPage() {
  const router = useRouter();
  const [storeId, setStoreId] = useState("");
  const [welcomeEmailEnabled, setWelcomeEmailEnabled] = useState(false);
  const [orderConfirmationEmailEnabled, setOrderConfirmationEmailEnabled] = useState(false);
  const [invoiceEmailEnabled, setInvoiceEmailEnabled] = useState(false);
  const [senderName, setSenderName] = useState("");
  const [senderEmail, setSenderEmail] = useState("");
  const [replyToEmail, setReplyToEmail] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    async function loadStoreSettings() {
      try {
        const response = await fetch("/api/stores", { cache: "no-store" });
        const payload = (await response.json()) as
          | StoreEmailSettings[]
          | { error?: string };

        if (!response.ok) {
          const apiError =
            typeof payload === "object" && payload !== null && "error" in payload
              ? (payload as { error?: string }).error
              : null;

          throw new Error(apiError || "Unable to load email settings.");
        }

        const stores = payload as StoreEmailSettings[];
        const activeStore = Array.isArray(stores) ? stores[0] : null;

        if (!activeStore?.id) {
          throw new Error("No store found. Create a store first to manage email settings.");
        }

        setStoreId(activeStore.id);
        setWelcomeEmailEnabled(Boolean(activeStore.welcomeEmailEnabled));
        setOrderConfirmationEmailEnabled(Boolean(activeStore.orderConfirmationEmailEnabled));
        setInvoiceEmailEnabled(Boolean(activeStore.invoiceEmailEnabled));
        setSenderName(activeStore.senderName ?? "");
        setSenderEmail(activeStore.senderEmail ?? "");
        setReplyToEmail(activeStore.replyToEmail ?? "");
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Unable to load email settings.");
      }
    }

    void loadStoreSettings();
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      if (!storeId) {
        throw new Error("No store found. Create a store first to manage email settings.");
      }

      if (senderEmail.trim() && !EMAIL_REGEX.test(senderEmail.trim())) {
        throw new Error("Sender email must be a valid email address.");
      }

      if (replyToEmail.trim() && !EMAIL_REGEX.test(replyToEmail.trim())) {
        throw new Error("Reply-to email must be a valid email address.");
      }

      const response = await fetch(`/api/stores/${storeId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          welcomeEmailEnabled,
          orderConfirmationEmailEnabled,
          invoiceEmailEnabled,
          senderName,
          senderEmail,
          replyToEmail,
        }),
      });

      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(result.error || "Unable to save email settings.");
      }

      setSuccess("Email settings saved.");
      router.refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save email settings.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
            Settings
          </p>
          <h1 className="mt-4 text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">
            Emails
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
            Configure buyer welcome emails, order confirmations, and invoice emails for your storefront.
          </p>
        </div>

        <Link
          href="/dashboard/settings"
          className="inline-flex shrink-0 items-center rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          ← Back to settings
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="space-y-5">
          {error ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          {success ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {success}
            </div>
          ) : null}

          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            Delivery status: Emails are live through Resend. Configure RESEND_API_KEY in your environment and emails will be sent from notifications@indevasa.com using your store branding color.
          </div>

          <div>
            <h2 className="text-sm font-semibold text-slate-900">Automation</h2>
            <p className="mt-1 text-sm text-slate-500">Turn each buyer-facing email on or off.</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <span className="text-sm font-medium text-slate-800">Welcome email</span>
                <input
                  type="checkbox"
                  checked={welcomeEmailEnabled}
                  onChange={(event) => setWelcomeEmailEnabled(event.target.checked)}
                  className="h-4 w-4 accent-slate-900"
                />
              </label>

              <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <span className="text-sm font-medium text-slate-800">Order confirmation</span>
                <input
                  type="checkbox"
                  checked={orderConfirmationEmailEnabled}
                  onChange={(event) => setOrderConfirmationEmailEnabled(event.target.checked)}
                  className="h-4 w-4 accent-slate-900"
                />
              </label>

              <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <span className="text-sm font-medium text-slate-800">Invoice email</span>
                <input
                  type="checkbox"
                  checked={invoiceEmailEnabled}
                  onChange={(event) => setInvoiceEmailEnabled(event.target.checked)}
                  className="h-4 w-4 accent-slate-900"
                />
              </label>
            </div>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-slate-900">Sender identity</h2>
            <p className="mt-1 text-sm text-slate-500">Choose how these emails will appear in buyer inboxes.</p>
            <div className="mt-3 grid gap-4 sm:grid-cols-3">
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-slate-700">Sender name</span>
                <input
                  value={senderName}
                  onChange={(event) => setSenderName(event.target.value)}
                  placeholder="Your Store Team"
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-slate-700">Sender email</span>
                <input
                  type="email"
                  value={senderEmail}
                  onChange={(event) => setSenderEmail(event.target.value)}
                  placeholder="hello@yourstore.com"
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-slate-700">Reply-to email</span>
                <input
                  type="email"
                  value={replyToEmail}
                  onChange={(event) => setReplyToEmail(event.target.value)}
                  placeholder="support@yourstore.com"
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
                />
              </label>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Link
            href="/dashboard/settings"
            className="rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSaving || !storeId}
            className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSaving ? "Saving..." : "Save email settings"}
          </button>
        </div>
      </form>
    </section>
  );
}
