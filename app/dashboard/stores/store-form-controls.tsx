"use client";

export function Field({
  label,
  labelHint,
  value,
  onChange,
  placeholder,
  type = "text",
  min,
  max,
  className = "",
}: {
  label: string;
  labelHint?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  min?: number;
  max?: number;
  className?: string;
}) {
  return (
    <label className={`flex flex-col gap-2 ${className}`.trim()}>
      <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
        <span>{label}</span>
        {labelHint ? (
          <span className="group relative inline-flex items-center">
            <button
              type="button"
              aria-label={`${label} help`}
              className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-blue-300 bg-blue-50 text-xs font-semibold text-blue-700 transition hover:border-blue-400 hover:bg-blue-100 hover:text-blue-800"
            >
              ?
            </button>
            <span className="pointer-events-none absolute left-1/2 top-7 z-20 hidden w-72 -translate-x-1/2 rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs font-normal leading-5 text-blue-800 shadow-lg group-hover:block group-focus-within:block">
              {labelHint}
            </span>
          </span>
        ) : null}
      </span>
      <input
        type={type}
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white"
      />
    </label>
  );
}

export function SelectField({
  label,
  value,
  onChange,
  options,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  className?: string;
}) {
  return (
    <label className={`flex flex-col gap-2 ${className}`.trim()}>
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:bg-white"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export const CURRENCIES = [
  { value: "USD", label: "USD — US Dollar" },
  { value: "EUR", label: "EUR — Euro" },
  { value: "GBP", label: "GBP — British Pound" },
  { value: "CAD", label: "CAD — Canadian Dollar" },
  { value: "AUD", label: "AUD — Australian Dollar" },
  { value: "JPY", label: "JPY — Japanese Yen" },
  { value: "CHF", label: "CHF — Swiss Franc" },
  { value: "INR", label: "INR — Indian Rupee" },
  { value: "SGD", label: "SGD — Singapore Dollar" },
  { value: "AED", label: "AED — UAE Dirham" },
  // South America
  { value: "BRL", label: "BRL — Brazilian Real" },
  { value: "ARS", label: "ARS — Argentine Peso" },
  { value: "CLP", label: "CLP — Chilean Peso" },
  { value: "COP", label: "COP — Colombian Peso" },
  { value: "PEN", label: "PEN — Peruvian Sol" },
  { value: "VES", label: "VES — Venezuelan Bolívar" },
  { value: "BOB", label: "BOB — Bolivian Boliviano" },
  { value: "PYG", label: "PYG — Paraguayan Guaraní" },
  { value: "UYU", label: "UYU — Uruguayan Peso" },
  { value: "GYD", label: "GYD — Guyanese Dollar" },
  { value: "SRD", label: "SRD — Surinamese Dollar" },
  // Central America
  { value: "GTQ", label: "GTQ — Guatemalan Quetzal" },
  { value: "BZD", label: "BZD — Belize Dollar" },
  { value: "HNL", label: "HNL — Honduran Lempira" },
  { value: "NIO", label: "NIO — Nicaraguan Córdoba" },
  { value: "CRC", label: "CRC — Costa Rican Colón" },
  { value: "PAB", label: "PAB — Panamanian Balboa" },
  { value: "DOP", label: "DOP — Dominican Peso" },
  { value: "MXN", label: "MXN — Mexican Peso" },
];

export const TIMEZONES = [
  // North America
  { value: "America/New_York", label: "America/New_York (ET)" },
  { value: "America/Chicago", label: "America/Chicago (CT)" },
  { value: "America/Denver", label: "America/Denver (MT)" },
  { value: "America/Los_Angeles", label: "America/Los_Angeles (PT)" },
  { value: "America/Anchorage", label: "America/Anchorage (AKT)" },
  { value: "Pacific/Honolulu", label: "Pacific/Honolulu (HST)" },
  { value: "America/Toronto", label: "America/Toronto" },
  { value: "America/Vancouver", label: "America/Vancouver" },
  // Central America
  { value: "America/Mexico_City", label: "America/Mexico_City" },
  { value: "America/Guatemala", label: "America/Guatemala" },
  { value: "America/Costa_Rica", label: "America/Costa_Rica" },
  { value: "America/Panama", label: "America/Panama" },
  // South America
  { value: "America/Bogota", label: "America/Bogota" },
  { value: "America/Lima", label: "America/Lima" },
  { value: "America/Caracas", label: "America/Caracas" },
  { value: "America/Santiago", label: "America/Santiago" },
  { value: "America/Sao_Paulo", label: "America/Sao_Paulo" },
  { value: "America/Argentina/Buenos_Aires", label: "America/Argentina/Buenos_Aires" },
  { value: "America/Montevideo", label: "America/Montevideo" },
  { value: "America/Asuncion", label: "America/Asuncion" },
  { value: "America/La_Paz", label: "America/La_Paz" },
  { value: "America/Guayaquil", label: "America/Guayaquil" },
  // Europe
  { value: "Europe/London", label: "Europe/London (GMT/BST)" },
  { value: "Europe/Dublin", label: "Europe/Dublin" },
  { value: "Europe/Lisbon", label: "Europe/Lisbon" },
  { value: "Europe/Madrid", label: "Europe/Madrid" },
  { value: "Europe/Paris", label: "Europe/Paris" },
  { value: "Europe/Berlin", label: "Europe/Berlin" },
  { value: "Europe/Rome", label: "Europe/Rome" },
  { value: "Europe/Amsterdam", label: "Europe/Amsterdam" },
  { value: "Europe/Brussels", label: "Europe/Brussels" },
  { value: "Europe/Warsaw", label: "Europe/Warsaw" },
  { value: "Europe/Stockholm", label: "Europe/Stockholm" },
  { value: "Europe/Helsinki", label: "Europe/Helsinki" },
  { value: "Europe/Athens", label: "Europe/Athens" },
  { value: "Europe/Bucharest", label: "Europe/Bucharest" },
  { value: "Europe/Moscow", label: "Europe/Moscow" },
  { value: "Europe/Istanbul", label: "Europe/Istanbul" },
  // Africa
  { value: "Africa/Cairo", label: "Africa/Cairo" },
  { value: "Africa/Johannesburg", label: "Africa/Johannesburg" },
  { value: "Africa/Lagos", label: "Africa/Lagos" },
  { value: "Africa/Nairobi", label: "Africa/Nairobi" },
  { value: "Africa/Casablanca", label: "Africa/Casablanca" },
  { value: "Africa/Accra", label: "Africa/Accra" },
  // Middle East
  { value: "Asia/Dubai", label: "Asia/Dubai" },
  { value: "Asia/Riyadh", label: "Asia/Riyadh" },
  { value: "Asia/Kuwait", label: "Asia/Kuwait" },
  { value: "Asia/Beirut", label: "Asia/Beirut" },
  { value: "Asia/Jerusalem", label: "Asia/Jerusalem" },
  { value: "Asia/Baghdad", label: "Asia/Baghdad" },
  { value: "Asia/Tehran", label: "Asia/Tehran" },
  // Asia
  { value: "Asia/Karachi", label: "Asia/Karachi" },
  { value: "Asia/Kolkata", label: "Asia/Kolkata" },
  { value: "Asia/Dhaka", label: "Asia/Dhaka" },
  { value: "Asia/Colombo", label: "Asia/Colombo" },
  { value: "Asia/Kathmandu", label: "Asia/Kathmandu" },
  { value: "Asia/Almaty", label: "Asia/Almaty" },
  { value: "Asia/Bangkok", label: "Asia/Bangkok" },
  { value: "Asia/Ho_Chi_Minh", label: "Asia/Ho_Chi_Minh" },
  { value: "Asia/Jakarta", label: "Asia/Jakarta" },
  { value: "Asia/Singapore", label: "Asia/Singapore" },
  { value: "Asia/Kuala_Lumpur", label: "Asia/Kuala_Lumpur" },
  { value: "Asia/Manila", label: "Asia/Manila" },
  { value: "Asia/Shanghai", label: "Asia/Shanghai" },
  { value: "Asia/Hong_Kong", label: "Asia/Hong_Kong" },
  { value: "Asia/Taipei", label: "Asia/Taipei" },
  { value: "Asia/Seoul", label: "Asia/Seoul" },
  { value: "Asia/Tokyo", label: "Asia/Tokyo" },
  // Oceania
  { value: "Australia/Perth", label: "Australia/Perth" },
  { value: "Australia/Darwin", label: "Australia/Darwin" },
  { value: "Australia/Adelaide", label: "Australia/Adelaide" },
  { value: "Australia/Brisbane", label: "Australia/Brisbane" },
  { value: "Australia/Sydney", label: "Australia/Sydney" },
  { value: "Australia/Melbourne", label: "Australia/Melbourne" },
  { value: "Pacific/Auckland", label: "Pacific/Auckland" },
  { value: "Pacific/Fiji", label: "Pacific/Fiji" },
  // UTC
  { value: "UTC", label: "UTC" },
];
