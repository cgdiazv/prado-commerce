"use client";

import { useMemo, useState } from "react";

type ApiKey = {
  id: string;
  name: string;
  type: "PUBLISHABLE" | "SECRET";
  key: string;
  expiresAt: string | null;
  createdAt: string;
};

type VariantRef = {
  id: string;
  title: string;
  productTitle: string;
};

type StoreRecord = {
  id: string;
  name: string;
  slug: string;
  allowedDomains: string[];
  apiKeys: ApiKey[];
  variantRefs: VariantRef[];
};

type Props = {
  initialStores: StoreRecord[];
  apiHost: string;
};

export function ApiAccessClient({ initialStores, apiHost }: Props) {
  const [stores, setStores] = useState<StoreRecord[]>(initialStores);
  const [busyMap, setBusyMap] = useState<Record<string, boolean>>({});
  const [copiedMap, setCopiedMap] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  const hasStores = useMemo(() => stores.length > 0, [stores]);

  function setBusy(key: string, value: boolean) {
    setBusyMap((current) => ({ ...current, [key]: value }));
  }

  function markCopied(copyKey: string) {
    setCopiedMap((current) => ({ ...current, [copyKey]: true }));
    setTimeout(() => {
      setCopiedMap((current) => ({ ...current, [copyKey]: false }));
    }, 1800);
  }

  async function copyValue(copyKey: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setError(null);
      markCopied(copyKey);
    } catch {
      setError("Could not copy to clipboard on this browser session.");
    }
  }

  function CopyIcon({ copied }: { copied: boolean }) {
    if (copied) {
      return (
        <svg viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5" aria-hidden="true">
          <path d="M5 10l3 3 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    }

    return (
      <svg viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5" aria-hidden="true">
        <rect x="7" y="7" width="9" height="9" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <rect x="4" y="4" width="9" height="9" rx="2" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    );
  }

  async function createKey(storeId: string, type: "PUBLISHABLE" | "SECRET") {
    const busyKey = `create:${storeId}:${type}`;
    setBusy(busyKey, true);
    setError(null);

    try {
      const response = await fetch(`/api/stores/${storeId}/keys`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });

      const result = (await response.json()) as ApiKey & { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Could not create API key");

      setStores((current) =>
        current.map((store) =>
          store.id === storeId ? { ...store, apiKeys: [result, ...store.apiKeys] } : store,
        ),
      );
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Could not create API key");
    } finally {
      setBusy(busyKey, false);
    }
  }

  async function revokeKey(storeId: string, keyId: string) {
    const busyKey = `delete:${keyId}`;
    setBusy(busyKey, true);
    setError(null);

    try {
      const response = await fetch(`/api/stores/${storeId}/keys/${keyId}`, {
        method: "DELETE",
      });

      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Could not revoke API key");

      setStores((current) =>
        current.map((store) =>
          store.id === storeId
            ? { ...store, apiKeys: store.apiKeys.filter((apiKey) => apiKey.id !== keyId) }
            : store,
        ),
      );
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Could not revoke API key");
    } finally {
      setBusy(busyKey, false);
    }
  }

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      {error ? (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      ) : null}

      {!hasStores ? (
        <p className="text-sm text-slate-600">No stores found for this account yet.</p>
      ) : (
        <div className="space-y-5">
          {stores.map((store) => {
            const publishableKeys = store.apiKeys.filter((key) => key.type === "PUBLISHABLE");
            const secretKeys = store.apiKeys.filter((key) => key.type === "SECRET");

            return (
              <div key={store.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-4">
                  <h2 className="text-sm font-semibold text-slate-900">{store.name}</h2>
                  <p className="text-xs text-slate-500">{store.slug}</p>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 bg-white p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Store ID</p>
                      <button
                        type="button"
                        onClick={() => copyValue(`store:${store.id}:id`, store.id)}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-300 text-slate-700 transition hover:bg-slate-50"
                        aria-label={copiedMap[`store:${store.id}:id`] ? "Copied store ID" : "Copy store ID"}
                        title={copiedMap[`store:${store.id}:id`] ? "Copied" : "Copy"}
                      >
                        <CopyIcon copied={Boolean(copiedMap[`store:${store.id}:id`])} />
                        <span className="sr-only">{copiedMap[`store:${store.id}:id`] ? "Copied" : "Copy"}</span>
                      </button>
                    </div>
                    <p className="mt-2 break-all font-mono text-xs text-slate-700">{store.id}</p>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">API host URL</p>
                      <button
                        type="button"
                        onClick={() => copyValue(`store:${store.id}:apiHost`, apiHost)}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-300 text-slate-700 transition hover:bg-slate-50"
                        aria-label={copiedMap[`store:${store.id}:apiHost`] ? "Copied API host URL" : "Copy API host URL"}
                        title={copiedMap[`store:${store.id}:apiHost`] ? "Copied" : "Copy"}
                      >
                        <CopyIcon copied={Boolean(copiedMap[`store:${store.id}:apiHost`])} />
                        <span className="sr-only">{copiedMap[`store:${store.id}:apiHost`] ? "Copied" : "Copy"}</span>
                      </button>
                    </div>
                    <p className="mt-2 break-all font-mono text-xs text-slate-700">{apiHost}</p>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-3 md:col-span-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Allowed frontend domains</p>
                    {store.allowedDomains.length === 0 ? (
                      <p className="mt-2 text-sm text-slate-600">No domains configured.</p>
                    ) : (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {store.allowedDomains.map((domain) => (
                          <span key={domain} className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700">
                            {domain}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-3 md:col-span-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Variant IDs (add-to-cart)</p>
                    {store.variantRefs.length === 0 ? (
                      <p className="mt-2 text-sm text-slate-600">No product variants found.</p>
                    ) : (
                      <div className="mt-2 space-y-3">
                        <p className="text-sm text-slate-600">
                          {store.variantRefs.length} variant ID{store.variantRefs.length === 1 ? "" : "s"} available for custom add-to-cart embeds.
                        </p>
                        <details className="group rounded-lg border border-slate-200 bg-slate-50">
                          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-sm font-medium text-slate-700">
                            <span>View variant IDs</span>
                            <span className="text-xs text-slate-500 transition group-open:rotate-180">▾</span>
                          </summary>
                          <div className="space-y-2 border-t border-slate-200 px-3 py-3">
                            {store.variantRefs.map((variant) => (
                              <div key={variant.id} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                                <p className="text-xs font-medium text-slate-700">{variant.productTitle} · {variant.title}</p>
                                <p className="mt-1 break-all font-mono text-xs text-slate-600">{variant.id}</p>
                              </div>
                            ))}
                          </div>
                        </details>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Publishable API keys</p>
                    <button
                      type="button"
                      onClick={() => createKey(store.id, "PUBLISHABLE")}
                      disabled={busyMap[`create:${store.id}:PUBLISHABLE`]}
                      className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {busyMap[`create:${store.id}:PUBLISHABLE`] ? "Creating..." : "Create publishable key"}
                    </button>
                  </div>

                  {publishableKeys.length === 0 ? (
                    <p className="mt-2 text-sm text-slate-600">No publishable keys created.</p>
                  ) : (
                    <div className="mt-2 space-y-2">
                      {publishableKeys.map((apiKey) => (
                        <div key={apiKey.id} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-xs font-semibold text-slate-700">{apiKey.name}</p>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => copyValue(`key:${apiKey.id}`, apiKey.key)}
                                className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-300 text-slate-700 transition hover:bg-slate-100"
                                aria-label={copiedMap[`key:${apiKey.id}`] ? "Copied API key" : "Copy API key"}
                                title={copiedMap[`key:${apiKey.id}`] ? "Copied" : "Copy"}
                              >
                                <CopyIcon copied={Boolean(copiedMap[`key:${apiKey.id}`])} />
                                <span className="sr-only">{copiedMap[`key:${apiKey.id}`] ? "Copied" : "Copy"}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => revokeKey(store.id, apiKey.id)}
                                disabled={busyMap[`delete:${apiKey.id}`]}
                                className="rounded-full border border-rose-200 px-2.5 py-1 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {busyMap[`delete:${apiKey.id}`] ? "Revoking..." : "Revoke"}
                              </button>
                            </div>
                          </div>
                          <p className="mt-1 break-all font-mono text-xs text-slate-600">{apiKey.key}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Secret API keys</p>
                    <button
                      type="button"
                      onClick={() => createKey(store.id, "SECRET")}
                      disabled={busyMap[`create:${store.id}:SECRET`]}
                      className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {busyMap[`create:${store.id}:SECRET`] ? "Creating..." : "Create secret key"}
                    </button>
                  </div>

                  {secretKeys.length === 0 ? (
                    <p className="mt-2 text-sm text-slate-600">No secret keys created.</p>
                  ) : (
                    <div className="mt-2 space-y-2">
                      {secretKeys.map((apiKey) => (
                        <div key={apiKey.id} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-xs font-semibold text-slate-700">{apiKey.name}</p>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => copyValue(`key:${apiKey.id}`, apiKey.key)}
                                className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-300 text-slate-700 transition hover:bg-slate-100"
                                aria-label={copiedMap[`key:${apiKey.id}`] ? "Copied API key" : "Copy API key"}
                                title={copiedMap[`key:${apiKey.id}`] ? "Copied" : "Copy"}
                              >
                                <CopyIcon copied={Boolean(copiedMap[`key:${apiKey.id}`])} />
                                <span className="sr-only">{copiedMap[`key:${apiKey.id}`] ? "Copied" : "Copy"}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => revokeKey(store.id, apiKey.id)}
                                disabled={busyMap[`delete:${apiKey.id}`]}
                                className="rounded-full border border-rose-200 px-2.5 py-1 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {busyMap[`delete:${apiKey.id}`] ? "Revoking..." : "Revoke"}
                              </button>
                            </div>
                          </div>
                          <p className="mt-1 break-all font-mono text-xs text-slate-600">{apiKey.key}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </article>
  );
}
