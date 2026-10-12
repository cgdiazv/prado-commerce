"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useLanguage } from "@/lib/i18n/language-context";

const MERCHANT_PROFILE_CACHE_KEY = "prado_merchant_profile_contact";

export default function StoreProfilePage() {
  const router = useRouter();
  const { language } = useLanguage();
  const isEs = language === "es";

  const [merchantName, setMerchantName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [addressType, setAddressType] = useState("Choose address type");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    async function loadMerchantProfile() {
      try {
        setIsLoading(true);
        const response = await fetch("/api/auth/me", { cache: "no-store" });
        const data = await response.json();

        if (!response.ok) {
          if (response.status === 401) {
            throw new Error(
              isEs
                ? "Tu sesión ha expirado. Por favor inicia sesión de nuevo."
                : "Your session has expired. Please sign in again."
            );
          }
          throw new Error(
            data.error ||
              (isEs
                ? "No se pudo cargar el perfil del comerciante."
                : "Unable to load merchant profile.")
          );
        }

        setMerchantName(data.name || "");
        setCompany(data.company || "");
        setEmail(data.email || "");
        setPhone(data.phone ? data.phone.replace(/\D/g, "") : "");
        setAddress(data.address || "");
        setAddressType(data.addressType || "Choose address type");

        // Cache fallback
        const rawCache = localStorage.getItem(MERCHANT_PROFILE_CACHE_KEY);
        if (rawCache) {
          try {
            const cached = JSON.parse(rawCache);
            if (!data.phone && cached.phone) setPhone(cached.phone);
            if (!data.address && cached.address) setAddress(cached.address);
            if (!data.addressType && cached.addressType) setAddressType(cached.addressType);
          } catch {
            // ignore cache parse errors
          }
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : isEs
            ? "No se pudo cargar el perfil del comerciante."
            : "Unable to load merchant profile."
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadMerchantProfile();
  }, [isEs]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: merchantName.trim(),
          company: company.trim(),
          phone: phone.trim(),
          address: address.trim(),
          addressType:
            addressType === "Choose address type" || addressType === "Elegir tipo de dirección"
              ? ""
              : addressType,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ??
            (isEs
              ? "No se pudo guardar el perfil del comerciante."
              : "Unable to save merchant profile.")
        );
      }

      localStorage.setItem(
        MERCHANT_PROFILE_CACHE_KEY,
        JSON.stringify({
          address: address.trim(),
          phone: phone.trim(),
          addressType:
            addressType === "Choose address type" || addressType === "Elegir tipo de dirección"
              ? ""
              : addressType,
        })
      );

      setSuccess(
        isEs
          ? "Perfil del comerciante actualizado correctamente."
          : "Merchant profile updated successfully."
      );
      router.refresh();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : isEs
          ? "No se pudo guardar el perfil del comerciante."
          : "Unable to save merchant profile."
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="space-y-4">
      <div className="w-full">
        <div>
          <p className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
            {isEs ? "Configuración" : "Settings"}
          </p>
          <div className="mt-4 flex items-start justify-between gap-4">
            <h1 className="text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">
              {isEs ? "Perfil del comerciante" : "Merchant profile"}
            </h1>

            <Link
              href="/dashboard/settings"
              className="inline-flex shrink-0 items-center rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              {isEs ? "← Volver a configuración" : "← Back to settings"}
            </Link>
          </div>
          <p className="mt-4 text-base leading-7 text-slate-600 sm:max-w-xl sm:text-lg">
            {isEs
              ? "Gestiona los datos de tu cuenta comercial, identidad fiscal y datos oficiales de contacto."
              : "Manage your merchant account details, legal business identity, and official contact information."}
          </p>
        </div>
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

          {isLoading ? (
            <div className="py-8 text-center text-sm text-slate-500">
              {isEs ? "Cargando perfil comercial..." : "Loading merchant profile..."}
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-semibold text-slate-900">
                  {isEs ? "Nombre del titular" : "Merchant name"}
                </label>
                <p className="mt-1 text-sm text-slate-500">
                  {isEs
                    ? "Nombre legal completo del propietario de la cuenta."
                    : "Full legal name of the merchant account owner."}
                </p>
                <input
                  type="text"
                  value={merchantName}
                  onChange={(e) => setMerchantName(e.target.value)}
                  placeholder="e.g. Carlos Diaz del Valle"
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-900">
                  {isEs ? "Nombre de la empresa / Razón social" : "Company / Business name"}
                </label>
                <p className="mt-1 text-sm text-slate-500">
                  {isEs
                    ? "Nombre oficial registrado de la empresa o negocio."
                    : "Official registered company or business name."}
                </p>
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="e.g. Indeva Websites"
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-900">
                  {isEs ? "Dirección" : "Address"}
                </label>
                <textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder={
                    isEs
                      ? "Calle y número, colonia, ciudad, estado, código postal"
                      : "Street address, city, state, postal code"
                  }
                  className="mt-2 min-h-24 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-900">
                  {isEs ? "Tipo de dirección" : "Address type"}
                </label>
                <select
                  value={addressType}
                  onChange={(e) => setAddressType(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400 bg-white"
                >
                  <option value="Choose address type">
                    {isEs ? "Elegir tipo de dirección" : "Choose address type"}
                  </option>
                  <option value="Home office">{isEs ? "Oficina en casa / Residencia" : "Home office"}</option>
                  <option value="Corporate office">{isEs ? "Oficina corporativa" : "Corporate office"}</option>
                  <option value="Warehouse">{isEs ? "Almacén / Depósito" : "Warehouse"}</option>
                  <option value="Retail store">{isEs ? "Tienda física" : "Retail store"}</option>
                  <option value="Other">{isEs ? "Otro" : "Other"}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-900">
                  {isEs ? "Correo electrónico" : "Email"}
                </label>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  {isEs
                    ? "Correo principal de acceso y notificaciones de la cuenta."
                    : "Primary login and account notification email address."}
                </p>
                <input
                  type="email"
                  value={email}
                  readOnly
                  disabled
                  placeholder="name@company.com"
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 outline-none cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-900">
                  {isEs ? "Teléfono" : "Phone"}{" "}
                  <span className="font-normal text-slate-500">
                    {isEs ? "(opcional)" : "(optional)"}
                  </span>
                </label>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  {isEs
                    ? "Número telefónico principal para verificación y facturación."
                    : "Primary merchant phone number for account verification and billing."}
                </p>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                  placeholder="e.g. 8329558892"
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
                />
              </div>
            </>
          )}
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Link
            href="/dashboard/settings"
            className="rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 text-center"
          >
            {isEs ? "Cancelar" : "Cancel"}
          </Link>
          <button
            type="submit"
            disabled={isSaving || isLoading}
            className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSaving ? (isEs ? "Guardando..." : "Saving...") : isEs ? "Guardar cambios" : "Save changes"}
          </button>
        </div>
      </form>
    </section>
  );
}
