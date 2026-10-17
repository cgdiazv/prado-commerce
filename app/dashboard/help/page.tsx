"use client";

import { useLanguage } from "@/lib/i18n/language-context";
import { HelpdeskTicketForm } from "./helpdesk-ticket-form";

export default function DashboardHelpPage() {
  const { language } = useLanguage();
  const isEs = language === "es";

  return (
    <section className="space-y-6">
      <header>
        <p className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
          {isEs ? "Ayuda" : "Help"}
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
          {isEs ? "Centro de Ayuda del Panel" : "Dashboard Help Center"}
        </h1>
        <p className="mt-2 text-xs font-medium tracking-[0.02em] text-slate-500">
          {isEs ? "Última actualización: 16 de octubre de 2026" : "Last updated: October 16, 2026"}
        </p>
        <p className="mt-1 max-w-3xl text-sm text-slate-500">
          {isEs
            ? "Encuentra orientación práctica para gestionar productos, pedidos, punto de venta (POS), compras, clientes, grupos, tiendas, facturación y la seguridad de tu cuenta en Prado Commerce."
            : "Find practical guidance for managing products, orders, point of sale (POS), procurement, customers, groups, stores, invoicing, and account security in Prado Commerce."}
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-12 lg:items-start">
        {/* Documentation Content - Left Column */}
        <article className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-7">
          {/* Latest Updates Highlight */}
          <section className="space-y-3 rounded-lg border border-cyan-200 bg-cyan-50 p-4">
            <h2 className="text-base font-semibold text-cyan-950">
              {isEs ? "Últimas actualizaciones (Últimos 7 días)" : "Latest updates (Past 7 days)"}
            </h2>
            <ul className="list-disc space-y-2 pl-5 text-sm leading-6 text-cyan-900">
              <li>
                <strong>{isEs ? "Punto de Venta (POS): " : "Point of Sale (POS): "}</strong>
                {isEs
                  ? "Nuevo módulo de ventas presenciales en Pedidos > Punto de Venta con soporte sin conexión (offline), escaneo de códigos de barra, selección rápida por categorías, control de turnos de caja con PIN e impresión de recibos."
                  : "New in-person sales terminal under Orders > Point of Sale featuring offline operation, barcode scanning, category quick filters, PIN-authenticated cashier shifts, and receipt printing."}
              </li>
              <li>
                <strong>{isEs ? "Grupos de Clientes: " : "Customer Groups: "}</strong>
                {isEs
                  ? "Nueva sección en Clientes > Grupos de Clientes para segmentar compradores en niveles (Mayoristas, VIP, Minoristas) y vincularlos automáticamente en pedidos y facturas."
                  : "New section in Customers > Customer Groups to segment buyers into tiers (Wholesale, VIP, Retail) and reference them automatically on orders and invoices."}
              </li>
              <li>
                <strong>{isEs ? "Facturación Oficial de Pedidos: " : "Official Order Invoicing: "}</strong>
                {isEs
                  ? "Genera, visualiza e imprime facturas oficiales desde el detalle de cada pedido con desglose de impuestos, prefijo personalizable (ej. INV-) y datos fiscales de tu tienda."
                  : "Generate, view, and print official invoices from any order detail view with full tax breakdowns, customizable numbering prefixes (e.g., INV-), and merchant branding."}
              </li>
              <li>
                <strong>{isEs ? "Soporte Bilingüe Completo (Español / Inglés): " : "Complete Bilingual Support (Spanish / English): "}</strong>
                {isEs
                  ? "Navegación, formularios, botones y tienda en línea totalmente traducidos con cambio de idioma instantáneo desde la barra superior."
                  : "Dashboard navigation, forms, buttons, and storefronts fully translated with instant language toggling from the top header."}
              </li>
              <li>
                <strong>{isEs ? "Módulo de Compras (Procurement): " : "Procurement & Purchase Orders: "}</strong>
                {isEs
                  ? "Módulo actualizado para gestión de proveedores y generación de Órdenes de Compra (OC) para reabastecimiento eficiente de inventario."
                  : "Updated module for vendor management and Purchase Order (PO) creation for streamlined inventory replenishment."}
              </li>
              <li>
                <strong>{isEs ? "Impuestos en Productos y Ajustes de POS: " : "Product Taxes & POS Settings: "}</strong>
                {isEs
                  ? "Asignación rápida de impuestos por producto, creación de categorías al instante y panel dedicado de Ajustes de POS en la sección de Ajustes."
                  : "Direct product-level tax configuration, on-the-fly category creation, and a dedicated POS Settings panel under Settings."}
              </li>
            </ul>
          </section>

          {/* 1. Dashboard Overview */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">
              {isEs ? "1. Resumen del panel" : "1. Dashboard overview"}
            </h2>
            <ol className="list-decimal space-y-2 pl-5 text-sm leading-6 text-slate-700">
              <li>
                {isEs
                  ? "Inicia sesión y verifica que estés en la cuenta comercial y tienda correspondiente."
                  : "Sign in and verify you are on the correct merchant account and store."}
              </li>
              <li>
                {isEs
                  ? "Abre el Panel para revisar métricas clave en tiempo real: ventas brutas, pedidos recientes, clientes totales y productos activos."
                  : "Open Dashboard first to review key real-time metrics: gross sales, recent orders, total customers, and active products."}
              </li>
              <li>
                {isEs
                  ? "Alterna en cualquier momento entre Español e Inglés con el selector de idioma ubicado en la barra superior o en el menú móvil."
                  : "Switch between English and Spanish at any time using the language selector in the top bar or mobile menu."}
              </li>
              <li>
                {isEs
                  ? "Utiliza la campana de notificaciones para enterarte al instante de nuevos pedidos entrantes sin necesidad de recargar la página."
                  : "Use the notification bell to receive real-time alerts for incoming orders without refreshing the page."}
              </li>
              <li>
                {isEs
                  ? "Navega con la barra lateral entre Pedidos (incluyendo POS), Productos, Compras, Clientes (incluyendo Grupos), Tiendas, Herramientas y Ajustes."
                  : "Use the sidebar to navigate between Orders (including POS), Products, Procurement, Customers (including Groups), Stores, Tools, and Settings."}
              </li>
            </ol>
          </section>

          {/* 2. Product Management */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">
              {isEs ? "2. Gestión de productos y categorías" : "2. Product and category management"}
            </h2>
            <ol className="list-decimal space-y-2 pl-5 text-sm leading-6 text-slate-700">
              <li>
                {isEs
                  ? "Ve a Productos para buscar artículos por título, slug, SKU o estado (Borrador, Activo, Archivado)."
                  : "Go to Products and search items by title, slug, SKU, or status (Draft, Active, Archived)."}
              </li>
              <li>
                {isEs
                  ? "Pulsa 'Añadir Producto' y completa título, descripción, precio base, inventario e imágenes con subida directa a la nube."
                  : "Click 'Add Product' and complete title, description, base price, inventory, and images with direct cloud upload."}
              </li>
              <li>
                {isEs
                  ? "Asigna o crea una nueva categoría directamente desde el formulario de producto sin interrumpir tu flujo de trabajo."
                  : "Assign or create a new category directly within the product form without interrupting your workflow."}
              </li>
              <li>
                {isEs
                  ? "Configura la clase impositiva o tasa fiscal directamente en la ficha del producto para cálculos exactos en tienda y POS."
                  : "Configure the tax class or rate directly on the product record for accurate calculations in both online store and POS."}
              </li>
              <li>
                {isEs
                  ? "Organiza categorías en Productos > Categorías para estructurar el menú web y las baldosas de acceso rápido del POS."
                  : "Organize categories in Products > Categories to structure your storefront navigation and POS quick-touch tiles."}
              </li>
              <li>
                {isEs
                  ? "Tras guardar, abre la vista previa de la tienda para verificar la información visual y variantes publicadas."
                  : "After saving, open the storefront preview to confirm published details, variants, and media presentation."}
              </li>
            </ol>
          </section>

          {/* 3. Order Management & Invoicing */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">
              {isEs ? "3. Gestión de pedidos y facturación" : "3. Order management and invoicing"}
            </h2>
            <ol className="list-decimal space-y-2 pl-5 text-sm leading-6 text-slate-700">
              <li>
                {isEs
                  ? "En Pedidos, filtra por número de orden, correo del cliente, estado del pedido o estado del pago (Pagado, Pendiente, Reembolsado)."
                  : "In Orders, search and filter by order number, customer email, order status, or payment status (Paid, Pending, Refunded)."}
              </li>
              <li>
                {isEs
                  ? "Verifica el estado del pago antes de proceder a la preparación o despacho de la mercancía."
                  : "Verify payment status before proceeding to fulfillment or item dispatch."}
              </li>
              <li>
                {isEs
                  ? "Utiliza acciones masivas para actualizar estados de múltiples pedidos de forma rápida y coordinada."
                  : "Use bulk actions to update statuses for multiple orders quickly and consistently."}
              </li>
              <li>
                {isEs
                  ? "Abre cualquier pedido y haz clic en 'Ver Factura' para generar una factura comercial oficial con datos de tienda, desglose de impuestos e impresión directa."
                  : "Open any order and click 'View Invoice' to generate a formal invoice complete with store branding, tax breakdown, and printable format."}
              </li>
              <li>
                {isEs
                  ? "Las órdenes procesadas en el Punto de Venta (POS) se sincronizan e identifican en este listado con su respectivo cajero y terminal."
                  : "Orders processed in Point of Sale (POS) automatically sync and display in this list with their designated cashier and terminal."}
              </li>
            </ol>
          </section>

          {/* 4. Point of Sale (POS) */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">
              {isEs ? "4. Punto de Venta (POS)" : "4. Point of Sale (POS)"}
            </h2>
            <ol className="list-decimal space-y-2 pl-5 text-sm leading-6 text-slate-700">
              <li>
                {isEs
                  ? "Accede desde Pedidos > Punto de Venta (/dashboard/orders/pos) para abrir la terminal de ventas en mostrador o tienda física."
                  : "Navigate to Orders > Point of Sale (/dashboard/orders/pos) to open the sales register for in-person transactions."}
              </li>
              <li>
                {isEs
                  ? "Inicia sesión con tu cuenta de comerciante o como cajero con código PIN individual para registrar aperturas y turnos de caja."
                  : "Sign in with your merchant account or as a cashier using a dedicated PIN to track register shifts and transactions."}
              </li>
              <li>
                {isEs
                  ? "Añade artículos al carrito escaneando códigos de barra con pistola lectora o seleccionando productos por categoría."
                  : "Add items to the sale by scanning product barcodes or selecting category tiles."}
              </li>
              <li>
                {isEs
                  ? "Asocia un cliente existente o registra uno nuevo durante el cobro para vincular la venta a su historial y grupo."
                  : "Attach an existing customer or create a new profile during checkout to link the sale to their account and customer group."}
              </li>
              <li>
                {isEs
                  ? "Cobra con efectivo (con cálculo automático de cambio), tarjeta o métodos divididos, e imprime recibos térmicos al instante."
                  : "Accept cash (with automatic change calculation), card, or split tenders, and print thermal receipts instantly upon completion."}
              </li>
              <li>
                {isEs
                  ? "Soporte fuera de línea (Offline): si se interrumpe la conexión a internet, el POS continúa operando con almacenamiento local y sincroniza las órdenes en cuanto vuelve la señal."
                  : "Offline support: if internet connectivity drops, the POS continues operating via local storage and automatically synchronizes orders once reconnected."}
              </li>
              <li>
                {isEs
                  ? "Configura cajeros, PINs, tasas fiscales por defecto y opciones de cobro rápido desde Ajustes > Ajustes de POS."
                  : "Manage cashiers, PIN credentials, default register tax rates, and fast-checkout options under Settings > POS Settings."}
              </li>
            </ol>
          </section>

          {/* 5. Customer & Group Management */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">
              {isEs ? "5. Gestión de clientes y grupos" : "5. Customer and group management"}
            </h2>
            <ol className="list-decimal space-y-2 pl-5 text-sm leading-6 text-slate-700">
              <li>
                {isEs
                  ? "Utiliza el Administrador de Clientes para buscar por nombre, correo electrónico, teléfono o grupo asignado."
                  : "Use Customer Manager to search profiles by name, email, phone number, or assigned group."}
              </li>
              <li>
                {isEs
                  ? "En Clientes > Grupos de Clientes, crea categorías como 'Mayoristas', 'Clientes VIP', 'Empresas' o 'Minoristas'."
                  : "In Customers > Customer Groups, create segmentation categories such as 'Wholesale', 'VIP', 'Corporate', or 'Retail'."}
              </li>
              <li>
                {isEs
                  ? "Asigna clientes a grupos desde el formulario de nuevo cliente o al editar su perfil para segmentar ventas y aplicar condiciones comerciales."
                  : "Assign customers to groups when creating or editing their profile to segment purchasing behavior and business terms."}
              </li>
              <li>
                {isEs
                  ? "El grupo asignado al cliente se muestra reflejado en los detalles del pedido, en la terminal del POS y en las facturas generadas."
                  : "The customer's assigned group is reflected across order details, POS checkout terminals, and generated invoices."}
              </li>
              <li>
                {isEs
                  ? "Mantén al día las direcciones de envío y facturación para acelerar el procesamiento de órdenes en línea."
                  : "Maintain accurate shipping and billing address records to streamline online order fulfillment."}
              </li>
            </ol>
          </section>

          {/* 6. Procurement & Vendors */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">
              {isEs ? "6. Compras y proveedores (Procurement)" : "6. Procurement and vendors"}
            </h2>
            <ol className="list-decimal space-y-2 pl-5 text-sm leading-6 text-slate-700">
              <li>
                {isEs
                  ? "Accede a Compras (/dashboard/procurement) para supervisar el flujo de abastecimiento y estado de recepción de mercancías."
                  : "Access Procurement (/dashboard/procurement) to monitor replenishment workflows and inventory intake."}
              </li>
              <li>
                {isEs
                  ? "En Compras > Proveedores, registra a tus suministradores con nombre, datos de contacto comercial y plazos de entrega."
                  : "In Procurement > Vendors, register suppliers with company names, commercial contacts, and delivery lead times."}
              </li>
              <li>
                {isEs
                  ? "Crea Órdenes de Compra (Nueva OC) seleccionando el proveedor, los artículos a reabastecer, las cantidades y los costos pactados."
                  : "Create Purchase Orders (New PO) by selecting the vendor, products to restock, required quantities, and agreed unit costs."}
              </li>
              <li>
                {isEs
                  ? "Gestiona el ciclo de vida de cada orden de compra (Borrador, Enviada, Recibida, Cancelada) para mantener tus existencias al día."
                  : "Track each purchase order's lifecycle (Draft, Sent, Received, Cancelled) to keep stock levels synchronized."}
              </li>
            </ol>
          </section>

          {/* 7. Store, Payment, and POS Settings */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">
              {isEs ? "7. Configuración de tienda, pagos y POS" : "7. Store, payment, and POS settings"}
            </h2>
            <p className="text-sm text-slate-700">
              {isEs
                ? "Utiliza Ajustes para administrar los parámetros operativos y fiscales de tus tiendas."
                : "Use Settings to manage operational and tax parameters across your stores."}
            </p>
            <ol className="list-decimal space-y-2 pl-5 text-sm leading-6 text-slate-700">
              <li>
                {isEs
                  ? "Perfil de tienda: gestiona nombre comercial, logo, correo de contacto, prefijo de factura (ej. INV-) y pie de página de facturas."
                  : "Store Profile: manage store name, logo, contact emails, invoice prefix (e.g. INV-), and custom invoice footer notes."}
              </li>
              <li>
                {isEs
                  ? "Monedas: confirma la moneda principal y divisas secundarias admitidas para transacciones."
                  : "Currencies: confirm the primary store currency and supported payment currencies."}
              </li>
              <li>
                {isEs
                  ? "Pasarelas de Pago: administra Stripe o Authorize.net para cobros en línea, o activa pagos manuales (transferencia bancaria, contra entrega)."
                  : "Payment Gateways: manage Stripe or Authorize.net for online card processing, or enable manual offline payments (bank transfer, COD)."}
              </li>
              <li>
                {isEs
                  ? "Ajustes de POS (/dashboard/settings/pos): crea cajeros con PIN, configura impuestos predeterminados del punto de venta y personaliza recibos."
                  : "POS Settings (/dashboard/settings/pos): set up cashiers with PINs, define default POS tax rates, and configure receipt printers."}
              </li>
              <li>
                {isEs
                  ? "Envíos e Impuestos: define orígenes de despacho, zonas de entrega, tarifas y reglas impositivas por territorio."
                  : "Shipping & Taxes: establish fulfillment origins, delivery zones, shipping rates, and regional tax nexus rules."}
              </li>
            </ol>
          </section>

          {/* 8. Account Security & Language */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">
              {isEs ? "8. Seguridad de la cuenta e idioma" : "8. Account security and language"}
            </h2>
            <ol className="list-decimal space-y-2 pl-5 text-sm leading-6 text-slate-700">
              <li>
                {isEs
                  ? "Cambia tu contraseña periódicamente desde Ajustes > Seguridad ante cualquier sospecha de compromiso."
                  : "Change your password regularly under Settings > Security if credentials may have been exposed."}
              </li>
              <li>
                {isEs
                  ? "Usa 'Cerrar sesión en otros dispositivos' para invalidar sesiones previas y mantener tu cuenta protegida."
                  : "Use 'Sign out other devices' to invalidate prior sessions and keep your account secure."}
              </li>
              <li>
                {isEs
                  ? "Asigna códigos PIN individuales a los cajeros en lugar de compartir las credenciales maestras de tu usuario administrador."
                  : "Assign individual PIN codes to POS cashiers rather than sharing your master administrator login."}
              </li>
              <li>
                {isEs
                  ? "Configura tu idioma preferido con el botón de idioma para adaptar la experiencia a tus operadores."
                  : "Set your preferred interface language using the language toggle to suit your team's workflow."}
              </li>
            </ol>
          </section>

          {/* 9. API Access and Integraciones */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">
              {isEs ? "9. Acceso a API e integraciones" : "9. API access and integrations"}
            </h2>
            <ol className="list-decimal space-y-2 pl-5 text-sm leading-6 text-slate-700">
              <li>
                {isEs
                  ? "Usa claves públicas (Publishable Keys) para solicitudes desde el frontend y escaparates personalizados."
                  : "Use publishable keys for storefront requests and custom client applications."}
              </li>
              <li>
                {isEs
                  ? "Usa claves secretas únicamente en servidores backend seguros; nunca las expongas en código cliente o navegadores."
                  : "Use secret keys strictly in secure backend environments; never expose them to client browsers."}
              </li>
              <li>
                {isEs
                  ? "Registra el ID de tienda y URL de la API antes de comenzar integraciones externas."
                  : "Note your Store ID and API host URL before beginning external integrations."}
              </li>
              <li>
                {isEs
                  ? "Restringe los dominios permitidos (CORS) a tus hosts legítimos de producción y pruebas."
                  : "Restrict allowed frontend domains (CORS) to trusted production and staging hosts."}
              </li>
              <li>
                {isEs
                  ? "Revoca de inmediato cualquier clave comprometida o en desuso desde Ajustes > Seguridad > API."
                  : "Revoke compromised or unused API keys immediately from Settings > Security > API."}
              </li>
            </ol>
          </section>

          {/* 10. Weekly Checklist */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">
              {isEs ? "10. Lista de verificación semanal recomendada" : "10. Recommended weekly checklist"}
            </h2>
            <ol className="list-decimal space-y-2 pl-5 text-sm leading-6 text-slate-700">
              <li>
                {isEs
                  ? "Audita productos: verifica precios, impuestos aplicables, niveles de inventario y fotos."
                  : "Audit products: review prices, applicable tax rates, stock counts, and imagery."}
              </li>
              <li>
                {isEs
                  ? "Revisa cortes de caja y turnos del POS: concilia arqueos de efectivo, pagos con tarjeta y ventas registradas."
                  : "Review POS register shifts: reconcile cash drawer balances, card payments, and recorded transactions."}
              </li>
              <li>
                {isEs
                  ? "Consulta órdenes de compra en Compras: monitorea entregas pendientes y pedidos de reabastecimiento a proveedores."
                  : "Review purchase orders in Procurement: monitor pending vendor deliveries and restock timelines."}
              </li>
              <li>
                {isEs
                  ? "Inspecciona pedidos fallidos o demorados y genera facturas oficiales para clientes empresariales o mayoristas."
                  : "Inspect delayed or flagged orders and generate official invoices for corporate or wholesale clients."}
              </li>
              <li>
                {isEs
                  ? "Actualiza Grupos de Clientes: asigna nuevos compradores a grupos VIP o Mayoristas para fomentar su fidelización."
                  : "Update Customer Groups: assign new buyers to VIP or Wholesale tiers to maintain loyalty segmentation."}
              </li>
              <li>
                {isEs
                  ? "Verifica la seguridad: audita cajeros autorizados, sesiones activas y vigencia de claves de API."
                  : "Verify security posture: audit authorized cashiers, active sessions, and API key lifecycles."}
              </li>
            </ol>
          </section>

          {/* Need More Help */}
          <section className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <h2 className="text-base font-semibold text-slate-900">
              {isEs ? "¿Necesitas más ayuda?" : "Need more help?"}
            </h2>
            <p className="text-sm text-slate-700">
              {isEs
                ? "Para preguntas técnicas adicionales o soporte, utiliza el formulario de la derecha para abrir un ticket o escribe directamente a support@pradocommerce.com."
                : "For additional technical questions or support, use the form on the right to open a helpdesk ticket or email support@pradocommerce.com directly."}
            </p>
          </section>
        </article>

        {/* Helpdesk Ticket Form - Right Column */}
        <div className="lg:sticky lg:top-20 lg:col-span-5">
          <HelpdeskTicketForm />
        </div>
      </div>
    </section>
  );
}
