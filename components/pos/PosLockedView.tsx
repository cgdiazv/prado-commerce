"use client";

import Link from "next/link";
import { Lock, Store, Zap, CheckCircle2, ArrowRight } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";

type PosLockedViewProps = {
  title?: string;
  subtitle?: string;
  returnHref?: string;
};

export function PosLockedView({
  title,
  subtitle,
  returnHref = "/dashboard",
}: PosLockedViewProps) {
  const { language } = useLanguage();
  const isEs = language === "es";

  return (
    <div className="mx-auto flex min-h-[500px] w-full max-w-2xl flex-col items-center justify-center p-6 text-center">
      <div className="relative mb-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700 border border-cyan-100 shadow-sm">
          <Store className="h-8 w-8" />
        </div>
        <div className="absolute -bottom-1.5 -right-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-white shadow-md">
          <Lock className="h-3.5 w-3.5" />
        </div>
      </div>

      <div className="inline-flex items-center gap-1.5 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-cyan-800 mb-3">
        <Zap className="h-3 w-3" />
        {isEs ? "Función de Prado Commerce Pro" : "Prado Commerce Pro Feature"}
      </div>

      <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
        {title ?? (isEs ? "Punto de Venta (TPV/POS) Bloqueado" : "Point of Sale (POS) Locked")}
      </h1>

      <p className="mt-2.5 max-w-lg text-sm text-slate-500 leading-relaxed">
        {subtitle ??
          (isEs
            ? "El Punto de Venta para mostrador y tiendas físicas está reservado para comerciantes en los planes Pro y Enterprise. Actualiza tu suscripción para desbloquear terminales y cajeros."
            : "The Point of Sale register for retail and in-person checkout is reserved for merchants on Pro and Enterprise tiers. Upgrade your plan to unlock registers and cashier management.")}
      </p>

      <div className="mt-8 w-full rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-xs">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
          {isEs ? "Incluido con Pro & Enterprise:" : "Included with Pro & Enterprise:"}
        </p>
        <ul className="grid gap-2.5 sm:grid-cols-2 text-sm text-slate-700">
          <li className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-cyan-600 shrink-0" />
            <span>{isEs ? "Cajeros ilimitados con PIN" : "Unlimited cashiers with PIN"}</span>
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-cyan-600 shrink-0" />
            <span>{isEs ? "Impresión de recibos térmicos" : "Thermal receipt printing"}</span>
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-cyan-600 shrink-0" />
            <span>{isEs ? "Múltiples terminales y cajas" : "Multiple registers & terminals"}</span>
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-cyan-600 shrink-0" />
            <span>{isEs ? "Sincronización de inventario" : "Real-time stock sync"}</span>
          </li>
        </ul>
      </div>

      <div className="mt-8 flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
        <Link
          href="/dashboard/settings/manage-plan-panel"
          className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
        >
          <span>{isEs ? "Actualizar a Pro" : "Upgrade to Pro"}</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
        <Link
          href={returnHref}
          className="inline-flex w-full sm:w-auto items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
        >
          {isEs ? "Regresar al panel" : "Back to dashboard"}
        </Link>
      </div>
    </div>
  );
}
