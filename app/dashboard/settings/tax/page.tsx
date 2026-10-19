"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useLanguage } from "@/lib/i18n/language-context";

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

const TAX_SETTINGS_STORAGE_KEY = "prado_tax_settings";

export default function TaxPage() {
  const router = useRouter();
  const { language } = useLanguage();
  const isEs = language === "es";

  const [stores, setStores] = useState<Array<{ id: string; name: string }>>([]);
  const [storeId, setStoreId] = useState<string>("");
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

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function loadSettingsForStore(id: string) {
    const key = id ? `${TAX_SETTINGS_STORAGE_KEY}_${id}` : TAX_SETTINGS_STORAGE_KEY;
    const savedSettings = localStorage.getItem(key) || localStorage.getItem(TAX_SETTINGS_STORAGE_KEY);
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        if (typeof parsed.pricesIncludeTax === "boolean") setPricesIncludeTax(parsed.pricesIncludeTax);
        if (typeof parsed.automaticTax === "boolean") setAutomaticTax(parsed.automaticTax);
        if (typeof parsed.collectTaxOnShipping === "boolean") setCollectTaxOnShipping(parsed.collectTaxOnShipping);
        if (typeof parsed.euVatEnabled === "boolean") setEuVatEnabled(parsed.euVatEnabled);
        if (typeof parsed.taxExemptEnabled === "boolean") setTaxExemptEnabled(parsed.taxExemptEnabled);
        if (typeof parsed.filingFrequency === "string") setFilingFrequency(parsed.filingFrequency);
        if (Array.isArray(parsed.nexusRegions)) setNexusRegions(parsed.nexusRegions);
        if (Array.isArray(parsed.taxCategories)) setTaxCategories(parsed.taxCategories);
      } catch (loadError) {
        console.error("Failed to parse tax settings from localStorage", loadError);
      }
    }
  }

  function handleStoreChange(newId: string) {
    setStoreId(newId);
    setError(null);
    setSuccess(null);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("storeId", newId);
      window.history.replaceState(null, "", url.toString());
    }
    loadSettingsForStore(newId);
  }

  useEffect(() => {
    async function loadStores() {
      try {
        const response = await fetch("/api/stores", { cache: "no-store" });
        if (response.ok) {
          const payload = await response.json();
          const list = Array.isArray(payload) ? payload : [];
          setStores(list);
          const urlParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
          const paramId = urlParams?.get("storeId");
          const target = (paramId && list.find((s: { id: string }) => s.id === paramId)) || list[0];
          const chosenId = target?.id || "";
          setStoreId(chosenId);
          loadSettingsForStore(chosenId);
          return;
        }
      } catch (e) {
        console.error("Failed to load stores for tax settings", e);
      }
      loadSettingsForStore("");
    }
    void loadStores();
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const payload = {
        pricesIncludeTax,
        automaticTax,
        collectTaxOnShipping,
        euVatEnabled,
        taxExemptEnabled,
        filingFrequency,
        nexusRegions,
        taxCategories,
      };

      await new Promise((resolve) => setTimeout(resolve, 500));

      const key = storeId ? `${TAX_SETTINGS_STORAGE_KEY}_${storeId}` : TAX_SETTINGS_STORAGE_KEY;
      localStorage.setItem(key, JSON.stringify(payload));
      localStorage.setItem(TAX_SETTINGS_STORAGE_KEY, JSON.stringify(payload));

      setSuccess(
        isEs
          ? "Configuración de cálculo de impuestos guardada correctamente."
          : "Tax calculation settings saved successfully."
      );
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : isEs
          ? "No se pudo guardar la configuración de impuestos."
          : "Unable to save tax calculation settings."
      );
    } finally {
      setIsSaving(false);
    }
  }

  function addNexusRegion() {
    if (!newCountry.trim() || !newRegion.trim()) return;

    setNexusRegions((current) => [
      ...current,
      {
        country: newCountry.trim(),
        region: newRegion.trim(),
        taxId: newTaxId.trim() || (isEs ? "No asignado" : "Not set"),
      },
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
      <div className="w-full">
        <div>
          <div className="flex items-start justify-between gap-4">
            <h1 className="text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">
              {isEs ? "Impuestos" : "Tax"}
            </h1>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              {stores.length > 1 ? (
                <div className="flex items-center gap-2">
                  <label htmlFor="tax-store-select" className="text-xs font-semibold text-slate-600 hidden sm:inline">
                    {isEs ? "Tienda:" : "Store:"}
                  </label>
                  <select
                    id="tax-store-select"
                    value={storeId}
                    onChange={(e) => handleStoreChange(e.target.value)}
                    className="text-xs font-semibold rounded-full border border-slate-300 bg-white px-3 py-2 text-slate-700 shadow-2xs focus:border-cyan-500 focus:outline-none"
                  >
                    {stores.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name || s.id}
                      </option>
                    ))}
                  </select>
                </div>
              ) : stores.length === 1 ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                  {stores[0].name || stores[0].id}
                </span>
              ) : null}

              <Link
                href="/dashboard/settings"
                className="inline-flex shrink-0 items-center rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                {isEs ? "← Volver a configuración" : "← Back to settings"}
              </Link>
            </div>
          </div>
          <p className="mt-1 max-w-xl text-sm text-slate-500">
            {isEs
              ? "Configura registros fiscales, regiones de nexo tributario, tasas, exenciones e integraciones."
              : "Configure tax registrations, regions, rates, exemptions, filing, and tax service integrations."}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="space-y-6">
          {error ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          {success ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {success}
            </div>
          ) : null}

          <article className="rounded-xl border border-slate-200 bg-slate-50 p-5">
            <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
              {isEs ? "Parámetros de cálculo de impuestos" : "Tax calculation settings"}
            </h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700">
                <span>{isEs ? "Los precios ya incluyen impuestos" : "Prices include tax"}</span>
                <input
                  type="checkbox"
                  checked={pricesIncludeTax}
                  onChange={(e) => setPricesIncludeTax(e.target.checked)}
                  className="h-4 w-4 accent-slate-900"
                />
              </label>

              <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700">
                <span>{isEs ? "Cálculo automático de impuestos" : "Automatic tax calculation"}</span>
                <input
                  type="checkbox"
                  checked={automaticTax}
                  onChange={(e) => setAutomaticTax(e.target.checked)}
                  className="h-4 w-4 accent-slate-900"
                />
              </label>

              <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700">
                <span>{isEs ? "Cobrar impuesto sobre el envío" : "Collect tax on shipping"}</span>
                <input
                  type="checkbox"
                  checked={collectTaxOnShipping}
                  onChange={(e) => setCollectTaxOnShipping(e.target.checked)}
                  className="h-4 w-4 accent-slate-900"
                />
              </label>

              <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700">
                <span>{isEs ? "Activar reglas de IVA para la UE" : "Enable EU VAT rules"}</span>
                <input
                  type="checkbox"
                  checked={euVatEnabled}
                  onChange={(e) => setEuVatEnabled(e.target.checked)}
                  className="h-4 w-4 accent-slate-900"
                />
              </label>
            </div>
          </article>

          <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
              {isEs ? "Regiones de nexo tributario" : "Tax nexus regions"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              {isEs
                ? "Agrega las regiones donde tu negocio está legalmente obligado a recaudar impuestos."
                : "Add the regions where your business must collect tax."}
            </p>

            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <input
                value={newCountry}
                onChange={(e) => setNewCountry(e.target.value)}
                placeholder={isEs ? "País (ej. México)" : "Country"}
                className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400"
              />
              <input
                value={newRegion}
                onChange={(e) => setNewRegion(e.target.value)}
                placeholder={isEs ? "Estado / provincia / región" : "State / province / region"}
                className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400"
              />
              <input
                value={newTaxId}
                onChange={(e) => setNewTaxId(e.target.value)}
                placeholder={isEs ? "Número de registro fiscal / RFC" : "Tax registration ID"}
                className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400"
              />
            </div>

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={addNexusRegion}
                className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                {isEs ? "Agregar región de nexo" : "Add nexus region"}
              </button>
            </div>

            <div className="mt-5 space-y-3">
              {nexusRegions.map((region, index) => (
                <div
                  key={`${region.country}-${region.region}-${index}`}
                  className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {region.country} · {region.region}
                    </p>
                    <p className="text-xs text-slate-500">
                      {isEs ? "ID Fiscal:" : "Tax ID:"} {region.taxId}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeNexusRegion(index)}
                    className="rounded-full border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-50"
                  >
                    {isEs ? "Eliminar" : "Remove"}
                  </button>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
              {isEs ? "Clientes y entidades exentos de impuestos" : "Tax-exempt customers and entities"}
            </h2>
            <div className="mt-4">
              <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
                <span>
                  {isEs
                    ? "Permitir perfiles de clientes con exención de impuestos"
                    : "Allow tax-exempt customer profiles"}
                </span>
                <input
                  type="checkbox"
                  checked={taxExemptEnabled}
                  onChange={(e) => setTaxExemptEnabled(e.target.checked)}
                  className="h-4 w-4 accent-slate-900"
                />
              </label>
            </div>
          </article>

          <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
              {isEs ? "Categorías fiscales de productos" : "Product tax categories"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              {isEs
                ? "Asigna categorías de producto con tasas y comportamiento impositivo predeterminado."
                : "Assign product categories with default tax behavior and rates."}
            </p>

            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <input
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder={isEs ? "Nombre de categoría" : "Category name"}
                className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400"
              />
              <input
                value={newCategoryCode}
                onChange={(e) => setNewCategoryCode(e.target.value)}
                placeholder={isEs ? "Código (ej. GEN, DIG)" : "Category code"}
                className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400"
              />
              <input
                value={newCategoryRate}
                onChange={(e) => setNewCategoryRate(e.target.value)}
                placeholder={isEs ? "Tasa predeterminada (%)" : "Default rate (%)"}
                className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400"
              />
            </div>

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={addTaxCategory}
                className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                {isEs ? "Agregar categoría fiscal" : "Add tax category"}
              </button>
            </div>

            <div className="mt-5 space-y-3">
              {taxCategories.map((category, index) => (
                <div
                  key={`${category.code}-${index}`}
                  className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {category.name} ({category.code})
                    </p>
                    <p className="text-xs text-slate-500">
                      {isEs ? "Tasa por defecto:" : "Default rate:"} {category.defaultRate}%
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeTaxCategory(index)}
                    className="rounded-full border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-50"
                  >
                    {isEs ? "Eliminar" : "Remove"}
                  </button>
                </div>
              ))}
            </div>
          </article>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Link
            href="/dashboard/settings"
            className="rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 text-center"
          >
            {isEs ? "Cancelar" : "Cancel"}
          </Link>
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSaving ? (
              <>
                <svg className="h-4 w-4 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>{isEs ? "Guardando opciones..." : "Saving options..."}</span>
              </>
            ) : (
              <span>{isEs ? "Guardar cambios" : "Save changes"}</span>
            )}
          </button>
        </div>
      </form>
    </section>
  );
}
