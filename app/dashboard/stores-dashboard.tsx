"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { getPlanLimits } from "@/lib/subscription";
import { useLanguage } from "@/lib/i18n/LanguageContext";

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

type DomainSetupNotice = {
  storeId: string;
  storeName: string;
  domain: string;
  status: "valid" | "pending" | "invalid" | "unknown" | null;
};

export function StoresDashboard({ initialStores, currentPlan = "STARTER", setupError = null }: StoresDashboardProps) {
  const { language } = useLanguage();
  const isEs = language === "es";
  const [stores, setStores] = useState(initialStores);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [domainSetupNotice, setDomainSetupNotice] = useState<DomainSetupNotice | null>(null);
  const [domainStatusError, setDomainStatusError] = useState<string | null>(null);
  const [isCheckingDomainStatus, setIsCheckingDomainStatus] = useState(false);
  const [deletingStoreId, setDeletingStoreId] = useState<string | null>(null);
  const limits = getPlanLimits(currentPlan);
  const isStarter = currentPlan === "STARTER";
  const isPro = currentPlan === "PRO";
  const hasReachedStoreLimit = stores.length >= limits.maxStores;

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

  async function handleCheckDomainStatus() {
    if (!domainSetupNotice) {
      return;
    }

    setIsCheckingDomainStatus(true);
    setDomainStatusError(null);

    try {
      const response = await fetch(`/api/stores/${domainSetupNotice.storeId}/domain-status`, {
        cache: "no-store",
      });

      const result = await response.json() as {
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
        if (!current) {
          return current;
        }

        return {
          storeId: result.storeId ?? current.storeId,
          storeName: result.storeName ?? current.storeName,
          domain: result.domain ?? current.domain,
          status: result.status ?? "unknown",
        };
      });
    } catch (statusError) {
      setDomainStatusError(
        statusError instanceof Error
          ? statusError.message
          : "Failed to check domain status",
      );
    } finally {
      setIsCheckingDomainStatus(false);
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

      {domainSetupNotice ? (
        <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 px-4 py-4 text-sm text-blue-900">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold">
                {isEs
                  ? `Dominio personalizado guardado para ${domainSetupNotice.storeName}`
                  : `Custom domain saved for ${domainSetupNotice.storeName}`}
              </p>
              <p className="mt-1 break-all text-blue-800">{domainSetupNotice.domain}</p>
              <p className="mt-1 text-blue-900">
                {isEs ? "Estado: " : "Status: "}
                {domainSetupNotice.status === "valid"
                  ? (isEs ? "Verificado" : "Verified")
                  : domainSetupNotice.status === "pending"
                    ? (isEs ? "Verificación pendiente" : "Pending verification")
                    : domainSetupNotice.status === "invalid"
                      ? (isEs ? "Requiere configuración DNS" : "Needs DNS fix")
                      : (isEs ? "Comprobando..." : "Checking")}
              </p>
              <div className="mt-3 space-y-2 text-blue-800">
                <p className="font-medium">{isEs ? "Configuración DNS:" : "DNS setup:"}</p>
                <p>
                  {isEs
                    ? `1. Subdominio (recomendado): añade un CNAME para ${domainSetupNotice.domain} apuntando a cname.vercel-dns.com.`
                    : `1. Subdomain (recommended): add CNAME for ${domainSetupNotice.domain} pointing to cname.vercel-dns.com.`}
                </p>
                <p>
                  {isEs
                    ? "2. Dominio raíz (apex): añade un registro A @ apuntando a 76.76.21.21, y añade un CNAME para www a cname.vercel-dns.com."
                    : "2. Apex domain: add A record @ pointing to 76.76.21.21, and add CNAME for www to cname.vercel-dns.com."}
                </p>
                <p>
                  {isEs
                    ? `3. Espera la propagación y abre https://${domainSetupNotice.domain} para verificar el enrutamiento de la tienda.`
                    : `3. Wait for propagation, then open https://${domainSetupNotice.domain} to verify storefront routing.`}
                </p>
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
                className="rounded-full border border-blue-300 px-3 py-1.5 text-xs font-semibold text-blue-800 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isCheckingDomainStatus
                  ? (isEs ? "Comprobando..." : "Checking...")
                  : (isEs ? "Comprobar estado" : "Check status")}
              </button>
              <button
                type="button"
                onClick={() => {
                  setDomainSetupNotice(null);
                  setDomainStatusError(null);
                }}
                className="rounded-full border border-blue-300 px-3 py-1.5 text-xs font-semibold text-blue-800 transition hover:bg-blue-100"
              >
                {isEs ? "Descartar" : "Dismiss"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <div className="flex flex-wrap items-center gap-2">
            <p className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
              {isEs ? "Tiendas" : "Stores"}
            </p>
          </div>
          <h1 className="mt-1 text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">
            {isEs ? "Tus tiendas, productos y configuración en un solo lugar." : "Your stores, products, and settings in one place."}
          </h1>
          <p className="mt-1 max-w-xl text-sm text-slate-500">
            {isEs ? "Crea y administra tus tiendas virtuales, y configura dominios y monedas." : "Create and manage your storefronts, and configure domains and currencies."}
          </p>
            </div>

            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap">
              <div className="group relative w-full sm:w-auto">
                {hasReachedStoreLimit ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (isStarter) {
                        setError(isEs ? "El plan Starter incluye 1 tienda activa. Actualiza a Pro para tener hasta 5 tiendas." : "Starter plan includes 1 active store. Upgrade to Prado Commerce Pro to add up to 5 stores.");
                      } else if (isPro) {
                        setError(isEs ? "El plan Pro incluye hasta 5 tiendas activas. Actualiza a Enterprise para tiendas ilimitadas." : "Pro plan includes up to 5 active stores. Upgrade to Prado Commerce Enterprise for unlimited stores.");
                      } else {
                        setError(isEs ? "Límite de tiendas alcanzado para tu plan actual." : "Store limit reached for your current plan.");
                      }
                    }}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white opacity-60 sm:w-auto"
                  >
                    <Plus className="h-4 w-4" />
                    {isEs ? "Nueva tienda" : "New store"}
                  </button>
                ) : (
                  <Link
                    href="/dashboard/stores/new"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 sm:w-auto"
                  >
                    <Plus className="h-4 w-4" />
                    {isEs ? "Nueva tienda" : "New store"}
                  </Link>
                )}
                {hasReachedStoreLimit ? (
                  <div className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 hidden w-72 -translate-x-1/2 rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2 text-sm text-cyan-800 shadow-lg group-hover:block group-focus-within:block sm:w-80">
                    {isStarter
                      ? (isEs ? "El plan Starter incluye hasta 1 tienda activa y no admite dominios personalizados. Actualiza a Pro para desbloquear 5 tiendas y dominios propios." : "Starter plan includes up to 1 active store and does not support custom domains. Upgrade to Prado Commerce Pro to unlock 5 stores and custom domains.")
                      : isPro
                        ? (isEs ? "El plan Pro incluye hasta 5 tiendas activas. Actualiza a Enterprise para tiendas ilimitadas." : "Pro plan includes up to 5 active stores. Upgrade to Prado Commerce Enterprise to unlock unlimited stores.")
                        : (isEs ? "Límite de tiendas alcanzado para tu plan." : "Store limit reached for your current plan.")}
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
                placeholder={isEs ? "Buscar por nombre, slug, dominio o moneda" : "Search by name, slug, domain, or currency"}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
              />
            </div>
            <p className="text-sm text-slate-500">
              {isEs
                ? `${filteredStores.length} tienda${filteredStores.length === 1 ? "" : "s"} mostrada${filteredStores.length === 1 ? "" : "s"}`
                : `${filteredStores.length} store${filteredStores.length === 1 ? "" : "s"} shown`}
            </p>
          </div>

          <div className="mt-8 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            {filteredStores.length === 0 ? (
              <div className="p-10 text-center text-slate-500">
                {isEs ? "No hay tiendas que coincidan con tu búsqueda." : "No stores match your search."}
              </div>
            ) : (
              <>
                <div className="hidden overflow-x-auto md:block">
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold text-slate-600">{isEs ? "Tienda" : "Store"}</th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-600">{isEs ? "Dominio" : "Domain"}</th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-600">{isEs ? "Moneda" : "Currency"}</th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-600">{isEs ? "Zona horaria" : "Timezone"}</th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-600">{isEs ? "Dominios autorizados" : "Allowed domains"}</th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-600">{isEs ? "Actualizado" : "Updated"}</th>
                        <th className="px-4 py-3 text-right font-semibold text-slate-600">{isEs ? "Acciones" : "Actions"}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {filteredStores.map((store) => {
                        const domainLabel = store.customDomain || `${store.slug}.pradocommerce.com`;

                        return (
                          <tr key={store.id} className="hover:bg-slate-50/70">
                            <td className="px-4 py-3 align-top">
                              <Link
                                href={`/dashboard/stores/${store.id}`}
                                className="group text-left"
                              >
                                <p className="font-semibold text-slate-900 transition group-hover:text-cyan-700">{store.name}</p>
                                <p className="text-xs text-slate-500">/{store.slug}</p>
                              </Link>
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
                              {store.allowedDomains.length > 0
                                ? store.allowedDomains.join(", ")
                                : (isEs ? "Ninguno" : "None")}
                            </td>
                            <td className="px-4 py-3 align-top text-slate-600">
                              {new Date(store.updatedAt).toLocaleDateString(isEs ? "es-ES" : "en-US")}
                            </td>
                            <td className="px-4 py-3 align-top">
                              <div className="flex justify-end gap-2">
                                <Link
                                  href={`/dashboard/stores/${store.id}`}
                                  aria-label={isEs ? "Editar tienda" : "Edit store"}
                                  title={isEs ? "Editar tienda" : "Edit store"}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                                >
                                  <Pencil className="h-4 w-4" />
                                </Link>
                                <button
                                  type="button"
                                  disabled={deletingStoreId === store.id}
                                  onClick={() => {
                                    if (
                                      confirm(
                                        isEs
                                          ? `¿Eliminar "${store.name}"? Esta acción no se puede deshacer.`
                                          : `Delete "${store.name}"? This cannot be undone.`,
                                      )
                                    ) {
                                      void handleDelete(store.id);
                                    }
                                  }}
                                  aria-label={isEs ? "Eliminar tienda" : "Delete store"}
                                  title={deletingStoreId === store.id ? (isEs ? "Eliminando..." : "Deleting") : (isEs ? "Eliminar" : "Delete")}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-rose-500 transition hover:bg-rose-50 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
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
                            <Link
                              href={`/dashboard/stores/${store.id}`}
                              className="group text-left"
                            >
                              <p className="font-semibold text-slate-900 transition group-hover:text-cyan-700">{store.name}</p>
                              <p className="mt-1 text-xs text-slate-500">/{store.slug}</p>
                            </Link>
                          </div>
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                            {store.currency}
                          </span>
                        </div>

                        <div className="mt-3 flex flex-col gap-3 text-sm text-slate-600">
                          <div>
                            <p className="text-xs uppercase tracking-[0.16em] text-slate-400">
                              {isEs ? "Dominio" : "Domain"}
                            </p>
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
                            <p className="text-xs uppercase tracking-[0.16em] text-slate-400">
                              {isEs ? "Zona horaria" : "Timezone"}
                            </p>
                            <p className="mt-1 font-medium text-slate-700">{store.timezone}</p>
                          </div>
                        </div>

                        <div className="mt-3 border-t border-slate-200 pt-3">
                          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">
                            {isEs ? "Dominios autorizados" : "Allowed domains"}
                          </p>
                          <p className="mt-1 text-sm text-slate-600">
                            {store.allowedDomains.length > 0
                              ? store.allowedDomains.join(", ")
                              : (isEs ? "Ninguno" : "None")}
                          </p>
                        </div>

                        <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-200 pt-3">
                          <p className="text-sm text-slate-500">
                            {isEs ? "Actualizado " : "Updated "}
                            {new Date(store.updatedAt).toLocaleDateString(isEs ? "es-ES" : "en-US")}
                          </p>
                          <div className="flex w-full justify-end gap-2 sm:w-auto">
                            <Link
                              href={`/dashboard/stores/${store.id}`}
                              aria-label={isEs ? "Editar tienda" : "Edit store"}
                              title={isEs ? "Editar tienda" : "Edit store"}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                            >
                              <Pencil className="h-4 w-4" />
                            </Link>
                            <button
                              type="button"
                              disabled={deletingStoreId === store.id}
                              onClick={() => {
                                if (
                                  confirm(
                                    isEs
                                      ? `¿Eliminar "${store.name}"? Esta acción no se puede deshacer.`
                                      : `Delete "${store.name}"? This cannot be undone.`,
                                  )
                                ) {
                                  void handleDelete(store.id);
                                }
                              }}
                              aria-label={isEs ? "Eliminar tienda" : "Delete store"}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-rose-500 transition hover:bg-rose-50 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
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
    </>
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
    <div className="rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{value}</p>
      <p className="mt-1 text-sm text-slate-500">{note}</p>
    </div>
  );
}

export { Field, SelectField, CURRENCIES, TIMEZONES } from "./stores/store-form-controls";