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
          {isEs ? "Última actualización: 7 de agosto de 2026" : "Last updated: August 7, 2026"}
        </p>
        <p className="mt-1 max-w-3xl text-sm text-slate-500">
          {isEs
            ? "Encuentra orientación práctica para gestionar productos, pedidos, clientes, tiendas, pagos y la seguridad de tu cuenta en Prado Commerce."
            : "Find practical guidance for managing products, orders, customers, stores, payments, and account security in Prado Commerce."}
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-12 lg:items-start">
        {/* Documentation Content - Left Column */}
        <article className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-7">
          <section className="space-y-3 rounded-lg border border-cyan-200 bg-cyan-50 p-4">
            <h2 className="text-base font-semibold text-cyan-950">
              {isEs ? "Últimas actualizaciones" : "Latest updates"}
            </h2>
            <ul className="list-disc space-y-2 pl-5 text-sm leading-6 text-cyan-900">
              <li>
                {isEs
                  ? "Los productos se pueden buscar por título, slug o estado desde el Administrador de Productos."
                  : "Products can be searched by title, slug, or status from Product Manager."}
              </li>
              <li>
                {isEs
                  ? "Los pedidos se pueden buscar por cliente, estado de pedido o estado de pago desde el Administrador de Pedidos."
                  : "Orders can be searched by customer, order status, or payment status from Order Manager."}
              </li>
              <li>
                {isEs
                  ? "Los clientes se pueden buscar por nombre, correo electrónico o teléfono desde el Administrador de Clientes."
                  : "Customers can be searched by name, email, or phone from Customer Manager."}
              </li>
              <li>
                {isEs
                  ? "Los campos de contacto y paneles de dirección del cliente ahora utilizan un diseño de escritorio más claro."
                  : "Customer contact fields and shipping and billing address panels now use a clearer desktop layout."}
              </li>
              <li>
                {isEs
                  ? "La configuración de Stripe y Authorize.net permanece contraída hasta seleccionar Administrar."
                  : "Stripe and Authorize.net settings stay collapsed until you select Manage."}
              </li>
              <li>
                {isEs
                  ? "El plan Starter es gratuito a $0 al mes para una tienda y hasta 50 productos."
                  : "The Starter plan is free at $0 per month for one store and up to 50 products."}
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">
              {isEs ? "1. Resumen del panel" : "1. Dashboard overview"}
            </h2>
            <ol className="list-decimal space-y-2 pl-5 text-sm leading-6 text-slate-700">
              <li>
                {isEs
                  ? "Inicia sesión y verifica que estés en la cuenta comercial correcta."
                  : "Sign in and verify you are on the correct merchant account."}
              </li>
              <li>
                {isEs
                  ? "Abre el Panel primero para revisar métricas clave de productos, clientes y actividad de pedidos recientes."
                  : "Open Dashboard first and scan key totals for products, customers, and recent order activity."}
              </li>
              <li>
                {isEs
                  ? "Utiliza la campana de notificaciones para revisar la actividad de nuevos pedidos."
                  : "Use the notification bell to review new order activity."}
              </li>
              <li>
                {isEs
                  ? "Utiliza la barra lateral para desplazarte entre Pedidos, Productos, Clientes, Tiendas, Herramientas y Ajustes."
                  : "Use the sidebar to move between Orders, Products, Customers, Stores, Tools, and Settings."}
              </li>
            </ol>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">
              {isEs ? "2. Gestión de productos" : "2. Product management"}
            </h2>
            <ol className="list-decimal space-y-2 pl-5 text-sm leading-6 text-slate-700">
              <li>
                {isEs
                  ? "Ve a Productos y busca por título, slug o estado para localizar un artículo."
                  : "Go to Products and search by title, slug, or status to locate an item."}
              </li>
              <li>
                {isEs
                  ? "Para artículos nuevos, pulsa Añadir Producto y completa título, descripción, precio, inventario e imágenes."
                  : "For new items, use Add Product and complete title, description, price, stock, and images."}
              </li>
              <li>
                {isEs
                  ? "Asigna siempre la categoría correcta y comprueba el tipo de producto antes de guardar."
                  : "Always assign the correct category and verify product type before saving."}
              </li>
              <li>
                {isEs
                  ? "Selecciona la fila de un producto para editar sus detalles, variantes, inventario y recursos multimedia."
                  : "Select a product row to edit its details, variants, inventory, and media."}
              </li>
              <li>
                {isEs
                  ? "Tras publicar, abre la vista previa de la tienda para verificar la información y los archivos multimedia."
                  : "After publish, open storefront preview to validate product details and media."}
              </li>
            </ol>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">
              {isEs ? "3. Categorías" : "3. Categories"}
            </h2>
            <ol className="list-decimal space-y-2 pl-5 text-sm leading-6 text-slate-700">
              <li>
                {isEs ? "Abre Productos, y luego Categorías." : "Open Products, then Categories."}
              </li>
              <li>
                {isEs
                  ? "Crea nombres claros para las categorías y evita duplicados con ortografías similares."
                  : "Create clear category names and avoid duplicates with slightly different spelling."}
              </li>
              <li>
                {isEs
                  ? "Ubica los productos en la categoría más específica disponible."
                  : "Place products in the most specific category available."}
              </li>
              <li>
                {isEs
                  ? "Al renombrar categorías, confirma que las asignaciones de productos se mantengan intactas."
                  : "When renaming categories, confirm product assignments remain intact."}
              </li>
            </ol>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">
              {isEs ? "4. Gestión de pedidos" : "4. Order management"}
            </h2>
            <ol className="list-decimal space-y-2 pl-5 text-sm leading-6 text-slate-700">
              <li>
                {isEs
                  ? "Usa la búsqueda de Pedidos para encontrar órdenes por correo del cliente, estado del pedido o estado del pago."
                  : "Use Order Manager search to find an order by customer email, order status, or payment status."}
              </li>
              <li>
                {isEs
                  ? "Verifica el estado del pago antes de proceder a la preparación o envío del pedido."
                  : "Verify payment status before moving any order to fulfillment."}
              </li>
              <li>
                {isEs
                  ? "Utiliza Pendiente, En proceso, Completado o Cancelado para mantener el estado de los pedidos al día."
                  : "Use Pending, Processing, Completed, or Cancelled to keep order status current."}
              </li>
              <li>
                {isEs
                  ? "Usa las acciones masivas para actualizar los estados de los pedidos seleccionados cuando proceda."
                  : "Use bulk actions to update selected order or payment statuses when appropriate."}
              </li>
              <li>
                {isEs
                  ? "Abre un pedido para revisar los detalles del cliente, artículos, envío, facturación y pagos."
                  : "Open an order to review customer, item, shipping, billing, and payment details."}
              </li>
            </ol>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">
              {isEs ? "5. Gestión de clientes" : "5. Customer management"}
            </h2>
            <ol className="list-decimal space-y-2 pl-5 text-sm leading-6 text-slate-700">
              <li>
                {isEs
                  ? "Utiliza el Administrador de Clientes para localizar perfiles por nombre, correo electrónico o teléfono."
                  : "Use Customer Manager search to locate profiles by name, email, or phone."}
              </li>
              <li>
                {isEs
                  ? "Crea registros de clientes nuevos solo cuando no existan previamente."
                  : "Create new customer records only when one does not already exist."}
              </li>
              <li>
                {isEs
                  ? "Mantén los datos de contacto actualizados y verifica teléfono y correo antes de guardar."
                  : "Keep contact data accurate and verify phone and email before saving."}
              </li>
              <li>
                {isEs
                  ? "Gestiona direcciones de envío y facturación desde la página de perfil del cliente."
                  : "Maintain both shipping and billing addresses from the create or edit customer profile page."}
              </li>
            </ol>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">
              {isEs ? "6. Configuración de tienda y pagos" : "6. Store and payment settings"}
            </h2>
            <p className="text-sm text-slate-700">
              {isEs
                ? "Utiliza Ajustes para mantener la configuración operativa de cada una de tus tiendas."
                : "Use Settings to maintain operational configuration for each store."}
            </p>
            <ol className="list-decimal space-y-2 pl-5 text-sm leading-6 text-slate-700">
              <li>
                {isEs
                  ? "Perfil de tienda: gestiona el nombre comercial, marca y datos de contacto."
                  : "Store Profile: maintain store name, branding, and contact details."}
              </li>
              <li>
                {isEs
                  ? "Monedas: confirma la moneda principal y las divisas admitidas para transacciones."
                  : "Currencies: confirm base currency and any supported transaction currencies."}
              </li>
              <li>
                {isEs
                  ? "Pagos: selecciona Administrar en Stripe o Authorize.net para conectar, actualizar o desconectar una pasarela."
                  : "Payments: select Manage on Stripe or Authorize.net to connect, update, or disconnect a provider."}
              </li>
              <li>
                {isEs
                  ? "Verifica el estado del proveedor antes de aceptar pagos reales con tarjeta."
                  : "Verify the provider status before accepting live card payments."}
              </li>
              <li>
                {isEs
                  ? "Activa los pagos fuera de línea si permites a los clientes realizar pedidos y pagar manualmente."
                  : "Use the Offline payments switch when customers may place orders and pay manually."}
              </li>
              <li>
                {isEs
                  ? "Envíos: define origen del envío, zonas, métodos e integraciones con transportistas."
                  : "Shipping: define shipping origin, zones, methods, and carrier integrations."}
              </li>
              <li>
                {isEs
                  ? "Impuestos: configura comportamiento fiscal, ubicaciones de nexo y clases impositivas de productos."
                  : "Tax: configure tax behavior, nexus locations, and product tax classes."}
              </li>
            </ol>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">
              {isEs ? "7. Seguridad de la cuenta" : "7. Account security"}
            </h2>
            <ol className="list-decimal space-y-2 pl-5 text-sm leading-6 text-slate-700">
              <li>
                {isEs
                  ? "Cambia tu contraseña de inmediato si sospechas que tus credenciales han sido comprometidas."
                  : "Change password immediately if credentials may have been exposed."}
              </li>
              <li>
                {isEs
                  ? "Usa 'Cerrar sesión en otros dispositivos' tras cambiar tu clave o ante actividad sospechosa."
                  : "Use Sign out other devices after password changes or suspicious activity."}
              </li>
              <li>
                {isEs
                  ? "No compartas credenciales del panel entre miembros del equipo."
                  : "Do not share dashboard credentials between staff members."}
              </li>
              <li>
                {isEs
                  ? "Revisa periódicamente el acceso a la cuenta y retira a los usuarios inactivos rápidamente."
                  : "Review account access regularly and remove inactive users quickly."}
              </li>
            </ol>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">
              {isEs ? "8. Acceso a API e integraciones" : "8. API access and integrations"}
            </h2>
            <ol className="list-decimal space-y-2 pl-5 text-sm leading-6 text-slate-700">
              <li>
                {isEs
                  ? "Usa claves públicas para solicitudes del frontend e integraciones públicas."
                  : "Use publishable keys for frontend requests and public embed scenarios."}
              </li>
              <li>
                {isEs
                  ? "Usa claves secretas únicamente en servicios de backend seguros; nunca las expongas en el navegador."
                  : "Use secret keys only on secure backend services; never expose them to browsers."}
              </li>
              <li>
                {isEs
                  ? "Registra el ID de tienda y la URL de host de API antes de iniciar la implementación."
                  : "Record Store ID and API host URL before implementation starts."}
              </li>
              <li>
                {isEs
                  ? "Usa los IDs de variante para acciones de añadir al carrito en tiendas personalizadas."
                  : "Use variant IDs for add-to-cart actions in custom storefronts."}
              </li>
              <li>
                {isEs
                  ? "Restringe los dominios de frontend permitidos a hosts de confianza de producción y pruebas."
                  : "Restrict allowed frontend domains to trusted production and staging hosts."}
              </li>
              <li>
                {isEs
                  ? "Revoca las claves de inmediato si se filtran o ya no son necesarias."
                  : "Revoke keys immediately if leaked, unused, or no longer required."}
              </li>
            </ol>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">
              {isEs ? "9. Lista de verificación semanal recomendada" : "9. Recommended weekly checklist"}
            </h2>
            <ol className="list-decimal space-y-2 pl-5 text-sm leading-6 text-slate-700">
              <li>
                {isEs
                  ? "Audita los productos principales para comprobar precios, inventario y recursos multimedia."
                  : "Audit top products for price, stock, and media accuracy."}
              </li>
              <li>
                {isEs
                  ? "Revisa pedidos fallidos o demorados y gestiona excepciones no resueltas."
                  : "Review failed or delayed orders and close unresolved exceptions."}
              </li>
              <li>
                {isEs
                  ? "Comprueba que las integraciones de pago y envío se encuentren activas y en buen estado."
                  : "Validate payment and shipping integrations are connected and healthy."}
              </li>
              <li>
                {isEs
                  ? "Verifica la seguridad: sesiones activas, higiene de contraseñas y ciclo de vida de claves API."
                  : "Check security posture: active sessions, password hygiene, and API key lifecycle."}
              </li>
              <li>
                {isEs
                  ? "Confirma los dominios permitidos y retira entornos de integración obsoletos."
                  : "Confirm allowed domains and remove any outdated integration environments."}
              </li>
            </ol>
          </section>

          <section className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <h2 className="text-base font-semibold text-slate-900">
              {isEs ? "¿Necesitas más ayuda?" : "Need more help?"}
            </h2>
            <p className="text-sm text-slate-700">
              {isEs
                ? "Para preguntas adicionales o soporte, escribe a support@pradocommerce.com."
                : "For additional questions or support, email support@pradocommerce.com."}
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

