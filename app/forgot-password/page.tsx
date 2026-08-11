"use client";

import Link from "next/link";
import { useState } from "react";
import { PradoLogo } from "@/components/PradoLogo";

export default function ForgotPasswordPage() {
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
        throw new Error(result.error ?? "Could not create reset link");
      }

      setStatus("success");
      setMessage(`Password reset link created: ${new URL(result.resetPath, window.location.origin).toString()}`);
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Could not create reset link");
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-16 text-slate-100">
      <section className="w-full max-w-md rounded-xl border border-white/15 bg-white/8 p-8 backdrop-blur-md">
        <Link href="/" className="inline-block transition hover:opacity-85">
          <PradoLogo theme="dark" subtitle="Unified E-Commerce" size="md" />
        </Link>
        <h1 className="mt-3 text-3xl font-semibold text-white">Reset your password</h1>
        <p className="mt-2 text-sm text-slate-300">
          Enter the email for your Prado Commerce account and we will generate a reset link.
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

          {message ? (
            <p className={`rounded-xl px-3 py-2 text-sm ${status === "success" ? "border border-emerald-300/40 bg-emerald-400/15 text-emerald-100" : "border border-rose-300/40 bg-rose-400/15 text-rose-100"}`}>
              {message}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={status === "saving"}
            className="inline-flex w-full items-center justify-center rounded-xl bg-cyan-300 px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {status === "saving" ? "Creating link..." : "Create reset link"}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-slate-300">
          Remembered your password?{" "}
          <Link href="/login" className="font-semibold text-cyan-200 hover:text-cyan-100">
            Sign in
          </Link>
        </p>
      </section>
    </main>
  );
}
