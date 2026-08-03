"use client";

import Link from "next/link";
import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nextPath = searchParams.get("next") || "/stores";

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
        throw new Error(data.error || "Unable to sign in");
      }

      router.push(nextPath);
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to sign in",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-16 text-slate-100">
      <section className="w-full max-w-md rounded-3xl border border-white/15 bg-white/8 p-8 backdrop-blur-md">
        <Link
          href="/"
          className="inline-block text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100 transition hover:text-cyan-50"
        >
          Prado Commerce
        </Link>
        <h1 className="mt-3 text-3xl font-semibold text-white">Sign in to Dashboard</h1>
        <p className="mt-2 text-sm text-slate-300">
          Use the password you created from your Prado Commerce onboarding link.
        </p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-200">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="owner@brand.com"
              className="w-full rounded-xl border border-white/20 bg-slate-900/70 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-300/30"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-200">Password</span>
            <input
              type="password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Your dashboard password"
              className="w-full rounded-xl border border-white/20 bg-slate-900/70 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-300/30"
            />
          </label>

          {error ? (
            <p className="rounded-xl border border-rose-300/40 bg-rose-400/15 px-3 py-2 text-sm text-rose-100">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex w-full items-center justify-center rounded-xl bg-cyan-300 px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Signing in..." : "Continue"}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-slate-300">
          Need an account?{" "}
          <Link href="/signup" className="font-semibold text-cyan-200 hover:text-cyan-100">
            Create account
          </Link>
        </p>

        <p className="mt-3 text-center text-sm text-slate-300">
          Forgot your password?{" "}
          <Link href="/forgot-password" className="font-semibold text-cyan-200 hover:text-cyan-100">
            Reset it
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
        <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-16 text-slate-100">
          <p className="text-sm text-slate-300">Loading sign in...</p>
        </main>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}
