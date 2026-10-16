"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, FolderPlus, Sparkles, Shield, HelpCircle } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";

type Store = {
  id: string;
  name: string;
  currency: string;
};

type NewGroupFormProps = {
  stores: Store[];
  selectedStoreId: string | null;
  setupError?: string | null;
};

export function NewCustomerGroupForm({
  stores,
  selectedStoreId,
  setupError = null,
}: NewGroupFormProps) {
  const router = useRouter();
  const { language } = useLanguage();
  const isEs = language === "es";

  const [activeStoreId, setActiveStoreId] = useState(selectedStoreId ?? stores[0]?.id ?? "");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const presets = [
    {
      name: isEs ? "VIP" : "VIP",
      desc: isEs ? "Clientes de alto valor con acceso prioritario y descuentos exclusivos." : "High-value customers with priority access and exclusive tier perks.",
    },
    {
      name: isEs ? "Mayoristas" : "Wholesale",
      desc: isEs ? "Compradores al por mayor que reciben tarifas comerciales y facturación especial." : "Bulk buyers receiving volume commercial pricing and terms.",
    },
    {
      name: isEs ? "Frecuentes" : "Frequent Buyers",
      desc: isEs ? "Clientes recurrentes del programa de lealtad." : "Recurring customers enrolled in loyalty program.",
    },
    {
      name: isEs ? "B2B Corporativo" : "Corporate B2B",
      desc: isEs ? "Cuentas comerciales registradas para compras de empresa a empresa." : "Registered commercial accounts for business-to-business purchasing.",
    },
  ];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!activeStoreId) {
      setError(isEs ? "Selecciona una tienda" : "Select a store");
      return;
    }
    if (!name.trim()) {
      setError(isEs ? "El nombre del grupo es obligatorio" : "Group name is required");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/customer-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId: activeStoreId,
          name: name.trim(),
          description: description.trim() || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || (isEs ? "Error al crear grupo" : "Failed to create group"));
      }

      router.push(`/dashboard/customers/groups?storeId=${encodeURIComponent(activeStoreId)}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error creating customer group");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Back button */}
      <div>
        <Link
          href={`/dashboard/customers/groups${activeStoreId ? `?storeId=${encodeURIComponent(activeStoreId)}` : ""}`}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-cyan-700 transition"
        >
          <ArrowLeft className="h-4 w-4" />
          {isEs ? "Volver a Grupos de Clientes" : "Back to Customer Groups"}
        </Link>
      </div>

      {setupError ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {setupError}
        </div>
      ) : null}

      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <span className="inline-flex rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-700">
            {isEs ? "Nuevo Segmento" : "New Segment"}
          </span>
        </div>
        <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
          {isEs ? "Crear Grupo de Clientes" : "Create Customer Group"}
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-600 sm:text-base">
          {isEs
            ? "Crea un nuevo grupo para clasificar a tus clientes. Este grupo aparecerá como columna en la tabla de clientes y podrás asignarlo a cualquier cliente."
            : "Create a new group to categorize your customers. This group will appear as a column in the customers table and can be assigned to any customer."}
        </p>
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Main Form (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-xs space-y-6">
            {/* Store select */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                {isEs ? "Tienda *" : "Store *"}
              </label>
              <select
                value={activeStoreId}
                onChange={(e) => setActiveStoreId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-cyan-500 focus:bg-white focus:ring-2 focus:ring-cyan-500/20"
              >
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.currency})
                  </option>
                ))}
              </select>
            </div>

            {/* Group Name */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                {isEs ? "Nombre del grupo *" : "Group Name *"}
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={isEs ? "Ej. VIP, Mayoristas, Regular, B2B..." : "e.g. VIP, Wholesale, Regular, B2B..."}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:bg-white focus:ring-2 focus:ring-cyan-500/20"
                autoFocus
              />
              <p className="mt-1.5 text-xs text-slate-500">
                {isEs ? "El nombre distintivo que verás en la tabla de clientes." : "The distinct label displayed in the customers table column."}
              </p>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                {isEs ? "Descripción (Opcional)" : "Description (Optional)"}
              </label>
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={isEs ? "Escribe detalles sobre beneficios, reglas de elegibilidad o notas del segmento..." : "Add details on eligibility, discount rules, or notes about this segment..."}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:bg-white focus:ring-2 focus:ring-cyan-500/20"
              />
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <Link
                href={`/dashboard/customers/groups${activeStoreId ? `?storeId=${encodeURIComponent(activeStoreId)}` : ""}`}
                className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                {isEs ? "Cancelar" : "Cancel"}
              </Link>
              <button
                type="submit"
                disabled={isSaving || !name.trim()}
                className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-6 py-2.5 text-sm font-bold text-white shadow-xs hover:bg-cyan-700 transition disabled:opacity-50 cursor-pointer"
              >
                <FolderPlus className="h-4 w-4" />
                {isSaving ? (isEs ? "Guardando..." : "Saving...") : (isEs ? "Crear grupo" : "Create Group")}
              </button>
            </div>
          </form>

          {/* Quick presets */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-600 mb-3">
              <Sparkles className="h-4 w-4 text-cyan-600" />
              <span>{isEs ? "Plantillas sugeridas" : "Suggested Presets"}</span>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              {isEs
                ? "Haz clic en una plantilla para autocompletar el nombre y la descripción sugerida:"
                : "Click on any preset to quickly autofill the name and description:"}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {presets.map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => {
                    setName(preset.name);
                    setDescription(preset.desc);
                  }}
                  className="text-left rounded-xl border border-slate-200/90 bg-slate-50/60 p-3.5 transition hover:border-cyan-400 hover:bg-cyan-50/30 cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">{preset.name}</span>
                    <span className="text-[10px] text-cyan-600 font-semibold">{isEs ? "Usar" : "Use"}</span>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                    {preset.desc}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar Preview & Tips (1 col) */}
        <div className="space-y-6">
          {/* Live Preview Card */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700 mb-4">
              <Shield className="h-4 w-4 text-cyan-600" />
              <span>{isEs ? "Vista previa en la tabla" : "Table Preview"}</span>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <span className="text-[11px] font-semibold text-slate-500 block mb-2">
                {isEs ? "Columna en la tabla de clientes:" : "Column in Customers table:"}
              </span>
              <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                <table className="min-w-full text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold text-slate-600">{isEs ? "Cliente" : "Customer"}</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-600">{isEs ? "Grupo" : "Group"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="px-3 py-2.5 text-slate-800 font-medium">Jane Doe</td>
                      <td className="px-3 py-2.5">
                        <span className="inline-flex items-center rounded-full bg-cyan-50 px-2.5 py-0.5 text-[11px] font-bold text-cyan-700 border border-cyan-200/80">
                          {name.trim() || (isEs ? "Nombre del grupo" : "Group Name")}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-4 flex items-start gap-2.5 text-xs text-slate-500 leading-relaxed">
              <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                {isEs
                  ? "Este distintivo se muestra automáticamente para los clientes que pertenezcan a este grupo."
                  : "This badge will automatically display for customers assigned to this group."}
              </span>
            </div>
          </div>

          {/* Tips Card */}
          <div className="rounded-2xl border border-cyan-100 bg-cyan-50/40 p-6 shadow-xs">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cyan-900 mb-3">
              <HelpCircle className="h-4 w-4 text-cyan-700" />
              <span>{isEs ? "¿Para qué sirven los grupos?" : "Why use customer groups?"}</span>
            </div>
            <ul className="space-y-2.5 text-xs text-slate-600 leading-relaxed">
              <li className="flex items-start gap-2">
                <span className="text-cyan-700 font-bold">•</span>
                <span>{isEs ? "Segmenta a tus clientes VIP de los compradores ocasionales." : "Distinguish your VIP customers from one-time shoppers."}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-700 font-bold">•</span>
                <span>{isEs ? "Asigna tarifas mayoristas o B2B directamente desde la ficha de cada cliente." : "Assign wholesale or B2B rates directly within each customer profile."}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-700 font-bold">•</span>
                <span>{isEs ? "Filtra y busca fácilmente en la tabla principal de clientes por grupo." : "Easily search and filter in the main customers table by group."}</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
