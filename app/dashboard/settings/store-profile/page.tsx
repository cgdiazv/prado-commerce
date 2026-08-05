"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { buildEmailBrandingStyles, normalizeMainColor } from "@/lib/branding";

export default function StoreProfilePage() {
  const router = useRouter();
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [storeId, setStoreId] = useState<string>("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [storeMainColor, setStoreMainColor] = useState("#0f172a");
  const [phone, setPhone] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  const MAX_BYTES = 5 * 1024 * 1024;
  const emailBranding = buildEmailBrandingStyles(storeMainColor);

  useEffect(() => {
    async function loadStoreProfile() {
      try {
        const response = await fetch("/api/stores", { cache: "no-store" });
        const payload = (await response.json()) as
          | Array<{ id: string; mainColor?: string; logoUrl?: string | null; phone?: string | null }>
          | { error?: string };

        if (!response.ok) {
          if (response.status === 401) {
            throw new Error("Your session has expired. Please sign in again.");
          }

          const apiError =
            typeof payload === "object" && payload !== null && "error" in payload
              ? (payload as { error?: string }).error
              : null;

          throw new Error(apiError || "Unable to load store profile settings.");
        }

        const stores = payload as Array<{ id: string; mainColor?: string; logoUrl?: string | null; phone?: string | null }>;
        const activeStore = Array.isArray(stores) ? stores[0] : null;

        if (!activeStore?.id) {
          throw new Error("No store found. Create a store first to manage branding.");
        }

        setStoreId(activeStore.id);
        setStoreMainColor(normalizeMainColor(activeStore.mainColor ?? "#0f172a"));
        setLogoUrl(activeStore.logoUrl ?? null);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Unable to load store profile settings.");
      }
    }

    void loadStoreProfile();
  }, []);

  async function parseUploadResponse(response: Response): Promise<{ url?: string; error?: string }> {
    const raw = await response.text();

    if (!raw) {
      return { error: "Upload failed. Empty response from server." };
    }

    try {
      return JSON.parse(raw) as { url?: string; error?: string };
    } catch {
      return { error: "Upload failed. Unexpected server response." };
    }
  }

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
      const data = await parseUploadResponse(response);

      if (!response.ok) throw new Error(data.error ?? "Upload failed");
      if (!data.url) throw new Error("Upload failed");

      setLogoUrl(data.url);
    } catch (uploadError) {
      alert(uploadError instanceof Error ? uploadError.message : "Upload failed");
    } finally {
      setIsUploadingLogo(false);
      if (logoInputRef.current) logoInputRef.current.value = "";
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      if (!storeId) {
        throw new Error("No store found. Create a store first to update branding.");
      }

      const response = await fetch(`/api/stores/${storeId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mainColor: normalizeMainColor(storeMainColor),
          logoUrl,
        }),
      });

      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(result.error ?? "Unable to save store profile settings.");
      }

      setSuccess("Store branding updated. This color now drives storefront primary actions and email template accents.");
      router.refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save store profile settings.");
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
            Store profile
          </h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-slate-600 sm:text-lg">
            Update your store contact details and storefront identity.
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

          <div>
            <label className="block text-sm font-semibold text-slate-900">Logo</label>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
              Upload a logo to use on your storefront instead of the default text logo.
            </p>

            <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="group relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                {logoUrl ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={logoUrl} alt="Store logo preview" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => {
                        setLogoUrl(null);
                        setSuccess(null);
                        setError(null);
                      }}
                      disabled={isUploadingLogo || isSaving}
                      className="absolute inset-0 flex items-center justify-center bg-slate-950/55 text-xs font-semibold text-white opacity-0 transition group-hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-60"
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
                  className="inline-flex w-fit items-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isUploadingLogo ? "Uploading…" : logoUrl ? "Replace logo" : "Upload logo"}
                </button>
                <p className="text-xs text-slate-400">JPEG, PNG, WebP or GIF — max 5 MB</p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-900">Main brand color</label>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
              This color is used for your storefront primary actions and customer email template accents.
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-[96px_1fr]">
              <input
                type="color"
                value={storeMainColor}
                onChange={(event) => setStoreMainColor(normalizeMainColor(event.target.value))}
                className="h-12 w-full cursor-pointer rounded-xl border border-slate-200 bg-white p-1"
              />
              <input
                type="text"
                value={storeMainColor}
                onChange={(event) => setStoreMainColor(normalizeMainColor(event.target.value, storeMainColor))}
                placeholder="#0f172a"
                className="w-full max-w-[180px] rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
              />
            </div>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Storefront preview</p>
                <div className="mt-3 rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-sm font-medium text-slate-700">Primary action button</p>
                  <button
                    type="button"
                    style={{ backgroundColor: emailBranding.primary }}
                    className="mt-3 rounded-full px-4 py-2 text-sm font-semibold text-white"
                  >
                    Add to cart
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Email template preview</p>
                <div className="mt-3 rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-sm text-slate-600">Order #PRD-1024 is confirmed.</p>
                  <p className="mt-2 text-sm" style={{ color: emailBranding.primary }}>
                    Thanks for shopping with your store.
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

          <div>
            <label className="block text-sm font-semibold text-slate-900">Store display name</label>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
              Store display name is used as your storefront&apos;s default text logo.
            </p>
            <input
              type="text"
              placeholder="Store display name"
              className="mt-3 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-900">Address</label>
            <textarea
              placeholder="Street address, city, state, postal code"
              className="mt-1 min-h-28 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-900">Address type</label>
            <select className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400">
              <option>Choose address type</option>
              <option>Home office</option>
              <option>Warehouse</option>
              <option>Retail store</option>
              <option>Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-900">Email</label>
            <p className="mt-1 text-sm leading-6 text-slate-500">All emails to customers will be sent from this address.</p>
            <input
              type="email"
              placeholder="name@company.com"
              className="mt-3 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-900">Phone <span className="font-normal text-slate-500">(optional)</span></label>
            <p className="mt-1 text-sm leading-6 text-slate-500">The number displayed on your storefront. Adding a number improves conversion rates.</p>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={phone}
              onChange={(event) => setPhone(event.target.value.replace(/\D/g, ""))}
              placeholder="0000000000"
              className="mt-3 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
            />
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
            {isSaving ? "Saving..." : "Save changes"}
          </button>
        </div>
      </form>
    </section>
  );
}
