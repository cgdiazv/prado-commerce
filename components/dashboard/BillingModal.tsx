"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ShieldCheck, X, Check, ArrowRight, Sparkles, Zap, Building } from "lucide-react";
import { TRIAL_DAYS } from "@/lib/trial-check";
import { useLanguage } from "@/lib/i18n/LanguageContext";

interface BillingModalProps {
  userEmail?: string;
  userId?: string;
  currentPlan?: string;
}

export function BillingModal({ userEmail = "", userId = "", currentPlan = "STARTER" }: BillingModalProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { language } = useLanguage();
  const isEs = language === "es";

  const isExpiredParam = searchParams.get("expired") === "true";
  const isBillingParam = searchParams.get("billing") === "true";

  const [isOpen, setIsOpen] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(true);
  const [billingInterval, setBillingInterval] = useState<"month" | "year">("month");
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isExpiredParam || isBillingParam) {
      setIsOpen(true);
    }
  }, [isExpiredParam, isBillingParam]);

  if (!isOpen) return null;

  const handleClose = () => {
    if (!isExpiredParam) {
      setIsOpen(false);
      const params = new URLSearchParams(searchParams.toString());
      params.delete("billing");
      params.delete("expired");
      const query = params.toString() ? `?${params.toString()}` : "";
      router.push(`${pathname}${query}`);
    }
  };

  const handleSelectPlan = async (plan: "PRO" | "ENTERPRISE") => {
    setError(null);
    setLoadingPlan(plan);

    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan,
          interval: billingInterval,
        }),
      });

      const data = await res.json();
      if (data?.url) {
        window.location.assign(data.url);
      } else {
        setError(data?.error || (isEs ? "Error al iniciar pago." : "Failed to initiate checkout."));
      }
    } catch {
      setError(isEs ? "Error de conexión." : "Network error. Please try again.");
    } finally {
      setLoadingPlan(null);
    }
  };

  const handleDowngradeStarter = async () => {
    if (!userId) {
      setIsOpen(false);
      router.push("/dashboard");
      return;
    }
    setLoadingPlan("STARTER");
    try {
      const res = await fetch(`/api/admin/merchants/${userId}/plan`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: "STARTER" }),
      });
      if (res.ok) {
        setIsOpen(false);
        window.location.href = "/dashboard";
      } else {
        const data = await res.json();
        setError(data?.error || "Error");
      }
    } catch {
      setError(isEs ? "Error al cambiar al plan Starter." : "Failed to switch to Starter.");
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="max-w-xl w-full bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl relative text-slate-900 font-sans max-h-[90vh] overflow-y-auto">
        {/* Close Button (Only if not expired lock) */}
        {!isExpiredParam && (
          <button
            type="button"
            onClick={handleClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 transition cursor-pointer p-1.5 rounded-lg hover:bg-slate-100"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-cyan-50 border border-cyan-200 flex items-center justify-center text-cyan-600 shrink-0">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              {isExpiredParam
                ? isEs
                  ? `Tu prueba de ${TRIAL_DAYS} días ha concluido`
                  : `Your ${TRIAL_DAYS}-day trial has concluded`
                : isEs
                ? "Planes y Suscripción"
                : "Manage Subscription"}
            </h2>
            <p className="text-xs text-slate-500">
              {isExpiredParam
                ? isEs
                  ? "Para continuar usando tiendas ilimitadas, dominios y POS, elige un plan para continuar."
                  : "To continue with multi-store, custom domains, and POS features, choose an operating plan."
                : isEs
                ? "Mejora o administra tu suscripción de Prado Commerce."
                : "Upgrade or manage your Prado Commerce subscription plan."}
            </p>
          </div>
        </div>

        {/* Interval Toggle */}
        <div className="flex items-center justify-center">
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setBillingInterval("month")}
              className={`px-3 py-1.5 rounded-md transition ${
                billingInterval === "month"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {isEs ? "Facturación Mensual" : "Monthly Billing"}
            </button>
            <button
              type="button"
              onClick={() => setBillingInterval("year")}
              className={`px-3 py-1.5 rounded-md transition flex items-center gap-1.5 ${
                billingInterval === "year"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span>{isEs ? "Anual (Ahorra ~20%)" : "Annual (Save ~20%)"}</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
            {error}
          </div>
        )}

        {/* Plan Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Pro Card */}
          <div className="rounded-xl border-2 border-cyan-500 bg-cyan-50/20 p-5 flex flex-col justify-between space-y-4 relative">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-cyan-700">Tier 2</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-600 text-white">
                  {isEs ? "Más popular" : "Popular"}
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-cyan-600" />
                <span>Pro</span>
              </h3>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-extrabold text-slate-900">
                  {billingInterval === "year" ? "$39" : "$49"}
                </span>
                <span className="text-xs text-slate-500">{isEs ? "/ mes" : "/ mo"}</span>
              </div>
              <ul className="text-xs text-slate-600 space-y-1.5 pt-2">
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-cyan-600" />
                  <span>{isEs ? "Hasta 5 tiendas" : "Up to 5 stores"}</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-cyan-600" />
                  <span>{isEs ? "0% tarifa de plataforma" : "0% platform fee"}</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-cyan-600" />
                  <span>{isEs ? "Punto de Venta (POS)" : "POS register"}</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-cyan-600" />
                  <span>{isEs ? "Dominios personalizados" : "Custom domains"}</span>
                </li>
              </ul>
            </div>
            <button
              type="button"
              disabled={loadingPlan === "PRO" || !acceptedTerms}
              onClick={() => handleSelectPlan("PRO")}
              className="w-full inline-flex items-center justify-center gap-1.5 bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold py-2.5 rounded-lg transition disabled:opacity-50 cursor-pointer shadow-xs"
            >
              <span>{loadingPlan === "PRO" ? (isEs ? "Cargando..." : "Loading...") : isEs ? "Elegir Pro" : "Choose Pro"}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Enterprise Card */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 flex flex-col justify-between space-y-4 hover:border-slate-300 transition">
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Tier 3</span>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-1.5">
                <Building className="w-4 h-4 text-slate-700" />
                <span>Enterprise</span>
              </h3>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-extrabold text-slate-900">
                  {billingInterval === "year" ? "$159" : "$199"}
                </span>
                <span className="text-xs text-slate-500">{isEs ? "/ mes" : "/ mo"}</span>
              </div>
              <ul className="text-xs text-slate-600 space-y-1.5 pt-2">
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-cyan-600" />
                  <span>{isEs ? "Tiendas ilimitadas" : "Unlimited stores"}</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-cyan-600" />
                  <span>{isEs ? "0% tarifa de plataforma" : "0% platform fee"}</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-cyan-600" />
                  <span>{isEs ? "ShipStation integrado" : "ShipStation integration"}</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-cyan-600" />
                  <span>{isEs ? "Soporte prioritario" : "Priority 24/7 support"}</span>
                </li>
              </ul>
            </div>
            <button
              type="button"
              disabled={loadingPlan === "ENTERPRISE" || !acceptedTerms}
              onClick={() => handleSelectPlan("ENTERPRISE")}
              className="w-full inline-flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold py-2.5 rounded-lg transition disabled:opacity-50 cursor-pointer shadow-xs"
            >
              <span>{loadingPlan === "ENTERPRISE" ? (isEs ? "Cargando..." : "Loading...") : isEs ? "Elegir Enterprise" : "Choose Enterprise"}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Option to continue on Starter if expired */}
        {isExpiredParam && (
          <div className="pt-2 text-center border-t border-slate-100">
            <button
              type="button"
              onClick={handleDowngradeStarter}
              disabled={loadingPlan === "STARTER"}
              className="text-xs font-medium text-slate-500 hover:text-slate-800 underline transition cursor-pointer"
            >
              {isEs
                ? "Continuar con el Plan Starter gratuito ($0/mes, límites básicos)"
                : "Continue with free Starter plan ($0/mo, basic limits)"}
            </button>
          </div>
        )}

        {/* Legal & Terms Acceptance */}
        <div className="space-y-2 pt-1 border-t border-slate-100 text-[11px] text-slate-500">
          <label className="flex items-start gap-2 text-left cursor-pointer">
            <input
              type="checkbox"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
            />
            <span>
              {isEs ? (
                <>
                  Acepto los{" "}
                  <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-cyan-700 underline">
                    Términos de Servicio
                  </a>{" "}
                  y la{" "}
                  <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-cyan-700 underline">
                    Política de Privacidad
                  </a>{" "}
                  de Prado.
                </>
              ) : (
                <>
                  I agree to Prado&apos;s{" "}
                  <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-cyan-700 underline">
                    Terms
                  </a>{" "}
                  and{" "}
                  <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-cyan-700 underline">
                    Privacy Policy
                  </a>
                  .
                </>
              )}
            </span>
          </label>
          <p className="text-slate-400">
            {isEs
              ? "Los pagos son procesados de forma segura mediante Stripe."
              : "Payments are securely processed via Stripe."}
          </p>
        </div>
      </div>
    </div>
  );
}

export default BillingModal;
