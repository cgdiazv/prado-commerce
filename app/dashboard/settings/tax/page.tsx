"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type NexusRegion = {
  country: string;
  region: string;
  taxId: string;
};

type TaxCategory = {
  name: string;
  code: string;
  defaultRate: string;
};

export default function TaxPage() {
  const router = useRouter();
  const [pricesIncludeTax, setPricesIncludeTax] = useState(false);
  const [automaticTax, setAutomaticTax] = useState(true);
  const [collectTaxOnShipping, setCollectTaxOnShipping] = useState(true);
  const [euVatEnabled, setEuVatEnabled] = useState(false);
  const [taxExemptEnabled, setTaxExemptEnabled] = useState(true);
  const [filingFrequency, setFilingFrequency] = useState("monthly");

  const [nexusRegions, setNexusRegions] = useState<NexusRegion[]>([
    { country: "United States", region: "California", taxId: "US-CA-000000" },
    { country: "United States", region: "New York", taxId: "US-NY-000000" },
  ]);

  const [taxCategories, setTaxCategories] = useState<TaxCategory[]>([
    { name: "General merchandise", code: "GEN", defaultRate: "8.25" },
    { name: "Digital goods", code: "DIGITAL", defaultRate: "7.00" },
  ]);

  const [newCountry, setNewCountry] = useState("");
  const [newRegion, setNewRegion] = useState("");
  const [newTaxId, setNewTaxId] = useState("");

  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryCode, setNewCategoryCode] = useState("");
  const [newCategoryRate, setNewCategoryRate] = useState("");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    router.push("/dashboard/settings");
  }

  function addNexusRegion() {
    if (!newCountry.trim() || !newRegion.trim()) return;

    setNexusRegions((current) => [
      ...current,
      { country: newCountry.trim(), region: newRegion.trim(), taxId: newTaxId.trim() || "Not set" },
    ]);

    setNewCountry("");
    setNewRegion("");
    setNewTaxId("");
  }

  function removeNexusRegion(index: number) {
    setNexusRegions((current) => current.filter((_, i) => i !== index));
  }

  function addTaxCategory() {
    if (!newCategoryName.trim() || !newCategoryCode.trim()) return;

    setTaxCategories((current) => [
      ...current,
      {
        name: newCategoryName.trim(),
        code: newCategoryCode.trim().toUpperCase(),
        defaultRate: newCategoryRate.trim() || "0.00",
      },
    ]);

    setNewCategoryName("");
    setNewCategoryCode("");
    setNewCategoryRate("");
  }

  function removeTaxCategory(index: number) {
    setTaxCategories((current) => current.filter((_, i) => i !== index));
  }

  return (
    <section className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
            Settings
          </p>
          <h1 className="mt-4 text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">Tax</h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-slate-600 sm:text-lg">
            Configure tax registrations, regions, rates, exemptions, filing, and tax service integrations.
          </p>
        </div>

        <Link
          href="/dashboard/settings"
          className="inline-flex shrink-0 items-center rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          ← Back to settings
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="space-y-6">
          <article className="rounded-xl border border-slate-200 bg-slate-50 p-5">
            <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Tax calculation settings</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700">
                <span>Prices include tax</span>
                <input type="checkbox" checked={pricesIncludeTax} onChange={(e) => setPricesIncludeTax(e.target.checked)} className="h-4 w-4" />
              </label>

              <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700">
                <span>Automatic tax calculation</span>
                <input type="checkbox" checked={automaticTax} onChange={(e) => setAutomaticTax(e.target.checked)} className="h-4 w-4" />
              </label>

              <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700">
                <span>Collect tax on shipping</span>
                <input type="checkbox" checked={collectTaxOnShipping} onChange={(e) => setCollectTaxOnShipping(e.target.checked)} className="h-4 w-4" />
              </label>

              <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700">
                <span>Enable EU VAT rules</span>
                <input type="checkbox" checked={euVatEnabled} onChange={(e) => setEuVatEnabled(e.target.checked)} className="h-4 w-4" />
              </label>
            </div>
          </article>

          <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Tax nexus regions</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Add the regions where your business must collect tax.
            </p>

            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <input value={newCountry} onChange={(e) => setNewCountry(e.target.value)} placeholder="Country" className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400" />
              <input value={newRegion} onChange={(e) => setNewRegion(e.target.value)} placeholder="State / province / region" className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400" />
              <input value={newTaxId} onChange={(e) => setNewTaxId(e.target.value)} placeholder="Tax registration ID" className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400" />
            </div>

            <div className="mt-4 flex justify-end">
              <button type="button" onClick={addNexusRegion} className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800">
                Add nexus region
              </button>
            </div>

            <div className="mt-5 space-y-3">
              {nexusRegions.map((region, index) => (
                <div key={`${region.country}-${region.region}-${index}`} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{region.country} · {region.region}</p>
                    <p className="text-xs text-slate-500">Tax ID: {region.taxId}</p>
                  </div>
                  <button type="button" onClick={() => removeNexusRegion(index)} className="rounded-full border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-50">
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Tax-exempt customers and entities</h2>
            <div className="mt-4">
              <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
                <span>Allow tax-exempt customer profiles</span>
                <input type="checkbox" checked={taxExemptEnabled} onChange={(e) => setTaxExemptEnabled(e.target.checked)} className="h-4 w-4" />
              </label>
            </div>
          </article>

          <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Product tax categories</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Assign product categories with default tax behavior and rates.
            </p>

            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <input value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} placeholder="Category name" className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400" />
              <input value={newCategoryCode} onChange={(e) => setNewCategoryCode(e.target.value)} placeholder="Category code" className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400" />
              <input value={newCategoryRate} onChange={(e) => setNewCategoryRate(e.target.value)} placeholder="Default rate (%)" className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400" />
            </div>

            <div className="mt-4 flex justify-end">
              <button type="button" onClick={addTaxCategory} className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800">
                Add tax category
              </button>
            </div>

            <div className="mt-5 space-y-3">
              {taxCategories.map((category, index) => (
                <div key={`${category.code}-${index}`} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{category.name} ({category.code})</p>
                    <p className="text-xs text-slate-500">Default rate: {category.defaultRate}%</p>
                  </div>
                  <button type="button" onClick={() => removeTaxCategory(index)} className="rounded-full border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-50">
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Filing preferences</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-slate-700">Filing frequency</span>
                <select value={filingFrequency} onChange={(e) => setFilingFrequency(e.target.value)} className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400">
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="annually">Annually</option>
                </select>
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-slate-700">Tax report export format</span>
                <select className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400">
                  <option>CSV</option>
                  <option>Excel (.xlsx)</option>
                  <option>PDF summary</option>
                </select>
              </label>
            </div>
          </article>

          <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Tax service integrations</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Connect services to automate tax rate lookups and compliance workflows.
            </p>

            <div className="mt-4 grid gap-4 md:grid-cols-3">
              {[
                { name: "Avalara AvaTax", detail: "Automated tax calculation and filing support." },
                { name: "TaxJar", detail: "Sales tax reporting and economic nexus tracking." },
                { name: "Manual tax tables", detail: "Custom tax rates configured in your dashboard." },
              ].map((integration) => (
                <div key={integration.name} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <h3 className="text-sm font-semibold text-slate-900">{integration.name}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-500">{integration.detail}</p>
                  <button type="button" className="mt-4 rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-white">
                    Connect
                  </button>
                </div>
              ))}
            </div>
          </article>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Link
            href="/dashboard/settings"
            className="rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Save changes
          </button>
        </div>
      </form>
    </section>
  );
}
