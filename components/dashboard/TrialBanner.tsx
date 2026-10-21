"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Clock, ArrowUpRight } from "lucide-react";
import { TRIAL_DURATION_MS } from "@/lib/trial-check";
import { useLanguage } from "@/lib/i18n/LanguageContext";

interface TrialBannerProps {
  trialStartsAt: string | Date;
  planName?: string;
}

export function TrialBanner({ trialStartsAt, planName = "Pro" }: TrialBannerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { language } = useLanguage();
  const isEs = language === "es";

  const expiryDate = new Date(new Date(trialStartsAt).getTime() + TRIAL_DURATION_MS);
  const now = new Date();

  const diffMs = expiryDate.getTime() - now.getTime();
  const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  // If the trial has run out, don't show the active trial banner
  if (daysLeft <= 0) return null;

  const handleOpenBilling = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("billing", "true");
    router.push(`${pathname}?${params.toString()}`);
  };

  const title = isEs
    ? `Prueba gratuita activa · Plan ${planName}`
    : `Free Trial Active · ${planName} Plan`;

  const subtitle =
    daysLeft === 1
      ? isEs
        ? "Tu período de evaluación con acceso completo tiene 1 día restante."
        : "Your full-access evaluation period has 1 day remaining."
      : isEs
      ? `Tu período de evaluación con acceso completo tiene ${daysLeft} días restantes.`
      : `Your full-access evaluation period has ${daysLeft} days remaining.`;

  return (
    <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-cyan-950 text-white px-4 py-3 sm:px-5 sm:py-3.5 rounded-xl border border-cyan-500/30 shadow-md flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6 transition-all">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 shrink-0">
          <Clock className="w-4 h-4" />
        </span>
        <div>
          <p className="text-sm font-semibold tracking-tight text-white flex items-center gap-2">
            <span>{title}</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              30 DAYS
            </span>
          </p>
          <p className="text-xs text-slate-300 font-medium">
            {subtitle}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={handleOpenBilling}
        className="inline-flex items-center justify-center gap-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold px-4 py-2 rounded-lg transition whitespace-nowrap shadow-xs self-start sm:self-center cursor-pointer border-none outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 active:scale-95"
      >
        <span>{isEs ? "Actualizar plan" : "Upgrade Plan"}</span>
        <ArrowUpRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export default TrialBanner;
