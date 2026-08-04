"use client";

import { useMemo, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";

type Store = {
  id: string;
  name: string;
  slug: string;
  customDomain: string | null;
  currency: string;
  timezone: string;
  allowedDomains: string[];
  createdAt: string | Date;
  updatedAt: string | Date;
};

type StoresDashboardProps = {
  initialStores: Store[];
  currentPlan?: "STARTER" | "PRO" | "ENTERPRISE";
  setupError?: string | null;
};

type StoreFormState = {
  name: string;
  slug: string;
  ownerId: string; // unused in UI, kept for API compat
  customDomain: string;
  currency: string;
  timezone: string;
  allowedDomains: string;
};

const defaultFormState: StoreFormState = {
  name: "",
  slug: "",
  ownerId: "",
  customDomain: "",
  currency: "USD",
  timezone: "America/New_York",
  allowedDomains: "",
};

export function StoresDashboard({ initialStores, currentPlan = "STARTER", setupError = null }: StoresDashboardProps) {
  const [stores, setStores] = useState(initialStores);
  const [query, setQuery] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [formState, setFormState] = useState<StoreFormState>(defaultFormState);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingStoreId, setDeletingStoreId] = useState<string | null>(null);
  const isStarter = currentPlan === "STARTER";
  const hasReachedStoreLimit = isStarter && stores.length >= 1;

  const filteredStores = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return stores;
    }

    return stores.filter((store) => {
      return (
        store.name.toLowerCase().includes(normalizedQuery) ||
        store.slug.toLowerCase().includes(normalizedQuery) ||
        store.currency.toLowerCase().includes(normalizedQuery) ||
        (store.customDomain ?? "").toLowerCase().includes(normalizedQuery)
      );
    });
  }, [query, stores]);

  function openCreateModal() {
    if (hasReachedStoreLimit) {
      setError("Starter plan includes 1 active store. Upgrade to Prado Commerce Pro to add more stores.");
      return;
    }
    setEditingStore(null);
    setFormState(defaultFormState);
    setError(null);
    setIsCreateOpen(true);
  }

  function openEditModal(store: Store) {
    setEditingStore(store);
    setFormState({
      name: store.name,
      slug: store.slug,
      ownerId: "",
      customDomain: store.customDomain ?? "",
      currency: store.currency,
      timezone: store.timezone,
      allowedDomains: store.allowedDomains.join(", "),
    });
    setError(null);
    setIsCreateOpen(true);
  }

  function closeModal() {
    setIsCreateOpen(false);
    setEditingStore(null);
    setError(null);
    setFormState(defaultFormState);
  }

  async function handleDelete(storeId: string) {
    setDeletingStoreId(storeId);
    try {
      const response = await fetch(`/api/stores/${storeId}`, { method: "DELETE" });
      if (!response.ok) {
        const result = await response.json() as { error?: string };
        throw new Error(result.error ?? "Failed to delete store");
      }
      setStores((current) => current.filter((s) => s.id !== storeId));
    } catch (deleteError) {
      alert(deleteError instanceof Error ? deleteError.message : "Failed to delete store");
    } finally {
      setDeletingStoreId(null);
    }
  }

  async function refreshStores() {
    const response = await fetch("/api/stores", {
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error("Failed to refresh stores");
    }

    const data = (await response.json()) as Store[];
    setStores(data);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
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

      const response = editingStore
        ? await fetch(`/api/stores/${editingStore.id}`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/stores", {
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

      await refreshStores();
      closeModal();
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Failed to save store",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <section>
      {setupError ? (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {setupError}
        </div>
      ) : null}
      <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <p className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
              My Storefronts
            </p>
            <span className="inline-flex rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-cyan-700">
              {currentPlan}
            </span>
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">
            Your stores, products, and settings in one place.
          </h1>
          <p className="max-w-xl text-base leading-7 text-slate-600 sm:text-lg">
            Create and manage your storefronts, configure domains and currencies, and keep your embed keys ready to go.
          </p>
            </div>

            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap">
              <div className="group relative w-full sm:w-auto">
                <button
                  type="button"
                  onClick={openCreateModal}
                  disabled={hasReachedStoreLimit}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                >
                  <Plus className="h-4 w-4" />
                  New store
                </button>
                {isStarter ? (
                  <div className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 hidden w-72 -translate-x-1/2 rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2 text-sm text-cyan-800 shadow-lg group-hover:block group-focus-within:block sm:w-80">
                    Starter plan includes up to 1 active store and does not support custom domains. Upgrade to Prado Commerce Pro to unlock 5 stores and custom domains.
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-md">
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by name, slug, domain, or currency"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
              />
            </div>
            <p className="text-sm text-slate-500">
              {filteredStores.length} store{filteredStores.length === 1 ? "" : "s"} shown
            </p>
          </div>

          <div className="mt-8 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            {filteredStores.length === 0 ? (
              <div className="p-10 text-center text-slate-500">
                No stores match your search.
              </div>
            ) : (
              <>
                <div className="hidden overflow-x-auto md:block">
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold text-slate-600">Store</th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-600">Domain</th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-600">Currency</th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-600">Timezone</th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-600">Allowed domains</th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-600">Updated</th>
                        <th className="px-4 py-3 text-right font-semibold text-slate-600">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {filteredStores.map((store) => {
                        const domainLabel = store.customDomain || `${store.slug}.pradocommerce.com`;

                        return (
                          <tr key={store.id} className="hover:bg-slate-50/70">
                            <td className="px-4 py-3 align-top">
                              <button
                                type="button"
                                onClick={() => openEditModal(store)}
                                className="text-left"
                              >
                                <p className="font-semibold text-slate-900 transition hover:text-cyan-700">{store.name}</p>
                                <p className="text-xs text-slate-500">/{store.slug}</p>
                              </button>
                            </td>
                            <td className="px-4 py-3 align-top">
                              <a
                                href={`https://${domainLabel}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm font-medium text-cyan-700 transition hover:text-cyan-800"
                              >
                                {domainLabel} ↗
                              </a>
                            </td>
                            <td className="px-4 py-3 align-top text-slate-700">{store.currency}</td>
                            <td className="px-4 py-3 align-top text-slate-700">{store.timezone}</td>
                            <td className="px-4 py-3 align-top text-slate-600">
                              {store.allowedDomains.length > 0 ? store.allowedDomains.join(", ") : "None"}
                            </td>
                            <td className="px-4 py-3 align-top text-slate-600">
                              {new Date(store.updatedAt).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-3 align-top">
                              <div className="flex justify-end gap-2">
                                <button
                                  type="button"
                                  disabled={deletingStoreId === store.id}
                                  onClick={() => {
                                    if (confirm(`Delete "${store.name}"? This cannot be undone.`)) {
                                      void handleDelete(store.id);
                                    }
                                  }}
                                  aria-label="Delete store"
                                  title={deletingStoreId === store.id ? "Deleting" : "Delete"}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-rose-200 text-rose-600 transition hover:border-rose-300 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-col gap-3 p-3 md:hidden">
                  {filteredStores.map((store) => {
                    const domainLabel = store.customDomain || `${store.slug}.pradocommerce.com`;

                    return (
                      <article key={store.id} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <button
                              type="button"
                              onClick={() => openEditModal(store)}
                              className="text-left"
                            >
                              <p className="font-semibold text-slate-900 transition hover:text-cyan-700">{store.name}</p>
                              <p className="mt-1 text-xs text-slate-500">/{store.slug}</p>
                            </button>
                          </div>
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                            {store.currency}
                          </span>
                        </div>

                        <div className="mt-3 flex flex-col gap-3 text-sm text-slate-600">
                          <div>
                            <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Domain</p>
                            <a
                              href={`https://${domainLabel}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-1 block font-medium text-cyan-700"
                            >
                              {domainLabel}
                            </a>
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Timezone</p>
                            <p className="mt-1 font-medium text-slate-700">{store.timezone}</p>
                          </div>
                        </div>

                        <div className="mt-3 border-t border-slate-200 pt-3">
                          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Allowed domains</p>
                          <p className="mt-1 text-sm text-slate-600">
                            {store.allowedDomains.length > 0 ? store.allowedDomains.join(", ") : "None"}
                          </p>
                        </div>

                        <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-200 pt-3">
                          <p className="text-sm text-slate-500">
                            Updated {new Date(store.updatedAt).toLocaleDateString()}
                          </p>
                          <div className="flex w-full justify-end gap-2 sm:w-auto">
                            <button
                              type="button"
                              disabled={deletingStoreId === store.id}
                              onClick={() => {
                                if (confirm(`Delete "${store.name}"? This cannot be undone.`)) {
                                  void handleDelete(store.id);
                                }
                              }}
                              aria-label="Delete store"
                              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-rose-200 text-rose-600 transition hover:border-rose-300 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </section>

      {isCreateOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 py-8 backdrop-blur-sm">
          <div className="w-full max-w-2xl overflow-hidden rounded-xl border border-white/60 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  {editingStore ? "Edit store" : "New store"}
                </p>
                <h2 className="mt-1 text-2xl font-semibold text-slate-950">
                  {editingStore ? "Update tenant settings" : "Create a new tenant"}
                </h2>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-full border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 px-6 py-6">
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
                      // auto-slug only when creating and slug hasn't been manually edited
                      slug: !editingStore && current.slug === toSlug(current.name)
                        ? toSlug(value)
                        : current.slug,
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
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving ? "Saving..." : editingStore ? "Save changes" : "Create store"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}

function toSlug(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function StatCard({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{value}</p>
      <p className="mt-1 text-sm text-slate-500">{note}</p>
    </div>
  );
}

function Field({
  label,
  labelHint,
  value,
  onChange,
  placeholder,
  className = "",
}: {
  label: string;
  labelHint?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <label className={`flex flex-col gap-2 ${className}`.trim()}>
      <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
        <span>{label}</span>
        {labelHint ? (
          <span className="group relative inline-flex items-center">
            <button
              type="button"
              aria-label={`${label} help`}
              className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-blue-300 bg-blue-50 text-xs font-semibold text-blue-700 transition hover:border-blue-400 hover:bg-blue-100 hover:text-blue-800"
            >
              ?
            </button>
            <span className="pointer-events-none absolute left-1/2 top-7 z-20 hidden w-72 -translate-x-1/2 rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs font-normal leading-5 text-blue-800 shadow-lg group-hover:block group-focus-within:block">
              {labelHint}
            </span>
          </span>
        ) : null}
      </span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white"
      />
    </label>
  );
}

const TIMEZONES = [
  // North America
  { value: "America/New_York", label: "America/New_York (ET)" },
  { value: "America/Chicago", label: "America/Chicago (CT)" },
  { value: "America/Denver", label: "America/Denver (MT)" },
  { value: "America/Los_Angeles", label: "America/Los_Angeles (PT)" },
  { value: "America/Anchorage", label: "America/Anchorage (AKT)" },
  { value: "Pacific/Honolulu", label: "Pacific/Honolulu (HST)" },
  { value: "America/Toronto", label: "America/Toronto" },
  { value: "America/Vancouver", label: "America/Vancouver" },
  // Central America
  { value: "America/Mexico_City", label: "America/Mexico_City" },
  { value: "America/Guatemala", label: "America/Guatemala" },
  { value: "America/Costa_Rica", label: "America/Costa_Rica" },
  { value: "America/Panama", label: "America/Panama" },
  // South America
  { value: "America/Bogota", label: "America/Bogota" },
  { value: "America/Lima", label: "America/Lima" },
  { value: "America/Caracas", label: "America/Caracas" },
  { value: "America/Santiago", label: "America/Santiago" },
  { value: "America/Sao_Paulo", label: "America/Sao_Paulo" },
  { value: "America/Argentina/Buenos_Aires", label: "America/Argentina/Buenos_Aires" },
  { value: "America/Montevideo", label: "America/Montevideo" },
  { value: "America/Asuncion", label: "America/Asuncion" },
  { value: "America/La_Paz", label: "America/La_Paz" },
  { value: "America/Guayaquil", label: "America/Guayaquil" },
  // Europe
  { value: "Europe/London", label: "Europe/London (GMT/BST)" },
  { value: "Europe/Dublin", label: "Europe/Dublin" },
  { value: "Europe/Lisbon", label: "Europe/Lisbon" },
  { value: "Europe/Madrid", label: "Europe/Madrid" },
  { value: "Europe/Paris", label: "Europe/Paris" },
  { value: "Europe/Berlin", label: "Europe/Berlin" },
  { value: "Europe/Rome", label: "Europe/Rome" },
  { value: "Europe/Amsterdam", label: "Europe/Amsterdam" },
  { value: "Europe/Brussels", label: "Europe/Brussels" },
  { value: "Europe/Warsaw", label: "Europe/Warsaw" },
  { value: "Europe/Stockholm", label: "Europe/Stockholm" },
  { value: "Europe/Helsinki", label: "Europe/Helsinki" },
  { value: "Europe/Athens", label: "Europe/Athens" },
  { value: "Europe/Bucharest", label: "Europe/Bucharest" },
  { value: "Europe/Moscow", label: "Europe/Moscow" },
  { value: "Europe/Istanbul", label: "Europe/Istanbul" },
  // Africa
  { value: "Africa/Cairo", label: "Africa/Cairo" },
  { value: "Africa/Johannesburg", label: "Africa/Johannesburg" },
  { value: "Africa/Lagos", label: "Africa/Lagos" },
  { value: "Africa/Nairobi", label: "Africa/Nairobi" },
  { value: "Africa/Casablanca", label: "Africa/Casablanca" },
  { value: "Africa/Accra", label: "Africa/Accra" },
  // Middle East
  { value: "Asia/Dubai", label: "Asia/Dubai" },
  { value: "Asia/Riyadh", label: "Asia/Riyadh" },
  { value: "Asia/Kuwait", label: "Asia/Kuwait" },
  { value: "Asia/Beirut", label: "Asia/Beirut" },
  { value: "Asia/Jerusalem", label: "Asia/Jerusalem" },
  { value: "Asia/Baghdad", label: "Asia/Baghdad" },
  { value: "Asia/Tehran", label: "Asia/Tehran" },
  // Asia
  { value: "Asia/Karachi", label: "Asia/Karachi" },
  { value: "Asia/Kolkata", label: "Asia/Kolkata" },
  { value: "Asia/Dhaka", label: "Asia/Dhaka" },
  { value: "Asia/Colombo", label: "Asia/Colombo" },
  { value: "Asia/Kathmandu", label: "Asia/Kathmandu" },
  { value: "Asia/Almaty", label: "Asia/Almaty" },
  { value: "Asia/Bangkok", label: "Asia/Bangkok" },
  { value: "Asia/Ho_Chi_Minh", label: "Asia/Ho_Chi_Minh" },
  { value: "Asia/Jakarta", label: "Asia/Jakarta" },
  { value: "Asia/Singapore", label: "Asia/Singapore" },
  { value: "Asia/Kuala_Lumpur", label: "Asia/Kuala_Lumpur" },
  { value: "Asia/Manila", label: "Asia/Manila" },
  { value: "Asia/Shanghai", label: "Asia/Shanghai" },
  { value: "Asia/Hong_Kong", label: "Asia/Hong_Kong" },
  { value: "Asia/Taipei", label: "Asia/Taipei" },
  { value: "Asia/Seoul", label: "Asia/Seoul" },
  { value: "Asia/Tokyo", label: "Asia/Tokyo" },
  // Oceania
  { value: "Australia/Perth", label: "Australia/Perth" },
  { value: "Australia/Darwin", label: "Australia/Darwin" },
  { value: "Australia/Adelaide", label: "Australia/Adelaide" },
  { value: "Australia/Brisbane", label: "Australia/Brisbane" },
  { value: "Australia/Sydney", label: "Australia/Sydney" },
  { value: "Australia/Melbourne", label: "Australia/Melbourne" },
  { value: "Pacific/Auckland", label: "Pacific/Auckland" },
  { value: "Pacific/Fiji", label: "Pacific/Fiji" },
  // UTC
  { value: "UTC", label: "UTC" },
];

const CURRENCIES = [
  { value: "USD", label: "USD — US Dollar" },
  { value: "EUR", label: "EUR — Euro" },
  { value: "GBP", label: "GBP — British Pound" },
  { value: "CAD", label: "CAD — Canadian Dollar" },
  { value: "AUD", label: "AUD — Australian Dollar" },
  { value: "JPY", label: "JPY — Japanese Yen" },
  { value: "CHF", label: "CHF — Swiss Franc" },
  { value: "INR", label: "INR — Indian Rupee" },
  { value: "SGD", label: "SGD — Singapore Dollar" },
  { value: "AED", label: "AED — UAE Dirham" },
  // South America
  { value: "BRL", label: "BRL — Brazilian Real" },
  { value: "ARS", label: "ARS — Argentine Peso" },
  { value: "CLP", label: "CLP — Chilean Peso" },
  { value: "COP", label: "COP — Colombian Peso" },
  { value: "PEN", label: "PEN — Peruvian Sol" },
  { value: "VES", label: "VES — Venezuelan Bolívar" },
  { value: "BOB", label: "BOB — Bolivian Boliviano" },
  { value: "PYG", label: "PYG — Paraguayan Guaraní" },
  { value: "UYU", label: "UYU — Uruguayan Peso" },
  { value: "GYD", label: "GYD — Guyanese Dollar" },
  { value: "SRD", label: "SRD — Surinamese Dollar" },
  // Central America
  { value: "GTQ", label: "GTQ — Guatemalan Quetzal" },
  { value: "BZD", label: "BZD — Belize Dollar" },
  { value: "HNL", label: "HNL — Honduran Lempira" },
  { value: "NIO", label: "NIO — Nicaraguan Córdoba" },
  { value: "CRC", label: "CRC — Costa Rican Colón" },
  { value: "PAB", label: "PAB — Panamanian Balboa" },
  { value: "DOP", label: "DOP — Dominican Peso" },
  { value: "MXN", label: "MXN — Mexican Peso" },
];

function SelectField({
  label,
  value,
  onChange,
  options,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  className?: string;
}) {
  return (
    <label className={`flex flex-col gap-2 ${className}`.trim()}>
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:bg-white"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </label>
  );
}