"use client";

import Link from "next/link";
import { useState } from "react";
import { PradoLogo } from "@/components/PradoLogo";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useLanguage } from "@/lib/i18n/LanguageContext";

export default function ForgotPasswordPage() {
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("saving");
    setMessage(null);

    try {
      const response = await fetch("/api/auth/password-reset/request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const result = (await response.json()) as {
        error?: string;
        resetPath?: string;
      };

      if (!response.ok || !result.resetPath) {
        throw new Error(result.error ?? t.forgotPassword.errorMessage);
      }

      setStatus("success");
      setMessage(`${t.forgotPassword.successMessage}: ${new URL(result.resetPath, window.location.origin).toString()}`);
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : t.forgotPassword.errorMessage);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-[#f8fafc] px-4 py-12 text-slate-900 overflow-hidden">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-cyan-500/5 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[400px] h-[400px] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none" />

      <section className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 md:p-10 shadow-xl shadow-slate-200/50 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-2">
          <Link href="/" className="inline-block transition hover:opacity-85">
            <PradoLogo theme="light" subtitle={t.common.logoSubtitle} size="md" />
          </Link>
          <LanguageToggle variant="light" />
        </div>

        <h1 className="mt-4 text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">{t.forgotPassword.title}</h1>
        <p className="mt-1.5 text-sm text-slate-500 leading-relaxed">
          {t.forgotPassword.subtitle}
        </p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-slate-700">{t.forgotPassword.emailLabel}</span>
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder={t.forgotPassword.emailPlaceholder}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-600 focus:ring-2 focus:ring-cyan-600/20"
            />
          </label>

          {message ? (
            <p className={`rounded-xl px-3.5 py-2.5 text-sm font-medium ${status === "success" ? "border border-emerald-200 bg-emerald-50 text-emerald-800" : "border border-rose-200 bg-rose-50 text-rose-700"}`}>
              {message}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={status === "saving"}
            className="inline-flex w-full items-center justify-center rounded-xl bg-cyan-600 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-cyan-600/20 transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {status === "saving" ? t.forgotPassword.submitting : t.forgotPassword.submitButton}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-500">
          {t.forgotPassword.rememberedPassword}{" "}
          <Link href="/login" className="font-semibold text-cyan-600 hover:text-cyan-700 hover:underline">
            {t.forgotPassword.signIn}
          </Link>
        </p>
      </section>
    </main>
  );
}
