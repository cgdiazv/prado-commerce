"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { useLanguage } from "@/lib/i18n/language-context";

const STORE_PROFILE_CONTACT_KEY = "prado_store_profile_contact";

type ShippingZone = {
  name: string;
  regions: string;
  rateType: "free" | "flat" | "pickup";
  rateValue: string;
};

type StoreShippingSettings = {
  id: string;
  name?: string;
  shippingZones?: unknown;
};

export default function ShippingPage() {
  const router = useRouter();
  const { language } = useLanguage();
  const isEs = language === "es";

  const [storeId, setStoreId] = useState("");
  const [zones, setZones] = useState<ShippingZone[]>([]);
  const [shipStationConnected, setShipStationConnected] = useState(false);
  const [shipStationAllowedByPlan, setShipStationAllowedByPlan] = useState(true);
  const [originName, setOriginName] = useState("");
  const [originAddress, setOriginAddress] = useState("");
  const [originPhone, setOriginPhone] = useState("");
  const [shipStationApiKey, setShipStationApiKey] = useState("");
  const [shipStationApiSecret, setShipStationApiSecret] = useState("");
  const [showShipStationConfig, setShowShipStationConfig] = useState(false);
  const [isUpdatingShipStation, setIsUpdatingShipStation] = useState(false);
  const [shipStationMessage, setShipStationMessage] = useState<string | null>(null);
  const [newZoneName, setNewZoneName] = useState("");
  const [newZoneRegions, setNewZoneRegions] = useState("");
  const [newZoneType, setNewZoneType] = useState<ShippingZone["rateType"]>("flat");
  const [newZoneValue, setNewZoneValue] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function normalizeShippingZones(value: unknown): ShippingZone[] {
    if (!Array.isArray(value)) {
      return [];
    }

    const zonesFromStore = value
      .map((zone) => {
        if (!zone || typeof zone !== "object") {
          return null;
        }

        const next = zone as Record<string, unknown>;
        const rateType = String(next.rateType ?? "").trim().toLowerCase();

        if (rateType !== "free" && rateType !== "flat" && rateType !== "pickup") {
          return null;
        }

        const name = String(next.name ?? "").trim();
        const regions = String(next.regions ?? "").trim();
        const rateValue = String(next.rateValue ?? "").trim();

        if (!name || !regions) {
          return null;
        }

        return {
          name,
          regions,
          rateType,
          rateValue:
            rateValue ||
            (rateType === "free"
              ? "$0.00"
              : rateType === "pickup"
              ? isEs
                ? "Recogida en tienda"
                : "Pickup at store"
              : "$0.00"),
        } as ShippingZone;
      })
      .filter((zone): zone is ShippingZone => zone !== null);

    return zonesFromStore;
  }

  useEffect(() => {
    async function loadShippingSettings() {
      try {
        const [storesResponse, storedContactRaw] = await Promise.all([
          fetch("/api/stores", { cache: "no-store" }),
          Promise.resolve(localStorage.getItem(STORE_PROFILE_CONTACT_KEY)),
        ]);

        if (storesResponse.ok) {
          const stores = (await storesResponse.json()) as StoreShippingSettings[];
          const firstStore = Array.isArray(stores) ? stores[0] : null;
          setStoreId(firstStore?.id ?? "");
          setOriginName((firstStore?.name ?? "").trim());

          if (firstStore?.shippingZones) {
            const parsedZones = normalizeShippingZones(firstStore.shippingZones);
            if (parsedZones.length > 0) {
              setZones(parsedZones);
            }
          }

          if (firstStore?.id) {
            const shipStationStatusResponse = await fetch(`/api/stores/${firstStore.id}/shipstation`, {
              cache: "no-store",
            });
            if (shipStationStatusResponse.ok) {
              const shipStationPayload = (await shipStationStatusResponse.json()) as {
                connected?: boolean;
                allowedByPlan?: boolean;
              };
              setShipStationConnected(Boolean(shipStationPayload.connected));
              setShipStationAllowedByPlan(shipStationPayload.allowedByPlan ?? true);
            }
          }
        }

        if (storedContactRaw) {
          try {
            const parsedContact = JSON.parse(storedContactRaw) as {
              address?: string;
              phone?: string;
              company?: string;
            };
            if (parsedContact.address) setOriginAddress(parsedContact.address);
            if (parsedContact.phone) setOriginPhone(parsedContact.phone);
            if (parsedContact.company && !originName) setOriginName(parsedContact.company);
          } catch {
            // ignore JSON error
          }
        }
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : isEs
            ? "No se pudo cargar la configuración de envío."
            : "Unable to load shipping settings."
        );
      }
    }

    void loadShippingSettings();
  }, [originName, isEs]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);
    setShipStationMessage(null);

    try {
      if (!storeId) {
        throw new Error(
          isEs
            ? "No se encontró ninguna tienda. Crea una tienda primero."
            : "No store found. Create a store first."
        );
      }

      const response = await fetch(`/api/stores/${storeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shippingZones: zones,
        }),
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(
          payload.error ||
            (isEs
              ? "No se pudo guardar la configuración de envío."
              : "Unable to save shipping settings.")
        );
      }

      setShipStationMessage(
        isEs ? "Configuración de envío guardada." : "Shipping settings saved."
      );
      router.refresh();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : isEs
          ? "No se pudo guardar la configuración de envío."
          : "Unable to save shipping settings."
      );
    } finally {
      setIsSaving(false);
    }
  }

  function addZone() {
    if (!newZoneName.trim() || !newZoneRegions.trim()) return;

    setZones((current) => [
      ...current,
      {
        name: newZoneName.trim(),
        regions: newZoneRegions.trim(),
        rateType: newZoneType,
        rateValue:
          newZoneValue.trim() ||
          (newZoneType === "free"
            ? "$0.00"
            : newZoneType === "pickup"
            ? isEs
              ? "Recogida en tienda"
              : "Pickup at store"
            : "$10.00"),
      },
    ]);

    setNewZoneName("");
    setNewZoneRegions("");
    setNewZoneType("flat");
    setNewZoneValue("");
  }

  function deleteZone(zoneName: string) {
    setZones((current) => current.filter((zone) => zone.name !== zoneName));
  }

  async function connectShipStation() {
    if (!storeId || !shipStationApiKey.trim() || !shipStationApiSecret.trim()) return;

    setIsUpdatingShipStation(true);
    setError(null);
    setShipStationMessage(null);
    try {
      const response = await fetch(`/api/stores/${storeId}/shipstation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: shipStationApiKey, apiSecret: shipStationApiSecret }),
      });
      const payload = (await response.json()) as { error?: string; warning?: string | null };
      if (!response.ok) {
        throw new Error(
          payload.error ||
            (isEs ? "No se pudo conectar ShipStation." : "Unable to connect ShipStation.")
        );
      }

      setShipStationConnected(true);
      setShipStationApiKey("");
      setShipStationApiSecret("");
      setShowShipStationConfig(false);
      setShipStationMessage(
        payload.warning || (isEs ? "ShipStation conectado." : "ShipStation connected.")
      );
    } catch (connectError) {
      setError(
        connectError instanceof Error
          ? connectError.message
          : isEs
          ? "No se pudo conectar ShipStation."
          : "Unable to connect ShipStation."
      );
    } finally {
      setIsUpdatingShipStation(false);
    }
  }

  async function disconnectShipStation() {
    if (
      !storeId ||
      !confirm(
        isEs
          ? "¿Desconectar ShipStation? Los nuevos pedidos pagados dejarán de sincronizarse."
          : "Disconnect ShipStation? New paid orders will stop syncing."
      )
    )
      return;

    setIsUpdatingShipStation(true);
    setError(null);
    setShipStationMessage(null);
    try {
      const response = await fetch(`/api/stores/${storeId}/shipstation`, { method: "DELETE" });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(
          payload.error ||
            (isEs ? "No se pudo desconectar ShipStation." : "Unable to disconnect ShipStation.")
        );
      }

      setShipStationConnected(false);
      setShowShipStationConfig(false);
      setShipStationMessage(isEs ? "ShipStation desconectado." : "ShipStation disconnected.");
    } catch (disconnectError) {
      setError(
        disconnectError instanceof Error
          ? disconnectError.message
          : isEs
          ? "No se pudo desconectar ShipStation."
          : "Unable to disconnect ShipStation."
      );
    } finally {
      setIsUpdatingShipStation(false);
    }
  }

  return (
    <section className="space-y-4">
      <div className="w-full">
        <div>
          <div className="flex items-start justify-between gap-4">
            <h1 className="text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">
              {isEs ? "Envíos y Entregas" : "Shipping"}
            </h1>

            <Link
              href="/dashboard/settings"
              className="inline-flex shrink-0 items-center rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              {isEs ? "← Volver a configuración" : "← Back to settings"}
            </Link>
          </div>
          <p className="mt-1 max-w-xl text-sm text-slate-500">
            {isEs
              ? "Gestiona el origen de despacho, zonas de envío, tarifas y transportistas conectados."
              : "Manage origin location, shipping zones, delivery methods, and carrier connections."}
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

          {shipStationMessage ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {shipStationMessage}
            </div>
          ) : null}

          <article className="rounded-xl border border-slate-200 bg-slate-50 p-5">
            <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
              {isEs ? "Ubicación de origen" : "Origin location"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              {isEs
                ? "Esta sección toma la dirección del perfil de la tienda como origen predeterminado para los cálculos de flete."
                : "This section uses the origin location from Store profile as the default shipping origin."}
            </p>

            <div className="mt-4 grid gap-4 lg:grid-cols-3">
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-slate-700">
                  {isEs ? "Nombre del remitente / Tienda" : "Store profile name"}
                </span>
                <input
                  value={originName}
                  onChange={(event) => setOriginName(event.target.value)}
                  placeholder={isEs ? "Origen del perfil" : "Store profile origin"}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
                />
              </label>
              <label className="flex flex-col gap-2 lg:col-span-2">
                <span className="text-sm font-medium text-slate-700">
                  {isEs ? "Dirección de origen" : "Origin address"}
                </span>
                <input
                  value={originAddress}
                  onChange={(event) => setOriginAddress(event.target.value)}
                  placeholder={
                    isEs
                      ? "Usa la dirección registrada en el perfil comercial"
                      : "Use the origin address from Store profile"
                  }
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
                />
              </label>
              <label className="flex flex-col gap-2 lg:col-span-3">
                <span className="text-sm font-medium text-slate-700">
                  {isEs ? "Teléfono de contacto de origen" : "Origin phone"}
                </span>
                <input
                  value={originPhone}
                  onChange={(event) => setOriginPhone(event.target.value)}
                  placeholder={
                    isEs
                      ? "Usa el número de teléfono del perfil comercial"
                      : "Use the phone number from Store profile"
                  }
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
                />
              </label>
            </div>
          </article>

          <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                  {isEs ? "Métodos y zonas de envío" : "Shipping methods"}
                </h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  {isEs
                    ? "Agrega, edita o elimina métodos con envío gratis, tarifa fija o recogida local."
                    : "Add, edit, or delete shipping methods with free shipping, flat rate, or customer pickup."}
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-4">
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-slate-700">
                  {isEs ? "Nombre de la zona" : "Zone name"}
                </span>
                <input
                  value={newZoneName}
                  onChange={(event) => setNewZoneName(event.target.value)}
                  placeholder={isEs ? "Nacional / Local" : "North America"}
                  className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-slate-700">
                  {isEs ? "Regiones incluidas" : "Regions"}
                </span>
                <input
                  value={newZoneRegions}
                  onChange={(event) => setNewZoneRegions(event.target.value)}
                  placeholder={isEs ? "México, Colombia, EE. UU." : "United States, Canada"}
                  className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-slate-700">
                  {isEs ? "Tipo de tarifa" : "Rate type"}
                </span>
                <select
                  value={newZoneType}
                  onChange={(event) => setNewZoneType(event.target.value as ShippingZone["rateType"])}
                  className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400 bg-white"
                >
                  <option value="free">{isEs ? "Envío gratis" : "Free shipping"}</option>
                  <option value="flat">{isEs ? "Tarifa fija" : "Flat rate"}</option>
                  <option value="pickup">{isEs ? "Recogida en tienda" : "Customer pickup"}</option>
                </select>
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-slate-700">
                  {isEs ? "Valor de la tarifa" : "Rate value"}
                </span>
                <input
                  value={newZoneValue}
                  onChange={(event) => setNewZoneValue(event.target.value)}
                  placeholder={
                    newZoneType === "pickup"
                      ? isEs
                        ? "Indicaciones para recoger"
                        : "Pickup location text"
                      : "$10.00"
                  }
                  className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
                />
              </label>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={addZone}
                className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                {isEs ? "Agregar método de envío" : "Add shipping method"}
              </button>
            </div>

            <div className="mt-5 space-y-3">
              {zones.map((zone) => (
                <div
                  key={zone.name}
                  className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <h3 className="text-sm font-semibold text-slate-950">{zone.name}</h3>
                    <p className="mt-1 text-sm text-slate-500">{zone.regions}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">
                      {zone.rateType === "free"
                        ? isEs
                          ? "Envío gratis"
                          : "Free shipping"
                        : zone.rateType === "flat"
                        ? isEs
                          ? "Tarifa fija"
                          : "Flat rate"
                        : isEs
                        ? "Recogida en tienda"
                        : "Customer pickup"}{" "}
                      • {zone.rateValue}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      aria-label={`${isEs ? "Editar" : "Edit"} ${zone.name}`}
                      title={`${isEs ? "Editar" : "Edit"} ${zone.name}`}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-300 text-slate-700 transition hover:bg-white"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteZone(zone.name)}
                      aria-label={`${isEs ? "Eliminar" : "Delete"} ${zone.name}`}
                      title={`${isEs ? "Eliminar" : "Delete"} ${zone.name}`}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-rose-200 text-rose-600 transition hover:bg-rose-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
              {isEs ? "Conexiones con transportistas" : "Carrier connections"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              {isEs
                ? "Conecta transportistas y servicios logísticos para imprimir etiquetas, tarifas en vivo y números de guía."
                : "Connect shipping carriers and fulfillment services for label creation, rates, and tracking."}
            </p>
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-950">ShipStation</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    {isEs
                      ? "Sincroniza pedidos y flujos logísticos automáticamente."
                      : "Sync orders and fulfillment workflows."}
                  </p>
                </div>
                <span
                  className={`inline-flex min-w-28 items-center justify-center rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap ${
                    shipStationConnected
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {shipStationConnected
                    ? isEs
                      ? "Conectado"
                      : "Connected"
                    : isEs
                    ? "No conectado"
                    : "Not connected"}
                </span>
              </div>
              {!shipStationAllowedByPlan ? (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50/80 p-3.5 text-sm text-amber-900">
                  <p className="font-medium">
                    {isEs ? (
                      <>
                        La integración con transportistas de ShipStation requiere una suscripción Prado Commerce{" "}
                        <strong className="font-semibold text-slate-900">Enterprise</strong>.
                      </>
                    ) : (
                      <>
                        ShipStation carrier integration requires a Prado Commerce{" "}
                        <strong className="font-semibold text-slate-900">Enterprise</strong> subscription.
                      </>
                    )}
                  </p>
                  <Link
                    href="/pricing"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800"
                  >
                    {isEs ? "Mejorar plan" : "Upgrade plan"}
                  </Link>
                </div>
              ) : (
                <>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        if (shipStationConnected) void disconnectShipStation();
                        else setShowShipStationConfig(true);
                      }}
                      disabled={isUpdatingShipStation}
                      className="rounded-full bg-[#00A9E0] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0093c2] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isUpdatingShipStation
                        ? isEs
                          ? "Procesando..."
                          : "Working..."
                        : shipStationConnected
                        ? isEs
                          ? "Desconectar"
                          : "Disconnect"
                        : isEs
                        ? "Conectar"
                        : "Connect"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowShipStationConfig((current) => !current)}
                      className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      {isEs ? "Configurar" : "Configure"}
                    </button>
                  </div>
                  {showShipStationConfig ? (
                    <div className="mt-4 grid gap-4 border-t border-slate-200 pt-4 sm:grid-cols-2">
                      <label className="flex flex-col gap-2">
                        <span className="text-sm font-medium text-slate-700">API Key</span>
                        <input
                          value={shipStationApiKey}
                          onChange={(event) => setShipStationApiKey(event.target.value)}
                          autoComplete="off"
                          placeholder={
                            shipStationConnected
                              ? isEs
                                ? "Ingresa una nueva clave"
                                : "Enter a replacement key"
                              : "ShipStation API Key"
                          }
                          className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
                        />
                      </label>
                      <label className="flex flex-col gap-2">
                        <span className="text-sm font-medium text-slate-700">API Secret</span>
                        <input
                          type="password"
                          value={shipStationApiSecret}
                          onChange={(event) => setShipStationApiSecret(event.target.value)}
                          autoComplete="new-password"
                          placeholder={
                            shipStationConnected
                              ? isEs
                                ? "Ingresa un nuevo secreto"
                                : "Enter a replacement secret"
                              : "ShipStation API Secret"
                          }
                          className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
                        />
                      </label>
                      <div className="flex justify-end sm:col-span-2">
                        <button
                          type="button"
                          onClick={() => void connectShipStation()}
                          disabled={
                            isUpdatingShipStation ||
                            !shipStationApiKey.trim() ||
                            !shipStationApiSecret.trim()
                          }
                          className="rounded-full bg-[#00A9E0] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0093c2] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isUpdatingShipStation
                            ? isEs
                              ? "Probando..."
                              : "Testing..."
                            : shipStationConnected
                            ? isEs
                              ? "Reemplazar credenciales"
                              : "Replace credentials"
                            : isEs
                            ? "Guardar credenciales"
                            : "Save credentials"}
                        </button>
                      </div>
                    </div>
                  ) : null}
                </>
              )}
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
            disabled={isSaving || !storeId}
            className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSaving
              ? isEs
                ? "Guardando..."
                : "Saving..."
              : isEs
              ? "Guardar cambios"
              : "Save changes"}
          </button>
        </div>
      </form>
    </section>
  );
}
