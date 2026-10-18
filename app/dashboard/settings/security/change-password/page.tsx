"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useLanguage } from "@/lib/i18n/language-context";

export default function ChangePasswordPage() {
  const router = useRouter();
  const { language } = useLanguage();
  const isEs = language === "es";

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!currentPassword) {
      setError(isEs ? "La contraseña actual es requerida." : "Current password is required.");
      return;
    }

    if (newPassword.length < 8) {
      setError(
        isEs
          ? "La nueva contraseña debe tener al menos 8 caracteres."
          : "New password must be at least 8 characters."
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(
        isEs
          ? "La confirmación de la contraseña no coincide."
          : "Password confirmation does not match."
      );
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch("/api/auth/security/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(
          result.error ?? (isEs ? "No se pudo cambiar la contraseña" : "Could not change password")
        );
      }

      router.push("/dashboard/settings");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : isEs
          ? "No se pudo cambiar la contraseña"
          : "Could not change password"
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="space-y-4">
      <div className="w-full">
        <div>
          <div className="flex items-start justify-between gap-4">
            <h1 className="text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">
              {isEs ? "Cambiar contraseña" : "Change password"}
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
              ? "Actualiza tu contraseña. Esto cerrará la sesión en todos los demás dispositivos activos."
              : "Update your password. This will sign out all other active devices."}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="space-y-4">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-slate-700">
              {isEs ? "Contraseña actual" : "Current password"}
            </span>
            <input
              type="password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              placeholder={isEs ? "Ingresa contraseña actual" : "Current password"}
              className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-slate-700">
              {isEs ? "Nueva contraseña" : "New password"}
            </span>
            <input
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              placeholder={isEs ? "Al menos 8 caracteres" : "At least 8 characters"}
              className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-slate-700">
              {isEs ? "Confirmar nueva contraseña" : "Confirm new password"}
            </span>
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder={isEs ? "Repite la nueva contraseña" : "Repeat new password"}
              className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
            />
          </label>

          {error ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
          ) : null}
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
            disabled={isSaving}
            className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? (isEs ? "Guardando..." : "Saving...") : isEs ? "Guardar cambios" : "Save changes"}
          </button>
        </div>
      </form>
    </section>
  );
}
