"use client";

import { useState, useEffect, useCallback, Suspense, type MouseEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowUpRight, Check, Minus, Globe, Menu, X } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";

type BillingMode = "monthly" | "annual";
type StripePlan = "PRO" | "ENTERPRISE";

function PricingPageContent() {
  const searchParams = useSearchParams();
  const { language, setLanguage } = useLanguage();
  const isEs = language === "es";

  const [billingMode, setBillingMode] = useState<BillingMode>("monthly");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState<string | null>(null);

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  const handleUpgrade = useCallback(
    async (
      event: MouseEvent<HTMLButtonElement | HTMLAnchorElement> | null,
      planName: "Starter" | "Pro" | "Enterprise",
      forcedInterval?: "month" | "year",
    ) => {
      const interval =
        forcedInterval || (billingMode === "annual" ? "year" : "month");

      if (planName === "Starter") {
        window.location.assign(`/signup?plan=Starter&interval=${interval}`);
        return;
      }

      if (event) {
        event.preventDefault();
      }

      setIsUpgrading(planName);
      const plan = planName.toUpperCase() as StripePlan;

      try {
        const response = await fetch("/api/billing/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan, interval }),
        });

        const data = await response.json();

        if (response.status === 401 || data?.error === "Unauthorized") {
          const signupUrl = `/signup?plan=${planName}&interval=${interval}`;
          window.location.assign(signupUrl);
          return;
        }

        if (data?.url) {
          window.location.assign(data.url);
        } else {
          const query = new URLSearchParams({
            plan: planName,
            interval,
            status: data?.error ? "unavailable" : "pending",
          });
          window.location.assign(`/checkout?${query.toString()}`);
        }
      } catch {
        window.location.assign(`/signup?plan=${planName}&interval=${interval}`);
      } finally {
        setIsUpgrading(null);
      }
    },
    [billingMode],
  );

  useEffect(() => {
    const autoCheckout = searchParams.get("autoCheckout");
    const planParam = searchParams.get("plan");
    const intervalParam = searchParams.get("interval") as "month" | "year" | null;

    if (autoCheckout === "true" && planParam) {
      const normalized = planParam.toLowerCase();
      if (normalized === "pro") {
        void handleUpgrade(null, "Pro", intervalParam || "month");
      } else if (normalized === "enterprise") {
        void handleUpgrade(null, "Enterprise", intervalParam || "month");
      }
    }
  }, [searchParams, handleUpgrade]);

  const toggleLanguage = () => {
    setLanguage(isEs ? "en" : "es");
  };

  return (
    <div className="min-h-screen bg-white font-sans text-[#030618] antialiased">
      {/* ================================================================ */}
      {/* SECTION 0: NAVEGACIÓN                                           */}
      {/* ================================================================ */}
      <header className="sticky top-0 z-50 w-full border-b border-[#d8dcd6] bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex h-24 max-w-[1312px] items-center justify-between px-6 sm:px-10 lg:px-16">
          {/* Logo Lockup */}
          <Link href="/" className="inline-flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/figma/logo-symbol.png"
              alt="Prado Commerce Logo"
              className="h-8 w-8 object-contain"
            />
            <div className="flex flex-col">
              <span className="text-[17px] font-semibold leading-[21px] text-[#030618] tracking-tight">
                Prado Commerce
              </span>
              <span className="text-[10px] font-normal leading-[12px] text-[#030618] tracking-widest uppercase">
                UNIFIED E-COMMERCE
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden items-center gap-9 md:flex">
            <Link
              href="/#plataforma"
              className="text-[15px] font-normal text-[#030618] transition hover:text-[#0bb7dc]"
            >
              {isEs ? "Plataforma" : "Platform"}
            </Link>
            <Link
              href="/#negocio"
              className="text-[15px] font-normal text-[#030618] transition hover:text-[#0bb7dc]"
            >
              {isEs ? "Para tu negocio" : "For your business"}
            </Link>
            <div className="flex flex-col items-center pt-2">
              <Link
                href="/pricing"
                className="text-[15px] font-semibold text-[#030618]"
              >
                {isEs ? "Precios" : "Pricing"}
              </Link>
              <span className="mt-1.5 h-1 w-6 rounded-full bg-[#0bb7dc]" />
            </div>
          </nav>

          {/* Right Area: Language + CTA */}
          <div className="hidden items-center gap-6 md:flex">
            <div className="flex items-center gap-1.5 text-[13px]">
              <button
                type="button"
                onClick={() => setLanguage("es")}
                className={`transition ${
                  isEs
                    ? "font-semibold text-[#030618]"
                    : "font-normal text-[#626763] hover:text-[#030618]"
                }`}
              >
                ES
              </button>
              <span className="text-[#626763]">/</span>
              <button
                type="button"
                onClick={() => setLanguage("en")}
                className={`transition ${
                  !isEs
                    ? "font-semibold text-[#030618]"
                    : "font-normal text-[#626763] hover:text-[#030618]"
                }`}
              >
                EN
              </button>
            </div>

            <div className="h-4 w-px bg-[#d8dcd6]" />

            <Link
              href="/"
              className="text-[15px] font-normal text-[#030618] transition hover:text-[#0bb7dc]"
            >
              {isEs ? "Inicio" : "Home"}
            </Link>

            <Link
              href="/signup"
              className="inline-flex items-center justify-center rounded-[5px] bg-[#030618] px-6 py-2.5 text-[15px] font-semibold text-white shadow-xs transition hover:bg-slate-800"
            >
              {isEs ? "Comenzar gratis" : "Start free"}
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex items-center gap-3 md:hidden">
            <div className="flex items-center gap-1 text-xs">
              <button
                type="button"
                onClick={() => setLanguage("es")}
                className={isEs ? "font-bold text-[#030618]" : "text-[#626763]"}
              >
                ES
              </button>
              <span className="text-[#626763]">/</span>
              <button
                type="button"
                onClick={() => setLanguage("en")}
                className={!isEs ? "font-bold text-[#030618]" : "text-[#626763]"}
              >
                EN
              </button>
            </div>

            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-[5px] border border-[#d8dcd6] text-[#030618]"
              aria-label="Abrir menú"
            >
              {isMobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {isMobileMenuOpen && (
          <div className="border-b border-[#d8dcd6] bg-white px-6 py-4 md:hidden">
            <nav className="flex flex-col gap-3 text-sm">
              <Link
                href="/#plataforma"
                onClick={closeMobileMenu}
                className="py-1 text-[#030618]"
              >
                {isEs ? "Plataforma" : "Platform"}
              </Link>
              <Link
                href="/#negocio"
                onClick={closeMobileMenu}
                className="py-1 text-[#030618]"
              >
                {isEs ? "Para tu negocio" : "For your business"}
              </Link>
              <Link
                href="/pricing"
                onClick={closeMobileMenu}
                className="py-1 font-semibold text-[#0bb7dc]"
              >
                {isEs ? "Precios" : "Pricing"}
              </Link>
              <Link
                href="/"
                onClick={closeMobileMenu}
                className="py-1 font-medium text-[#030618]"
              >
                {isEs ? "Inicio" : "Home"}
              </Link>
              <Link
                href="/signup"
                onClick={closeMobileMenu}
                className="mt-2 inline-flex items-center justify-center rounded-[5px] bg-[#030618] py-3 text-center text-sm font-semibold text-white"
              >
                {isEs ? "Comenzar gratis" : "Start free"}
              </Link>
            </nav>
          </div>
        )}
      </header>

      {/* ================================================================ */}
      {/* SECTION 1: PLANES QUE ESCALAN (HERO)                            */}
      {/* ================================================================ */}
      <section className="w-full px-6 pt-16 pb-8 sm:px-10 lg:px-16">
        <div className="mx-auto max-w-[1312px]">
          {/* Section label */}
          <div className="flex items-center gap-2.5">
            <span className="h-[7px] w-[7px] bg-[#0bb7dc]" />
            <span className="text-[12px] font-semibold uppercase tracking-[0.1em] text-[#030618]">
              {isEs ? "Precios" : "Pricing"}
            </span>
          </div>

          {/* Pricing Header: Title + Description */}
          <div className="mt-8 flex flex-col gap-8 2xl:flex-row 2xl:items-end 2xl:justify-between 2xl:gap-16">
            <h1 className="text-4xl font-normal tracking-tight text-[#030618] sm:text-6xl lg:text-[76px] lg:leading-[78px]">
              {isEs ? (
                <>
                  Planes que escalan
                  <br />
                  con cada tienda en
                  <br />
                  Prado Commerce.
                </>
              ) : (
                <>
                  Plans that scale
                  <br />
                  with every store on
                  <br />
                  Prado Commerce.
                </>
              )}
            </h1>

            <div className="flex max-w-xl flex-col gap-6 2xl:pb-2">
              <p className="text-[18px] leading-[28px] text-[#626763]">
                {isEs
                  ? "Comienza gratis con Starter, desbloquea el crecimiento con Pro y opera a escala con Enterprise. Cada nivel incluye capacidades centrales de checkout y tienda virtual."
                  : "Start free with Starter, unlock growth with Pro, and operate at scale with Enterprise. Every tier includes core checkout and storefront capabilities."}
              </p>
            </div>
          </div>

          {/* Billing Switcher */}
          <div className="mt-12 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[#d8dcd6] pb-8">
            <div className="flex flex-wrap items-center gap-4">
              <div className="inline-flex rounded-[5px] border border-[#d8dcd6] bg-white p-1">
                <button
                  type="button"
                  onClick={() => setBillingMode("monthly")}
                  className={`rounded-[3px] px-6 py-2 text-[14px] transition ${
                    billingMode === "monthly"
                      ? "bg-[#030618] font-semibold text-white shadow-xs"
                      : "font-normal text-[#030618] hover:text-[#0bb7dc]"
                  }`}
                >
                  {isEs ? "Mensual" : "Monthly"}
                </button>
                <button
                  type="button"
                  onClick={() => setBillingMode("annual")}
                  className={`rounded-[3px] px-6 py-2 text-[14px] transition ${
                    billingMode === "annual"
                      ? "bg-[#030618] font-semibold text-white shadow-xs"
                      : "font-normal text-[#030618] hover:text-[#0bb7dc]"
                  }`}
                >
                  {isEs ? "Anual" : "Annual"}
                </button>
              </div>

              <span className="text-[13px] font-semibold text-[#030618]">
                {isEs
                  ? "Ahorra un 20% con el plan anual"
                  : "Save 20% with the annual plan"}
              </span>
            </div>

            <p className="text-[13px] text-[#626763]">
              {billingMode === "monthly"
                ? isEs
                  ? "Precios mensuales · Compara la facturación anual más abajo"
                  : "Monthly pricing · Compare annual billing below"
                : isEs
                ? "Facturación anual con 20% de descuento incluido"
                : "Annual billing with 20% discount included"}
            </p>
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* SECTION 2: PLANES Y PRECIOS (3 CARDS)                           */}
      {/* ================================================================ */}
      <section className="w-full px-6 pt-6 pb-20 sm:px-10 lg:px-16">
        <div className="mx-auto grid max-w-[1312px] grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Card 1: Starter */}
          <div className="flex flex-col justify-between rounded-[8px] border border-[#d8dcd6] bg-white p-8 shadow-xs">
            <div className="flex flex-col gap-5">
              <div className="flex items-center justify-between">
                <h3 className="text-[26px] font-medium leading-[31px] text-[#030618]">
                  Starter
                </h3>
              </div>

              <p className="min-h-[44px] text-[16px] leading-[22px] text-[#626763]">
                {isEs
                  ? "Creadores independientes y pequeñas tiendas que prueban sitios personalizados."
                  : "Independent creators and small shops testing custom sites."}
              </p>

              <div className="flex items-baseline gap-2 pt-2">
                <span className="text-[76px] font-normal leading-[80px] tracking-tight text-[#030618]">
                  $0
                </span>
                <span className="text-[18px] text-[#626763]">
                  {isEs ? "/ mes" : "/ mo"}
                </span>
              </div>

              <button
                type="button"
                onClick={(e) => handleUpgrade(e, "Starter")}
                className="mt-2 inline-flex w-full items-center justify-between rounded-[5px] bg-[#030618] px-6 py-3.5 text-[15px] font-semibold text-white transition hover:bg-slate-800"
              >
                <span>{isEs ? "Comenzar gratis" : "Start free"}</span>
                <ArrowUpRight className="h-4 w-4" />
              </button>

              <p className="text-[12px] text-[#626763]">
                {isEs ? "Sin tarjeta de crédito" : "No credit card required"}
              </p>

              <div className="my-2 h-px w-full bg-[#d8dcd6]" />

              {/* Features List */}
              <ul className="flex flex-col gap-4 text-[15px] leading-[23px] text-[#030618]">
                <li className="flex items-start gap-3">
                  <Check className="mt-1 h-4 w-4 shrink-0 text-[#0bb7dc]" />
                  <span>{isEs ? "1 tienda" : "1 store"}</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="mt-1 h-4 w-4 shrink-0 text-[#0bb7dc]" />
                  <span>
                    {isEs ? "Hasta 50 productos" : "Up to 50 products"}
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="mt-1 h-4 w-4 shrink-0 text-[#0bb7dc]" />
                  <span>
                    {isEs
                      ? "2% de tarifa de plataforma en transacciones"
                      : "2% platform fee on transactions"}
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="mt-1 h-4 w-4 shrink-0 text-[#0bb7dc]" />
                  <span>
                    {isEs
                      ? "Stripe Connect incluido para cobros"
                      : "Stripe Connect included for payouts"}
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="mt-1 h-4 w-4 shrink-0 text-[#0bb7dc]" />
                  <span>
                    {isEs
                      ? "Checkout integrable básico"
                      : "Basic embeddable checkout"}
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="mt-1 h-4 w-4 shrink-0 text-[#0bb7dc]" />
                  <span>
                    {isEs
                      ? "60 solicitudes / minuto"
                      : "60 requests / minute"}
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <Minus className="mt-1 h-4 w-4 shrink-0 text-[#626763]" />
                  <span className="text-[#626763]">
                    {isEs
                      ? "Punto de venta (POS) no incluido"
                      : "POS register not included"}
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <Minus className="mt-1 h-4 w-4 shrink-0 text-[#626763]" />
                  <span className="text-[#626763]">
                    {isEs
                      ? "Exportación a CSV no incluida"
                      : "CSV export not included"}
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <Minus className="mt-1 h-4 w-4 shrink-0 text-[#626763]" />
                  <span className="text-[#626763]">
                    {isEs
                      ? "Inyector de CSS personalizado no incluido"
                      : "Custom CSS injector not included"}
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <Minus className="mt-1 h-4 w-4 shrink-0 text-[#626763]" />
                  <span className="text-[#626763]">
                    {isEs
                      ? "Dominios personalizados no incluidos (solo subdominios)"
                      : "Custom domains not included (subdomains only)"}
                  </span>
                </li>
              </ul>
            </div>
          </div>

          {/* Card 2: Pro (Highlighted) */}
          <div className="relative flex flex-col justify-between rounded-[8px] border-2 border-[#0bb7dc] bg-white p-8 shadow-md">
            <div className="flex flex-col gap-5">
              <div className="flex items-center justify-between">
                <h3 className="text-[26px] font-medium leading-[31px] text-[#030618]">
                  Pro
                </h3>
                <span className="rounded-[3px] bg-[#0bb7dc] px-2.5 py-1 text-[11px] font-semibold text-[#030618]">
                  {isEs ? "Más popular" : "Most popular"}
                </span>
              </div>

              <p className="min-h-[44px] text-[16px] leading-[22px] text-[#626763]">
                {isEs
                  ? "Comerciantes en expansión, agencias y tiendas medianas."
                  : "Growing merchants, agencies, and mid-sized storefronts."}
              </p>

              <div className="flex items-baseline gap-2 pt-2">
                <span className="text-[76px] font-normal leading-[80px] tracking-tight text-[#030618]">
                  {billingMode === "annual" ? "$39" : "$49"}
                </span>
                <span className="text-[18px] text-[#626763]">
                  {isEs ? "/ mes" : "/ mo"}
                </span>
              </div>

              <button
                type="button"
                disabled={isUpgrading === "Pro"}
                onClick={(e) => handleUpgrade(e, "Pro")}
                className="mt-2 inline-flex w-full items-center justify-between rounded-[5px] bg-[#030618] px-6 py-3.5 text-[15px] font-semibold text-white transition hover:bg-slate-800 disabled:opacity-75"
              >
                <span>
                  {isUpgrading === "Pro"
                    ? isEs
                      ? "Procesando..."
                      : "Processing..."
                    : isEs
                    ? "Elegir Pro"
                    : "Choose Pro"}
                </span>
                <ArrowUpRight className="h-4 w-4" />
              </button>

              <p className="text-[12px] text-[#626763]">
                {billingMode === "annual"
                  ? isEs
                    ? "Facturación anual ($468/año)"
                    : "Billed annually ($468/yr)"
                  : isEs
                  ? "Facturación mensual"
                  : "Billed monthly"}
              </p>

              <div className="my-2 h-px w-full bg-[#d8dcd6]" />

              {/* Features List */}
              <ul className="flex flex-col gap-4 text-[15px] leading-[23px] text-[#030618]">
                <li className="flex items-start gap-3">
                  <Check className="mt-1 h-4 w-4 shrink-0 text-[#0bb7dc]" />
                  <span>
                    {isEs ? "Hasta 5 tiendas" : "Up to 5 stores"}
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="mt-1 h-4 w-4 shrink-0 text-[#0bb7dc]" />
                  <span>
                    {isEs ? "Productos ilimitados" : "Unlimited products"}
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="mt-1 h-4 w-4 shrink-0 text-[#0bb7dc]" />
                  <span>
                    {isEs
                      ? "0% tarifa de plataforma (sin comisión adicional)"
                      : "0% transaction platform fee"}
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="mt-1 h-4 w-4 shrink-0 text-[#0bb7dc]" />
                  <span>
                    {isEs
                      ? "Stripe Connect incluido con 0% de comisión"
                      : "Stripe Connect with 0% platform fee"}
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="mt-1 h-4 w-4 shrink-0 text-[#0bb7dc]" />
                  <span>
                    {isEs
                      ? "Punto de venta (POS) y PINs de cajeros"
                      : "POS register with cashier PINs"}
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="mt-1 h-4 w-4 shrink-0 text-[#0bb7dc]" />
                  <span>
                    {isEs
                      ? "Exportación de tablas a CSV"
                      : "CSV data table exports"}
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="mt-1 h-4 w-4 shrink-0 text-[#0bb7dc]" />
                  <span>
                    {isEs
                      ? "Inyector de CSS personalizado (tienda y checkout)"
                      : "Custom CSS styling injector (storefront & checkout)"}
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="mt-1 h-4 w-4 shrink-0 text-[#0bb7dc]" />
                  <span>
                    {isEs
                      ? "Dominios personalizados incluidos"
                      : "Custom domains included"}
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="mt-1 h-4 w-4 shrink-0 text-[#0bb7dc]" />
                  <span>
                    {isEs
                      ? "1.000 solicitudes / minuto"
                      : "1,000 requests / minute"}
                  </span>
                </li>
              </ul>
            </div>
          </div>

          {/* Card 3: Enterprise */}
          <div className="flex flex-col justify-between rounded-[8px] border border-[#d8dcd6] bg-white p-8 shadow-xs">
            <div className="flex flex-col gap-5">
              <div className="flex items-center justify-between">
                <h3 className="text-[26px] font-medium leading-[31px] text-[#030618]">
                  Enterprise
                </h3>
              </div>

              <p className="min-h-[44px] text-[16px] leading-[22px] text-[#626763]">
                {isEs
                  ? "Marcas de alto volumen y operaciones integradas con TPV/POS."
                  : "High-volume brands and integrated POS operations."}
              </p>

              <div className="flex items-baseline gap-2 pt-2">
                <span className="text-[76px] font-normal leading-[80px] tracking-tight text-[#030618]">
                  {billingMode === "annual" ? "$159" : "$199"}
                </span>
                <span className="text-[18px] text-[#626763]">
                  {isEs ? "/ mes" : "/ mo"}
                </span>
              </div>

              <button
                type="button"
                disabled={isUpgrading === "Enterprise"}
                onClick={(e) => handleUpgrade(e, "Enterprise")}
                className="mt-2 inline-flex w-full items-center justify-between rounded-[5px] bg-[#030618] px-6 py-3.5 text-[15px] font-semibold text-white transition hover:bg-slate-800 disabled:opacity-75"
              >
                <span>
                  {isUpgrading === "Enterprise"
                    ? isEs
                      ? "Procesando..."
                      : "Processing..."
                    : isEs
                    ? "Elegir Enterprise"
                    : "Choose Enterprise"}
                </span>
                <ArrowUpRight className="h-4 w-4" />
              </button>

              <p className="text-[12px] text-[#626763]">
                {billingMode === "annual"
                  ? isEs
                    ? "Facturación anual ($1.908/año)"
                    : "Billed annually ($1,908/yr)"
                  : isEs
                  ? "Facturación mensual"
                  : "Billed monthly"}
              </p>

              <div className="my-2 h-px w-full bg-[#d8dcd6]" />

              {/* Features List */}
              <ul className="flex flex-col gap-4 text-[15px] leading-[23px] text-[#030618]">
                <li className="flex items-start gap-3">
                  <Check className="mt-1 h-4 w-4 shrink-0 text-[#0bb7dc]" />
                  <span>
                    {isEs ? "Tiendas ilimitadas" : "Unlimited stores"}
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="mt-1 h-4 w-4 shrink-0 text-[#0bb7dc]" />
                  <span>
                    {isEs ? "Productos ilimitados" : "Unlimited products"}
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="mt-1 h-4 w-4 shrink-0 text-[#0bb7dc]" />
                  <span>
                    {isEs
                      ? "0% tarifa de plataforma"
                      : "0% transaction platform fee"}
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="mt-1 h-4 w-4 shrink-0 text-[#0bb7dc]" />
                  <span>
                    {isEs
                      ? "Stripe Connect + pasarelas avanzadas (0% fee)"
                      : "Stripe Connect + advanced gateways (0% fee)"}
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="mt-1 h-4 w-4 shrink-0 text-[#0bb7dc]" />
                  <span>
                    {isEs
                      ? "POS avanzado + transportistas"
                      : "Advanced POS register + carriers"}
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="mt-1 h-4 w-4 shrink-0 text-[#0bb7dc]" />
                  <span>
                    {isEs
                      ? "Exportación completa a CSV"
                      : "Full CSV data exports"}
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="mt-1 h-4 w-4 shrink-0 text-[#0bb7dc]" />
                  <span>
                    {isEs
                      ? "Inyector CSS + checkout headless y marca blanca"
                      : "Custom CSS injector + headless & white-label checkout"}
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="mt-1 h-4 w-4 shrink-0 text-[#0bb7dc]" />
                  <span>
                    {isEs
                      ? "Múltiples dominios personalizados"
                      : "Multiple custom domains"}
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="mt-1 h-4 w-4 shrink-0 text-[#0bb7dc]" />
                  <span>
                    {isEs
                      ? "Rendimiento edge dedicado"
                      : "Dedicated edge throughput"}
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* SECTION 3: COMPARACIÓN RÁPIDA (TABLE)                           */}
      {/* ================================================================ */}
      <section className="w-full border-t border-[#d8dcd6] px-6 py-20 sm:px-10 lg:px-16">
        <div className="mx-auto max-w-[1312px]">
          {/* Section heading */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2.5">
              <span className="h-[7px] w-[7px] bg-[#0bb7dc]" />
              <span className="text-[12px] font-semibold uppercase tracking-[0.1em] text-[#030618]">
                {isEs ? "Cada detalle, a la vista" : "Every detail in sight"}
              </span>
            </div>
            <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
              <h2 className="text-3xl font-normal tracking-tight text-[#030618] sm:text-5xl">
                {isEs ? "Comparación rápida" : "Quick comparison"}
              </h2>
              <p className="max-w-md text-[15px] leading-[23px] text-[#626763]">
                {isEs
                  ? "Los precios anuales muestran el equivalente mensual. El importe total se factura una vez al año."
                  : "Annual prices reflect the monthly equivalent. Billed in a single annual payment."}
              </p>
            </div>
          </div>

          {/* Comparison Table */}
          <div className="mt-12 overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-[#030618]">
                  <th className="py-4 pr-6 text-[13px] font-semibold tracking-wider text-[#626763] uppercase">
                    {isEs ? "CARACTERÍSTICA" : "FEATURE"}
                  </th>
                  <th className="px-6 py-4 text-[22px] font-medium text-[#030618]">
                    Starter
                  </th>
                  <th className="px-6 py-4 text-[22px] font-medium text-[#030618]">
                    Pro
                  </th>
                  <th className="px-6 py-4 text-[22px] font-medium text-[#030618]">
                    Enterprise
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#d8dcd6] text-[15px]">
                {/* Row 1 */}
                <tr>
                  <td className="py-5 pr-6 font-medium text-[#030618]">
                    {isEs ? "Facturación mensual" : "Monthly billing"}
                  </td>
                  <td className="px-6 py-5 text-[#030618]">$0 / mes</td>
                  <td className="px-6 py-5 text-[#030618]">$49 / mes</td>
                  <td className="px-6 py-5 text-[#030618]">$199 / mes</td>
                </tr>

                {/* Row 2 */}
                <tr>
                  <td className="py-5 pr-6">
                    <div className="font-medium text-[#030618]">
                      {isEs ? "Facturación anual" : "Annual billing"}
                    </div>
                    <div className="text-[12px] text-[#626763]">
                      {isEs
                        ? "20% de ahorro · Pago anual"
                        : "20% savings · Annual payment"}
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="font-medium text-[#030618]">$0</div>
                    <div className="text-[13px] text-[#626763]">$0 / año</div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="font-medium text-[#030618]">$39 / mes</div>
                    <div className="text-[13px] text-[#626763]">$468 / año</div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="font-medium text-[#030618]">$159 / mes</div>
                    <div className="text-[13px] text-[#626763]">
                      $1.908 / año
                    </div>
                  </td>
                </tr>

                {/* Row 3 */}
                <tr>
                  <td className="py-5 pr-6 font-medium text-[#030618]">
                    {isEs ? "Tiendas activas" : "Active stores"}
                  </td>
                  <td className="px-6 py-5 text-[#030618]">1</td>
                  <td className="px-6 py-5 text-[#030618]">
                    {isEs ? "Hasta 5" : "Up to 5"}
                  </td>
                  <td className="px-6 py-5 text-[#030618]">
                    {isEs ? "Ilimitadas" : "Unlimited"}
                  </td>
                </tr>

                {/* Row 4 */}
                <tr>
                  <td className="py-5 pr-6 font-medium text-[#030618]">
                    {isEs ? "Productos" : "Products"}
                  </td>
                  <td className="px-6 py-5 text-[#030618]">
                    {isEs ? "Hasta 50" : "Up to 50"}
                  </td>
                  <td className="px-6 py-5 text-[#030618]">
                    {isEs ? "Ilimitados" : "Unlimited"}
                  </td>
                  <td className="px-6 py-5 text-[#030618]">
                    {isEs ? "Ilimitados" : "Unlimited"}
                  </td>
                </tr>

                {/* Row 5 */}
                <tr>
                  <td className="py-5 pr-6 font-medium text-[#030618]">
                    {isEs ? "Dominios personalizados" : "Custom domains"}
                  </td>
                  <td className="px-6 py-5 text-[#030618]">
                    {isEs ? "No incluidos" : "Not included"}
                  </td>
                  <td className="px-6 py-5 text-[#030618]">
                    {isEs ? "Incluidos" : "Included"}
                  </td>
                  <td className="px-6 py-5 text-[#030618]">
                    {isEs ? "Incluidos (múltiples)" : "Included (multiple)"}
                  </td>
                </tr>

                {/* Row 6 */}
                <tr>
                  <td className="py-5 pr-6 font-medium text-[#030618]">
                    {isEs ? "Límites de API" : "API rate limits"}
                  </td>
                  <td className="px-6 py-5 text-[#030618]">60 req/min</td>
                  <td className="px-6 py-5 text-[#030618]">1.000 req/min</td>
                  <td className="px-6 py-5 text-[#030618]">
                    {isEs ? "Rendimiento dedicado" : "Dedicated throughput"}
                  </td>
                </tr>

                {/* Row 7: Platform fee */}
                <tr>
                  <td className="py-5 pr-6 font-medium text-[#030618]">
                    {isEs ? "Tarifa de plataforma" : "Platform fee"}
                  </td>
                  <td className="px-6 py-5 font-semibold text-[#030618]">2%</td>
                  <td className="px-6 py-5 font-semibold text-emerald-700">0%</td>
                  <td className="px-6 py-5 font-semibold text-emerald-700">0%</td>
                </tr>

                {/* Row 8: Stripe Connect */}
                <tr>
                  <td className="py-5 pr-6 font-medium text-[#030618]">
                    Stripe Connect
                  </td>
                  <td className="px-6 py-5 text-[#030618]">
                    {isEs ? "Incluido (tarifa 2%)" : "Included (2% fee)"}
                  </td>
                  <td className="px-6 py-5 text-[#030618]">
                    {isEs ? "Incluido (0% tarifa)" : "Included (0% fee)"}
                  </td>
                  <td className="px-6 py-5 text-[#030618]">
                    {isEs ? "Incluido (0% tarifa)" : "Included (0% fee)"}
                  </td>
                </tr>

                {/* Row 9: POS System */}
                <tr>
                  <td className="py-5 pr-6 font-medium text-[#030618]">
                    {isEs ? "Punto de Venta (POS) y cajeros" : "POS Register & Cashier PINs"}
                  </td>
                  <td className="px-6 py-5 text-[#626763]">
                    {isEs ? "No incluido" : "Not included"}
                  </td>
                  <td className="px-6 py-5 text-[#030618]">
                    {isEs ? "Incluido (caja y PINs)" : "Included (register & PINs)"}
                  </td>
                  <td className="px-6 py-5 text-[#030618]">
                    {isEs ? "Incluido (avanzado)" : "Included (advanced)"}
                  </td>
                </tr>

                {/* Row 10: CSV Export */}
                <tr>
                  <td className="py-5 pr-6 font-medium text-[#030618]">
                    {isEs ? "Exportación de datos a CSV" : "CSV Data Export"}
                  </td>
                  <td className="px-6 py-5 text-[#626763]">
                    {isEs ? "No incluida" : "Not included"}
                  </td>
                  <td className="px-6 py-5 text-[#030618]">
                    {isEs ? "Incluida" : "Included"}
                  </td>
                  <td className="px-6 py-5 text-[#030618]">
                    {isEs ? "Incluida" : "Included"}
                  </td>
                </tr>

                {/* Row 11: Custom CSS Injector */}
                <tr>
                  <td className="py-5 pr-6 font-medium text-[#030618]">
                    {isEs ? "Inyector de CSS personalizado" : "Custom CSS Injector"}
                  </td>
                  <td className="px-6 py-5 text-[#626763]">
                    {isEs ? "No incluido" : "Not included"}
                  </td>
                  <td className="px-6 py-5 text-[#030618]">
                    {isEs ? "Incluido (tienda y checkout)" : "Included (storefront & checkout)"}
                  </td>
                  <td className="px-6 py-5 text-[#030618]">
                    {isEs ? "Incluido (tienda y checkout)" : "Included (storefront & checkout)"}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* SECTION 4: TU PRÓXIMO CAPÍTULO                                 */}
      {/* ================================================================ */}
      <section className="w-full bg-[#e7ffff] px-6 py-16 sm:px-10 lg:px-16">
        <div className="mx-auto flex max-w-[1312px] flex-col justify-between gap-10 lg:flex-row lg:items-center">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2.5">
              <span className="h-[7px] w-[7px] bg-[#0bb7dc]" />
              <span className="text-[12px] font-semibold uppercase tracking-[0.1em] text-[#030618]">
                {isEs ? "Un buen comienzo" : "A strong start"}
              </span>
            </div>
            <h2 className="text-3xl font-normal tracking-tight text-[#030618] sm:text-5xl lg:text-[52px] lg:leading-[56px]">
              {isEs
                ? "Tu próximo capítulo empieza gratis."
                : "Your next chapter starts free."}
            </h2>
          </div>

          <div className="flex flex-col gap-4 lg:max-w-md">
            <p className="text-[16px] leading-[24px] text-[#626763]">
              {isEs
                ? "Empieza con Starter: 1 tienda, hasta 50 productos y 2% de tarifa de plataforma por $0 al mes."
                : "Start with Starter: 1 store, up to 50 products, and 2% platform fee for $0 a month."}
            </p>

            <div>
              <Link
                href="/signup"
                className="inline-flex items-center gap-5 rounded-[5px] bg-[#030618] px-6 py-3.5 text-[15px] font-semibold text-white transition hover:bg-slate-800"
              >
                <span>{isEs ? "Comenzar gratis" : "Start free"}</span>
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>

            <p className="text-[13px] text-[#626763]">
              {isEs ? "Sin tarjeta de crédito" : "No credit card required"}
            </p>
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* SECTION 5: PIE DE PÁGINA                                        */}
      {/* ================================================================ */}
      <footer className="w-full bg-[#f5f5f1] px-6 pt-16 pb-10 sm:px-10 lg:px-16">
        <div className="mx-auto max-w-[1312px]">
          <div className="flex flex-col justify-between gap-12 lg:flex-row lg:gap-16">
            {/* Brand Statement */}
            <div className="flex max-w-sm flex-col gap-5">
              <Link href="/" className="inline-flex items-center gap-2.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/figma/logo-symbol.png"
                  alt="Prado Commerce Logo"
                  className="h-8 w-8 object-contain"
                />
                <div className="flex flex-col">
                  <span className="text-[17px] font-semibold leading-[21px] text-[#030618] tracking-tight">
                    Prado Commerce
                  </span>
                  <span className="text-[10px] font-normal leading-[12px] text-[#030618] tracking-widest uppercase">
                    UNIFIED E-COMMERCE
                  </span>
                </div>
              </Link>

              <p className="text-[15px] leading-[23px] text-[#626763]">
                {isEs
                  ? "Menos complejidad detrás de cada venta. Más posibilidades para tu negocio."
                  : "Less complexity behind each sale. More opportunities for your business."}
              </p>
            </div>

            {/* Navigation Groups */}
            <div className="flex flex-wrap gap-12 sm:gap-16">
              {/* Group 1 */}
              <div className="flex flex-col gap-4">
                <span className="text-[12px] font-semibold tracking-wider text-[#626763] uppercase">
                  PRADO COMMERCE
                </span>
                <Link
                  href="/#plataforma"
                  className="text-[15px] text-[#030618] transition hover:text-[#0bb7dc]"
                >
                  {isEs ? "Plataforma" : "Platform"}
                </Link>
                <Link
                  href="/#negocio"
                  className="text-[15px] text-[#030618] transition hover:text-[#0bb7dc]"
                >
                  {isEs ? "Para tu negocio" : "For your business"}
                </Link>
                <Link
                  href="/pricing"
                  className="text-[15px] font-semibold text-[#0bb7dc]"
                >
                  {isEs ? "Precios" : "Pricing"}
                </Link>
              </div>

              {/* Group 2 */}
              <div className="flex flex-col gap-4">
                <span className="text-[12px] font-semibold tracking-wider text-[#626763] uppercase">
                  {isEs ? "TU ESPACIO" : "YOUR SPACE"}
                </span>
                <Link
                  href="/dashboard"
                  className="text-[15px] text-[#030618] transition hover:text-[#0bb7dc]"
                >
                  {isEs ? "Panel" : "Dashboard"}
                </Link>
                <Link
                  href="/signup"
                  className="text-[15px] text-[#030618] transition hover:text-[#0bb7dc]"
                >
                  {isEs ? "Comenzar gratis" : "Start free"}
                </Link>
              </div>

              {/* Group 3: Language Preference */}
              <div className="flex flex-col gap-4">
                <span className="text-[12px] font-semibold tracking-wider text-[#626763] uppercase">
                  {isEs ? "IDIOMA" : "LANGUAGE"}
                </span>
                <button
                  type="button"
                  onClick={toggleLanguage}
                  className="inline-flex items-center gap-2 text-[14px] font-medium text-[#030618] transition hover:text-[#0bb7dc]"
                >
                  <Globe className="h-4 w-4 text-[#171919]" />
                  <span>{isEs ? "ES (Español)" : "EN (English)"}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Legal / Copyright Bottom Line */}
          <div className="mt-14 flex flex-col justify-between gap-4 border-t border-[#d8dcd6] pt-6 sm:flex-row sm:items-center text-[12px] text-[#626763]">
            <p>Copyright © 2026 Prado Commerce. {isEs ? "Todos los derechos reservados." : "All rights reserved."}</p>
            <div className="flex items-center gap-8">
              <Link href="/privacy" className="text-[#030618] hover:underline">
                {isEs ? "Privacidad" : "Privacy"}
              </Link>
              <Link href="/terms" className="text-[#030618] hover:underline">
                {isEs ? "Términos" : "Terms"}
              </Link>
              <a
                href="https://indevasa.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#030618] hover:underline"
              >
                Indeva Website
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function PricingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-white text-slate-500">
          Loading...
        </div>
      }
    >
      <PricingPageContent />
    </Suspense>
  );
}
