"use client";

import { useState } from "react";
import type { CSSProperties } from "react";
import { Eye, EyeOff } from "lucide-react";
import { getStoreBrandingCssVars, normalizeMainColor } from "@/lib/branding";

type AuthPanelProps = {
  storeId: string;
  mainColor: string;
};

type PasswordResetRequestResponse = {
  error?: string;
  resetPath?: string;
};

type StorefrontAuthResponse = {
  error?: string;
};

export default function AuthPanel({ storeId, mainColor }: AuthPanelProps) {
  const [mode, setMode] = useState<"signin" | "signup" | "reset">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const resolvedMainColor = normalizeMainColor(mainColor);
  const colorVars = getStoreBrandingCssVars(resolvedMainColor) as CSSProperties;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setStatus(null);

    try {
      if (mode === "reset") {
        const response = await fetch("/api/storefront/password-reset/request", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ storeId, email }),
        });

        const payload = (await response.json()) as PasswordResetRequestResponse;

        if (!response.ok) {
          throw new Error(payload.error || "Unable to create a reset link.");
        }

        if (!payload.resetPath) {
          throw new Error("Reset link is unavailable right now. Please try again.");
        }

        const resetUrl = new URL(payload.resetPath, window.location.origin).toString();
        setStatus(`Reset link created: ${resetUrl}`);
        return;
      }

      if (mode === "signup" && password !== confirmPassword) {
        setStatus("Password confirmation does not match.");
        return;
      }

      const response = await fetch("/api/storefront/auth", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: mode,
          storeId,
          email,
          password,
          firstName,
          lastName,
        }),
      });

      const payload = (await response.json()) as StorefrontAuthResponse;
      if (!response.ok) {
        throw new Error(payload.error || "Unable to sign in to this storefront.");
      }

      if (mode === "signup") {
        // Do not keep shoppers signed in immediately after account creation.
        // This keeps the flow on sign-in as requested.
        await fetch("/api/storefront/auth", { method: "DELETE" });
        setMode("signin");
        setPassword("");
        setConfirmPassword("");
        setStatus("Account created. Please sign in.");
      } else {
        // Reload so the server-rendered account page can switch to the full sidebar layout.
        window.location.reload();
        return;
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to complete this request.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div style={colorVars} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-base font-semibold text-slate-900">
              {mode === "signin" ? "Sign in" : mode === "signup" ? "Sign up" : "Reset password"}
          </p>
            <p className="text-sm text-slate-500">Sign in to access your account dashboard.</p>
        </div>
      </div>

        <form onSubmit={submit} className="mt-5 space-y-3">
          <div className="flex gap-2 rounded-full border border-slate-200 p-1">
            <button
              type="button"
              onClick={() => setMode("signin")}
              className={`flex-1 rounded-full px-3 py-2 text-sm font-medium transition ${mode === "signin" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => setMode("signup")}
              className={`flex-1 rounded-full px-3 py-2 text-sm font-medium transition ${mode === "signup" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}
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

          {mode === "signup" ? (
            <>
              <div className="relative">
                <input
                  type={showSignupPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 pr-10 text-sm outline-none ring-0"
                  placeholder="Create a password"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowSignupPassword((current) => !current)}
                  className="absolute inset-y-0 right-2 inline-flex items-center text-slate-500 transition hover:text-slate-700"
                  aria-label={showSignupPassword ? "Hide password" : "Show password"}
                >
                  {showSignupPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 pr-10 text-sm outline-none ring-0"
                  placeholder="Confirm password"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((current) => !current)}
                  className="absolute inset-y-0 right-2 inline-flex items-center text-slate-500 transition hover:text-slate-700"
                  aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </>
          ) : mode !== "reset" ? (
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none ring-0"
              placeholder="Password"
              required
              minLength={6}
            />
          ) : null}

          {mode === "signin" ? (
            <button
              type="button"
              onClick={() => setMode("reset")}
              className="text-sm font-semibold text-cyan-700 hover:text-cyan-800"
            >
              Forgot password?
            </button>
          ) : null}

          {mode === "reset" ? (
            <button
              type="button"
              onClick={() => setMode("signin")}
              className="text-sm font-semibold text-cyan-700 hover:text-cyan-800"
            >
              Back to sign in
            </button>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-full bg-[var(--store-main-color)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--store-main-color-hover)] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? "Working..." : mode === "signup" ? "Create account" : mode === "reset" ? "Send reset link" : "Sign in"}
          </button>
      </form>

      {status ? <p className="mt-4 text-sm text-slate-600">{status}</p> : null}
    </div>
  );
}
