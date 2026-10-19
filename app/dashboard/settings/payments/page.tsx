"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLanguage } from "@/lib/i18n/language-context";

type StripeStatus = {
  stripeConnected: boolean;
  stripeConnectAccountId: string | null;
  stripeChargesEnabled: boolean;
  stripePayoutsEnabled: boolean;
  stripeDetailsSubmitted: boolean;
};

type StoreSummary = {
  id: string;
  name: string;
  offlinePaymentsEnabled?: boolean;
  stripeConnectAccountId?: string | null;
  stripeChargesEnabled?: boolean;
  stripePayoutsEnabled?: boolean;
  stripeDetailsSubmitted?: boolean;
  authNetLoginId?: string | null;
  authNetClientKey?: string | null;
  authNetEnv?: "sandbox" | "production" | string;
  authNetConfigured?: boolean;
};

export default function PaymentsPage() {
  const { language } = useLanguage();
  const isEs = language === "es";

  const [stores, setStores] = useState<StoreSummary[]>([]);
  const [store, setStore] = useState<StoreSummary | null>(null);
  const [stripeStatus, setStripeStatus] = useState<StripeStatus>({
    stripeConnected: false,
    stripeConnectAccountId: null,
    stripeChargesEnabled: false,
    stripePayoutsEnabled: false,
    stripeDetailsSubmitted: false,
  });
  const [isStripeLoading, setIsStripeLoading] = useState(true);
  const [isStripeActionPending, setIsStripeActionPending] = useState(false);
  const [isStripeExpanded, setIsStripeExpanded] = useState(false);
  const [offlinePaymentsEnabled, setOfflinePaymentsEnabled] = useState(false);
  const [authNetLoginId, setAuthNetLoginId] = useState("");
  const [authNetClientKey, setAuthNetClientKey] = useState("");
  const [authNetTransKey, setAuthNetTransKey] = useState("");
  const [authNetEnv, setAuthNetEnv] = useState<"sandbox" | "production">("sandbox");
  const [isAuthorizeNetExpanded, setIsAuthorizeNetExpanded] = useState(false);
  const [isDisconnectingAuthNet, setIsDisconnectingAuthNet] = useState(false);
  const [isSavingAuthNet, setIsSavingAuthNet] = useState(false);
  const [isSavingOfflinePayments, setIsSavingOfflinePayments] = useState(false);

  async function refreshStripeStatus(storeId: string) {
    const response = await fetch(`/api/stores/${storeId}/stripe-connect`, { cache: "no-store" });
    const payload = (await response.json()) as StripeStatus & { error?: string };

    if (!response.ok) {
      throw new Error(
        payload.error ||
          (isEs ? "No se pudo cargar el estado de Stripe." : "Unable to load Stripe status.")
      );
    }

    setStripeStatus({
      stripeConnected: payload.stripeConnected,
      stripeConnectAccountId: payload.stripeConnectAccountId,
      stripeChargesEnabled: payload.stripeChargesEnabled,
      stripePayoutsEnabled: payload.stripePayoutsEnabled,
      stripeDetailsSubmitted: payload.stripeDetailsSubmitted,
    });
  }

  async function selectStore(selected: StoreSummary) {
    setStore(selected);
    setOfflinePaymentsEnabled(Boolean(selected.offlinePaymentsEnabled));
    setAuthNetLoginId(selected.authNetLoginId ?? "");
    setAuthNetClientKey(selected.authNetClientKey ?? "");
    setAuthNetTransKey("");
    setAuthNetEnv(selected.authNetEnv === "production" ? "production" : "sandbox");

    if (selected.stripeConnectAccountId) {
      await refreshStripeStatus(selected.id);
    } else {
      setStripeStatus({
        stripeConnected: false,
        stripeConnectAccountId: null,
        stripeChargesEnabled: false,
        stripePayoutsEnabled: false,
        stripeDetailsSubmitted: false,
      });
    }
  }

  async function handleStoreChange(newId: string) {
    const chosen = stores.find((s) => s.id === newId);
    if (!chosen) return;
    setIsStripeLoading(true);
    try {
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        url.searchParams.set("storeId", newId);
        window.history.replaceState(null, "", url.toString());
      }
      await selectStore(chosen);
    } catch (err) {
      console.error("[PAYMENTS_STORE_CHANGE_ERROR]", err);
    } finally {
      setIsStripeLoading(false);
    }
  }

  useEffect(() => {
    async function loadStoreSettings() {
      setIsStripeLoading(true);

      try {
        const response = await fetch("/api/stores", { cache: "no-store" });
        const fetchedStores = (await response.json()) as StoreSummary[];

        if (!response.ok) {
          throw new Error(isEs ? "No se pudieron cargar las tiendas." : "Unable to load stores.");
        }

        const validStores = Array.isArray(fetchedStores) ? fetchedStores : [];
        setStores(validStores);

        if (validStores.length === 0) {
          setStore(null);
          return;
        }

        const urlParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
        const paramId = urlParams?.get("storeId");
        const initialStore = (paramId && validStores.find((s) => s.id === paramId)) || validStores[0];

        await selectStore(initialStore);
      } catch (error) {
        console.error("[PAYMENTS_SETTINGS_LOAD_ERROR]", error);
      } finally {
        setIsStripeLoading(false);
      }
    }

    void loadStoreSettings();
  }, [isEs]);

  async function handleStripeAction(action: "onboard" | "dashboard" | "disconnect") {
    if (!store?.id) {
      alert(isEs ? "Tienda no encontrada" : "Store not found");
      return;
    }

    setIsStripeActionPending(true);

    try {
      const response = await fetch(`/api/stores/${store.id}/stripe-connect`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action }),
      });

      const payload = (await response.json()) as { error?: string; url?: string };

      if (!response.ok) {
        throw new Error(
          payload.error ||
            (isEs ? "No se pudo completar la acción de Stripe." : "Unable to complete Stripe action.")
        );
      }

      if ((action === "onboard" || action === "dashboard") && payload.url) {
        window.location.href = payload.url;
        return;
      }

      if (action === "disconnect") {
        setStripeStatus({
          stripeConnected: false,
          stripeConnectAccountId: null,
          stripeChargesEnabled: false,
          stripePayoutsEnabled: false,
          stripeDetailsSubmitted: false,
        });
        setOfflinePaymentsEnabled(true);
      }

      await refreshStripeStatus(store.id);
    } catch (error) {
      console.error("[PAYMENTS_STRIPE_ACTION_ERROR]", error);
      alert(
        error instanceof Error
          ? error.message
          : isEs
          ? "No se pudo completar la acción de Stripe."
          : "Unable to complete Stripe action."
      );
    } finally {
      setIsStripeActionPending(false);
    }
  }

  async function patchStorePaymentsSettings(payload: Record<string, unknown>) {
    if (!store?.id) {
      throw new Error(isEs ? "Tienda no encontrada" : "Store not found");
    }

    const patchResponse = await fetch(`/api/stores/${store.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });

    const patchPayload = await patchResponse.json();
    if (!patchResponse.ok) {
      throw new Error(
        patchPayload.error ||
          (isEs
            ? "No se pudo actualizar la configuración de pagos."
            : "Unable to update payments settings.")
      );
    }
  }

  async function handleSaveAuthorizeNet() {
    setIsSavingAuthNet(true);

    try {
      await patchStorePaymentsSettings({
        authNetLoginId,
        authNetClientKey,
        authNetTransKey: authNetTransKey || undefined,
        authNetEnv,
      });

      const hasCredentials = Boolean(authNetLoginId.trim() && authNetClientKey.trim());
      const hasTransKeyInput = Boolean(authNetTransKey.trim());

      setStore((current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,
          authNetLoginId: authNetLoginId.trim() || null,
          authNetClientKey: authNetClientKey.trim() || null,
          authNetEnv,
          authNetConfigured:
            hasCredentials && (hasTransKeyInput || Boolean(current.authNetConfigured)),
        };
      });

      setAuthNetTransKey("");
      alert(
        isEs
          ? "Configuración de Authorize.net guardada."
          : "Authorize.net settings saved."
      );
    } catch (error) {
      console.error("[PAYMENTS_SETTINGS_SAVE_ERROR]", error);
      alert(
        error instanceof Error
          ? error.message
          : isEs
          ? "No se pudo guardar la configuración de Authorize.net."
          : "Unable to save payments settings."
      );
    } finally {
      setIsSavingAuthNet(false);
    }
  }

  async function handleToggleOfflinePayments() {
    const nextValue = !offlinePaymentsEnabled;
    setOfflinePaymentsEnabled(nextValue);
    setIsSavingOfflinePayments(true);

    try {
      await patchStorePaymentsSettings({ offlinePaymentsEnabled: nextValue });
      setStore((current) => (current ? { ...current, offlinePaymentsEnabled: nextValue } : current));
    } catch (error) {
      setOfflinePaymentsEnabled(!nextValue);
      console.error("[OFFLINE_PAYMENTS_TOGGLE_ERROR]", error);
      alert(
        error instanceof Error
          ? error.message
          : isEs
          ? "No se pudo cambiar el estado de pagos offline."
          : "Unable to update offline payment setting."
      );
    } finally {
      setIsSavingOfflinePayments(false);
    }
  }

  async function handleDisconnectAuthorizeNet() {
    if (!store?.id) {
      alert(isEs ? "Tienda no encontrada" : "Store not found");
      return;
    }

    setIsDisconnectingAuthNet(true);

    try {
      const response = await fetch(`/api/stores/${store.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          authNetLoginId: null,
          authNetClientKey: null,
          authNetTransKey: null,
          authNetEnv: "sandbox",
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(
          payload.error ||
            (isEs ? "No se pudo desconectar Authorize.net." : "Unable to disconnect Authorize.net.")
        );
      }

      setAuthNetLoginId("");
      setAuthNetClientKey("");
      setAuthNetTransKey("");
      setAuthNetEnv("sandbox");
      setStore((current) =>
        current
          ? {
              ...current,
              authNetConfigured: false,
              authNetLoginId: null,
              authNetClientKey: null,
              authNetEnv: "sandbox",
            }
          : current
      );
    } catch (error) {
      console.error("[PAYMENTS_AUTHNET_DISCONNECT_ERROR]", error);
      alert(
        error instanceof Error
          ? error.message
          : isEs
          ? "No se pudo desconectar Authorize.net."
          : "Unable to disconnect Authorize.net."
      );
    } finally {
      setIsDisconnectingAuthNet(false);
    }
  }

  const isStripeReady = stripeStatus.stripeChargesEnabled && stripeStatus.stripePayoutsEnabled;
  const showStripePending = stripeStatus.stripeConnectAccountId && !isStripeReady;
  const disableStripeDisconnect = isStripeActionPending || !stripeStatus.stripeConnectAccountId;

  return (
    <section className="space-y-4">
      <div className="w-full">
        <div>
          <div className="flex items-start justify-between gap-4">
            <h1 className="text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">
              {isEs ? "Pasarelas y Métodos de Pago" : "Payments"}
            </h1>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              {stores.length > 1 ? (
                <div className="flex items-center gap-2">
                  <label htmlFor="payments-store-select" className="text-xs font-semibold text-slate-600 hidden sm:inline">
                    {isEs ? "Tienda:" : "Store:"}
                  </label>
                  <select
                    id="payments-store-select"
                    value={store?.id || ""}
                    onChange={(e) => void handleStoreChange(e.target.value)}
                    className="text-xs font-semibold rounded-full border border-slate-300 bg-white px-3 py-2 text-slate-700 shadow-2xs focus:border-cyan-500 focus:outline-none"
                  >
                    {stores.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : stores.length === 1 ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                  {stores[0].name}
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
              ? "Conecta Stripe o Authorize.net para recibir pagos con tarjeta de crédito/débito y transferir los fondos a tu cuenta bancaria."
              : "Connect Stripe to accept online card payments and transfer payouts to your business."}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="space-y-5">
          {store ? (
            <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              {isEs ? "Configurando pagos para" : "Managing payments for"}{" "}
              <span className="font-semibold text-slate-900">{store.name}</span>.
            </p>
          ) : (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {isEs
                ? "Crea una tienda antes de configurar proveedores de pago."
                : "Create a store before configuring payment providers."}
            </p>
          )}

          <div className="grid gap-4">
            <article
              className={`rounded-xl border p-5 shadow-sm ${
                isStripeReady ? "border-cyan-200 bg-cyan-50" : "border-slate-200 bg-white"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-base font-semibold text-slate-950">Stripe</h2>
                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    {isEs
                      ? "Conecta tu cuenta de Stripe para procesar tarjetas en el checkout."
                      : "Connect a Stripe account to accept online card payments in checkout."}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                  <span
                    className={`inline-flex min-w-28 items-center justify-center rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap ${
                      isStripeReady
                        ? "bg-emerald-100 text-emerald-700"
                        : showStripePending
                        ? "bg-amber-100 text-amber-700"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {isStripeLoading
                      ? isEs
                        ? "Verificando"
                        : "Checking"
                      : isStripeReady
                      ? isEs
                        ? "Conectado"
                        : "Connected"
                      : showStripePending
                      ? isEs
                        ? "Pendiente"
                        : "Pending setup"
                      : isEs
                      ? "No conectado"
                      : "Not connected"}
                  </span>
                  <button
                    type="button"
                    aria-expanded={isStripeExpanded}
                    aria-controls="stripe-settings"
                    onClick={() => setIsStripeExpanded((current) => !current)}
                    className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    {isStripeExpanded
                      ? isEs
                        ? "Listo"
                        : "Done"
                      : isEs
                      ? "Gestionar"
                      : "Manage"}
                  </button>
                </div>
              </div>

              {isStripeExpanded ? (
                <div id="stripe-settings">
                  <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-600">
                    <p>
                      {isEs ? "Cobros habilitados:" : "Charges enabled:"}{" "}
                      <span className="font-semibold">
                        {stripeStatus.stripeChargesEnabled
                          ? isEs
                            ? "Sí"
                            : "Yes"
                          : "No"}
                      </span>
                    </p>
                    <p className="mt-1">
                      {isEs ? "Transferencias/Depósitos habilitados:" : "Payouts enabled:"}{" "}
                      <span className="font-semibold">
                        {stripeStatus.stripePayoutsEnabled
                          ? isEs
                            ? "Sí"
                            : "Yes"
                          : "No"}
                      </span>
                    </p>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      type="button"
                      disabled={!store || isStripeActionPending}
                      onClick={() => void handleStripeAction("onboard")}
                      className="rounded-full bg-[#635BFF] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#5247f5]"
                    >
                      {showStripePending
                        ? isEs
                          ? "Continuar activación"
                          : "Continue onboarding"
                        : isStripeReady
                        ? isEs
                          ? "Reconectar Stripe"
                          : "Reconnect Stripe"
                        : isEs
                        ? "Conectar Stripe"
                        : "Connect Stripe"}
                    </button>
                    <button
                      type="button"
                      disabled={!store || isStripeActionPending || !isStripeReady}
                      onClick={() => void handleStripeAction("dashboard")}
                      className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      {isEs ? "Abrir panel de Stripe" : "Open Stripe dashboard"}
                    </button>
                    <button
                      type="button"
                      disabled={disableStripeDisconnect}
                      onClick={() => {
                        if (
                          confirm(
                            isEs
                              ? "¿Desconectar Stripe de esta tienda?"
                              : "Disconnect Stripe from this store?"
                          )
                        ) {
                          void handleStripeAction("disconnect");
                        }
                      }}
                      className="rounded-full border border-rose-300 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isEs ? "Desconectar Stripe" : "Disconnect Stripe"}
                    </button>
                  </div>
                </div>
              ) : null}
            </article>

            <article
              className={`rounded-xl border p-5 shadow-sm ${
                store?.authNetConfigured ? "border-cyan-200 bg-cyan-50" : "border-slate-200 bg-white"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-base font-semibold text-slate-950">Authorize.net</h2>
                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    {isEs
                      ? "Usa tokenización Accept.js para que Prado Commerce nunca reciba números de tarjeta sin cifrar."
                      : "Use Accept.js tokenization so Prado Commerce never receives raw card numbers."}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                  <span
                    className={`inline-flex min-w-28 items-center justify-center rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap ${
                      store?.authNetConfigured
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {store?.authNetConfigured
                      ? isEs
                        ? "Configurado"
                        : "Configured"
                      : isEs
                      ? "No conectado"
                      : "Not connected"}
                  </span>
                  <button
                    type="button"
                    aria-expanded={isAuthorizeNetExpanded}
                    aria-controls="authorize-net-settings"
                    onClick={() => setIsAuthorizeNetExpanded((current) => !current)}
                    className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    {isAuthorizeNetExpanded
                      ? isEs
                        ? "Listo"
                        : "Done"
                      : isEs
                      ? "Gestionar"
                      : "Manage"}
                  </button>
                </div>
              </div>

              {isAuthorizeNetExpanded ? (
                <div id="authorize-net-settings">
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <label className="flex flex-col gap-2">
                      <span className="text-sm font-medium text-slate-700">API Login ID</span>
                      <input
                        value={authNetLoginId}
                        onChange={(event) => setAuthNetLoginId(event.target.value)}
                        placeholder="5KP3u95bQpv"
                        className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                      />
                    </label>

                    <label className="flex flex-col gap-2">
                      <span className="text-sm font-medium text-slate-700">Public Client Key</span>
                      <input
                        value={authNetClientKey}
                        onChange={(event) => setAuthNetClientKey(event.target.value)}
                        placeholder="1234567890abcdef1234567890abcdef"
                        className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                      />
                    </label>

                    <label className="flex flex-col gap-2 md:col-span-2">
                      <span className="text-sm font-medium text-slate-700">
                        {isEs ? "Clave de Transacción (Transaction Key)" : "Transaction Key"}
                      </span>
                      <input
                        type="password"
                        value={authNetTransKey}
                        onChange={(event) => setAuthNetTransKey(event.target.value)}
                        placeholder={
                          store?.authNetConfigured
                            ? isEs
                              ? "Dejar en blanco para mantener la clave actual"
                              : "Leave blank to keep the current key"
                            : isEs
                            ? "Ingresar clave de transacción"
                            : "Enter transaction key"
                        }
                        className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                      />
                    </label>

                    <label className="flex flex-col gap-2 md:col-span-2">
                      <span className="text-sm font-medium text-slate-700">
                        {isEs ? "Entorno" : "Environment"}
                      </span>
                      <select
                        value={authNetEnv}
                        onChange={(event) =>
                          setAuthNetEnv(
                            event.target.value === "production" ? "production" : "sandbox"
                          )
                        }
                        className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                      >
                        <option value="sandbox">
                          {isEs ? "Sandbox (Pruebas)" : "Sandbox (testing)"}
                        </option>
                        <option value="production">
                          {isEs ? "Producción (En vivo)" : "Production (live)"}
                        </option>
                      </select>
                    </label>
                  </div>

                  <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
                    <p className="font-semibold text-slate-900">
                      {isEs ? "Cómo funciona" : "How this works"}
                    </p>
                    <ul className="mt-2 space-y-2 leading-6">
                      <li>
                        {isEs
                          ? "• Los clientes ingresan sus datos y Accept.js los tokeniza de forma segura en el navegador."
                          : "• Buyers enter card details in the storefront, and Accept.js tokenizes them in the browser."}
                      </li>
                      <li>
                        {isEs
                          ? "• Prado Commerce únicamente procesa el token de un solo uso con tu pasarela bancaria."
                          : "• Prado Commerce receives only the one-time opaque token and routes the charge through your gateway credentials."}
                      </li>
                      <li>
                        {isEs
                          ? "• Si Stripe también está conectado, Stripe tiene prioridad en el checkout online."
                          : "• If Stripe is also connected, Stripe remains the preferred online card provider for now."}
                      </li>
                    </ul>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      type="button"
                      disabled={!store || isSavingAuthNet}
                      onClick={() => void handleSaveAuthorizeNet()}
                      className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isSavingAuthNet
                        ? isEs
                          ? "Guardando..."
                          : "Saving..."
                        : isEs
                        ? "Guardar Authorize.net"
                        : "Save Authorize.net"}
                    </button>
                    <button
                      type="button"
                      disabled={!store?.authNetConfigured || isDisconnectingAuthNet}
                      onClick={() => {
                        if (
                          confirm(
                            isEs
                              ? "¿Desconectar Authorize.net de esta tienda?"
                              : "Disconnect Authorize.net from this store?"
                          )
                        ) {
                          void handleDisconnectAuthorizeNet();
                        }
                      }}
                      className="rounded-full border border-rose-300 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isEs ? "Desconectar Authorize.net" : "Disconnect Authorize.net"}
                    </button>
                  </div>
                </div>
              ) : null}
            </article>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-900">
                  {isEs ? "Pagos fuera de línea (Offline)" : "Offline payments"}
                </label>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  {isEs
                    ? "Permite a los clientes hacer pedidos y pagar contra entrega, transferencia bancaria o en efectivo."
                    : "Allow customers to place orders and pay later through cash, bank transfer, or another manual method."}
                </p>
              </div>
              <button
                type="button"
                disabled={!store || isSavingOfflinePayments}
                onClick={() => void handleToggleOfflinePayments()}
                role="switch"
                aria-checked={offlinePaymentsEnabled}
                aria-label={isEs ? "Alternar pagos offline" : "Toggle offline payments"}
                className="inline-flex items-center gap-2 rounded-full text-sm font-semibold text-slate-700 transition disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span
                  className={`relative inline-flex h-7 w-12 items-center rounded-full border transition ${
                    offlinePaymentsEnabled
                      ? "border-cyan-500 bg-cyan-500"
                      : "border-slate-300 bg-slate-200"
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                      offlinePaymentsEnabled ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </span>
                <span>
                  {isSavingOfflinePayments
                    ? isEs
                      ? "Guardando..."
                      : "Saving..."
                    : offlinePaymentsEnabled
                    ? isEs
                      ? "Activado"
                      : "On"
                    : isEs
                    ? "Desactivado"
                    : "Off"}
                </span>
              </button>
            </div>

            <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-sm font-semibold text-slate-900">
                {isEs ? "Cómo funciona" : "How it works"}
              </p>
              <ul className="mt-2 space-y-2 text-sm leading-6 text-slate-600">
                <li>
                  {isEs
                    ? "• Los clientes seleccionan pago manual/offline al pagar."
                    : "• Customers can choose offline payment at checkout."}
                </li>
                <li>
                  {isEs
                    ? "• Puedes marcar el pago como recibido desde el gestor de pedidos."
                    : "• You can confirm payment manually from the order dashboard."}
                </li>
                <li>
                  {isEs
                    ? "• Muestra instrucciones para depósitos, SINPE, transferencias bancarias o cobro contra entrega."
                    : "• Add notes for pickup, invoicing, or bank-transfer instructions."}
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
