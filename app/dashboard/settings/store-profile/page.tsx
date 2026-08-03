"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

export default function StoreProfilePage() {
  const router = useRouter();
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [phone, setPhone] = useState("");

  const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  const MAX_BYTES = 5 * 1024 * 1024;

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

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    router.push("/dashboard/settings");
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
          <div>
            <label className="block text-sm font-semibold text-slate-900">Logo</label>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
              Upload a logo to use on your storefront instead of the default text logo.
            </p>

            <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                {logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoUrl} alt="Store logo preview" className="h-full w-full object-cover" />
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
            className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Save changes
          </button>
        </div>
      </form>
    </section>
  );
}
