"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ExternalLink, Palette, Trash2 } from "lucide-react";
import { buildEmailBrandingStyles, normalizeMainColor } from "@/lib/branding";
import { normalizeStoreSlug } from "@/lib/store-slug";
import { CURRENCIES, Field, SelectField, TIMEZONES } from "../store-form-controls";

type Store = {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
  mainColor?: string;
  heroEyebrow?: string | null;
  customDomain: string | null;
  currency: string;
  timezone: string;
  allowedDomains: string[];
  senderEmail?: string | null;
  shippingOrigin?: unknown;
  invoiceFooterText?: string | null;
  invoicePrefix?: string | null;
  nextInvoiceNumber?: number;
  createdAt: string | Date;
  updatedAt: string | Date;
};

type EditStoreFormProps = {
  store: Store;
  currentPlan?: "STARTER" | "PRO" | "ENTERPRISE";
};

type StoreFormState = {
  name: string;
  slug: string;
  customDomain: string;
  currency: string;
  timezone: string;
  allowedDomains: string;
  email: string;
  phone: string;
  address: string;
  logoUrl: string | null;
  mainColor: string;
  slogan: string;
  invoiceFooterText: string;
  invoicePrefix: string;
  nextInvoiceNumber: number;
};

type DomainSetupNotice = {
  storeId: string;
  storeName: string;
  domain: string;
  status: "valid" | "pending" | "invalid" | "unknown" | null;
};

type SlugAvailability = {
  slug: string;
  available: boolean;
  reason: string | null;
};

function extractOriginContact(shippingOrigin: unknown) {
  let address = "";
  let phone = "";
  if (shippingOrigin && typeof shippingOrigin === "object") {
    const originObj = shippingOrigin as Record<string, unknown>;
    if (typeof originObj.address === "string") address = originObj.address;
    if (typeof originObj.phone === "string") phone = originObj.phone;
  }
  return { address, phone };
}

async function getSlugAvailability(slug: string, signal?: AbortSignal) {
  const response = await fetch(`/api/stores/slug-availability?slug=${encodeURIComponent(slug)}`, {
    cache: "no-store",
    signal,
  });
  const result = (await response.json()) as SlugAvailability & { error?: string };

  if (!response.ok) {
    throw new Error(result.error ?? "Unable to check store URL availability.");
  }

  return result;
}

export function EditStoreForm({ store, currentPlan = "STARTER" }: EditStoreFormProps) {
  const router = useRouter();
  const initialContact = extractOriginContact(store.shippingOrigin);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  const [formState, setFormState] = useState<StoreFormState>({
    name: store.name,
    slug: store.slug,
    customDomain: store.customDomain ?? "",
    currency: store.currency,
    timezone: store.timezone,
    allowedDomains: store.allowedDomains.join(", "),
    email: store.senderEmail ?? "",
    phone: initialContact.phone,
    address: initialContact.address,
    logoUrl: store.logoUrl ?? null,
    mainColor: normalizeMainColor(store.mainColor ?? "#0f172a"),
    slogan: store.heroEyebrow ?? "",
    invoiceFooterText: store.invoiceFooterText ?? "",
    invoicePrefix: store.invoicePrefix ?? "INV-",
    nextInvoiceNumber: store.nextInvoiceNumber ?? 1001,
  });

  const emailBranding = buildEmailBrandingStyles(formState.mainColor);

  useEffect(() => {
    if (!initialContact.phone || !initialContact.address) {
      try {
        const raw =
          localStorage.getItem(`prado_store_contact_${store.id}`) ||
          localStorage.getItem("prado_store_profile_contact");
        if (raw) {
          const parsed = JSON.parse(raw) as { address?: string; phone?: string };
          setFormState((prev) => ({
            ...prev,
            phone: prev.phone || (typeof parsed.phone === "string" ? parsed.phone : ""),
            address: prev.address || (typeof parsed.address === "string" ? parsed.address : ""),
          }));
        }
      } catch {
        // ignore fallback errors
      }
    }
  }, [store.id, initialContact.phone, initialContact.address]);

  const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  const MAX_BYTES = 5 * 1024 * 1024;

  async function handleLogoPick(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;

    const file = files[0];

    if (!ALLOWED_TYPES.includes(file.type)) {
      alert(`"${file.name}" is not allowed. Use JPEG, PNG, WebP, or GIF.`);
      if (logoInputRef.current) logoInputRef.current.value = "";
      return;
    }

    if (file.size > MAX_BYTES) {
      alert(`"${file.name}" exceeds the 5 MB limit.`);
      if (logoInputRef.current) logoInputRef.current.value = "";
      return;
    }

    setIsUploadingLogo(true);

    try {
      const form = new FormData();
      form.append("file", file);
      const response = await fetch("/api/uploads/products", { method: "POST", body: form });
      const rawText = await response.text();
      let data: { url?: string; error?: string } = {};
      try {
        data = JSON.parse(rawText);
      } catch {
        throw new Error("Upload failed. Unexpected server response.");
      }

      if (!response.ok) throw new Error(data.error ?? "Upload failed");
      if (!data.url) throw new Error("Upload failed");

      setFormState((prev) => ({ ...prev, logoUrl: data.url ?? null }));
    } catch (uploadError) {
      alert(uploadError instanceof Error ? uploadError.message : "Upload failed");
    } finally {
      setIsUploadingLogo(false);
      if (logoInputRef.current) logoInputRef.current.value = "";
    }
  }

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [domainSetupNotice, setDomainSetupNotice] = useState<DomainSetupNotice | null>(
    store.customDomain
      ? {
          storeId: store.id,
          storeName: store.name,
          domain: store.customDomain,
          status: "unknown",
        }
      : null,
  );
  const [domainStatusError, setDomainStatusError] = useState<string | null>(null);
  const [isCheckingDomainStatus, setIsCheckingDomainStatus] = useState(false);

  const [slugCheck, setSlugCheck] = useState<{
    slug: string;
    status: "checking" | "available" | "unavailable" | "error";
    message: string | null;
  } | null>(null);

  const normalizedSlug = normalizeStoreSlug(formState.slug);
  const isOriginalSlug = normalizedSlug === store.slug;
  const currentSlugCheck = slugCheck?.slug === normalizedSlug ? slugCheck : null;

  useEffect(() => {
    if (!normalizedSlug || isOriginalSlug) return;

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
          message:
            availabilityError instanceof Error
              ? availabilityError.message
              : "Unable to check store URL availability.",
        });
      }
    }, 350);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [normalizedSlug, isOriginalSlug]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      if (!isOriginalSlug) {
        const availability = await getSlugAvailability(normalizedSlug);
        setSlugCheck({
          slug: availability.slug,
          status: availability.available ? "available" : "unavailable",
          message: availability.reason,
        });

        if (!availability.available) {
          throw new Error(availability.reason ?? "This store URL is not available.");
        }
      }

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
        senderEmail: formState.email.trim() || null,
        shippingOrigin: {
          address: formState.address.trim(),
          phone: formState.phone.trim(),
        },
        logoUrl: formState.logoUrl,
        mainColor: normalizeMainColor(formState.mainColor),
        heroEyebrow: formState.slogan.trim() || null,
        invoiceFooterText: formState.invoiceFooterText.trim() || null,
        invoicePrefix: formState.invoicePrefix.trim() || null,
        nextInvoiceNumber: Math.max(1, Number(formState.nextInvoiceNumber) || 1001),
      };

      const response = await fetch(`/api/stores/${store.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = (await response.json()) as Store & {
        error?: string;
        domainStatus?: "valid" | "pending" | "invalid" | "unknown" | null;
      };

      if (!response.ok) {
        throw new Error(result.error ?? "Something went wrong saving the store.");
      }

      try {
        localStorage.setItem(
          `prado_store_contact_${store.id}`,
          JSON.stringify({
            address: formState.address.trim(),
            phone: formState.phone.trim(),
          }),
        );
        localStorage.setItem(
          "prado_store_profile_contact",
          JSON.stringify({
            address: formState.address.trim(),
            phone: formState.phone.trim(),
          }),
        );
      } catch {
        // ignore localStorage save errors
      }

      if (result.customDomain) {
        setDomainSetupNotice({
          storeId: result.id,
          storeName: result.name,
          domain: result.customDomain,
          status: result.domainStatus ?? "unknown",
        });
        setDomainStatusError(null);
      } else {
        setDomainSetupNotice(null);
        setDomainStatusError(null);
      }

      setSuccess("Store settings updated successfully.");
      router.refresh();
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Failed to save store settings.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleCheckDomainStatus() {
    if (!domainSetupNotice) return;

    setIsCheckingDomainStatus(true);
    setDomainStatusError(null);

    try {
      const response = await fetch(`/api/stores/${domainSetupNotice.storeId}/domain-status`, {
        cache: "no-store",
      });

      const result = (await response.json()) as {
        error?: string;
        storeId?: string;
        storeName?: string;
        domain?: string;
        status?: "valid" | "pending" | "invalid" | "unknown";
      };

      if (!response.ok) {
        throw new Error(result.error ?? "Failed to check domain status");
      }

      setDomainSetupNotice((current) => {
        if (!current) return current;

        return {
          storeId: result.storeId ?? current.storeId,
          storeName: result.storeName ?? current.storeName,
          domain: result.domain ?? current.domain,
          status: result.status ?? "unknown",
        };
      });
    } catch (statusError) {
      setDomainStatusError(
        statusError instanceof Error ? statusError.message : "Failed to check domain status",
      );
    } finally {
      setIsCheckingDomainStatus(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Are you sure you want to delete "${store.name}"? This action cannot be undone.`)) {
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/stores/${store.id}`, { method: "DELETE" });
      if (!response.ok) {
        const result = (await response.json()) as { error?: string };
        throw new Error(result.error ?? "Failed to delete store");
      }
      router.push("/dashboard/stores");
      router.refresh();
    } catch (deleteError) {
      alert(deleteError instanceof Error ? deleteError.message : "Failed to delete store");
      setIsDeleting(false);
    }
  }

  const domainLabel = store.customDomain || `${store.slug}.pradocommerce.com`;

  return (
    <section className="min-w-0 space-y-6">
      {/* Top bar breadcrumb & navigation */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            <Link href="/dashboard/stores" className="hover:text-cyan-700 transition">
              Stores
            </Link>
            <span>/</span>
            <span>Edit Store</span>
          </div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
            {store.name}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Configure tenant parameters, custom domain, currency, and permitted origins.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <a
            href={`https://${domainLabel}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Visit store
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
          <Link
            href={`/dashboard/stores/${store.id}/themes`}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <Palette className="h-3.5 w-3.5 text-cyan-600" />
            Theme settings
          </Link>
          <Link
            href="/dashboard/stores"
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to stores
          </Link>
        </div>
      </div>

      {domainSetupNotice ? (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold">Custom domain configuration for {domainSetupNotice.storeName}</p>
              <p className="mt-1 break-all text-blue-800 font-mono text-xs">{domainSetupNotice.domain}</p>
              <p className="mt-1 text-blue-900">
                Status:{" "}
                <span className="font-medium">
                  {domainSetupNotice.status === "valid"
                    ? "Verified"
                    : domainSetupNotice.status === "pending"
                      ? "Pending verification"
                      : domainSetupNotice.status === "invalid"
                        ? "Needs DNS fix"
                        : "Checking"}
                </span>
              </p>
              <div className="mt-3 space-y-1 text-xs text-blue-800">
                <p className="font-medium">DNS setup instructions:</p>
                <p>1. Subdomain: add CNAME record for <code className="bg-blue-100/80 px-1 rounded">{domainSetupNotice.domain}</code> pointing to <code className="bg-blue-100/80 px-1 rounded">cname.vercel-dns.com</code>.</p>
                <p>2. Apex domain: add A record @ pointing to <code className="bg-blue-100/80 px-1 rounded">76.76.21.21</code>, and CNAME for www pointing to <code className="bg-blue-100/80 px-1 rounded">cname.vercel-dns.com</code>.</p>
                <p>3. Wait for DNS propagation, then test connection.</p>
              </div>
              {domainStatusError ? (
                <p className="mt-3 rounded-lg border border-amber-300 bg-amber-100/80 px-3 py-2 text-xs text-amber-800">
                  {domainStatusError}
                </p>
              ) : null}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => void handleCheckDomainStatus()}
                disabled={isCheckingDomainStatus}
                className="rounded-full border border-blue-300 bg-white px-3 py-1.5 text-xs font-semibold text-blue-800 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isCheckingDomainStatus ? "Checking..." : "Check status"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setDomainSetupNotice(null);
                  setDomainStatusError(null);
                }}
                className="rounded-full border border-blue-300 px-3 py-1.5 text-xs font-semibold text-blue-800 transition hover:bg-blue-100"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-6">
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

        {/* General Store Details */}
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
              General Configuration
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Update the core store metadata, localized currency, and timezone settings.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Store name"
              value={formState.name}
              onChange={(value) => {
                setFormState((current) => ({
                  ...current,
                  name: value,
                }));
              }}
              placeholder="My Brand"
            />
            <div>
              <Field
                label="Store URL slug"
                value={formState.slug}
                onChange={(value) => setFormState((current) => ({ ...current, slug: value }))}
                placeholder="my-brand"
              />
              {normalizedSlug ? (
                <div className="mt-2 text-xs">
                  <p className="break-all text-slate-500">
                    https://{normalizedSlug}.pradocommerce.com
                  </p>
                  {!isOriginalSlug && currentSlugCheck?.status === "checking" ? (
                    <p className="mt-1 text-slate-500">Checking availability...</p>
                  ) : !isOriginalSlug && currentSlugCheck?.status === "available" ? (
                    <p className="mt-1 font-medium text-emerald-700">Available</p>
                  ) : !isOriginalSlug && currentSlugCheck?.status === "unavailable" ? (
                    <p className="mt-1 font-medium text-rose-700">{currentSlugCheck.message}</p>
                  ) : !isOriginalSlug && currentSlugCheck?.status === "error" ? (
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
          </div>
        </div>

        {/* Store Branding & Appearance */}
        <div className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
              Branding & Appearance
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Upload your storefront logo, configure your brand tagline/slogan, and choose primary theme accent colors.
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-900">Storefront Logo</label>
            <p className="mt-1 max-w-2xl text-xs text-slate-500">
              Upload a logo image to display on your storefront navigation bar instead of plain text.
            </p>

            <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="group relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                {formState.logoUrl ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={formState.logoUrl} alt="Store logo preview" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setFormState((prev) => ({ ...prev, logoUrl: null }))}
                      disabled={isUploadingLogo || isSaving}
                      className="absolute inset-0 flex items-center justify-center bg-slate-950/55 text-xs font-semibold text-white opacity-0 transition group-hover:opacity-100 disabled:cursor-not-allowed"
                    >
                      Remove
                    </button>
                  </>
                ) : (
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Logo</span>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleLogoPick}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  disabled={isUploadingLogo}
                  className="inline-flex w-fit items-center rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isUploadingLogo ? "Uploading…" : formState.logoUrl ? "Replace logo" : "Upload logo"}
                </button>
                <p className="text-xs text-slate-400">JPEG, PNG, WebP or GIF — max 5 MB</p>
              </div>
            </div>
          </div>

          <div>
            <Field
              label="Store Slogan / Tagline (optional)"
              labelHint="Subtitle or slogan displayed under your store name on storefront headers and receipts."
              value={formState.slogan}
              onChange={(value) => setFormState((prev) => ({ ...prev, slogan: value }))}
              placeholder="e.g. Premium Artisanal Handcrafted Goods"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-900">Main brand color</label>
            <p className="mt-1 max-w-2xl text-xs text-slate-500">
              This accent color drives primary storefront buttons, checkout actions, and customer email template headers.
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-[96px_1fr]">
              <input
                type="color"
                value={formState.mainColor}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, mainColor: normalizeMainColor(event.target.value) }))
                }
                className="h-11 w-full cursor-pointer rounded-xl border border-slate-200 bg-white p-1"
              />
              <input
                type="text"
                value={formState.mainColor}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    mainColor: normalizeMainColor(event.target.value, prev.mainColor),
                  }))
                }
                placeholder="#0f172a"
                className="w-full max-w-[180px] rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
              />
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Storefront preview</p>
                <div className="mt-3 rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-xs font-medium text-slate-700">Primary action button</p>
                  <button
                    type="button"
                    style={{ backgroundColor: emailBranding.primary }}
                    className="mt-3 rounded-full px-4 py-2 text-xs font-semibold text-white"
                  >
                    Add to cart
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Email template preview</p>
                <div className="mt-3 rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-xs text-slate-600">Order #PRD-1024 is confirmed.</p>
                  <p className="mt-2 text-xs font-medium" style={{ color: emailBranding.primary }}>
                    Thanks for shopping with {formState.name || "your store"}.
                  </p>
                  <button
                    type="button"
                    style={{ backgroundColor: emailBranding.primary }}
                    className="mt-3 rounded-full px-4 py-2 text-xs font-semibold text-white"
                  >
                    View order
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Contact & Location Configuration */}
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
              Store Contact & Location
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Set customer contact details, phone number, and physical store address.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Store Email"
              labelHint="Primary contact email for customers, order inquiries, and transaction receipts."
              value={formState.email}
              onChange={(value) => setFormState((current) => ({ ...current, email: value }))}
              placeholder="contact@mybrand.com"
            />
            <Field
              label="Store Phone Number (optional)"
              labelHint="Customer support phone number for storefront and order receipts."
              value={formState.phone}
              onChange={(value) => setFormState((current) => ({ ...current, phone: value }))}
              placeholder="+1 (555) 000-0000"
            />
            <label className="flex flex-col gap-2 sm:col-span-2">
              <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <span>Store Physical Address (optional)</span>
                <span className="group relative inline-flex items-center">
                  <button
                    type="button"
                    aria-label="Store Address help"
                    className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-blue-300 bg-blue-50 text-xs font-semibold text-blue-700 transition hover:border-blue-400 hover:bg-blue-100 hover:text-blue-800"
                  >
                    ?
                  </button>
                  <span className="pointer-events-none absolute left-1/2 top-7 z-20 hidden w-72 -translate-x-1/2 rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs font-normal leading-5 text-blue-800 shadow-lg group-hover:block group-focus-within:block">
                    Physical business, retail, or warehouse location for shipping and contact info.
                  </span>
                </span>
              </span>
              <textarea
                rows={3}
                value={formState.address}
                onChange={(event) => setFormState((current) => ({ ...current, address: event.target.value }))}
                placeholder="123 Commerce St, Suite 100, New York, NY 10001"
                className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white"
              />
            </label>
          </div>
        </div>

        {/* Invoice & Receipt Customization */}
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
              Invoice & Receipt Settings
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Customize footer notes, terms, return policy, or thank-you messages on printed order invoices.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Invoice Prefix (optional)"
              labelHint="Prefix added to all generated invoice and order numbers (e.g., INV-, ORD-, INV-2026-)."
              value={formState.invoicePrefix}
              onChange={(value) => setFormState((current) => ({ ...current, invoicePrefix: value }))}
              placeholder="INV-"
            />

            <Field
              label="Next Invoice Number"
              labelHint="The starting or next sequential order/invoice number to assign to your next sale."
              type="number"
              min={1}
              value={formState.nextInvoiceNumber.toString()}
              onChange={(value) =>
                setFormState((current) => ({
                  ...current,
                  nextInvoiceNumber: Math.max(1, Number.parseInt(value, 10) || 1),
                }))
              }
              placeholder="1001"
            />
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Generated Invoice Format Preview
            </span>
            <div className="mt-1.5 flex items-center gap-3">
              <span className="inline-flex items-center rounded-lg bg-slate-900 px-3 py-1.5 font-mono text-sm font-bold text-white shadow-sm">
                {(formState.invoicePrefix || "INV-").trim()}
                {formState.nextInvoiceNumber || 1001}
              </span>
              <span className="text-xs text-slate-500">
                Your next order invoice will be formatted like this on receipts, emails, and PDFs.
              </span>
            </div>
          </div>

          <label className="flex flex-col gap-2">
            <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <span>Invoice Footer Custom Text (optional)</span>
              <span className="group relative inline-flex items-center">
                <button
                  type="button"
                  aria-label="Invoice Footer Text help"
                  className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-blue-300 bg-blue-50 text-xs font-semibold text-blue-700 transition hover:border-blue-400 hover:bg-blue-100 hover:text-blue-800"
                >
                  ?
                </button>
                <span className="pointer-events-none absolute left-1/2 top-7 z-20 hidden w-72 -translate-x-1/2 rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs font-normal leading-5 text-blue-800 shadow-lg group-hover:block group-focus-within:block">
                  Custom text, return policy, warranty terms, or special instructions displayed at the bottom of printed invoices.
                </span>
              </span>
            </span>
            <textarea
              value={formState.invoiceFooterText}
              onChange={(e) => setFormState((prev) => ({ ...prev, invoiceFooterText: e.target.value }))}
              rows={3}
              placeholder="e.g. Thank you for your business! All returns must be requested within 30 days of receipt."
              className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white"
            />
          </label>
        </div>

        {/* Domain & Network Configuration */}
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
              Domains & Security
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Manage custom domains and CORS allowed origins for embedding storefront APIs.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Custom domain (optional)"
              labelHint="Use a domain you own. Point your DNS records to your Prado Commerce Storefront, save settings, and verify connection."
              value={formState.customDomain}
              onChange={(value) => setFormState((current) => ({ ...current, customDomain: value }))}
              placeholder="checkout.mybrand.com"
              className="sm:col-span-2"
            />
            <Field
              label="Allowed domains (optional)"
              labelHint="Comma-separated list of web addresses permitted to send cross-origin requests to your store API."
              value={formState.allowedDomains}
              onChange={(value) => setFormState((current) => ({ ...current, allowedDomains: value }))}
              placeholder="https://mybrand.com, https://store.mybrand.com"
              className="sm:col-span-2"
            />
          </div>
        </div>

        {/* Submit Bar */}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={() => void handleDelete()}
            disabled={isDeleting}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-rose-200 px-5 py-3 text-sm font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Trash2 className="h-4 w-4" />
            {isDeleting ? "Deleting store..." : "Delete store"}
          </button>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center">
            <Link
              href="/dashboard/stores"
              className="rounded-full border border-slate-300 px-5 py-3 text-center text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? "Saving changes..." : "Save changes"}
            </button>
          </div>
        </div>
      </form>
    </section>
  );
}
