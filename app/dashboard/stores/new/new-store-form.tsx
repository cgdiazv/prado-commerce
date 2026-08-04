"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CURRENCIES, Field, SelectField, TIMEZONES } from "../../stores-dashboard";

type NewStoreFormProps = {
  currentPlan: "STARTER" | "PRO" | "ENTERPRISE";
  initialStoreCount: number;
  setupError?: string | null;
};

type StoreFormState = {
  name: string;
  slug: string;
  customDomain: string;
  currency: string;
  timezone: string;
  allowedDomains: string;
};

const defaultFormState: StoreFormState = {
  name: "",
  slug: "",
  customDomain: "",
  currency: "USD",
  timezone: "America/New_York",
  allowedDomains: "",
};

function toSlug(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export function NewStoreForm({ currentPlan, initialStoreCount, setupError = null }: NewStoreFormProps) {
  const router = useRouter();
  const [formState, setFormState] = useState<StoreFormState>(defaultFormState);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isStarter = currentPlan === "STARTER";
  const hasReachedStoreLimit = isStarter && initialStoreCount >= 1;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (hasReachedStoreLimit) {
      setError("Starter plan includes 1 active store. Upgrade to Prado Commerce Pro to add more stores.");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const payload = {
        name: formState.name,
        slug: formState.slug,
        customDomain: formState.customDomain || null,
        currency: formState.currency,
        timezone: formState.timezone,
        allowedDomains: formState.allowedDomains
          .split(",")
          .map((domain) => domain.trim())
          .filter(Boolean),
      };

      const response = await fetch("/api/stores", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error ?? "Something went wrong");
      }

      router.push("/dashboard/stores");
      router.refresh();
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Failed to create store");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="overflow-hidden rounded-xl border border-white/70 bg-white/80 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.12)] backdrop-blur">
      {setupError ? (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {setupError}
        </div>
      ) : null}

      {hasReachedStoreLimit ? (
        <div className="mb-6 rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm text-cyan-800">
          Starter plan includes up to 1 active store and does not support custom domains. Upgrade to Prado Commerce Pro to unlock 5 stores and custom domains.
        </div>
      ) : null}

      <div className="mb-6 flex items-center justify-between border-b border-slate-200 pb-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">New store</p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-950">Create a new tenant</h1>
        </div>
        <Link
          href="/dashboard/stores"
          className="rounded-full border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
        >
          Back
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Store name"
            value={formState.name}
            onChange={(value) => {
              setFormState((current) => ({
                ...current,
                name: value,
                slug: current.slug === toSlug(current.name) ? toSlug(value) : current.slug,
              }));
            }}
            placeholder="My Brand"
          />
          <Field
            label="Slug"
            value={formState.slug}
            onChange={(value) => setFormState((current) => ({ ...current, slug: value }))}
            placeholder="my-brand"
          />
          <SelectField
            label="Currency"
            value={formState.currency}
            onChange={(value) => setFormState((current) => ({ ...current, currency: value }))}
            options={CURRENCIES}
          />
          <SelectField
            label="Timezone"
            value={formState.timezone}
            onChange={(value) => setFormState((current) => ({ ...current, timezone: value }))}
            options={TIMEZONES}
          />
          <Field
            label="Custom domain (optional)"
            labelHint="Use a domain you own (for example from GoDaddy). Next steps: 1) Add this exact domain in your DNS provider. 2) Point DNS to your Prado Commerce Storefront. 3) Save this store and open the domain to verify storefront routing."
            value={formState.customDomain}
            onChange={(value) => setFormState((current) => ({ ...current, customDomain: value }))}
            placeholder="checkout.mybrand.com"
            className="sm:col-span-2"
          />
          <Field
            label="Allowed domains (optional)"
            value={formState.allowedDomains}
            onChange={(value) => setFormState((current) => ({ ...current, allowedDomains: value }))}
            placeholder="https://mybrand.com, https://store.mybrand.com"
            className="sm:col-span-2"
          />
        </div>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Link
            href="/dashboard/stores"
            className="rounded-full border border-slate-300 px-5 py-3 text-center text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSaving || hasReachedStoreLimit}
            className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? "Saving..." : "Create store"}
          </button>
        </div>
      </form>
    </section>
  );
}
