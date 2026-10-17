"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";

export default function TermsPage() {
  const { language, setLanguage } = useLanguage();
  const isEs = language === "es";

  const sections = isEs
    ? [
        {
          id: "section-1",
          num: "01",
          title: "1. Servicios cubiertos por estos términos",
          shortTitle: "Servicios cubiertos",
          lead: "Estos términos se aplican a todas las áreas del producto, incluyendo:",
          bullets: [
            "Páginas públicas como inicio, precios, inicio de sesión, registro, privacidad y términos.",
            "Módulos del panel de comerciante: panel principal, tiendas, productos, categorías, pedidos y clientes.",
            "Configuración del panel: perfil de tienda, monedas, pagos, envíos, impuestos, seguridad y acceso a la API.",
            "Páginas de tiendas virtuales servidas por slug y rutas de dominios personalizados.",
            "APIs para autenticación, gestión del catálogo, carrito, checkout, cargas de archivos y administración de claves.",
            "Uso embebido y headless con claves públicas, IDs de variantes y configuración del host de API.",
          ],
        },
        {
          id: "section-2",
          num: "02",
          title: "2. Elegibilidad y responsabilidades de la cuenta",
          shortTitle: "Elegibilidad y cuenta",
          bullets: [
            "Debes proporcionar información precisa y verídica sobre tu cuenta y tu negocio.",
            "Eres el único responsable de todas las acciones realizadas con tu cuenta y los accesos de tu equipo.",
            "Debes proteger contraseñas, accesos de sesión, claves de API y configuraciones de dominio.",
            "Debes actualizar inmediatamente tus credenciales o revocar claves ante cualquier sospecha de acceso no autorizado.",
          ],
        },
        {
          id: "section-3",
          num: "03",
          title: "3. Uso aceptable y conductas prohibidas",
          shortTitle: "Uso aceptable",
          bullets: [
            "Utiliza Prado Commerce únicamente para actividades comerciales lícitas y éticas.",
            "No intentes eludir controles de acceso, firewalls o mecanismos de seguridad de la plataforma.",
            "No extraigas datos de forma abusiva, ni sobrecargues o perturbes la infraestructura del servicio.",
            "No utilices la plataforma para distribuir contenido dañino, engañoso, fraudulento o infractor.",
            "No expongas claves secretas en código del lado del cliente ni en repositorios accesibles al público.",
          ],
        },
        {
          id: "section-4",
          num: "04",
          title: "4. Contenido del comerciante y datos operativos",
          shortTitle: "Contenido del comerciante",
          bullets: [
            "Conservas la responsabilidad exclusiva de los datos de productos, precios, clientes y pedidos en tu espacio.",
            "Eres el único responsable de la legalidad y exactitud del contenido de tu catálogo y de tus promociones.",
            "Eres responsable de los impuestos, tarifas de envío y reglas de cumplimiento configuradas en tu cuenta.",
          ],
        },
        {
          id: "section-5",
          num: "05",
          title: "5. Términos de API e integraciones",
          shortTitle: "Términos de API",
          bullets: [
            "Las claves públicas pueden utilizarse en contextos autorizados de integración en el frontend.",
            "Las claves secretas deben almacenarse de forma segura y utilizarse únicamente en servidores de confianza.",
            "Debes configurar con exactitud los dominios frontend autorizados para aplicar controles de seguridad en navegadores.",
            "Eres responsable de las solicitudes realizadas por tus scripts, aplicaciones y servicios de terceros.",
            "Prado Commerce se reserva el derecho de limitar o revocar el acceso a la API para salvaguardar la plataforma.",
          ],
        },
        {
          id: "section-6",
          num: "06",
          title: "6. Tarifas de pago, envíos y comisiones de procesamiento",
          shortTitle: "Tarifas y comisiones",
          lead: "Las herramientas de configuración del panel se proporcionan como utilidades operativas. Sigues siendo responsable de las políticas comerciales, el cumplimiento normativo, contratos con proveedores y obligaciones fiscales.",
          subheading: "Comisiones de procesamiento de pagos con Stripe",
          sublead: "Al habilitar pagos en línea a través de Stripe Connect, aplican las tarifas estándar de procesamiento de Stripe para transacciones exitosas con tarjeta:",
          bullets: [
            "Tarjetas nacionales en línea: 2,9% + $0,30 por transacción exitosa. Válido para Visa, Mastercard, American Express, Discover y billeteras digitales (Apple Pay / Google Pay).",
            "Tarjetas internacionales: se aplica un recargo adicional de +1,5%, totalizando 4,4% + $0,30.",
            "Conversión de divisas: si la operación requiere cambio de divisa, aplica un +1% adicional.",
            "Tarjetas ingresadas manualmente (MOTO): se aplica un recargo de +0,5% sobre la tasa base.",
            "Tarjetas presenciales (Stripe Terminal): 2,7% + $0,05 por transacción.",
          ],
        },
        {
          id: "section-7",
          num: "07",
          title: "7. Disponibilidad y actualizaciones del servicio",
          shortTitle: "Disponibilidad y mejoras",
          lead: "Prado Commerce puede agregar, modificar o descontinuar funciones a lo largo del tiempo, incluyendo mejoras en el panel, rutas de API y capacidades de la tienda. Mantenimientos programados o de emergencia pueden afectar temporalmente la disponibilidad.",
        },
        {
          id: "section-8",
          num: "08",
          title: "8. Suspensión y rescisión",
          shortTitle: "Suspensión y rescisión",
          lead: "El acceso a la plataforma puede suspenderse o cancelarse en caso de incumplimiento de estos términos, sospecha fundada de abuso, requerimientos legales o riesgos de seguridad. Tras la rescisión, las claves de API y sesiones activas quedarán revocadas.",
        },
        {
          id: "section-9",
          num: "09",
          title: "9. Exenciones y limitación de responsabilidad",
          shortTitle: "Limitación de responsabilidad",
          lead: "Prado Commerce se suministra 'tal cual' y sujeto a disponibilidad. En la máxima medida permitida por la legislación aplicable, Prado Commerce no será responsable por daños indirectos, incidentales, especiales, consecuentes o punitivos derivados del uso del servicio.",
        },
        {
          id: "section-10",
          num: "10",
          title: "10. Modificaciones de estos términos",
          shortTitle: "Modificaciones",
          lead: "Estos términos pueden ser actualizados a medida que evolucione la plataforma. El uso continuado del servicio tras la publicación de cambios implicará la aceptación plena de los términos actualizados.",
        },
        {
          id: "section-11",
          num: "11",
          title: "11. Contacto",
          shortTitle: "Contacto",
          lead: "Para preguntas sobre estos términos o asistencia adicional, comunícate con support@pradocommerce.com",
        },
      ]
    : [
        {
          id: "section-1",
          num: "01",
          title: "1. Services covered by these terms",
          shortTitle: "Services covered",
          lead: "These terms apply to all product areas, including:",
          bullets: [
            "Public pages such as home, pricing, login, signup, privacy, and terms.",
            "Merchant dashboard modules: dashboard, stores, products, categories, orders, and customers.",
            "Dashboard settings: store profile, currencies, payments, shipping, tax, security, and API access.",
            "Storefront pages served by slug and custom domain routes.",
            "APIs for authentication, catalog management, cart, checkout, uploads, and key management.",
            "Embed and headless usage with publishable keys, variant IDs, and API host configuration.",
          ],
        },
        {
          id: "section-2",
          num: "02",
          title: "2. Eligibility and account responsibilities",
          shortTitle: "Eligibility & account",
          bullets: [
            "You must provide accurate account and store information.",
            "You are responsible for all actions under your account and team access.",
            "You must protect passwords, session access, API keys, and domain configuration settings.",
            "You must promptly update credentials or revoke keys if unauthorized access is suspected.",
          ],
        },
        {
          id: "section-3",
          num: "03",
          title: "3. Acceptable use and prohibited conduct",
          shortTitle: "Acceptable use",
          bullets: [
            "Use Prado Commerce only for lawful commercial activity.",
            "Do not attempt to bypass access controls or security mechanisms.",
            "Do not scrape, abuse, overload, or disrupt service infrastructure.",
            "Do not use the platform to distribute harmful, fraudulent, or infringing content.",
            "Do not expose secret keys in client-side code or publicly accessible repositories.",
          ],
        },
        {
          id: "section-4",
          num: "04",
          title: "4. Merchant content and operational data",
          shortTitle: "Merchant content",
          bullets: [
            "You retain responsibility for product, pricing, customer, and order data entered in your workspace.",
            "You are responsible for the legality and accuracy of catalog and marketing content.",
            "You are responsible for taxes, shipping rules, and compliance settings configured in your account.",
          ],
        },
        {
          id: "section-5",
          num: "05",
          title: "5. API and integration terms",
          shortTitle: "API & integration terms",
          bullets: [
            "Publishable keys may be used in approved frontend integration contexts.",
            "Secret keys must be stored securely and used only in trusted server environments.",
            "You must configure allowed frontend domains accurately for browser-side safety controls.",
            "You are responsible for requests made by your scripts, applications, and third-party integrations.",
            "Prado Commerce may limit or revoke API access to protect platform integrity.",
          ],
        },
        {
          id: "section-6",
          num: "06",
          title: "6. Payment, shipping, and processing fees",
          shortTitle: "Payment & processing fees",
          lead: "Dashboard configuration tools are provided as operational features. You remain responsible for business policy, legal compliance, provider contracts, settlement outcomes, and tax filing obligations.",
          subheading: "Stripe Payment Processing Fees",
          sublead: "When you enable online payments through Stripe Connect, Stripe processing fees apply to successful card transactions:",
          bullets: [
            "Domestic online cards: 2.9% + $0.30 per successful transaction. Applies to Visa, Mastercard, American Express, Discover, and digital wallets (Apple Pay / Google Pay).",
            "International cards: an additional +1.5% applies, for a total of 4.4% + $0.30.",
            "Currency conversion: if the charge requires currency conversion, an additional +1% applies.",
            "Manually entered cards (MOTO): an additional +0.5% applies on top of the base processing rate.",
            "In-person cards (Stripe Terminal): 2.7% + $0.05 per transaction.",
          ],
        },
        {
          id: "section-7",
          num: "07",
          title: "7. Availability and updates",
          shortTitle: "Availability & updates",
          lead: "Prado Commerce may add, remove, or modify features over time, including changes to dashboard workflows, API routes, and storefront capabilities. Scheduled or emergency maintenance may affect availability.",
        },
        {
          id: "section-8",
          num: "08",
          title: "8. Suspension and termination",
          shortTitle: "Suspension & termination",
          lead: "Access may be suspended or terminated for violations of these terms, suspected abuse, legal requirements, or security risks. Upon termination, API keys and active sessions may be revoked.",
        },
        {
          id: "section-9",
          num: "09",
          title: "9. Disclaimers and limitation of liability",
          shortTitle: "Limitation of liability",
          lead: "Prado Commerce is provided on an as-available basis. To the maximum extent permitted by law, Prado Commerce is not liable for indirect, incidental, special, consequential, or punitive damages arising from service use.",
        },
        {
          id: "section-10",
          num: "10",
          title: "10. Changes to these terms",
          shortTitle: "Changes to terms",
          lead: "These terms may be updated as Prado Commerce evolves. Continued use of the service after updates means you accept the revised terms.",
        },
        {
          id: "section-11",
          num: "11",
          title: "11. Contact",
          shortTitle: "Contact",
          lead: "For terms questions or additional assistance, contact support@pradocommerce.com",
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
                className="flex items-center gap-3 text-[15px] font-normal text-[#626763] transition hover:text-[#030618]"
              >
                <span className="h-4 w-[3px] bg-[#d8dcd6]" />
                <span>{isEs ? "Privacidad" : "Privacy"}</span>
              </Link>
              <Link
                href="/terms"
                className="flex items-center gap-3 text-[15px] font-semibold text-[#030618]"
              >
                <span className="h-4 w-[3px] bg-[#0bb7dc]" />
                <span>{isEs ? "Términos" : "Terms"}</span>
              </Link>
            </div>
          </div>

          {/* Right Column: Title and Lead */}
          <div className="flex flex-1 flex-col gap-6">
            <h1 className="text-4xl font-normal tracking-tight text-[#030618] sm:text-6xl lg:text-[72px] lg:leading-[76px]">
              {isEs ? "Términos del Servicio" : "Terms of Service"}
            </h1>
            <p className="text-[14px] font-normal text-[#626763]">
              {isEs
                ? "Fecha de vigencia: 3 de agosto de 2026"
                : "Effective date: August 3, 2026"}
            </p>
            <p className="max-w-3xl text-[20px] leading-[32px] text-[#030618]">
              {isEs
                ? "Estos Términos del Servicio rigen el acceso y uso de Prado Commerce, incluyendo el sitio web, el panel de control para comerciantes, los servicios de API, las rutas de tiendas virtuales y las integraciones de carrito incrustable."
                : "These Terms of Service govern access to and use of Prado Commerce, including the website, merchant dashboard, API services, storefront routes, and embedded cart integrations."}
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

                {sec.subheading && (
                  <h3 className="mt-6 text-[19px] font-semibold leading-[29px] text-[#030618]">
                    {sec.subheading}
                  </h3>
                )}

                {sec.sublead && (
                  <p className="mt-2 text-[17px] leading-[28px] text-[#030618]">
                    {sec.sublead}
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
                className="text-[#030618] hover:underline"
              >
                {isEs ? "Privacidad" : "Privacy"}
              </Link>
              <Link
                href="/terms"
                className="font-semibold text-[#030618] hover:underline"
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