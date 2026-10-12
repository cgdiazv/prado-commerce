"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { normalizeStoreSlug } from "@/lib/store-slug";
import { getPlanLimits } from "@/lib/subscription";
import { useLanguage } from "@/lib/i18n/language-context";
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
  const { language } = useLanguage();
  const isEs = language === "es";

  const [formState, setFormState] = useState<StoreFormState>(defaultFormState);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [slugCheck, setSlugCheck] = useState<{
    slug: string;
    status: "checking" | "available" | "unavailable" | "error";
    message: string | null;
  } | null>(null);

  const limits = getPlanLimits(currentPlan);
  const isStarter = currentPlan === "STARTER";
  const isPro = currentPlan === "PRO";
  const hasReachedStoreLimit = initialStoreCount >= limits.maxStores;
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
            : isEs ? "No se pudo verificar la disponibilidad de la URL." : "Unable to check store URL availability.",
        });
      }
    }, 350);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [normalizedSlug, isEs]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (hasReachedStoreLimit) {
      if (isStarter) {
        setError(
          isEs
            ? "El plan Starter incluye 1 tienda activa. Actualiza a Prado Commerce Pro para añadir hasta 5 tiendas."
            : "Starter plan includes 1 active store. Upgrade to Prado Commerce Pro to add up to 5 stores."
        );
      } else if (isPro) {
        setError(
          isEs
            ? "El plan Pro incluye hasta 5 tiendas activas. Actualiza a Prado Commerce Enterprise para tiendas ilimitadas."
            : "Pro plan includes up to 5 active stores. Upgrade to Prado Commerce Enterprise for unlimited stores."
        );
      } else {
        setError(
          isEs
            ? "Has alcanzado el límite de tiendas de tu plan actual."
            : "Store limit reached for your current plan."
        );
      }
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
        throw new Error(
          availability.reason ?? (isEs ? "Esta URL de tienda no está disponible." : "This store URL is not available.")
        );
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
        throw new Error(result.error ?? (isEs ? "Ocurrió un error inesperado" : "Something went wrong"));
      }

      router.push("/dashboard/stores");
      router.refresh();
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : isEs
            ? "Error al crear la tienda"
            : "Failed to create store"
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="min-w-0 space-y-6">
      {setupError ? (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {setupError}
        </div>
      ) : null}

      {hasReachedStoreLimit ? (
        <div className="mb-6 rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm text-cyan-800">
          {isStarter
            ? isEs
              ? "El plan Starter incluye hasta 1 tienda activa y no admite dominios personalizados. Actualiza a Prado Commerce Pro para habilitar 5 tiendas y dominios personalizados."
              : "Starter plan includes up to 1 active store and does not support custom domains. Upgrade to Prado Commerce Pro to unlock 5 stores and custom domains."
            : isPro
              ? isEs
                ? "El plan Pro incluye hasta 5 tiendas activas. Actualiza a Prado Commerce Enterprise para tiendas ilimitadas."
                : "Pro plan includes up to 5 active stores. Upgrade to Prado Commerce Enterprise to unlock unlimited stores."
              : isEs
                ? "Has alcanzado el límite de tiendas de tu plan actual."
                : "Store limit reached for your current plan."}
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            {isEs ? "Nueva tienda" : "New store"}
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-950">
            {isEs ? "Crear una nueva tienda" : "Create a new storefront"}
          </h1>
        </div>
        <Link
          href="/dashboard/stores"
          className="rounded-full border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
        >
          {isEs ? "Volver" : "Back"}
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
            {isEs ? "Configuración de la tienda" : "Store configuration"}
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label={isEs ? "Nombre de la tienda" : "Store name"}
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
              placeholder={isEs ? "Mi Marca" : "My Brand"}
            />
            <div>
              <Field
                label={isEs ? "URL de la tienda" : "Store URL"}
                value={formState.slug}
                onChange={(value) => setFormState((current) => ({ ...current, slug: value }))}
                placeholder="mi-marca"
              />
              {normalizedSlug ? (
                <div className="mt-2 text-xs">
                  <p className="break-all text-slate-500">
                    https://{normalizedSlug}.pradocommerce.com
                  </p>
                  {currentSlugCheck?.status === "checking" ? (
                    <p className="mt-1 text-slate-500">
                      {isEs ? "Comprobando disponibilidad..." : "Checking availability..."}
                    </p>
                  ) : currentSlugCheck?.status === "available" ? (
                    <p className="mt-1 font-medium text-emerald-700">
                      {isEs ? "Disponible" : "Available"}
                    </p>
                  ) : currentSlugCheck?.status === "unavailable" ? (
                    <p className="mt-1 font-medium text-rose-700">{currentSlugCheck.message}</p>
                  ) : currentSlugCheck?.status === "error" ? (
                    <p className="mt-1 font-medium text-amber-700">{currentSlugCheck.message}</p>
                  ) : null}
                </div>
              ) : null}
            </div>
            <SelectField
              label={isEs ? "Moneda" : "Currency"}
              value={formState.currency}
              onChange={(value) => setFormState((current) => ({ ...current, currency: value }))}
              options={CURRENCIES}
            />
            <SelectField
              label={isEs ? "Zona horaria" : "Timezone"}
              value={formState.timezone}
              onChange={(value) => setFormState((current) => ({ ...current, timezone: value }))}
              options={TIMEZONES}
            />
            <Field
              label={isEs ? "Dominio personalizado (opcional)" : "Custom domain (optional)"}
              labelHint={
                isEs
                  ? "Usa un dominio de tu propiedad (por ejemplo de GoDaddy o Namecheap). Pasos: 1) Añade este dominio exacto en tu proveedor de DNS. 2) Apunta el DNS a tu tienda de Prado Commerce. 3) Guarda esta tienda y abre el dominio para verificar la ruta."
                  : "Use a domain you own (for example from GoDaddy). Next steps: 1) Add this exact domain in your DNS provider. 2) Point DNS to your Prado Commerce Storefront. 3) Save this store and open the domain to verify storefront routing."
              }
              value={formState.customDomain}
              onChange={(value) => setFormState((current) => ({ ...current, customDomain: value }))}
              placeholder="checkout.mimarca.com"
              className="sm:col-span-2"
            />
            <Field
              label={isEs ? "Dominios permitidos (opcional)" : "Allowed domains (optional)"}
              value={formState.allowedDomains}
              onChange={(value) => setFormState((current) => ({ ...current, allowedDomains: value }))}
              placeholder="https://mimarca.com, https://tienda.mimarca.com"
              className="sm:col-span-2"
            />
          </div>
        </div>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Link
            href="/dashboard/stores"
            className="rounded-full border border-slate-300 px-5 py-3 text-center text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            {isEs ? "Cancelar" : "Cancel"}
          </Link>
          <button
            type="submit"
            disabled={isSaving || hasReachedStoreLimit}
            className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving
              ? isEs ? "Guardando..." : "Saving..."
              : isEs ? "Crear tienda" : "Create store"}
          </button>
        </div>
      </form>
    </section>
  );
}

