"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useLanguage } from "@/lib/i18n/language-context";

export default function SignOutOtherDevicesPage() {
  const router = useRouter();
  const { language } = useLanguage();
  const isEs = language === "es";

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignOutOthers() {
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/security/signout-others", {
        method: "POST",
      });

      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(
          result.error ??
            (isEs
              ? "No se pudo cerrar sesión en otros dispositivos"
              : "Could not sign out other devices")
        );
      }

      router.push("/dashboard/settings");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : isEs
          ? "No se pudo cerrar sesión en otros dispositivos"
          : "Could not sign out other devices"
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="space-y-4">
      <div className="w-full">
        <div>
          <div className="flex items-start justify-between gap-4">
            <h1 className="text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">
              {isEs ? "Cerrar sesión en los demás dispositivos" : "Sign out of all other devices"}
            </h1>

            <Link
              href="/dashboard/settings"
              className="inline-flex shrink-0 items-center rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              {isEs ? "← Volver a configuración" : "← Back to settings"}
            </Link>
          </div>
          <p className="mt-1 max-w-xl text-sm text-slate-500">
            {isEs
              ? "Finaliza todas las sesiones activas en otros equipos manteniendo este dispositivo conectado."
              : "End all other active sessions while keeping this current device signed in."}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm leading-6 text-slate-600">
          {isEs
            ? "Usa esta opción si iniciaste sesión en una computadora pública o dispositivo antiguo y deseas revocar el acceso de inmediato."
            : "Use this action if you signed in on a shared or old device and want to close those sessions immediately."}
        </p>

        {error ? (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
        ) : null}

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Link
            href="/dashboard/settings"
            className="rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 text-center"
          >
            {isEs ? "Cancelar" : "Cancel"}
          </Link>
          <button
            type="button"
            onClick={handleSignOutOthers}
            disabled={isSubmitting}
            className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting
              ? isEs
                ? "Cerrando sesiones..."
                : "Signing out..."
              : isEs
              ? "Cerrar sesión en otros dispositivos"
              : "Sign out other devices"}
          </button>
        </div>
      </div>
    </section>
  );
}
