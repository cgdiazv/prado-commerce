"use client";

import React from "react";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { ManagePlanPanel } from "./manage-plan-panel";
import { DeleteAccountPanel } from "./delete-account-panel";

interface SettingsViewProps {
  user: {
    id: string;
    plan: string;
  } | null;
}

export function SettingsView({ user }: SettingsViewProps) {
  const { language } = useLanguage();
  const isEs = language === "es";

  const accountProfileItems = [
    {
      title: isEs ? "Perfil de comerciante" : "Merchant profile",
      detail: isEs
        ? "Información básica de contacto y negocio para tu cuenta de comerciante."
        : "Basic contact and business information for your merchant account.",
      href: "/dashboard/settings/store-profile",
    },
    {
      title: isEs ? "Métodos de pago" : "Payments",
      detail: isEs
        ? "Administra las pasarelas de pago disponibles para las monedas admitidas."
        : "Manage payment methods available for supported currencies.",
      href: "/dashboard/settings/payments",
    },
    {
      title: isEs ? "Notificaciones por correo" : "Emails",
      detail: isEs
        ? "Configura correos de bienvenida al comprador, confirmación de pedidos y facturas."
        : "Configure buyer welcome, order confirmation, and invoice emails.",
      href: "/dashboard/settings/emails",
    },
    {
      title: isEs ? "Envíos" : "Shipping",
      detail: isEs
        ? "Configura dirección de origen, zonas de envío y tarifas de paquetería."
        : "Set origin address, shipping zones, and delivery services.",
      href: "/dashboard/settings/shipping",
    },
    {
      title: isEs ? "Impuestos" : "Tax",
      detail: isEs
        ? "Configura reglas de impuestos y servicios de cálculo fiscal."
        : "Configure tax rules and recommended tax services.",
      href: "/dashboard/settings/tax",
    },
    {
      title: isEs ? "Punto de Venta (POS)" : "Point of Sale (POS)",
      detail: isEs
        ? "Administra terminales físicas, cajas registradoras, cajeros autorizados y códigos PIN."
        : "Manage physical registers, checkouts, cashiers, and operator PINs.",
      href: "/dashboard/settings/pos",
    },
    {
      title: isEs ? "Configuración de la barra de tareas" : "Taskbar Settings",
      detail: isEs
        ? "Personaliza la posición y el comportamiento."
        : "Customize position and behavior.",
      href: "/dashboard/settings/taskbar",
    },
  ];

  const securityItems = [
    {
      title: isEs ? "Cambiar contraseña" : "Change password",
      detail: isEs
        ? "Actualiza tu contraseña de acceso para esta cuenta."
        : "Update your current password for this account.",
      href: "/dashboard/settings/security/change-password",
    },
    {
      title: isEs ? "Cerrar sesión en otros dispositivos" : "Sign out of all other devices",
      detail: isEs
        ? "Mantén este dispositivo activo y finaliza todas las demás sesiones."
        : "Keep this device signed in and end all other active sessions.",
      href: "/dashboard/settings/security/devices",
    },
  ];

  return (
    <section>
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">
            {isEs ? "Configuración de la Cuenta" : "Account Settings"}
          </h1>
          <p className="mt-1 max-w-xl text-sm text-slate-500">
            {isEs
              ? "Administra tu perfil, seguridad y preferencias de la tienda."
              : "Manage your profile, security, and notification preferences."}
          </p>
        </div>

        <div className="mt-8 space-y-5">
          <article className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <h2 className="px-4 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
              {isEs ? "Perfil de cuenta" : "Account profile"}
            </h2>
            <div className="border-t border-slate-200">
              {accountProfileItems.map((item) => (
                <Link
                  href={item.href}
                  key={item.title}
                  className="grid w-full grid-cols-[1.3fr_2fr_auto] items-center gap-4 border-b border-slate-200 px-4 py-3 text-left last:border-b-0 hover:bg-slate-50"
                >
                  <span className="text-sm font-semibold text-slate-900">{item.title}</span>
                  <span className="text-sm text-slate-500">{item.detail}</span>
                  <span className="text-lg text-slate-400" aria-hidden>
                    ›
                  </span>
                </Link>
              ))}
            </div>
          </article>

          <article className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <h2 className="px-4 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
              {isEs ? "Seguridad" : "Security"}
            </h2>
            <div className="border-t border-slate-200">
              {securityItems.map((item) => (
                <Link
                  href={item.href}
                  key={item.title}
                  className="grid w-full grid-cols-[1.3fr_2fr_auto] items-center gap-4 border-b border-slate-200 px-4 py-3 text-left last:border-b-0 hover:bg-slate-50"
                >
                  <span className="text-sm font-semibold text-slate-900">{item.title}</span>
                  <span className="text-sm text-slate-500">{item.detail}</span>
                  <span className="text-lg text-slate-400" aria-hidden>
                    ›
                  </span>
                </Link>
              ))}
            </div>
          </article>

          <article className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <h2 className="px-4 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
              {isEs ? "Acceso a la API" : "API access"}
            </h2>
            <div className="border-t border-slate-200">
              <Link
                href="/dashboard/settings/security/api"
                className="grid w-full grid-cols-[1.3fr_2fr_auto] items-center gap-4 px-4 py-3 text-left hover:bg-slate-50"
              >
                <span className="text-sm font-semibold text-slate-900">
                  {isEs ? "Claves de API" : "API keys"}
                </span>
                <span className="text-sm text-slate-500">
                  {isEs
                    ? "Consulta tus claves públicas y secretas por tienda."
                    : "View your publishable and secret API keys by store."}
                </span>
                <span className="text-lg text-slate-400" aria-hidden>
                  ›
                </span>
              </Link>
            </div>
          </article>
        </div>

        {user ? (
          <div className="space-y-5">
            <ManagePlanPanel merchantId={user.id} currentPlan={user.plan} />
            <DeleteAccountPanel />
          </div>
        ) : null}
      </div>
    </section>
  );
}
