"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type KeyboardEvent } from "react";
import { ChevronDown } from "lucide-react";
import { allCountries } from "country-region-data";
import { useLanguage } from "@/lib/i18n/language-context";

type NexusRegion = {
  country: string;
  region: string;
  taxId: string;
  defaultRate?: string;
};

type TaxCategory = {
  name: string;
  code: string;
  defaultRate: string;
};

type TaxTab = "calculation" | "regions" | "exempt" | "categories";

const TAX_SETTINGS_STORAGE_KEY = "prado_tax_settings";

export default function TaxPage() {
  const router = useRouter();
  const { language } = useLanguage();
  const isEs = language === "es";
  const [activeTab, setActiveTab] = useState<TaxTab>("calculation");

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
  const [isCountryListOpen, setIsCountryListOpen] = useState(false);
  const [activeCountryIndex, setActiveCountryIndex] = useState(0);
  const [newRegion, setNewRegion] = useState("");
  const [isCustomRegion, setIsCustomRegion] = useState(false);
  const [newTaxId, setNewTaxId] = useState("");
  const [newRegionRate, setNewRegionRate] = useState("");
  const filteredCountries = allCountries.filter(([countryName]) =>
    countryName.toLocaleLowerCase().includes(newCountry.trim().toLocaleLowerCase())
  );
  const selectedCountry = allCountries.find(([countryName]) => countryName === newCountry);
  const selectedCountryRegions = selectedCountry?.[2] ?? [];

  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryCode, setNewCategoryCode] = useState("");
  const [newCategoryRate, setNewCategoryRate] = useState("");

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function handleTaxTabKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight" && event.key !== "Home" && event.key !== "End") {
      return;
    }

    event.preventDefault();
    const tabs: TaxTab[] = ["calculation", "regions", "exempt", "categories"];
    const currentIndex = tabs.indexOf(activeTab);
    const nextIndex =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? tabs.length - 1
          : (currentIndex + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
    const nextTab = tabs[nextIndex];
    setActiveTab(nextTab);
    document.getElementById(`tax-tab-${nextTab}`)?.focus();
  }

  function selectCountry(countryName: string) {
    setNewCountry(countryName);
    setNewRegion("");
    setIsCustomRegion(false);
    setIsCountryListOpen(false);
    setActiveCountryIndex(0);
  }

  function handleCountryKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      setIsCountryListOpen(false);
      return;
    }

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const wasOpen = isCountryListOpen;
      setIsCountryListOpen(true);
      if (filteredCountries.length > 0) {
        setActiveCountryIndex((index) => {
          if (!wasOpen) {
            return event.key === "ArrowDown" ? 0 : filteredCountries.length - 1;
          }
          return event.key === "ArrowDown"
            ? Math.min(index + 1, filteredCountries.length - 1)
            : Math.max(index - 1, 0);
        });
      }
      return;
    }

    if (event.key === "Enter" && isCountryListOpen && filteredCountries[activeCountryIndex]) {
      event.preventDefault();
      selectCountry(filteredCountries[activeCountryIndex][0]);
    }
  }

  function applySettings(parsed: Record<string, unknown>) {
    if (typeof parsed.pricesIncludeTax === "boolean") setPricesIncludeTax(parsed.pricesIncludeTax);
    if (typeof parsed.automaticTax === "boolean") setAutomaticTax(parsed.automaticTax);
    if (typeof parsed.collectTaxOnShipping === "boolean") setCollectTaxOnShipping(parsed.collectTaxOnShipping);
    if (typeof parsed.euVatEnabled === "boolean") setEuVatEnabled(parsed.euVatEnabled);
    if (typeof parsed.taxExemptEnabled === "boolean") setTaxExemptEnabled(parsed.taxExemptEnabled);
    if (typeof parsed.filingFrequency === "string") setFilingFrequency(parsed.filingFrequency);
    if (Array.isArray(parsed.nexusRegions)) setNexusRegions(parsed.nexusRegions);
    if (Array.isArray(parsed.taxCategories)) setTaxCategories(parsed.taxCategories);
  }

  async function loadSettingsForStore(id: string) {
    const key = id ? `${TAX_SETTINGS_STORAGE_KEY}_${id}` : TAX_SETTINGS_STORAGE_KEY;
    const savedSettings = localStorage.getItem(key) || localStorage.getItem(TAX_SETTINGS_STORAGE_KEY);
    let localSettings: Record<string, unknown> | null = null;
    if (savedSettings) {
      try {
        const parsed: unknown = JSON.parse(savedSettings);
        if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
          localSettings = parsed as Record<string, unknown>;
          applySettings(localSettings);
        }
      } catch (loadError) {
        console.error("Failed to parse tax settings from localStorage", loadError);
      }
    }

    if (!id) return;

    try {
      const response = await fetch(`/api/stores/${id}/tax-settings`, { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to load tax settings.");

      if (result.settings) {
        applySettings(result.settings);
        localStorage.setItem(key, JSON.stringify(result.settings));
      } else if (localSettings) {
        const migrationResponse = await fetch(`/api/stores/${id}/tax-settings`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(localSettings),
        });
        if (!migrationResponse.ok) {
          const migrationResult = await migrationResponse.json();
          throw new Error(migrationResult.error || "Unable to migrate saved tax settings.");
        }
      }
    } catch (loadError) {
      console.error("Failed to load tax settings from server", loadError);
      setError(loadError instanceof Error ? loadError.message : "Unable to load tax settings.");
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
    void loadSettingsForStore(newId);
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

      const key = storeId ? `${TAX_SETTINGS_STORAGE_KEY}_${storeId}` : TAX_SETTINGS_STORAGE_KEY;
      if (!storeId) throw new Error(isEs ? "Selecciona una tienda antes de guardar." : "Select a store before saving.");
      const response = await fetch(`/api/stores/${storeId}/tax-settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to save tax settings.");

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
        defaultRate: newRegionRate.trim(),
      },
    ]);

    setNewCountry("");
    setNewRegion("");
    setIsCustomRegion(false);
    setNewTaxId("");
    setNewRegionRate("");
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

          <div
            role="tablist"
            aria-label={isEs ? "Configuración de impuestos" : "Tax settings"}
            className="flex min-w-0 flex-row overflow-x-auto border-b border-slate-200 bg-slate-50/70"
          >
            {(["calculation", "regions", "exempt", "categories"] as const).map((tab) => (
              <button
                key={tab}
                id={`tax-tab-${tab}`}
                type="button"
                role="tab"
                aria-selected={activeTab === tab}
                aria-controls={`tax-panel-${tab}`}
                tabIndex={activeTab === tab ? 0 : -1}
                onClick={() => setActiveTab(tab)}
                onKeyDown={handleTaxTabKeyDown}
                className={`flex shrink-0 items-center border-b-4 px-4 py-3 text-left text-xs font-bold transition ${
                  activeTab === tab
                    ? "border-cyan-600 bg-white text-cyan-700"
                    : "border-transparent text-slate-500 hover:bg-white/70 hover:text-slate-800"
                }`}
              >
                {tab === "calculation"
                  ? isEs
                    ? "Parámetros de cálculo de impuestos"
                    : "Tax Calculation Settings"
                  : tab === "regions"
                    ? isEs
                      ? "Regiones de impuestos"
                      : "Tax Regions"
                    : tab === "exempt"
                      ? isEs
                        ? "Clientes exentos de impuestos"
                        : "Tax-Exempt Customers"
                      : isEs
                        ? "Categorías fiscales de productos"
                        : "Product Tax Categories"}
              </button>
            ))}
          </div>

          <div
            id="tax-panel-calculation"
            role="tabpanel"
            aria-labelledby="tax-tab-calculation"
            hidden={activeTab !== "calculation"}
          >
          <article className="rounded-xl border border-slate-200 bg-slate-50 p-5">
            <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
              {isEs ? "Parámetros de cálculo de impuestos" : "Tax calculation settings"}
            </h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700">
                <span>
                  {isEs ? "Los precios ya incluyen impuestos" : "Prices include tax"}
                  <span className="mt-1 block text-xs font-normal text-slate-500">
                    {isEs
                      ? "El impuesto se extrae de los precios de los productos; no se suma de nuevo."
                      : "Tax is extracted from product prices and is not added a second time."}
                  </span>
                </span>
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
          </div>

          <div
            id="tax-panel-regions"
            role="tabpanel"
            aria-labelledby="tax-tab-regions"
            hidden={activeTab !== "regions"}
          >
          <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
              {isEs ? "Regiones de impuestos" : "Tax Regions"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              {isEs
                ? "Agrega las regiones donde tu negocio está legalmente obligado a recaudar impuestos."
                : "Add the regions where your business must collect tax."}
            </p>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              {isEs
                ? "La tasa predeterminada es solo una referencia; el impuesto real puede variar según la ubicación y la categoría del producto."
                : "The default rate is a reference only; actual tax may vary by location and product category."}
            </p>

            <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium text-slate-700">
                  {isEs ? "País" : "Country"}
                </span>
                <div className="relative">
                  <input
                    type="text"
                    role="combobox"
                    aria-label={isEs ? "País" : "Country"}
                    aria-autocomplete="list"
                    aria-expanded={isCountryListOpen}
                    aria-controls="tax-country-options"
                    aria-activedescendant={
                      isCountryListOpen && filteredCountries[activeCountryIndex]
                        ? `tax-country-option-${filteredCountries[activeCountryIndex][1]}`
                        : undefined
                    }
                    value={newCountry}
                    onFocus={() => {
                      setIsCountryListOpen(true);
                      setActiveCountryIndex(0);
                    }}
                    onBlur={() => setIsCountryListOpen(false)}
                    onKeyDown={handleCountryKeyDown}
                    onChange={(event) => {
                      setNewCountry(event.target.value);
                      setNewRegion("");
                      setIsCustomRegion(false);
                      setActiveCountryIndex(0);
                      setIsCountryListOpen(true);
                    }}
                    placeholder={isEs ? "Busca o escribe un país" : "Search or enter a country"}
                    autoComplete="off"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 pr-10 text-sm outline-none transition placeholder:text-slate-400 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                  />
                  <ChevronDown
                    aria-hidden="true"
                    className={`pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-transform ${
                      isCountryListOpen ? "rotate-180" : ""
                    }`}
                  />
                  {isCountryListOpen ? (
                    <ul
                      id="tax-country-options"
                      role="listbox"
                      className="absolute left-0 right-0 top-full z-30 mt-1 max-h-60 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg"
                    >
                      {filteredCountries.length > 0 ? (
                        filteredCountries.map(([countryName, countryCode], index) => (
                          <li
                            key={countryCode}
                            id={`tax-country-option-${countryCode}`}
                            role="option"
                            aria-selected={index === activeCountryIndex}
                          >
                            <button
                              type="button"
                              onMouseDown={(event) => event.preventDefault()}
                              onMouseEnter={() => setActiveCountryIndex(index)}
                              onClick={() => selectCountry(countryName)}
                              className={`w-full rounded-lg px-3 py-2 text-left text-sm ${
                                index === activeCountryIndex
                                  ? "bg-cyan-50 text-cyan-900"
                                  : "text-slate-700 hover:bg-slate-50"
                              }`}
                            >
                              {countryName}
                            </button>
                          </li>
                        ))
                      ) : (
                        <li className="px-3 py-2 text-sm text-slate-500">
                          {isEs
                            ? "No hay coincidencias. Puedes usar el nombre escrito."
                            : "No matches. You can use the country name you entered."}
                        </li>
                      )}
                    </ul>
                  ) : null}
                </div>
              </div>
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-slate-700">
                  {isEs ? "Estado / provincia / región" : "State / province / region"}
                </span>
                {selectedCountryRegions.length > 0 && !isCustomRegion ? (
                  <select
                    value={newRegion}
                    onChange={(event) => {
                      if (event.target.value === "__custom__") {
                        setNewRegion("");
                        setIsCustomRegion(true);
                      } else {
                        setNewRegion(event.target.value);
                      }
                    }}
                    disabled={!newCountry}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400 disabled:bg-slate-50"
                  >
                    <option value="">
                      {isEs ? "Selecciona un estado o provincia" : "Select a state or province"}
                    </option>
                    {selectedCountryRegions.map(([regionName, regionCode]) => (
                      <option key={regionCode || regionName} value={regionName}>
                        {regionName}
                      </option>
                    ))}
                    <option value="__custom__">
                      {isEs ? "Ingresar otra región..." : "Enter a custom region..."}
                    </option>
                  </select>
                ) : (
                  <input
                    value={newRegion}
                    onChange={(event) => setNewRegion(event.target.value)}
                    disabled={!newCountry}
                    placeholder={
                      isEs
                        ? "Estado / provincia / región"
                        : "State / province / region"
                    }
                    className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400 disabled:bg-slate-50"
                  />
                )}
                {isCustomRegion && selectedCountryRegions.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => {
                      setNewRegion("");
                      setIsCustomRegion(false);
                    }}
                    className="self-start text-xs font-medium text-cyan-700 hover:text-cyan-800"
                  >
                    {isEs ? "Elegir de la lista" : "Choose from list"}
                  </button>
                ) : null}
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-slate-700">
                  {isEs ? "ID de registro fiscal" : "Tax registration ID"}
                </span>
                <input
                  value={newTaxId}
                  onChange={(e) => setNewTaxId(e.target.value)}
                  placeholder={isEs ? "Número de registro fiscal / RFC" : "Tax registration ID"}
                  className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400"
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-slate-700">
                  {isEs ? "Tasa predeterminada (%)" : "Default tax rate (%)"}
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={newRegionRate}
                  onChange={(e) => setNewRegionRate(e.target.value)}
                  placeholder="0.00"
                  aria-label={isEs ? "Tasa predeterminada de impuestos (%)" : "Default tax rate (%)"}
                  className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400"
                />
              </label>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={addNexusRegion}
                className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                {isEs ? "Agregar región de impuestos" : "Add Tax Region"}
              </button>
            </div>

            <div className="mt-5 space-y-3">
              {nexusRegions.map((region, index) => (
                <div
                  key={`${region.country}-${region.region}-${index}`}
                  className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {region.country} · {region.region}
                    </p>
                    <p className="text-xs text-slate-500">
                      {isEs ? "ID Fiscal:" : "Tax ID:"} {region.taxId}
                    </p>
                  </div>
                  <label className="flex items-center gap-2 text-sm text-slate-600">
                    <span>{isEs ? "Tasa predeterminada:" : "Default rate:"}</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={region.defaultRate ?? ""}
                      onChange={(event) => {
                        const defaultRate = event.target.value;
                        setNexusRegions((current) =>
                          current.map((item, currentIndex) =>
                            currentIndex === index ? { ...item, defaultRate } : item
                          )
                        );
                      }}
                      aria-label={`${isEs ? "Tasa predeterminada para" : "Default tax rate for"} ${region.country} ${region.region}`}
                      className="w-24 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
                    />
                    <span>%</span>
                  </label>
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
          </div>

          <div
            id="tax-panel-exempt"
            role="tabpanel"
            aria-labelledby="tax-tab-exempt"
            hidden={activeTab !== "exempt"}
          >
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
                  <span className="mt-1 block text-xs font-normal text-slate-500">
                    {isEs
                      ? "Activa la exención en el perfil del cliente para omitir el impuesto en sus pedidos."
                      : "Enable the exemption on a customer profile to skip tax on that customer’s orders."}
                  </span>
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
          </div>

          <div
            id="tax-panel-categories"
            role="tabpanel"
            aria-labelledby="tax-tab-categories"
            hidden={activeTab !== "categories"}
          >
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
