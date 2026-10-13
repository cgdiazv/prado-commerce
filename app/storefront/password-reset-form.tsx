"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";

type PasswordResetFormProps = {
  token: string;
  successPath: string;
  storeName: string;
};

export default function PasswordResetForm({ token, successPath, storeName }: PasswordResetFormProps) {
  const { t, language } = useLanguage();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError(t.storefront.passwordMinLength);
      return;
    }

    if (password !== confirmPassword) {
      setError(t.storefront.passwordsDoNotMatch);
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/storefront/password-reset/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(result.error || (language === "es" ? "No se pudo actualizar la contraseña." : "Could not update password"));
      }

      router.push(successPath);
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : (language === "es" ? "No se pudo actualizar la contraseña." : "Could not update password"));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-16 text-slate-100">
      <section className="w-full max-w-md rounded-xl border border-white/15 bg-white/8 p-8 backdrop-blur-md">
        <Link href="/" className="inline-block text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100 transition hover:text-cyan-50">
          {storeName}
        </Link>
        <h1 className="mt-3 text-3xl font-semibold text-white">
          {language === "es" ? "Elige una nueva contraseña" : "Choose a new password"}
        </h1>
        <p className="mt-2 text-sm text-slate-300">
          {language === "es" ? "Establece una nueva contraseña para tu cuenta." : "Set a new password for your storefront account."}
        </p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-200">{t.storefront.newPassword}</span>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={t.storefront.newPassword}
                className="w-full rounded-xl border border-white/20 bg-slate-900/70 px-4 py-3 pr-11 text-sm text-slate-100 outline-none transition focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-300/30"
              />
              <button
                type="button"
                aria-label={showPassword ? t.login.hidePassword : t.login.showPassword}
                onClick={() => setShowPassword((current) => !current)}
                className="absolute inset-y-0 right-0 inline-flex items-center justify-center px-3 text-slate-300 transition hover:text-cyan-100"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-200">{t.storefront.confirmNewPassword}</span>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                required
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder={t.storefront.confirmNewPassword}
                className="w-full rounded-xl border border-white/20 bg-slate-900/70 px-4 py-3 pr-11 text-sm text-slate-100 outline-none transition focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-300/30"
              />
              <button
                type="button"
                aria-label={showConfirmPassword ? t.login.hidePassword : t.login.showPassword}
                onClick={() => setShowConfirmPassword((current) => !current)}
                className="absolute inset-y-0 right-0 inline-flex items-center justify-center px-3 text-slate-300 transition hover:text-cyan-100"
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </label>

          {error ? <p className="rounded-xl border border-rose-300/40 bg-rose-400/15 px-3 py-2 text-sm text-rose-100">{error}</p> : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex w-full items-center justify-center rounded-xl bg-cyan-300 px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? t.storefront.updatingPassword : t.storefront.updatePassword}
          </button>
        </form>
      </section>
    </main>
  );
}