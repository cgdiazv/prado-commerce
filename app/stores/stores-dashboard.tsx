"use client";

import { useMemo, useState } from "react";

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
  setupError?: string | null;
};

type StoreFormState = {
  name: string;
  slug: string;
  ownerId: string;
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

export function StoresDashboard({ initialStores, setupError = null }: StoresDashboardProps) {
  const [stores, setStores] = useState(initialStores);
  const [query, setQuery] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [formState, setFormState] = useState<StoreFormState>(defaultFormState);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        ownerId: editingStore ? editingStore.id : formState.ownerId,
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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.9),_rgba(237,242,247,0.94)_40%,_rgba(226,232,240,0.9))] text-slate-900">
      <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 py-10 lg:px-10">
        <section className="overflow-hidden rounded-[2rem] border border-white/70 bg-white/80 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.12)] backdrop-blur">
          {setupError ? (
            <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {setupError}
            </div>
          ) : null}
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl space-y-4">
              <p className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                Prado Commerce Admin
              </p>
              <h1 className="text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
                Manage stores, domains, and tenant settings from one control plane.
              </h1>
              <p className="max-w-xl text-base leading-7 text-slate-600 sm:text-lg">
                Create merchant tenants, update currency and domain policy, and keep your storefront keys in sync with the platform API.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={openCreateModal}
                className="inline-flex items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                New store
              </button>
              <a
                href="/account-requests"
                className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
              >
                Account requests
              </a>
              <a
                href="/api/stores"
                className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
              >
                View API
              </a>
            </div>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <StatCard label="Stores" value={stores.length.toString()} note="Active tenant records" />
            <StatCard
              label="Domains"
              value={stores.filter((store) => Boolean(store.customDomain)).length.toString()}
              note="Stores with custom domains"
            />
            <StatCard
              label="Currencies"
              value={new Set(stores.map((store) => store.currency)).size.toString()}
              note="Configured commerce currencies"
            />
          </div>

          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-md">
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by name, slug, domain, or currency"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
              />
            </div>
            <p className="text-sm text-slate-500">
              {filteredStores.length} store{filteredStores.length === 1 ? "" : "s"} shown
            </p>
          </div>

          <div className="mt-8 grid gap-5 xl:grid-cols-2">
            {filteredStores.length === 0 ? (
              <div className="col-span-full rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-slate-500">
                No stores match your search.
              </div>
            ) : (
              filteredStores.map((store) => (
                <article
                  key={store.id}
                  className="group rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="text-xl font-semibold text-slate-950">{store.name}</h2>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                          {store.currency}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-slate-500">/{store.slug}</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => openEditModal(store)}
                      className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                    >
                      Edit
                    </button>
                  </div>

                  <dl className="mt-6 grid gap-4 text-sm text-slate-600 sm:grid-cols-2">
                    <DetailRow label="Custom domain" value={store.customDomain ?? "Not configured"} />
                    <DetailRow label="Timezone" value={store.timezone} />
                    <DetailRow
                      label="Allowed domains"
                      value={store.allowedDomains.length > 0 ? store.allowedDomains.join(", ") : "None"}
                    />
                    <DetailRow
                      label="Updated"
                      value={new Date(store.updatedAt).toLocaleDateString()}
                    />
                  </dl>
                </article>
              ))
            )}
          </div>
        </section>
      </main>

      {isCreateOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 py-8 backdrop-blur-sm">
          <div className="w-full max-w-2xl overflow-hidden rounded-[2rem] border border-white/60 bg-white shadow-2xl">
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
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {error}
                </div>
              ) : null}

              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Store name"
                  value={formState.name}
                  onChange={(value) => setFormState((current) => ({ ...current, name: value }))}
                  placeholder="My Brand"
                />
                <Field
                  label="Slug"
                  value={formState.slug}
                  onChange={(value) => setFormState((current) => ({ ...current, slug: value }))}
                  placeholder="my-brand"
                />
                <Field
                  label="Currency"
                  value={formState.currency}
                  onChange={(value) => setFormState((current) => ({ ...current, currency: value }))}
                  placeholder="USD"
                />
                <Field
                  label="Timezone"
                  value={formState.timezone}
                  onChange={(value) => setFormState((current) => ({ ...current, timezone: value }))}
                  placeholder="America/New_York"
                />
                <Field
                  label="Custom domain"
                  value={formState.customDomain}
                  onChange={(value) => setFormState((current) => ({ ...current, customDomain: value }))}
                  placeholder="checkout.mybrand.com"
                  className="sm:col-span-2"
                />
                <Field
                  label="Allowed domains"
                  value={formState.allowedDomains}
                  onChange={(value) => setFormState((current) => ({ ...current, allowedDomains: value }))}
                  placeholder="https://mybrand.com, https://store.mybrand.com"
                  className="sm:col-span-2"
                />
                {!editingStore ? (
                  <Field
                    label="Owner ID"
                    value={formState.ownerId}
                    onChange={(value) => setFormState((current) => ({ ...current, ownerId: value }))}
                    placeholder="clerk_user_123"
                    className="sm:col-span-2"
                  />
                ) : null}
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
    </div>
  );
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
    <div className="rounded-[1.5rem] border border-slate-200 bg-white px-5 py-4 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{value}</p>
      <p className="mt-1 text-sm text-slate-500">{note}</p>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
        {label}
      </dt>
      <dd className="mt-1 break-words text-slate-700">{value}</dd>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <label className={`flex flex-col gap-2 ${className}`.trim()}>
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white"
      />
    </label>
  );
}