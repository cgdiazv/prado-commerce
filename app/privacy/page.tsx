"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";

export default function PrivacyPage() {
  const { language, setLanguage } = useLanguage();
  const isEs = language === "es";

  const sections = isEs
    ? [
        {
          id: "section-1",
          num: "01",
          title: "1. Alcance de esta política",
          shortTitle: "Alcance de esta política",
          lead: "Esta política se aplica a todas las superficies de Prado Commerce, incluyendo:",
          bullets: [
            "Páginas públicas del sitio web, como inicio, precios, privacidad, términos, inicio de sesión, registro y restablecimiento de contraseña.",
            "Módulos del panel de administración, incluyendo tiendas, productos, categorías, pedidos, clientes y configuración.",
            "Funciones de configuración, incluyendo perfil de tienda, monedas, pagos, envíos, impuestos, seguridad y acceso a la API.",
            "Rutas de visualización de tiendas virtuales por slug o dominio personalizado mapeado.",
            "Rutas de API utilizadas para autenticación, gestión del catálogo, carrito, checkout, cargas de archivos y administración de claves.",
            "Scripts incrustables y eventos de tienda virtual que envían datos a las APIs de la plataforma.",
          ],
        },
        {
          id: "section-2",
          num: "02",
          title: "2. Información que recopilamos",
          shortTitle: "Información que recopilamos",
          bullets: [
            "Datos de la cuenta: nombre, correo electrónico, hash de contraseña, registros de incorporación y metadatos de estado de la cuenta.",
            "Datos de autenticación: cookies de sesión, versiones de sesión, registros de inicio de sesión y eventos de seguridad.",
            "Datos de la tienda: ID de tienda, nombre comercial, slug, ajustes de dominio, dominios web autorizados y campos de identidad de marca.",
            "Datos del catálogo: productos, variantes, categorías, URLs de archivos multimedia, precios y atributos de inventario.",
            "Datos de clientes: perfiles de clientes e historial de pedidos relacionados almacenados por el comerciante.",
            "Datos de pedidos: contenido del carrito, contexto del checkout, totales del pedido, transiciones de estado y metadatos de entrega.",
            "Datos de configuración de pagos e impuestos: ajustes de proveedores, preferencias fiscales y reglas a nivel de región.",
            "Datos de configuración de envíos: origen, zonas, métodos y estado de integraciones con empresas de paquetería.",
            "Datos de acceso a la API: claves públicas, claves secretas, metadatos de claves e historial de revocaciones.",
            "Datos operativos: registros de solicitudes, trazas de errores y telemetría de rendimiento para confiabilidad y seguridad.",
          ],
        },
        {
          id: "section-3",
          num: "03",
          title: "3. Cómo utilizamos la información",
          shortTitle: "Cómo usamos la información",
          bullets: [
            "Proporcionar la funcionalidad del panel de control y de las tiendas para las operaciones comerciales.",
            "Autenticar usuarios, aplicar controles de acceso y proteger cuentas contra accesos o usos no autorizados.",
            "Procesar los flujos de catálogo, carrito y checkout solicitados por los comerciantes y los compradores.",
            "Ofrecer soporte para funciones de configuración de envíos, impuestos, métodos de pago, monedas y dominios.",
            "Emitir, validar y revocar claves de API para integraciones y casos de uso de comercio headless.",
            "Supervisar el rendimiento de la plataforma, resolver incidencias y mejorar la estabilidad del servicio.",
          ],
        },
        {
          id: "section-4",
          num: "04",
          title: "4. Cookies y sesiones",
          shortTitle: "Cookies y sesiones",
          lead: "Prado Commerce utiliza cookies y mecanismos de sesión asociados para mantener las sesiones de usuario activas, proteger rutas seguras y dar soporte a controles de seguridad de la cuenta, tales como cambios de contraseña y cierre de sesión en otros dispositivos.",
        },
        {
          id: "section-5",
          num: "05",
          title: "5. Claves de API y seguridad de integración",
          shortTitle: "Claves de API y seguridad",
          bullets: [
            "Las claves públicas están diseñadas para integraciones del lado del cliente o contextos web públicos.",
            "Las claves secretas están destinadas exclusivamente a entornos seguros en servidores de confianza.",
            "Los comerciantes pueden generar y revocar claves en Configuración del Panel bajo la sección Acceso a la API.",
            "Los controles de dominios autorizados se aplican para evitar el uso indebido de integraciones en el navegador.",
          ],
        },
        {
          id: "section-6",
          num: "06",
          title: "6. Intercambio y divulgación de datos",
          shortTitle: "Intercambio de datos",
          lead: "Prado Commerce no vende datos de sus comerciantes. La información solo podrá compartirse cuando sea necesario para:",
          bullets: [
            "Operar las características solicitadas de la plataforma a través de proveedores de servicios de confianza.",
            "Cumplir con obligaciones legales, requerimientos regulatorios válidos o requerimientos de autoridades judiciales.",
            "Proteger los derechos, la seguridad y la integridad de Prado Commerce, sus comerciantes y sus usuarios.",
          ],
        },
        {
          id: "section-7",
          num: "07",
          title: "7. Conservación de datos",
          shortTitle: "Conservación de datos",
          lead: "Los datos se conservan durante el tiempo necesario para prestar los servicios, mantener registros comerciales legítimos, hacer cumplir medidas de seguridad y satisfacer exigencias legales o contractuales.",
        },
        {
          id: "section-8",
          num: "08",
          title: "8. Prácticas de seguridad",
          shortTitle: "Prácticas de seguridad",
          bullets: [
            "Controles estrictos de acceso y verificaciones de autenticación en rutas protegidas del panel y la API.",
            "Mecanismos de cambio de contraseña e invalidación inmediata de sesiones activas en otros dispositivos.",
            "Gestión completa del ciclo de vida de claves criptográficas con endpoints de creación y revocación.",
            "Monitoreo operativo continuo para garantizar la estabilidad de la plataforma y detectar patrones de uso anormales.",
          ],
        },
        {
          id: "section-9",
          num: "09",
          title: "9. Uso internacional",
          shortTitle: "Uso internacional",
          lead: "Los comerciantes pueden acceder a Prado Commerce desde múltiples regiones del mundo. Al utilizar el servicio, comprende que sus datos pueden procesarse en jurisdicciones donde operen nuestra infraestructura o nuestros proveedores de servicios.",
        },
        {
          id: "section-10",
          num: "10",
          title: "10. Actualizaciones de la política",
          shortTitle: "Actualizaciones",
          lead: "Esta política puede actualizarse a medida que evolucionan las capacidades de la plataforma, incluyendo cambios en módulos del panel, comportamiento de la API o controles de seguridad. El uso continuado de Prado Commerce tras las actualizaciones constituye la aceptación de la política revisada.",
        },
        {
          id: "section-11",
          num: "11",
          title: "11. Contacto",
          shortTitle: "Contacto",
          lead: "Para consultas sobre privacidad o solicitudes de derechos sobre tus datos, comunícate con nosotros en: support@pradocommerce.com",
        },
      ]
    : [
        {
          id: "section-1",
          num: "01",
          title: "1. Scope of this policy",
          shortTitle: "Scope of this policy",
          lead: "This policy applies to all Prado Commerce surfaces, including:",
          bullets: [
            "Public website pages such as home, pricing, privacy, terms, login, signup, and password reset.",
            "Dashboard modules including stores, products, categories, orders, customers, and settings.",
            "Settings features including store profile, currencies, payments, shipping, tax, security, and API access.",
            "Storefront rendering routes by slug or mapped domain.",
            "API routes used for authentication, catalog management, cart, checkout, uploads, and key management.",
            "Embed scripts and storefront events that send data to platform APIs.",
          ],
        },
        {
          id: "section-2",
          num: "02",
          title: "2. Information we collect",
          shortTitle: "Information we collect",
          bullets: [
            "Account data: name, email, password hash, onboarding records, and account status metadata.",
            "Authentication data: session cookies, session version values, login events, and security events.",
            "Store data: store ID, store name, slug, domain settings, allowed frontend domains, and branding fields.",
            "Catalog data: products, variants, categories, media URLs, pricing, and inventory attributes.",
            "Customer data: customer profiles and related order history stored by the merchant.",
            "Order data: cart contents, checkout context, order totals, status transitions, and fulfillment metadata.",
            "Payment and tax configuration data: provider settings, tax preferences, and region-level rules.",
            "Shipping configuration data: origin, zones, methods, and carrier integration states.",
            "API access data: publishable keys, secret keys, key metadata, and revocation history.",
            "Operational data: request logs, error traces, and performance telemetry needed for reliability and security.",
          ],
        },
        {
          id: "section-3",
          num: "03",
          title: "3. How we use information",
          shortTitle: "How we use information",
          bullets: [
            "Provide dashboard and storefront functionality for merchant operations.",
            "Authenticate users, enforce access control, and protect accounts from unauthorized use.",
            "Process catalog, cart, and checkout workflows requested by merchants and storefront users.",
            "Support configuration features for shipping, tax, payment, currency, and domain controls.",
            "Issue, validate, and revoke API keys for integrations and headless storefront use cases.",
            "Monitor platform performance, troubleshoot issues, and improve service reliability.",
          ],
        },
        {
          id: "section-4",
          num: "04",
          title: "4. Cookies and sessions",
          shortTitle: "Cookies and sessions",
          lead: "Prado Commerce uses cookies and related session mechanisms to keep users signed in, protect secure routes, and support account-level controls such as changing passwords and signing out other devices.",
        },
        {
          id: "section-5",
          num: "05",
          title: "5. API keys and integration safety",
          shortTitle: "API keys and safety",
          bullets: [
            "Publishable keys are intended for client-side or public integration contexts.",
            "Secret keys are intended for trusted server-side environments only.",
            "Merchants can create and revoke keys in Dashboard Settings under API access.",
            "Allowed frontend domain controls are used to reduce misuse of browser-side integrations.",
          ],
        },
        {
          id: "section-6",
          num: "06",
          title: "6. Data sharing and disclosures",
          shortTitle: "Data sharing & disclosures",
          lead: "Prado Commerce does not sell merchant data. Information may be shared only when required to:",
          bullets: [
            "Operate requested platform features through service providers.",
            "Comply with legal obligations, lawful requests, or enforcement requirements.",
            "Protect the rights, security, and integrity of Prado Commerce, merchants, and users.",
          ],
        },
        {
          id: "section-7",
          num: "07",
          title: "7. Data retention",
          shortTitle: "Data retention",
          lead: "Data is retained for as long as needed to provide services, maintain legitimate business records, enforce security controls, and satisfy legal or contractual requirements.",
        },
        {
          id: "section-8",
          num: "08",
          title: "8. Security practices",
          shortTitle: "Security practices",
          bullets: [
            "Access controls and authentication checks on protected dashboard and API routes.",
            "Password change and active-session invalidation controls.",
            "Key lifecycle management with creation and revocation endpoints.",
            "Operational monitoring for platform stability and abnormal usage detection.",
          ],
        },
        {
          id: "section-9",
          num: "09",
          title: "9. International use",
          shortTitle: "International use",
          lead: "Merchants may access Prado Commerce from multiple regions. By using the service, you understand that data may be processed in jurisdictions where our infrastructure or vendors operate.",
        },
        {
          id: "section-10",
          num: "10",
          title: "10. Policy updates",
          shortTitle: "Policy updates",
          lead: "This policy may be updated as platform features evolve, including updates to dashboard modules, API behavior, or security controls. Continued use of Prado Commerce after updates indicates acceptance of the revised policy.",
        },
        {
          id: "section-11",
          num: "11",
          title: "11. Contact",
          shortTitle: "Contact",
          lead: "For privacy questions or requests, contact: support@pradocommerce.com",
        },
      ];

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

          {/* Right Area: Back to Home + Language Selector */}
          <div className="flex items-center gap-6 sm:gap-8">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-[15px] font-normal text-[#030618] transition hover:text-[#0bb7dc]"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>{isEs ? "Volver al inicio" : "Back to home"}</span>
            </Link>

            <div className="h-4 w-px bg-[#d8dcd6]" />

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
          </div>
        </div>
      </header>

      {/* ================================================================ */}
      {/* SECTION 1: DOCUMENT INTRODUCTION                                */}
      {/* ================================================================ */}
      <section className="w-full px-6 pt-16 pb-12 sm:px-10 lg:px-16">
        <div className="mx-auto flex max-w-[1312px] flex-col gap-12 lg:flex-row lg:gap-20">
          {/* Left Column: Legal Tabs */}
          <div className="flex w-full flex-col gap-7 lg:w-64 lg:shrink-0">
            <div className="flex items-center gap-2.5">
              <span className="h-[7px] w-[7px] bg-[#0bb7dc]" />
              <span className="text-[12px] font-semibold uppercase tracking-[0.1em] text-[#030618]">
                LEGAL
              </span>
            </div>

            <div className="flex flex-row gap-6 lg:flex-col lg:gap-4">
              <Link
                href="/privacy"
                className="flex items-center gap-3 text-[15px] font-semibold text-[#030618]"
              >
                <span className="h-4 w-[3px] bg-[#0bb7dc]" />
                <span>{isEs ? "Privacidad" : "Privacy"}</span>
              </Link>
              <Link
                href="/terms"
                className="flex items-center gap-3 text-[15px] font-normal text-[#626763] transition hover:text-[#030618]"
              >
                <span className="h-4 w-[3px] bg-[#d8dcd6]" />
                <span>{isEs ? "Términos" : "Terms"}</span>
              </Link>
            </div>
          </div>

          {/* Right Column: Title and Lead */}
          <div className="flex flex-1 flex-col gap-6">
            <h1 className="text-4xl font-normal tracking-tight text-[#030618] sm:text-6xl lg:text-[72px] lg:leading-[76px]">
              {isEs ? "Política de Privacidad" : "Privacy Policy"}
            </h1>
            <p className="text-[14px] font-normal text-[#626763]">
              {isEs
                ? "Fecha de vigencia: 3 de agosto de 2026"
                : "Effective date: August 3, 2026"}
            </p>
            <p className="max-w-3xl text-[20px] leading-[32px] text-[#030618]">
              {isEs
                ? "Esta Política de Privacidad explica cómo Prado Commerce recopila, utiliza, almacena y protege la información cuando los comerciantes y sus equipos utilizan el sitio web, el panel de administración, las APIs y las experiencias de checkout integrables."
                : "This Privacy Policy explains how Prado Commerce collects, uses, stores, and protects information when merchants and their teams use the website, dashboard, APIs, and embedded cart experiences."}
            </p>
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* SECTION 2: LEGAL DOCUMENT BODY                                  */}
      {/* ================================================================ */}
      <section className="w-full px-6 pb-24 sm:px-10 lg:px-16">
        <div className="mx-auto flex max-w-[1312px] flex-col gap-12 lg:flex-row lg:gap-20">
          {/* Left Column: Table of Contents Rail */}
          <aside className="w-full lg:w-64 lg:shrink-0">
            <div className="sticky top-32 flex flex-col gap-5 border border-[#d8dcd6] rounded-[8px] p-6 bg-[#fafaf9]">
              <span className="text-[12px] font-semibold uppercase tracking-[0.1em] text-[#626763]">
                {isEs ? "EN ESTA PÁGINA" : "ON THIS PAGE"}
              </span>
              <nav className="flex flex-col gap-3.5 text-[13px] leading-[20px]">
                {sections.map((sec) => (
                  <a
                    key={sec.id}
                    href={`#${sec.id}`}
                    className="flex items-center gap-2.5 text-[#626763] transition hover:text-[#030618]"
                  >
                    <span className="font-mono text-[12px] text-[#0bb7dc]">
                      {sec.num}
                    </span>
                    <span>{sec.shortTitle}</span>
                  </a>
                ))}
              </nav>
            </div>
          </aside>

          {/* Right Column: 11 Legal Sections */}
          <div className="flex flex-1 flex-col gap-10">
            {sections.map((sec) => (
              <article
                key={sec.id}
                id={sec.id}
                className="scroll-mt-32 border-t border-[#d8dcd6] pt-8"
              >
                <h2 className="text-[25px] font-medium leading-[33px] text-[#030618]">
                  {sec.title}
                </h2>

                {sec.lead && (
                  <p className="mt-4 text-[17px] leading-[28px] text-[#030618]">
                    {sec.lead}
                  </p>
                )}

                {sec.bullets && (
                  <ul className="mt-4 flex flex-col gap-2.5 text-[17px] leading-[28px] text-[#030618]">
                    {sec.bullets.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <span className="text-[#030618] select-none">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* SECTION 3: PIE DE PÁGINA                                        */}
      {/* ================================================================ */}
      <footer className="w-full border-t border-[#d8dcd6] bg-white px-6 pt-10 pb-8 sm:px-10 lg:px-16">
        <div className="mx-auto flex max-w-[1312px] flex-col gap-8">
          <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
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

            <a
              href="https://indevasa.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[13px] text-[#626763] hover:text-[#030618] hover:underline"
            >
              Indeva Website
            </a>
          </div>

          <div className="flex flex-col justify-between gap-4 border-t border-[#d8dcd6] pt-6 sm:flex-row sm:items-center text-[12px] text-[#626763]">
            <p>
              Copyright © 2026 Prado Commerce.{" "}
              {isEs ? "Todos los derechos reservados." : "All rights reserved."}
            </p>
            <div className="flex items-center gap-8">
              <Link
                href="/privacy"
                className="font-semibold text-[#030618] hover:underline"
              >
                {isEs ? "Privacidad" : "Privacy"}
              </Link>
              <Link
                href="/terms"
                className="text-[#030618] hover:underline"
              >
                {isEs ? "Términos" : "Terms"}
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}