export default function DashboardHelpPage() {
  return (
    <section className="space-y-6">
      <header className="space-y-3">
        <p className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          Help
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Dashboard SOP</h1>
        <p className="text-xs font-medium tracking-[0.02em] text-slate-500">Last updated: August 3, 2026</p>
        <p className="max-w-3xl text-sm leading-6 text-slate-600">
          This Standard Operating Procedure covers daily operations for the Prado Commerce dashboard.
          Follow each section in order for consistent catalog, order, and account management.
        </p>
      </header>

      <article className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">1. Dashboard overview and daily startup</h2>
          <ol className="list-decimal space-y-2 pl-5 text-sm leading-6 text-slate-700">
            <li>Sign in and verify you are on the correct merchant account.</li>
            <li>Open Dashboard first and scan key totals for products, customers, and recent order activity.</li>
            <li>Review alerts and pending actions before editing catalog data.</li>
            <li>Confirm timezone and store settings are correct before processing orders.</li>
          </ol>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">2. Product management SOP</h2>
          <ol className="list-decimal space-y-2 pl-5 text-sm leading-6 text-slate-700">
            <li>Go to Products and use search or filters to locate items that need updates.</li>
            <li>For new items, use Add Product and complete title, description, price, stock, and images.</li>
            <li>Always assign the correct category and verify product type before saving.</li>
            <li>For edits, update only required fields and save once after final review.</li>
            <li>After publish, open storefront preview to validate product details and media.</li>
          </ol>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">3. Category SOP</h2>
          <ol className="list-decimal space-y-2 pl-5 text-sm leading-6 text-slate-700">
            <li>Open Products, then Categories.</li>
            <li>Create clear category names and avoid duplicates with slightly different spelling.</li>
            <li>Place products in the most specific category available.</li>
            <li>When renaming categories, confirm product assignments remain intact.</li>
          </ol>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">4. Orders SOP</h2>
          <ol className="list-decimal space-y-2 pl-5 text-sm leading-6 text-slate-700">
            <li>Open Orders at least twice daily to review new and in-progress orders.</li>
            <li>Verify payment status before moving any order to fulfillment.</li>
            <li>Update order status in sequence: pending, processing, fulfilled, completed.</li>
            <li>Document any manual adjustments directly in internal order notes.</li>
            <li>Resolve exceptions (stock mismatch, address issue, payment failure) before shipment.</li>
          </ol>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">5. Customer management SOP</h2>
          <ol className="list-decimal space-y-2 pl-5 text-sm leading-6 text-slate-700">
            <li>Use Customers to locate profiles by name or email.</li>
            <li>Create new customer records only when one does not already exist.</li>
            <li>Keep contact data accurate; verify phone and email format before saving.</li>
            <li>Use customer history to support refunds, exchanges, and retention follow-up.</li>
          </ol>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">6. Store settings SOP</h2>
          <p className="text-sm text-slate-700">Use Settings to maintain operational configuration for each store.</p>
          <ol className="list-decimal space-y-2 pl-5 text-sm leading-6 text-slate-700">
            <li>Store Profile: maintain store name, branding, and contact details.</li>
            <li>Currencies: confirm base currency and any supported transaction currencies.</li>
            <li>Payments: connect providers and verify account health before accepting live orders.</li>
            <li>Shipping: define shipping origin, zones, methods, and carrier integrations.</li>
            <li>Tax: configure tax behavior, nexus locations, and product tax classes.</li>
          </ol>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">7. Security SOP</h2>
          <ol className="list-decimal space-y-2 pl-5 text-sm leading-6 text-slate-700">
            <li>Change password immediately if credentials may have been exposed.</li>
            <li>Use Sign out other devices after password changes or suspicious activity.</li>
            <li>Do not share dashboard credentials between staff members.</li>
            <li>Review account access regularly and remove inactive users quickly.</li>
          </ol>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">8. API access SOP (headless and integrations)</h2>
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
          <h2 className="text-lg font-semibold text-slate-900">9. Weekly operating checklist</h2>
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
