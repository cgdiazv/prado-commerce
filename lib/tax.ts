export type TaxRegion = {
  country: string;
  region: string;
  defaultRate?: string;
};

export type TaxCategory = {
  code: string;
  defaultRate: string;
};

export type TaxSettings = {
  automaticTax: boolean;
  collectTaxOnShipping: boolean;
  pricesIncludeTax: boolean;
  taxExemptEnabled: boolean;
  nexusRegions: TaxRegion[];
  taxCategories: TaxCategory[];
};

export type TaxLineInput = {
  price: number;
  quantity: number;
  taxable: boolean;
  taxCategoryCode?: string | null;
};

const DEFAULT_TAX_SETTINGS: TaxSettings = {
  automaticTax: true,
  collectTaxOnShipping: true,
  pricesIncludeTax: false,
  taxExemptEnabled: true,
  nexusRegions: [],
  taxCategories: [],
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toRate(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 100 ? parsed / 100 : 0;
}

export function parseTaxSettings(value: unknown): TaxSettings {
  if (!isRecord(value)) return DEFAULT_TAX_SETTINGS;

  const nexusRegions = Array.isArray(value.nexusRegions)
    ? value.nexusRegions.filter((region): region is TaxRegion =>
        isRecord(region) &&
        typeof region.country === "string" &&
        typeof region.region === "string",
      )
    : [];
  const taxCategories = Array.isArray(value.taxCategories)
    ? value.taxCategories.filter((category): category is TaxCategory =>
        isRecord(category) &&
        typeof category.code === "string" &&
        typeof category.defaultRate === "string",
      )
    : [];

  return {
    automaticTax: value.automaticTax !== false,
    collectTaxOnShipping: value.collectTaxOnShipping === true,
    pricesIncludeTax: value.pricesIncludeTax === true,
    taxExemptEnabled: value.taxExemptEnabled !== false,
    nexusRegions,
    taxCategories,
  };
}

function normalize(value: string) {
  return value.trim().toLocaleLowerCase();
}

export function findTaxRegion(settings: TaxSettings, country: string, region: string) {
  const countryData = allCountries.find(
    ([name, code]) => normalize(name) === normalize(country) || normalize(code) === normalize(country),
  );
  const regionData = countryData?.[2].find(
    ([name, code]) => normalize(name) === normalize(region) || normalize(code) === normalize(region),
  );

  return settings.nexusRegions.find((candidate) => {
    const configuredCountry = allCountries.find(
      ([name, code]) =>
        normalize(name) === normalize(candidate.country) ||
        normalize(code) === normalize(candidate.country),
    );
    const sameCountry =
      normalize(candidate.country) === normalize(country) ||
      Boolean(countryData && configuredCountry?.[1] === countryData[1]);
    const sameRegion =
      normalize(candidate.region) === normalize(region) ||
      Boolean(
        regionData &&
        configuredCountry?.[1] === countryData?.[1] &&
        (normalize(candidate.region) === normalize(regionData[0]) ||
          normalize(candidate.region) === normalize(regionData[1])),
      );
    return sameCountry && sameRegion;
  });
}

export function calculateTax(
  settingsValue: unknown,
  destination: { country?: unknown; region?: unknown },
  lines: TaxLineInput[],
  shipping = 0,
  customerTaxExempt = false,
) {
  const settings = parseTaxSettings(settingsValue);
  const pricesIncludeTax = settings.pricesIncludeTax;
  const isTaxExempt = settings.taxExemptEnabled && customerTaxExempt;
  const country = typeof destination.country === "string" ? destination.country : "";
  const region = typeof destination.region === "string" ? destination.region : "";
  const matchedRegion = settings.automaticTax && !isTaxExempt && country && region
    ? findTaxRegion(settings, country, region)
    : undefined;

  const lineTaxes = lines.map((line) => {
    if (!matchedRegion || !line.taxable || !Number.isFinite(line.price) || !Number.isFinite(line.quantity)) {
      return 0;
    }

    const category = line.taxCategoryCode
      ? settings.taxCategories.find((candidate) => normalize(candidate.code) === normalize(line.taxCategoryCode!))
      : undefined;
    const rate = category
      ? toRate(category.defaultRate)
      : toRate(matchedRegion.defaultRate);
    const grossAmount = line.price * line.quantity;
    const taxAmount = pricesIncludeTax
      ? grossAmount * rate / (1 + rate)
      : grossAmount * rate;
    return Math.round(taxAmount * 100) / 100;
  });

  const shippingTax = matchedRegion && settings.collectTaxOnShipping && Number.isFinite(shipping)
    ? Math.round(Math.max(0, shipping) * toRate(matchedRegion.defaultRate) * 100) / 100
    : 0;
  const lineTaxTotal = lineTaxes.reduce((sum, tax) => sum + tax, 0);

  return {
    lineTaxes,
    shippingTax,
    total: Math.round((lineTaxTotal + shippingTax) * 100) / 100,
    includedTax: pricesIncludeTax ? Math.round(lineTaxTotal * 100) / 100 : 0,
    additionalTax: Math.round(
      (pricesIncludeTax ? shippingTax : lineTaxTotal + shippingTax) * 100,
    ) / 100,
    pricesIncludeTax,
    taxExempt: isTaxExempt,
  };
}
import { allCountries } from "country-region-data";
