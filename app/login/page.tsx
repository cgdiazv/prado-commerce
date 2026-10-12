"use client";

import Link from "next/link";
import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { PradoLogo } from "@/components/PradoLogo";
import { useLanguage } from "@/lib/i18n/LanguageContext";

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nextPath = searchParams.get("next") || "/dashboard";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error || t.login.errorMessage);
      }

      router.push(nextPath);
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : t.login.errorMessage,
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-[#f8fafc] px-4 py-12 text-slate-900 overflow-hidden">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-cyan-500/5 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[400px] h-[400px] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none" />

      <section className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 md:p-10 shadow-xl shadow-slate-200/50 backdrop-blur-xl">
        <Link href="/" className="inline-block transition hover:opacity-85">
          <PradoLogo theme="light" subtitle={t.common.logoSubtitle} size="md" />
        </Link>

        <h1 className="mt-4 text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">{t.login.title}</h1>
        <p className="mt-1.5 text-sm text-slate-500 leading-relaxed">
          {t.login.subtitle}
        </p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-slate-700">{t.login.emailLabel}</span>
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder={t.login.emailPlaceholder}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-600 focus:ring-2 focus:ring-cyan-600/20"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-slate-700">{t.login.passwordLabel}</span>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={t.login.passwordPlaceholder}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 pr-11 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-600 focus:ring-2 focus:ring-cyan-600/20"
              />
              <button
                type="button"
                aria-label={showPassword ? t.login.hidePassword : t.login.showPassword}
                onClick={() => setShowPassword((current) => !current)}
                className="absolute inset-y-0 right-0 inline-flex items-center justify-center px-3 text-slate-400 transition hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </label>

          {error ? (
            <p className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm font-medium text-rose-700">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex w-full items-center justify-center rounded-xl bg-cyan-600 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-cyan-600/20 transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? t.login.submitting : t.login.submitButton}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-500">
          {t.login.needAccount}{" "}
          <Link href={nextPath ? `/signup?next=${encodeURIComponent(nextPath)}` : "/signup"} className="font-semibold text-cyan-600 hover:text-cyan-700 hover:underline">
            {t.login.startFree}
          </Link>
        </p>

        <p className="mt-2 text-center text-xs text-slate-500">
          {t.login.forgotPassword}{" "}
          <Link href="/forgot-password" className="font-semibold text-cyan-600 hover:text-cyan-700 hover:underline">
            {t.login.resetIt}
          </Link>
        </p>
      </section>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#f8fafc] px-6 py-16 text-slate-600">
          <p className="text-sm">Loading...</p>
        </main>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}
