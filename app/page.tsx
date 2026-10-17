"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Globe,
  Menu,
  ShieldCheck,
  ShoppingBag,
  X,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";

export default function Home() {
  const { language, setLanguage } = useLanguage();
  const isEs = language === "es";
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  return (
    <main className="min-h-screen bg-white text-[#030618] font-sans antialiased selection:bg-[#0bb7dc]/20 selection:text-[#030618]">
      {/* ================================================================ */}
      {/* SECTION 0: NAVEGACIÓN                                           */}
      {/* ================================================================ */}
      <header className="sticky top-0 z-50 w-full border-b border-[#d8dcd6] bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex h-20 sm:h-24 w-full max-w-[1312px] items-center justify-between px-6 sm:px-10 lg:px-16">
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

          {/* Navigation Links (Desktop) */}
          <nav className="hidden items-center gap-9 md:flex">
            <Link
              href="#plataforma"
              className="text-[15px] font-normal text-[#030618] transition hover:text-[#0bb7dc]"
            >
              {isEs ? "Plataforma" : "Platform"}
            </Link>
            <Link
              href="#negocio"
              className="text-[15px] font-normal text-[#030618] transition hover:text-[#0bb7dc]"
            >
              {isEs ? "Para tu negocio" : "For your business"}
            </Link>
            <Link
              href="/pricing"
              className="text-[15px] font-normal text-[#030618] transition hover:text-[#0bb7dc]"
            >
              {isEs ? "Precios" : "Pricing"}
            </Link>
          </nav>

          {/* Account, Language & Actions (Desktop) */}
          <div className="hidden items-center gap-6 md:flex">
            {/* Language Switcher */}
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
              href="/dashboard"
              className="text-[15px] font-normal text-[#030618] transition hover:text-[#0bb7dc]"
            >
              {isEs ? "Panel" : "Dashboard"}
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
              {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {isMobileMenuOpen && (
          <div className="border-b border-[#d8dcd6] bg-white px-6 py-6 md:hidden">
            <nav className="flex flex-col gap-4 text-base">
              <Link
                href="#plataforma"
                onClick={closeMobileMenu}
                className="py-1 font-medium text-[#030618]"
              >
                {isEs ? "Plataforma" : "Platform"}
              </Link>
              <Link
                href="#negocio"
                onClick={closeMobileMenu}
                className="py-1 font-medium text-[#030618]"
              >
                {isEs ? "Para tu negocio" : "For your business"}
              </Link>
              <Link
                href="/pricing"
                onClick={closeMobileMenu}
                className="py-1 font-medium text-[#030618]"
              >
                {isEs ? "Precios" : "Pricing"}
              </Link>
              <Link
                href="/dashboard"
                onClick={closeMobileMenu}
                className="py-1 font-medium text-[#030618]"
              >
                {isEs ? "Panel" : "Dashboard"}
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
      {/* SECTION 1: TU NEGOCIO, SIN EL CAOS (HERO)                       */}
      {/* ================================================================ */}
      <section className="w-full px-6 pt-12 pb-8 sm:px-10 lg:px-16 lg:pt-16">
        <div className="mx-auto max-w-[1312px]">
          {/* Section label */}
          <div className="flex items-center gap-2.5">
            <span className="h-[7px] w-[7px] bg-[#0bb7dc]" />
            <span className="text-[12px] font-semibold uppercase tracking-[0.1em] text-[#171919]">
              {isEs ? "Comercio electrónico unificado" : "Unified E-Commerce"}
            </span>
          </div>

          {/* Hero introduction */}
          <div className="mt-8 flex flex-col gap-8 2xl:flex-row 2xl:items-end 2xl:justify-between 2xl:gap-16">
            <h1 className="text-5xl font-normal tracking-tight text-[#030618] sm:text-6xl md:text-7xl lg:text-8xl 2xl:text-[108px] leading-[1.05] sm:leading-[1.02] 2xl:leading-[107px]">
              {isEs ? (
                <>
                  Tu negocio,
                  <br />
                  sin el caos.
                </>
              ) : (
                <>
                  Your business,
                  <br />
                  without the chaos.
                </>
              )}
            </h1>

            <div className="flex max-w-2xl flex-col gap-6 2xl:max-w-xl 2xl:pb-3">
              <p className="text-[18px] leading-[28px] text-[#626763]">
                {isEs
                  ? "Crea tiendas veloces sin el caos de plataformas. Un único panel para tus tiendas, productos y flujos de compra. Más foco en lo que haces mejor."
                  : "Create fast storefronts without platform chaos. A single dashboard for your stores, products, and checkout flows. More focus on what you do best."}
              </p>

              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href="/signup"
                  className="inline-flex items-center gap-5 rounded-[5px] bg-[#030618] px-6 py-3.5 text-[15px] font-semibold text-white transition hover:bg-slate-800"
                >
                  <span>{isEs ? "Comenzar gratis" : "Start free"}</span>
                  <ArrowUpRight className="h-4 w-4" />
                </Link>

                <Link
                  href="/pricing"
                  className="inline-flex items-center rounded-[5px] border border-[#030618] bg-white px-6 py-3.5 text-[15px] font-semibold text-[#030618] transition hover:bg-slate-50"
                >
                  <span>{isEs ? "Ver precios" : "View pricing"}</span>
                </Link>
              </div>

              <p className="text-[13px] text-[#626763]">
                {isEs
                  ? "Plan Inicial Gratuito · $0/mes"
                  : "Free Starter Plan · $0/mo"}
              </p>
            </div>
          </div>

          {/* Hero Image with Overlaid Promise Card */}
          <div className="relative mt-12 w-full overflow-hidden bg-slate-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/figma/hero-merchant.png"
              alt="Merchant welcoming a customer"
              className="h-auto max-h-[560px] w-full object-cover object-center"
            />

            {/* Promise Card Overlay */}
            <div className="relative mt-4 rounded-[8px] bg-white p-6 shadow-xl sm:absolute sm:right-8 sm:bottom-8 sm:mt-0 sm:max-w-[310px]">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold tracking-wider text-[#626763] uppercase">
                  {isEs ? "HECHO PARA TU NEGOCIO" : "BUILT FOR YOUR BUSINESS"}
                </span>
                <ArrowUpRight className="h-4 w-4 text-[#0bb7dc]" />
              </div>
              <p className="mt-4 text-[27px] font-medium leading-[30px] text-[#030618]">
                {isEs
                  ? "De tu primera idea a tu próxima tienda."
                  : "From your first idea to your next store."}
              </p>
              <p className="mt-4 text-[13px] text-[#626763]">
                {isEs
                  ? "Productos físicos, digitales y servicios."
                  : "Physical products, digital goods and services."}
              </p>
            </div>
          </div>

          {/* Image caption */}
          <div className="mt-4 flex flex-col justify-between gap-2 text-xs sm:flex-row sm:items-center">
            <span className="text-[11px] font-semibold tracking-wider text-[#030618] uppercase">
              {isEs ? "DE TU MOSTRADOR AL MUNDO" : "FROM YOUR COUNTER TO THE WORLD"}
            </span>
            <span className="text-[12px] text-[#626763]">
              {isEs
                ? "Tu negocio es real. Tu plataforma debe estar a la altura."
                : "Your business is real. Your platform should match it."}
            </span>
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* SECTION 2: MENOS FRICCIÓN, MÁS NEGOCIO                         */}
      {/* ================================================================ */}
      <section className="w-full px-6 py-20 sm:px-10 lg:px-16 lg:py-26">
        <div className="mx-auto max-w-[1312px]">
          {/* Section introduction */}
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:gap-20">
            <div className="flex shrink-0 items-center gap-2.5">
              <span className="h-[7px] w-[7px] bg-[#0bb7dc]" />
              <span className="text-[12px] font-semibold uppercase tracking-[0.1em] text-[#171919]">
                {isEs ? "Tu ambición, sin los obstáculos" : "Your ambition, without roadblocks"}
              </span>
            </div>

            <h2 className="text-3xl font-normal tracking-tight text-[#030618] sm:text-5xl lg:text-[54px] lg:leading-[57px]">
              {isEs ? (
                "Que crezca tu negocio. No la complejidad."
              ) : (
                "Grow your business. Not the complexity."
              )}
            </h2>
          </div>

          {/* 3 Benefits Columns */}
          <div className="mt-14 grid grid-cols-1 gap-10 md:grid-cols-3">
            {/* Benefit 01 */}
            <div className="flex flex-col gap-5 border-t border-[#d8dcd6] pt-6">
              <span className="text-[12px] font-semibold text-[#0bb7dc]">01</span>
              <h3 className="text-[26px] font-medium leading-[31px] text-[#030618]">
                {isEs ? "Menos herramientas sueltas." : "Fewer disconnected tools."}
              </h3>
              <p className="text-[16px] leading-[25px] text-[#626763]">
                {isEs
                  ? "Reúne productos, precios y flujos de compra. Deja atrás la operación repartida entre herramientas que no se hablan."
                  : "Bring together products, prices, and checkout flows. Leave behind scattered operations across tools that don't speak to each other."}
              </p>
            </div>

            {/* Benefit 02 */}
            <div className="flex flex-col gap-5 border-t border-[#d8dcd6] pt-6">
              <span className="text-[12px] font-semibold text-[#0bb7dc]">02</span>
              <h3 className="text-[26px] font-medium leading-[31px] text-[#030618]">
                {isEs ? "Más confianza al vender." : "More confidence when selling."}
              </h3>
              <p className="text-[16px] leading-[25px] text-[#626763]">
                {isEs
                  ? "Las campañas traen oportunidades, no deberían traer problemas al checkout. Ofrece una compra ágil con pagos más seguros."
                  : "Marketing brings opportunities, it shouldn't bring checkout hiccups. Offer friction-free purchases with secure payments."}
              </p>
            </div>

            {/* Benefit 03 */}
            <div className="flex flex-col gap-5 border-t border-[#d8dcd6] pt-6">
              <span className="text-[12px] font-semibold text-[#0bb7dc]">03</span>
              <h3 className="text-[26px] font-medium leading-[31px] text-[#030618]">
                {isEs ? "Espacio para lo que viene." : "Room for what comes next."}
              </h3>
              <p className="text-[16px] leading-[25px] text-[#626763]">
                {isEs
                  ? "Lanza funciones más rápido y crece sin reconstruir tu infraestructura cada vez que tu negocio da un paso."
                  : "Ship features faster and grow without rebuilding your entire infrastructure each time your business takes a step forward."}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* SECTION 3: UN SOLO PANEL (PLATAFORMA)                           */}
      {/* ================================================================ */}
      <section
        id="plataforma"
        className="w-full bg-[#e7ffff] px-6 py-20 sm:px-10 lg:px-16 lg:py-26"
      >
        <div className="mx-auto grid max-w-[1312px] grid-cols-1 items-center gap-16 lg:grid-cols-12">
          {/* Left Column: Story */}
          <div className="flex flex-col gap-7 lg:col-span-5">
            <div className="flex items-center gap-2.5">
              <span className="h-[7px] w-[7px] bg-[#0bb7dc]" />
              <span className="text-[12px] font-semibold uppercase tracking-[0.1em] text-[#171919]">
                {isEs ? "La plataforma" : "The platform"}
              </span>
            </div>

            <h2 className="text-3xl font-normal tracking-tight text-[#030618] sm:text-5xl lg:text-[55px] lg:leading-[58px]">
              {isEs ? (
                <>
                  Todo conectado.
                  <br />
                  Todo bajo
                  <br />
                  control.
                </>
              ) : (
                <>
                  Everything connected.
                  <br />
                  Everything in
                  <br />
                  control.
                </>
              )}
            </h2>

            <p className="text-[18px] leading-[28px] text-[#626763]">
              {isEs
                ? "Tiendas, productos y flujos de compra integrables en un único panel. Una forma más clara de operar, para que tu equipo lance más rápido y venda con inteligencia."
                : "Stores, products, and embeddable checkouts inside one unified dashboard. A clearer way to operate, so your team launches faster and sells with intelligence."}
            </p>

            <Link
              href="/dashboard"
              className="inline-flex items-center gap-3 text-[15px] font-semibold text-[#0bb7dc] transition hover:underline"
            >
              <span>{isEs ? "Conoce tu nuevo panel" : "Explore your new dashboard"}</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {/* Right Column: Panel Mockup */}
          <div className="flex flex-col gap-2 lg:col-span-7">
            <div className="overflow-hidden rounded-[8px] border border-[#d8dcd6] bg-white shadow-xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/figma/dashboard-preview.png"
                alt="Panel de administración de Prado Commerce"
                className="w-full h-auto object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* SECTION 4: DE LA TIENDA AL MUNDO                               */}
      {/* ================================================================ */}
      <section id="negocio" className="w-full px-6 pt-20 pb-16 sm:px-10 lg:px-16 lg:pt-26 lg:pb-20">
        <div className="mx-auto grid max-w-[1312px] grid-cols-1 items-center gap-16 lg:grid-cols-2 lg:gap-24">
          {/* Left Column: Photo */}
          <div className="flex flex-col gap-4">
            <div className="overflow-hidden bg-slate-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/figma/storefront-owner.png"
                alt="Independent storefront owner"
                className="h-auto max-h-[600px] w-full object-cover object-center"
              />
            </div>
            <p className="text-[11px] font-medium tracking-wider text-[#626763] uppercase">
              {isEs
                ? "NEGOCIOS LOCALES. POSIBILIDADES GLOBALES."
                : "LOCAL BUSINESSES. GLOBAL POSSIBILITIES."}
            </p>
          </div>

          {/* Right Column: Merchant Copy */}
          <div className="flex flex-col gap-7">
            <div className="flex items-center gap-2.5">
              <span className="h-[7px] w-[7px] bg-[#0bb7dc]" />
              <span className="text-[12px] font-semibold uppercase tracking-[0.1em] text-[#171919]">
                {isEs ? "Tu esencia, también online" : "Your essence, also online"}
              </span>
            </div>

            <h2 className="text-3xl font-normal tracking-tight text-[#030618] sm:text-5xl lg:text-[58px] lg:leading-[61px]">
              {isEs ? (
                <>
                  Tu tienda tiene
                  <br />
                  algo único.
                  <br />
                  Llévalo online.
                </>
              ) : (
                <>
                  Your store has
                  <br />
                  something unique.
                  <br />
                  Bring it online.
                </>
              )}
            </h2>

            <p className="text-[18px] leading-[28px] text-[#626763]">
              {isEs
                ? "Ese cuidado que pones en cada detalle merece llegar más lejos. Fortalece tu presencia online y conecta tus productos con personas que aún no te conocen."
                : "The craft you put into every detail deserves to go further. Strengthen your online presence and connect your products with people who haven't met you yet."}
            </p>

            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <Check className="h-5 w-5 shrink-0 text-[#0bb7dc]" />
                <span className="text-[15px] text-[#030618]">
                  {isEs
                    ? "Un catálogo para mostrar lo que haces."
                    : "A catalog to showcase what you create."}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Check className="h-5 w-5 shrink-0 text-[#0bb7dc]" />
                <span className="text-[15px] text-[#030618]">
                  {isEs
                    ? "Una operación más simple para tu equipo."
                    : "A simpler day-to-day operation for your team."}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Check className="h-5 w-5 shrink-0 text-[#0bb7dc]" />
                <span className="text-[15px] text-[#030618]">
                  {isEs
                    ? "Una base preparada para crecer contigo."
                    : "A foundation built to scale alongside you."}
                </span>
              </div>
            </div>

            <Link
              href="/signup"
              className="inline-flex items-center gap-3 text-[15px] font-semibold text-[#0bb7dc] transition hover:underline"
            >
              <span>{isEs ? "Da el siguiente paso" : "Take the next step"}</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* SECTION 5: UNA COMPRA QUE FLUYE                                */}
      {/* ================================================================ */}
      <section className="w-full px-6 pt-16 pb-20 sm:px-10 lg:px-16 lg:pb-26">
        <div className="mx-auto grid max-w-[1312px] grid-cols-1 items-center gap-16 lg:grid-cols-2 lg:gap-24">
          {/* Left Column: Online Shopping Copy */}
          <div className="flex flex-col gap-7 order-2 lg:order-1">
            <div className="flex items-center gap-2.5">
              <span className="h-[7px] w-[7px] bg-[#0bb7dc]" />
              <span className="text-[12px] font-semibold uppercase tracking-[0.1em] text-[#171919]">
                {isEs ? "Del interés a la compra" : "From interest to checkout"}
              </span>
            </div>

            <h2 className="text-3xl font-normal tracking-tight text-[#030618] sm:text-5xl lg:text-[58px] lg:leading-[61px]">
              {isEs ? (
                <>
                  Una gran compra
                  <br />
                  empieza con
                  <br />
                  cero fricción.
                </>
              ) : (
                <>
                  A great purchase
                  <br />
                  starts with
                  <br />
                  zero friction.
                </>
              )}
            </h2>

            <p className="text-[18px] leading-[28px] text-[#626763]">
              {isEs
                ? "Tu próxima venta puede empezar en el sofá de alguien. Haz que siga su curso con tiendas veloces, flujos de compra integrables y pagos más seguros."
                : "Your next sale might begin on someone's sofa. Keep it moving smoothly with fast storefronts, embeddable checkout flows, and secure payments."}
            </p>

            <div className="h-px w-full bg-[#d8dcd6]" />

            <div className="flex items-start gap-4">
              <ShieldCheck className="h-6 w-6 shrink-0 text-[#0bb7dc] mt-0.5" />
              <div className="flex flex-col gap-1.5">
                <h4 className="text-[18px] font-normal leading-[22px] text-[#030618]">
                  {isEs
                    ? "Menos pasos entre querer y comprar."
                    : "Fewer steps between desire and purchase."}
                </h4>
                <p className="text-[15px] leading-[23px] text-[#626763]">
                  {isEs
                    ? "Una experiencia conectada, desde tu catálogo hasta el checkout."
                    : "A connected experience from your catalog through checkout."}
                </p>
              </div>
            </div>

            <Link
              href="/signup"
              className="inline-flex items-center gap-3 text-[15px] font-semibold text-[#0bb7dc] transition hover:underline"
            >
              <span>{isEs ? "Empieza a vender online" : "Start selling online"}</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {/* Right Column: Customer Image with Connected Shopping Card */}
          <div className="relative order-1 lg:order-2">
            <div className="overflow-hidden bg-slate-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/figma/customer-home.png"
                alt="Customer shopping online at home"
                className="h-auto max-h-[620px] w-full object-cover object-center"
              />
            </div>

            {/* Connected Shopping Card */}
            <div className="relative mt-4 flex items-center gap-4 rounded-[8px] bg-white p-5 shadow-xl sm:absolute sm:bottom-8 sm:left-8 sm:mt-0 sm:max-w-[320px]">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#e8f7fb]">
                <ShoppingBag className="h-5 w-5 text-[#0bb7dc]" />
              </div>
              <div className="flex flex-col">
                <span className="text-[14px] font-semibold text-[#171919]">
                  {isEs ? "Cerca, incluso a distancia." : "Close, even from afar."}
                </span>
                <span className="text-[12px] text-[#626763]">
                  {isEs ? "Tu tienda, donde están tus clientes." : "Your store, where your customers are."}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* SECTION 6: PARA CADA FORMA DE EMPRENDER                        */}
      {/* ================================================================ */}
      <section className="w-full bg-[#171919] px-6 py-20 text-white sm:px-10 lg:px-16 lg:py-26">
        <div className="mx-auto max-w-[1312px]">
          {/* Section Introduction */}
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between lg:gap-20">
            <div className="flex flex-col gap-6 max-w-2xl">
              <div className="flex items-center gap-2.5">
                <span className="h-[7px] w-[7px] bg-[#0bb7dc]" />
                <span className="text-[12px] font-semibold uppercase tracking-[0.1em] text-white">
                  {isEs ? "Tu negocio tiene un lugar aquí" : "Your business has a home here"}
                </span>
              </div>

              <h2 className="text-3xl font-normal tracking-tight text-white sm:text-5xl lg:text-[58px] lg:leading-[61px]">
                {isEs ? (
                  "No hay una sola forma de emprender."
                ) : (
                  "There isn't only one way to build."
                )}
              </h2>
            </div>

            <p className="max-w-md text-[18px] leading-[28px] text-[#aeb5b1]">
              {isEs
                ? "Productos físicos, digitales o servicios. Prado conecta lo que vendes con todo lo que puedes llegar a ser."
                : "Physical goods, digital downloads, or services. Prado connects what you sell with everything you can become."}
            </p>
          </div>

          {/* 3 Business Types Cards */}
          <div className="mt-14 grid grid-cols-1 gap-8 md:grid-cols-3">
            {/* Card 1 */}
            <div className="flex flex-col gap-5">
              <div className="overflow-hidden bg-slate-800">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/figma/creators.png"
                  alt="Creadores independientes"
                  className="h-[280px] w-full object-cover object-center transition duration-300 hover:scale-105"
                />
              </div>
              <div className="flex items-center justify-between">
                <h3 className="text-[25px] font-medium leading-[30px] text-white">
                  {isEs ? "Creadores independientes" : "Independent creators"}
                </h3>
                <ArrowUpRight className="h-5 w-5 text-white" />
              </div>
              <p className="text-[16px] leading-[25px] text-[#aeb5b1]">
                {isEs
                  ? "Convierte lo que sabes y lo que creas en tu próximo proyecto de venta."
                  : "Turn what you know and what you craft into your next thriving venture."}
              </p>
            </div>

            {/* Card 2 */}
            <div className="flex flex-col gap-5">
              <div className="overflow-hidden bg-slate-800">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/figma/local-stores.png"
                  alt="Tiendas locales"
                  className="h-[280px] w-full object-cover object-center transition duration-300 hover:scale-105"
                />
              </div>
              <div className="flex items-center justify-between">
                <h3 className="text-[25px] font-medium leading-[30px] text-white">
                  {isEs ? "Tiendas locales" : "Local stores"}
                </h3>
                <ArrowUpRight className="h-5 w-5 text-white" />
              </div>
              <p className="text-[16px] leading-[25px] text-[#aeb5b1]">
                {isEs
                  ? "Lleva la personalidad de tu negocio a una tienda que llegue más lejos."
                  : "Bring the unique spirit of your storefront to customers everywhere."}
              </p>
            </div>

            {/* Card 3 */}
            <div className="flex flex-col gap-5">
              <div className="overflow-hidden bg-slate-800">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/figma/growing-brands.png"
                  alt="Marcas en crecimiento"
                  className="h-[280px] w-full object-cover object-center transition duration-300 hover:scale-105"
                />
              </div>
              <div className="flex items-center justify-between">
                <h3 className="text-[25px] font-medium leading-[30px] text-white">
                  {isEs ? "Marcas en crecimiento" : "Growing brands"}
                </h3>
                <ArrowUpRight className="h-5 w-5 text-white" />
              </div>
              <p className="text-[16px] leading-[25px] text-[#aeb5b1]">
                {isEs
                  ? "Dale a tu equipo una base unificada para lanzar, operar y escalar."
                  : "Give your team a unified foundation to launch, operate, and scale."}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* SECTION 7: EMPIEZA A TU RITMO                                   */}
      {/* ================================================================ */}
      <section className="w-full px-6 py-20 sm:px-10 lg:px-16 lg:py-26">
        <div className="mx-auto max-w-[1312px]">
          {/* Section Introduction */}
          <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
            <div className="flex flex-col gap-6">
              <div className="flex items-center gap-2.5">
                <span className="h-[7px] w-[7px] bg-[#0bb7dc]" />
                <span className="text-[12px] font-semibold uppercase tracking-[0.1em] text-[#171919]">
                  {isEs ? "El siguiente paso" : "The next step"}
                </span>
              </div>

              <h2 className="text-3xl font-normal tracking-tight text-[#030618] sm:text-5xl lg:text-[58px] lg:leading-[61px]">
                {isEs ? "De la idea a tu tienda." : "From idea to storefront."}
              </h2>
            </div>

            <Link
              href="/signup"
              className="inline-flex items-center gap-3 text-[15px] font-semibold text-[#0bb7dc] transition hover:underline"
            >
              <span>{isEs ? "Comenzar gratis" : "Start free"}</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {/* 3 Step Sequence */}
          <div className="mt-14 grid grid-cols-1 gap-12 md:grid-cols-3">
            {/* Step 1 */}
            <div className="flex flex-col gap-6">
              <div className="flex items-center gap-5">
                <div className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-full border border-[#171919] text-[15px] font-medium text-[#171919]">
                  01
                </div>
                <div className="h-px flex-1 bg-[#d8dcd6]" />
              </div>
              <h3 className="text-[26px] font-medium leading-[31px] text-[#030618]">
                {isEs ? "Crea tu espacio" : "Create your workspace"}
              </h3>
              <p className="text-[16px] leading-[25px] text-[#626763]">
                {isEs
                  ? "Empieza con el Plan Inicial Gratuito y da forma al lugar desde el que gestionarás tu negocio."
                  : "Start on the Free Starter Plan and shape the hub where you will manage your entire business."}
              </p>
            </div>

            {/* Step 2 */}
            <div className="flex flex-col gap-6">
              <div className="flex items-center gap-5">
                <div className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-full border border-[#171919] text-[15px] font-medium text-[#171919]">
                  02
                </div>
                <div className="h-px flex-1 bg-[#d8dcd6]" />
              </div>
              <h3 className="text-[26px] font-medium leading-[31px] text-[#030618]">
                {isEs ? "Conecta tu catálogo" : "Connect your catalog"}
              </h3>
              <p className="text-[16px] leading-[25px] text-[#626763]">
                {isEs
                  ? "Reúne tus productos físicos, digitales o servicios y organiza tu propuesta en un único panel."
                  : "Gather physical items, digital assets, or services and organize your offering in a single view."}
              </p>
            </div>

            {/* Step 3 */}
            <div className="flex flex-col gap-6">
              <div className="flex items-center gap-5">
                <div className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-full border border-[#171919] text-[15px] font-medium text-[#171919]">
                  03
                </div>
                <div className="h-px flex-1 bg-[#d8dcd6]" />
              </div>
              <h3 className="text-[26px] font-medium leading-[31px] text-[#030618]">
                {isEs ? "Lanza. Aprende. Crece." : "Launch. Learn. Grow."}
              </h3>
              <p className="text-[16px] leading-[25px] text-[#626763]">
                {isEs
                  ? "Pon tu tienda en marcha, integra tus flujos de compra y sigue construyendo sobre la misma base."
                  : "Set your store live, connect your checkout flows, and continue expanding on one reliable base."}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* SECTION 8: PLAN INICIAL GRATUITO (PRICING)                      */}
      {/* ================================================================ */}
      <section
        id="precios"
        className="w-full bg-[#e7ffff] px-6 py-20 sm:px-10 lg:px-16 lg:py-24"
      >
        <div className="mx-auto grid max-w-[1312px] grid-cols-1 items-center gap-16 lg:grid-cols-12 lg:gap-24">
          {/* Left Column: Pricing Introduction */}
          <div className="flex flex-col gap-7 lg:col-span-6">
            <div className="flex items-center gap-2.5">
              <span className="h-[7px] w-[7px] bg-[#0bb7dc]" />
              <span className="text-[12px] font-semibold uppercase tracking-[0.1em] text-[#171919]">
                {isEs ? "Un buen comienzo" : "A great start"}
              </span>
            </div>

            <h2 className="text-3xl font-normal tracking-tight text-[#030618] sm:text-5xl lg:text-[62px] lg:leading-[66px]">
              {isEs ? (
                <>
                  Tu próximo
                  <br />
                  capítulo
                  <br />
                  empieza gratis.
                </>
              ) : (
                <>
                  Your next
                  <br />
                  chapter
                  <br />
                  starts free.
                </>
              )}
            </h2>

            <p className="text-[18px] leading-[28px] text-[#626763]">
              {isEs
                ? "Empieza a construir tu presencia online con Prado. Conoce la plataforma y encuentra una forma más simple de hacer crecer tu negocio."
                : "Begin crafting your online footprint with Prado. Discover the platform and find an easier way to expand your business."}
            </p>

            <Link
              href="/pricing"
              className="inline-flex items-center gap-3 text-[15px] font-semibold text-[#0bb7dc] transition hover:underline"
            >
              <span>{isEs ? "Ver precios y detalles del plan" : "View pricing and plan details"}</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {/* Right Column: Free Plan Card */}
          <div className="lg:col-span-6">
            <div className="rounded-[8px] bg-white p-8 shadow-xl sm:p-10">
              <h3 className="text-[24px] font-medium leading-[29px] text-[#030618]">
                {isEs ? "Plan Inicial Gratuito" : "Free Starter Plan"}
              </h3>

              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-7xl font-normal tracking-tight text-[#030618] sm:text-[100px] sm:leading-[100px]">
                  $0
                </span>
                <span className="text-[20px] font-normal text-[#626763]">
                  {isEs ? "/mes" : "/mo"}
                </span>
              </div>

              <div className="my-6 h-px w-full bg-[#d8dcd6]" />

              <p className="text-[16px] leading-[25px] text-[#626763]">
                {isEs
                  ? "Tu punto de partida para explorar el comercio electrónico unificado. El siguiente paso lo marcas tú."
                  : "Your launchpad to experience unified commerce. The next milestone is defined by you."}
              </p>

              <Link
                href="/signup"
                className="mt-8 flex w-full items-center justify-between rounded-[5px] bg-[#030618] px-6 py-3.5 text-[15px] font-semibold text-white transition hover:bg-slate-800"
              >
                <span>{isEs ? "Comenzar gratis" : "Start free"}</span>
                <ArrowUpRight className="h-4 w-4" />
              </Link>

              <p className="mt-4 text-[12px] leading-[18px] text-[#626763]">
                {isEs
                  ? "Consulta los detalles y las condiciones del plan en Precios."
                  : "Review full features and conditions on the Pricing page."}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* SECTION 9: CRECE CON PRADO COMMERCE (FINAL CTA)                */}
      {/* ================================================================ */}
      <section className="w-full bg-[#0bb7dc] px-6 py-20 text-white sm:px-10 lg:px-16 lg:py-24">
        <div className="mx-auto max-w-[1312px]">
          {/* Section label */}
          <div className="flex items-center gap-2.5">
            <span className="h-[7px] w-[7px] bg-white" />
            <span className="text-[12px] font-semibold uppercase tracking-[0.1em] text-white">
              {isEs ? "Lo que viene, lo construyes tú" : "What lies ahead is built by you"}
            </span>
          </div>

          {/* Closing Invitation Layout */}
          <div className="mt-8 flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between xl:gap-20">
            <h2 className="text-4xl font-medium tracking-tight text-white sm:text-6xl xl:text-[74px] xl:leading-[78px]">
              {isEs ? (
                <>
                  ¿Listo para crecer
                  <br />
                  con Prado Commerce?
                </>
              ) : (
                <>
                  Ready to grow
                  <br />
                  with Prado Commerce?
                </>
              )}
            </h2>

            <div className="flex max-w-md flex-col gap-7">
              <p className="text-[18px] leading-[27px] text-white">
                {isEs
                  ? "Tu idea. Tu negocio. Una plataforma para llevarlos más lejos."
                  : "Your idea. Your business. A platform built to take them further."}
              </p>

              <div>
                <Link
                  href="/signup"
                  className="inline-flex items-center gap-5 rounded-[5px] bg-[#030618] px-6 py-3.5 text-[15px] font-semibold text-white shadow-md transition hover:bg-slate-800"
                >
                  <span>{isEs ? "Comenzar gratis" : "Start free"}</span>
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* SECTION 10: PIE DE PÁGINA (FOOTER)                             */}
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
                  href="#plataforma"
                  className="text-[15px] text-[#030618] transition hover:text-[#0bb7dc]"
                >
                  {isEs ? "Plataforma" : "Platform"}
                </Link>
                <Link
                  href="#negocio"
                  className="text-[15px] text-[#030618] transition hover:text-[#0bb7dc]"
                >
                  {isEs ? "Para tu negocio" : "For your business"}
                </Link>
                <Link
                  href="/pricing"
                  className="text-[15px] text-[#030618] transition hover:text-[#0bb7dc]"
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

              {/* Language Preference */}
              <div className="flex flex-col gap-4">
                <span className="text-[12px] font-semibold tracking-wider text-[#626763] uppercase">
                  {isEs ? "IDIOMA" : "LANGUAGE"}
                </span>
                <button
                  type="button"
                  onClick={() => setLanguage(isEs ? "en" : "es")}
                  className="inline-flex items-center gap-2 text-[14px] text-[#030618] transition hover:text-[#0bb7dc]"
                >
                  <Globe className="h-4 w-4 text-[#171919]" />
                  <span>{isEs ? "ES (Español)" : "EN (English)"}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Legal / Copyright Bottom Line */}
          <div className="mt-14 flex flex-col justify-between gap-4 border-t border-[#d8dcd6] pt-6 sm:flex-row sm:items-center text-[12px] text-[#626763]">
            <p>Copyright © 2026 Prado Commerce.</p>
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
    </main>
  );
}
