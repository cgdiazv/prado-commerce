"use client";

import Link from "next/link";
import { useState } from "react";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [onboardUrl, setOnboardUrl] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("saving");
    setMessage(null);

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, email, company }),
      });

      const result = (await response.json()) as {
        error?: string;
        onboardUrl?: string;
      };

      if (!response.ok) {
        throw new Error(result.error ?? "Failed to create account");
      }

      setStatus("success");
      setOnboardUrl(result.onboardUrl ?? null);
      setName("");
      setEmail("");
      setCompany("");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Failed to submit request");
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-16 text-slate-100">
      <section className="w-full max-w-md rounded-xl border border-white/15 bg-white/8 p-8 backdrop-blur-md">
        <Link
          href="/"
          className="inline-block text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100 transition hover:text-cyan-50"
        >
          Prado Commerce
        </Link>
        <h1 className="mt-3 text-3xl font-semibold text-white">Create account</h1>
        <p className="mt-2 text-sm text-slate-300">
          Create your Prado Commerce dashboard account.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <Field label="Full name" value={name} onChange={setName} placeholder="Jane Merchant" required />
          <Field label="Work email" value={email} onChange={setEmail} placeholder="jane@brand.com" required />
          <Field label="Company (optional)" value={company} onChange={setCompany} placeholder="North Studio" />

          {status === "success" && onboardUrl ? (
            <div className="rounded-xl border border-emerald-300/40 bg-emerald-400/15 px-4 py-3 text-sm text-emerald-100">
              Account created.{" "}
              <a href={onboardUrl} className="font-semibold underline underline-offset-2 hover:text-emerald-50">
                Click here to set your password.
              </a>
            </div>
          ) : message ? (
            <div className="rounded-xl border border-rose-300/40 bg-rose-400/15 px-4 py-3 text-sm text-rose-100">
              {message}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={status === "saving"}
            className="inline-flex w-full items-center justify-center rounded-xl bg-cyan-300 px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {status === "saving" ? "Submitting..." : "Continue"}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-slate-300">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-cyan-200 hover:text-cyan-100">
            Sign in
          </Link>
        </p>
      </section>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-200">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full rounded-xl border border-white/20 bg-slate-900/70 px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-400 focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-300/30"
      />
    </label>
  );
}