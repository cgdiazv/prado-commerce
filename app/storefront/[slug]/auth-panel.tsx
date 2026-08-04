"use client";

import { useEffect, useState } from "react";

export type StorefrontCustomer = {
  id: string;
  storeId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  createdAt: string;
  updatedAt: string;
};

type AuthPanelProps = {
  storeId: string;
  initialCustomer: StorefrontCustomer | null;
};

export default function AuthPanel({ storeId, initialCustomer }: AuthPanelProps) {
  const [customer, setCustomer] = useState<StorefrontCustomer | null>(initialCustomer);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState(initialCustomer?.email ?? "");
  const [firstName, setFirstName] = useState(initialCustomer?.firstName ?? "");
  const [lastName, setLastName] = useState(initialCustomer?.lastName ?? "");
  const [status, setStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function loadCustomer() {
      try {
        const response = await fetch("/api/storefront/auth", { cache: "no-store" });
        const payload = await response.json();
        setCustomer(payload.customer ?? null);
      } catch {
        setCustomer(null);
      }
    }

    loadCustomer();
  }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setStatus(null);

    try {
      const response = await fetch("/api/storefront/auth", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: mode,
          storeId,
          email,
          firstName,
          lastName,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Unable to sign in to this storefront.");
      }

      setCustomer(payload.customer ?? null);
      setStatus(mode === "signup" ? "Account ready. You can continue shopping." : "Signed in successfully.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to complete this request.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function signOut() {
    await fetch("/api/storefront/auth", { method: "DELETE" });
    setCustomer(null);
    setStatus("Signed out.");
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">Shopper account</p>
          <p className="text-sm text-slate-500">
            {customer ? `Signed in as ${customer.email}` : "Create or access your storefront account"}
          </p>
        </div>
        {customer ? (
          <button
            type="button"
            onClick={signOut}
            className="rounded-full border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
          >
            Sign out
          </button>
        ) : null}
      </div>

      {!customer ? (
        <form onSubmit={submit} className="mt-5 space-y-3">
          <div className="flex gap-2 rounded-full border border-slate-200 p-1">
            <button
              type="button"
              onClick={() => setMode("signin")}
              className={`flex-1 rounded-full px-3 py-2 text-sm font-medium transition ${mode === "signin" ? "bg-slate-900 text-white" : "text-slate-600"}`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => setMode("signup")}
              className={`flex-1 rounded-full px-3 py-2 text-sm font-medium transition ${mode === "signup" ? "bg-slate-900 text-white" : "text-slate-600"}`}
            >
              Create account
            </button>
          </div>

          {mode === "signup" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none ring-0"
                placeholder="First name"
              />
              <input
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none ring-0"
                placeholder="Last name"
              />
            </div>
          ) : null}

          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none ring-0"
            placeholder="Email address"
            required
          />

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-full bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? "Working..." : mode === "signup" ? "Create account" : "Sign in"}
          </button>
        </form>
      ) : null}

      {status ? <p className="mt-4 text-sm text-slate-600">{status}</p> : null}
    </div>
  );
}
