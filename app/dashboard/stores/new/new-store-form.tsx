"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { normalizeStoreSlug } from "@/lib/store-slug";
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

type SlugAvailability = {
  slug: string;
  available: boolean;
  reason: string | null;
};

async function getSlugAvailability(slug: string, signal?: AbortSignal) {
  const response = await fetch(`/api/stores/slug-availability?slug=${encodeURIComponent(slug)}`, {
    cache: "no-store",
    signal,
  });
  const result = await response.json() as SlugAvailability & { error?: string };

  if (!response.ok) {
    throw new Error(result.error ?? "Unable to check store URL availability.");
  }

  return result;
}

export function NewStoreForm({ currentPlan, initialStoreCount, setupError = null }: NewStoreFormProps) {
  const router = useRouter();
  const [formState, setFormState] = useState<StoreFormState>(defaultFormState);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [slugCheck, setSlugCheck] = useState<{
    slug: string;
    status: "checking" | "available" | "unavailable" | "error";
    message: string | null;
  } | null>(null);

  const isStarter = currentPlan === "STARTER";
  const hasReachedStoreLimit = isStarter && initialStoreCount >= 1;
  const normalizedSlug = normalizeStoreSlug(formState.slug);
  const currentSlugCheck = slugCheck?.slug === normalizedSlug ? slugCheck : null;

  useEffect(() => {
    if (!normalizedSlug) return;

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSlugCheck({ slug: normalizedSlug, status: "checking", message: null });

      try {
        const result = await getSlugAvailability(normalizedSlug, controller.signal);
        setSlugCheck({
          slug: result.slug,
          status: result.available ? "available" : "unavailable",
          message: result.reason,
        });
      } catch (availabilityError) {
        if (controller.signal.aborted) return;
        setSlugCheck({
          slug: normalizedSlug,
          status: "error",
          message: availabilityError instanceof Error
            ? availabilityError.message
            : "Unable to check store URL availability.",
        });
      }
    }, 350);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [normalizedSlug]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (hasReachedStoreLimit) {
      setError("Starter plan includes 1 active store. Upgrade to Prado Commerce Pro to add more stores.");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const availability = await getSlugAvailability(normalizedSlug);
      setSlugCheck({
        slug: availability.slug,
        status: availability.available ? "available" : "unavailable",
        message: availability.reason,
      });

      if (!availability.available) {
        throw new Error(availability.reason ?? "This store URL is not available.");
      }

      const payload = {
        name: formState.name,
        slug: availability.slug,
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
                slug: current.slug === normalizeStoreSlug(current.name)
                  ? normalizeStoreSlug(value)
                  : current.slug,
              }));
            }}
            placeholder="My Brand"
          />
          <div>
            <Field
              label="Store URL"
              value={formState.slug}
              onChange={(value) => setFormState((current) => ({ ...current, slug: value }))}
              placeholder="my-brand"
            />
            {normalizedSlug ? (
              <div className="mt-2 text-xs">
                <p className="break-all text-slate-500">
                  https://{normalizedSlug}.pradocommerce.com
                </p>
                {currentSlugCheck?.status === "checking" ? (
                  <p className="mt-1 text-slate-500">Checking availability...</p>
                ) : currentSlugCheck?.status === "available" ? (
                  <p className="mt-1 font-medium text-emerald-700">Available</p>
                ) : currentSlugCheck?.status === "unavailable" ? (
                  <p className="mt-1 font-medium text-rose-700">{currentSlugCheck.message}</p>
                ) : currentSlugCheck?.status === "error" ? (
                  <p className="mt-1 font-medium text-amber-700">{currentSlugCheck.message}</p>
                ) : null}
              </div>
            ) : null}
          </div>
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
