export default function DashboardHelpPage() {
  return (
    <section className="space-y-6">
      <header className="space-y-3">
        <p className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          Help
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Dashboard Help Center</h1>
        <p className="text-xs font-medium tracking-[0.02em] text-slate-500">Last updated: August 7, 2026</p>
        <p className="max-w-3xl text-sm leading-6 text-slate-600">
          Find practical guidance for managing products, orders, customers, stores, payments, and account security in Prado Commerce.
        </p>
      </header>

      <article className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <section className="space-y-3 rounded-lg border border-cyan-200 bg-cyan-50 p-4">
          <h2 className="text-base font-semibold text-cyan-950">Latest updates</h2>
          <ul className="list-disc space-y-2 pl-5 text-sm leading-6 text-cyan-900">
            <li>Products can be searched by title, slug, or status from Product Manager.</li>
            <li>Orders can be searched by customer, order status, or payment status from Order Manager.</li>
            <li>Customers can be searched by name, email, or phone from Customer Manager.</li>
            <li>Customer contact fields and shipping and billing address panels now use a clearer desktop layout.</li>
            <li>Stripe and Authorize.net settings stay collapsed until you select Manage.</li>
            <li>The Starter plan is free at $0 per month for one store and up to 50 products. A 2% platform transaction fee applies to sales.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">1. Dashboard overview</h2>
          <ol className="list-decimal space-y-2 pl-5 text-sm leading-6 text-slate-700">
            <li>Sign in and verify you are on the correct merchant account.</li>
            <li>Open Dashboard first and scan key totals for products, customers, and recent order activity.</li>
            <li>Use the notification bell to review new order activity.</li>
            <li>Use the sidebar to move between Orders, Products, Customers, Stores, Tools, and Settings.</li>
          </ol>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">2. Product management</h2>
          <ol className="list-decimal space-y-2 pl-5 text-sm leading-6 text-slate-700">
            <li>Go to Products and search by title, slug, or status to locate an item.</li>
            <li>For new items, use Add Product and complete title, description, price, stock, and images.</li>
            <li>Always assign the correct category and verify product type before saving.</li>
            <li>Select a product row to edit its details, variants, inventory, and media.</li>
            <li>After publish, open storefront preview to validate product details and media.</li>
          </ol>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">3. Categories</h2>
          <ol className="list-decimal space-y-2 pl-5 text-sm leading-6 text-slate-700">
            <li>Open Products, then Categories.</li>
            <li>Create clear category names and avoid duplicates with slightly different spelling.</li>
            <li>Place products in the most specific category available.</li>
            <li>When renaming categories, confirm product assignments remain intact.</li>
          </ol>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">4. Order management</h2>
          <ol className="list-decimal space-y-2 pl-5 text-sm leading-6 text-slate-700">
            <li>Use Order Manager search to find an order by customer email, order status, or payment status.</li>
            <li>Verify payment status before moving any order to fulfillment.</li>
            <li>Use Pending, Processing, Completed, or Cancelled to keep order status current.</li>
            <li>Use bulk actions to update selected order or payment statuses when appropriate.</li>
            <li>Open an order to review customer, item, shipping, billing, and payment details.</li>
          </ol>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">5. Customer management</h2>
          <ol className="list-decimal space-y-2 pl-5 text-sm leading-6 text-slate-700">
            <li>Use Customer Manager search to locate profiles by name, email, or phone.</li>
            <li>Create new customer records only when one does not already exist.</li>
            <li>Keep contact data accurate and verify phone and email before saving.</li>
            <li>Maintain both shipping and billing addresses from the create or edit customer profile page.</li>
          </ol>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">6. Store and payment settings</h2>
          <p className="text-sm text-slate-700">Use Settings to maintain operational configuration for each store.</p>
          <ol className="list-decimal space-y-2 pl-5 text-sm leading-6 text-slate-700">
            <li>Store Profile: maintain store name, branding, and contact details.</li>
            <li>Currencies: confirm base currency and any supported transaction currencies.</li>
            <li>Payments: select Manage on Stripe or Authorize.net to connect, update, or disconnect a provider.</li>
            <li>Verify the provider status before accepting live card payments.</li>
            <li>Use the Offline payments switch when customers may place orders and pay manually.</li>
            <li>Shipping: define shipping origin, zones, methods, and carrier integrations.</li>
            <li>Tax: configure tax behavior, nexus locations, and product tax classes.</li>
          </ol>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">7. Account security</h2>
          <ol className="list-decimal space-y-2 pl-5 text-sm leading-6 text-slate-700">
            <li>Change password immediately if credentials may have been exposed.</li>
            <li>Use Sign out other devices after password changes or suspicious activity.</li>
            <li>Do not share dashboard credentials between staff members.</li>
            <li>Review account access regularly and remove inactive users quickly.</li>
          </ol>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">8. API access and integrations</h2>
          <ol className="list-decimal space-y-2 pl-5 text-sm leading-6 text-slate-700">
            <li>Use publishable keys for frontend requests and public embed scenarios.</li>
            <li>Use secret keys only on secure backend services; never expose them to browsers.</li>
            <li>Record Store ID and API host URL before implementation starts.</li>
            <li>Use variant IDs for add-to-cart actions in custom storefronts.</li>
            <li>Restrict allowed frontend domains to trusted production and staging hosts.</li>
            <li>Revoke keys immediately if leaked, unused, or no longer required.</li>
          </ol>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">9. Recommended weekly checklist</h2>
          <ol className="list-decimal space-y-2 pl-5 text-sm leading-6 text-slate-700">
            <li>Audit top products for price, stock, and media accuracy.</li>
            <li>Review failed or delayed orders and close unresolved exceptions.</li>
            <li>Validate payment and shipping integrations are connected and healthy.</li>
            <li>Check security posture: active sessions, password hygiene, and API key lifecycle.</li>
            <li>Confirm allowed domains and remove any outdated integration environments.</li>
          </ol>
        </section>

        <section className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <h2 className="text-base font-semibold text-slate-900">Need more help?</h2>
          <p className="text-sm text-slate-700">For additional questions or support, email support@pradocommerce.com.</p>
        </section>
      </article>
    </section>
  );
}
