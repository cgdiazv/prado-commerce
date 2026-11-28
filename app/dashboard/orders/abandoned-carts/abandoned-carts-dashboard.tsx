"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRightLeft,
  Eye,
  Loader2,
  Mail,
  MoreVertical,
  Search,
  ShoppingCart,
  Store,
  Trash2,
  X,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n/language-context";

export type StoreOption = {
  id: string;
  name: string;
  slug?: string;
  currency: string;
};

export type AbandonedCartItem = {
  id: string;
  variantId: string;
  title: string;
  sku: string | null;
  quantity: number;
  price: string;
  lineTotal: string;
};

export type AbandonedCartRecord = {
  id: string;
  token: string;
  storeId: string;
  storeName: string;
  storeSlug: string;
  customerId: string | null;
  customerEmail: string | null;
  customerName: string | null;
  customerPhone: string | null;
  currency: string;
  itemsCount: number;
  subtotal: string;
  status: "ABANDONED" | "ACTIVE";
  idleMinutes: number;
  items: AbandonedCartItem[];
  createdAt: string;
  updatedAt: string;
};

type Props = {
  initialStores: StoreOption[];
  initialCarts: AbandonedCartRecord[];
  selectedStoreId: string | null;
  setupError?: string | null;
};

function formatShortDate(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
}

function formatIdleDuration(minutes: number, isEs: boolean): string {
  if (minutes < 1) return isEs ? "Hace un momento" : "Just now";
  if (minutes < 60) return isEs ? `Hace ${minutes} min` : `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return isEs ? `Hace ${hours} h` : `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return isEs ? `Hace ${days} d` : `${days}d ago`;
}

export function AbandonedCartsDashboard({
  initialStores,
  initialCarts,
  selectedStoreId,
  setupError = null,
}: Props) {
  const router = useRouter();
  const { language } = useLanguage();
  const isEs = language === "es";

  const [carts, setCarts] = useState<AbandonedCartRecord[]>(initialCarts);
  const [activeStoreId, setActiveStoreId] = useState<string>(selectedStoreId ?? "ALL");
  const [search, setSearch] = useState("");
  const [filterTab, setFilterTab] = useState<"ALL" | "WITH_EMAIL" | "GUEST">("ALL");
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [workingCartId, setWorkingCartId] = useState<string | null>(null);
  const [openMenuCartId, setOpenMenuCartId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);

  // Modals
  const [detailCart, setDetailCart] = useState<AbandonedCartRecord | null>(null);
  const [emailModalCart, setEmailModalCart] = useState<AbandonedCartRecord | null>(null);
  const [emailRecipientInput, setEmailRecipientInput] = useState("");
  const [emailCustomerNameInput, setEmailCustomerNameInput] = useState("");
  const [emailCustomNoteInput, setEmailCustomNoteInput] = useState("");

  const [convertModalCart, setConvertModalCart] = useState<AbandonedCartRecord | null>(null);
  const [convertEmailInput, setConvertEmailInput] = useState("");
  const [convertNameInput, setConvertNameInput] = useState("");

  const defaultCurrency = useMemo(() => {
    if (activeStoreId !== "ALL") {
      const found = initialStores.find((s) => s.id === activeStoreId);
      if (found?.currency) return found.currency;
    }
    return initialStores[0]?.currency || "USD";
  }, [activeStoreId, initialStores]);

  const formatMoney = (amount: number | string, currency = defaultCurrency) => {
    const num = typeof amount === "number" ? amount : Number(amount) || 0;
    return new Intl.NumberFormat(isEs ? "es-ES" : "en-US", {
      style: "currency",
      currency: currency || "USD",
    }).format(num);
  };

  const visibleCarts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return carts.filter((cart) => {
      if (activeStoreId !== "ALL" && cart.storeId !== activeStoreId) return false;
      if (filterTab === "WITH_EMAIL" && !cart.customerEmail) return false;
      if (filterTab === "GUEST" && cart.customerEmail) return false;
      if (!query) return true;

      const itemNames = cart.items.map((i) => `${i.title} ${i.sku ?? ""}`).join(" ");
      return [
        cart.id,
        cart.token,
        cart.customerName ?? "",
        cart.customerEmail ?? "",
        cart.storeName,
        itemNames,
      ].some((val) => val.toLowerCase().includes(query));
    });
  }, [carts, activeStoreId, filterTab, search]);

  const stats = useMemo(() => {
    let recoverableAmount = 0;
    let abandonedCount = 0;
    let activeCount = 0;
    let withEmailCount = 0;

    for (const c of visibleCarts) {
      recoverableAmount += Number(c.subtotal) || 0;
      if (c.status === "ABANDONED") abandonedCount += 1;
      else activeCount += 1;
      if (c.customerEmail) withEmailCount += 1;
    }

    return {
      totalCarts: visibleCarts.length,
      abandonedCount,
      activeCount,
      recoverableAmount,
      withEmailCount,
    };
  }, [visibleCarts]);

  function openEmailRecoveryModal(cart: AbandonedCartRecord) {
    setEmailModalCart(cart);
    setEmailRecipientInput(cart.customerEmail ?? "");
    setEmailCustomerNameInput(cart.customerName ?? "");
    setEmailCustomNoteInput("");
    setError(null);
  }

  function openConvertModal(cart: AbandonedCartRecord) {
    setConvertModalCart(cart);
    setConvertEmailInput(cart.customerEmail ?? "");
    setConvertNameInput(cart.customerName ?? "");
    setError(null);
  }

  async function handleSendRecoveryEmail() {
    if (!emailModalCart) return;
    if (!emailRecipientInput.trim() || !emailRecipientInput.includes("@")) {
      setError(
        isEs
          ? "Ingresa un correo electrónico válido para enviar el recordatorio."
          : "Please enter a valid email address to send the recovery reminder.",
      );
      return;
    }

    setWorkingCartId(emailModalCart.id);
    setError(null);
    setStatusMessage(null);

    try {
      const response = await fetch(`/api/abandoned-carts/${emailModalCart.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send_recovery_email",
          email: emailRecipientInput.trim(),
          customerName: emailCustomerNameInput.trim() || undefined,
          customMessage: emailCustomNoteInput.trim() || undefined,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(
          payload.error ||
            (isEs ? "No se pudo enviar el correo" : "Could not send recovery email"),
        );
      }

      setEmailModalCart(null);
      setStatusMessage(
        isEs
          ? `¡Correo de recuperación de carrito enviado a ${payload.sentTo}!`
          : `Cart recovery email sent to ${payload.sentTo}!`,
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : isEs
            ? "Error al enviar el correo"
            : "Failed to send recovery email",
      );
    } finally {
      setWorkingCartId(null);
    }
  }

  async function handleConvertCartToOrder() {
    if (!convertModalCart) return;
    setWorkingCartId(convertModalCart.id);
    setError(null);
    setStatusMessage(null);

    try {
      const response = await fetch(`/api/abandoned-carts/${convertModalCart.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "convert_to_order",
          email: convertEmailInput.trim() || undefined,
          customerName: convertNameInput.trim() || undefined,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(
          payload.error ||
            (isEs ? "No se pudo convertir el carrito en pedido" : "Could not convert cart to order"),
        );
      }

      setCarts((current) => current.filter((c) => c.id !== convertModalCart.id));
      setConvertModalCart(null);
      router.push(`/dashboard/orders/${payload.orderId}`);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : isEs
            ? "Error al convertir carrito en pedido"
            : "Failed to convert cart to order",
      );
    } finally {
      setWorkingCartId(null);
    }
  }

  async function handleDeleteCart(cart: AbandonedCartRecord) {
    const confirmed = window.confirm(
      isEs
        ? "¿Eliminar este carrito abandonado de la base de datos?"
        : "Delete this abandoned cart from the database?",
    );
    if (!confirmed) return;

    setWorkingCartId(cart.id);
    setError(null);
    try {
      const response = await fetch(`/api/abandoned-carts/${cart.id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || "Could not delete cart");
      }
      setCarts((current) => current.filter((c) => c.id !== cart.id));
      if (detailCart?.id === cart.id) setDetailCart(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete cart");
    } finally {
      setWorkingCartId(null);
    }
  }

  return (
    <section className="space-y-6">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {isEs ? "Carritos abandonados" : "Abandoned Carts"}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {isEs
              ? "Monitorea los carritos con productos pendientes de pago, envía recordatorios por correo o conviértelos en pedidos."
              : "Monitor shopping carts left before checkout, send recovery emails, or convert them directly into orders."}
          </p>
        </div>

        {initialStores.length > 1 ? (
          <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-xs">
            <Store className="h-3.5 w-3.5 text-slate-400" />
            <select
              value={activeStoreId}
              onChange={(e) => setActiveStoreId(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-800 outline-none"
            >
              <option value="ALL">
                {isEs ? "Todas las tiendas" : "All Stores"}
              </option>
              {initialStores.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </header>

      {setupError ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {setupError}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {statusMessage ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {statusMessage}
        </div>
      ) : null}

      {/* Filters & Search */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              isEs
                ? "Buscar por cliente, correo, producto, SKU o token de carrito..."
                : "Search by customer, email, product, SKU, or cart token..."
            }
            className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-sm text-slate-900 outline-none focus:border-slate-400"
          />
        </div>

        <div className="inline-flex items-center rounded-xl border border-slate-200 bg-slate-50 p-1">
          {(
            [
              { id: "ALL", label: isEs ? "Todos" : "All" },
              {
                id: "WITH_EMAIL",
                label: isEs ? "Con cliente" : "With customer",
              },
              { id: "GUEST", label: isEs ? "Visitantes" : "Guests" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterTab(tab.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                filterTab === tab.id
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Abandoned Carts Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
        {visibleCarts.length === 0 ? (
          <div className="p-12 text-center">
            <ShoppingCart className="mx-auto h-10 w-10 text-slate-300" />
            <h3 className="mt-3 text-sm font-semibold text-slate-900">
              {isEs
                ? "No hay carritos abandonados"
                : "No abandoned carts found"}
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              {isEs
                ? "Cuando un comprador agregue artículos al carrito en la tienda y no complete el pago, aparecerá aquí automáticamente."
                : "When a shopper adds items to their cart on your storefront without completing checkout, it will appear here automatically."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
              <thead className="bg-slate-100/80 text-xs font-semibold text-slate-600">
                <tr>
                  <th className="px-3.5 py-2.5">{isEs ? "Fecha" : "Date"}</th>
                  <th className="px-3.5 py-2.5">{isEs ? "Carrito" : "Cart"}</th>
                  <th className="px-3.5 py-2.5">{isEs ? "Cliente" : "Customer"}</th>
                  <th className="px-3.5 py-2.5">{isEs ? "Estado" : "Status"}</th>
                  <th className="px-3.5 py-2.5">{isEs ? "Artículos" : "Items"}</th>
                  <th className="px-3.5 py-2.5 text-right">{isEs ? "Valor" : "Value"}</th>
                  <th className="px-3.5 py-2.5 text-right">{isEs ? "Acciones" : "Actions"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleCarts.map((cart) => {
                  const isWorking = workingCartId === cart.id;
                  return (
                    <tr key={cart.id} className="hover:bg-slate-50/80 transition">
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="text-slate-700">
                          {formatShortDate(cart.updatedAt)}
                        </div>
                        <div className="text-xs text-slate-400">
                          {formatIdleDuration(cart.idleMinutes, isEs)}
                        </div>
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="font-bold text-slate-900">
                          #{cart.token.slice(-6).toUpperCase()}
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        {cart.customerName || cart.customerEmail ? (
                          <div>
                            <div className="font-medium text-slate-900">
                              {cart.customerName || cart.customerEmail}
                            </div>
                            {cart.customerName && cart.customerEmail ? (
                              <div className="text-xs text-slate-500">
                                {cart.customerEmail}
                              </div>
                            ) : null}
                          </div>
                        ) : (
                          <span className="text-xs italic text-slate-500">
                            {isEs ? "Visitante (sin correo)" : "Guest shopper"}
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium ${
                            cart.status === "ABANDONED"
                              ? "border-amber-200/80 bg-amber-100/90 text-amber-900"
                              : "border-slate-200 bg-slate-100 text-slate-700"
                          }`}
                        >
                          {cart.status === "ABANDONED"
                            ? isEs
                              ? "Abandonado"
                              : "Abandoned"
                            : isEs
                              ? "Activo"
                              : "Active"}
                        </span>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="font-medium text-slate-800">
                          {cart.itemsCount}{" "}
                          {isEs
                            ? cart.itemsCount === 1
                              ? "artículo"
                              : "artículos"
                            : cart.itemsCount === 1
                              ? "item"
                              : "items"}
                        </div>
                        <div className="text-xs text-slate-500 truncate max-w-[240px]">
                          {cart.items
                            .map((i) => `${i.quantity}× ${i.title}`)
                            .join(", ")}
                        </div>
                      </td>

                      <td className="px-4 py-3.5 text-right whitespace-nowrap font-bold text-slate-900">
                        {formatMoney(cart.subtotal, cart.currency)}
                      </td>

                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={isWorking}
                            onClick={() => openEmailRecoveryModal(cart)}
                            title={
                              isEs
                                ? "Enviar correo de recuperación"
                                : "Send recovery email"
                            }
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 hover:text-cyan-700 disabled:opacity-40"
                          >
                            <Mail className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            disabled={isWorking}
                            onClick={(e) => {
                              if (openMenuCartId === cart.id) {
                                setOpenMenuCartId(null);
                                setMenuPosition(null);
                              } else {
                                const rect = e.currentTarget.getBoundingClientRect();
                                setMenuPosition({
                                  top: rect.bottom + 4,
                                  left: Math.max(8, rect.right - 184),
                                });
                                setOpenMenuCartId(cart.id);
                              }
                            }}
                            title={isEs ? "Más acciones" : "More actions"}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-900 disabled:opacity-40"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Three-dots Actions Dropdown */}
      {openMenuCartId && menuPosition ? (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => {
              setOpenMenuCartId(null);
              setMenuPosition(null);
            }}
          />
          {(() => {
            const activeCart = visibleCarts.find((c) => c.id === openMenuCartId);
            if (!activeCart) return null;
            return (
              <div
                style={{ top: menuPosition.top, left: menuPosition.left }}
                className="fixed z-50 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 text-left shadow-xl"
              >
                <button
                  type="button"
                  onClick={() => {
                    setOpenMenuCartId(null);
                    setMenuPosition(null);
                    setDetailCart(activeCart);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  <Eye className="h-4 w-4 text-slate-500" />
                  {isEs ? "Ver artículos" : "View items"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOpenMenuCartId(null);
                    setMenuPosition(null);
                    openConvertModal(activeCart);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  <ArrowRightLeft className="h-4 w-4 text-cyan-600" />
                  {isEs ? "Convertir en pedido" : "Convert to order"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOpenMenuCartId(null);
                    setMenuPosition(null);
                    void handleDeleteCart(activeCart);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium text-rose-700 hover:bg-rose-50"
                >
                  <Trash2 className="h-4 w-4" />
                  {isEs ? "Eliminar carrito" : "Delete cart"}
                </button>
              </div>
            );
          })()}
        </>
      ) : null}

      {/* View Cart Details Modal */}
      {detailCart ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-xs"
          onClick={() => setDetailCart(null)}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-4">
              <div>
                <h3 className="text-lg font-bold text-slate-950">
                  {isEs ? "Carrito" : "Cart"} #{detailCart.token.slice(-6).toUpperCase()}
                </h3>
                <p className="text-xs text-slate-500">
                  {isEs ? "Última actividad:" : "Last updated:"}{" "}
                  {new Date(detailCart.updatedAt).toLocaleString(
                    isEs ? "es-ES" : "en-US",
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDetailCart(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div>
                  <span className="text-xs text-slate-500">
                    {isEs ? "Subtotal del carrito" : "Cart Subtotal"}
                  </span>
                  <p className="text-base font-bold text-slate-950">
                    {formatMoney(detailCart.subtotal, detailCart.currency)}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-slate-500">
                    {isEs ? "Cliente" : "Customer"}
                  </span>
                  <p className="font-semibold text-slate-900">
                    {detailCart.customerName ||
                      detailCart.customerEmail ||
                      (isEs ? "Visitante" : "Guest shopper")}
                  </p>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  {isEs ? "Artículos en el carrito" : "Cart Items"}
                </h4>
                <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                  {detailCart.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-3 px-4 py-2.5 text-xs"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-slate-900">
                          {item.title}
                        </p>
                        {item.sku ? (
                          <p className="text-slate-400">SKU: {item.sku}</p>
                        ) : null}
                      </div>
                      <div className="text-right whitespace-nowrap">
                        <span className="text-slate-600">
                          {item.quantity} × {formatMoney(item.price, detailCart.currency)}
                        </span>
                        <p className="font-bold text-slate-900">
                          {formatMoney(item.lineTotal, detailCart.currency)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/60 px-6 py-4">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const target = detailCart;
                    setDetailCart(null);
                    openEmailRecoveryModal(target);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <Mail className="h-3.5 w-3.5" />
                  {isEs ? "Enviar recordatorio" : "Send Recovery Email"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const target = detailCart;
                    setDetailCart(null);
                    openConvertModal(target);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-bold text-white hover:bg-slate-800"
                >
                  <ArrowRightLeft className="h-3.5 w-3.5" />
                  {isEs ? "Convertir en pedido" : "Convert to Order"}
                </button>
              </div>
              <button
                type="button"
                onClick={() => setDetailCart(null)}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                {isEs ? "Cerrar" : "Close"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Send Recovery Email Modal */}
      {emailModalCart ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-xs"
          onClick={() => {
            if (!workingCartId) setEmailModalCart(null);
          }}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-4">
              <div>
                <h3 className="text-base font-bold text-slate-950">
                  {isEs
                    ? "Enviar correo de recuperación"
                    : "Send Cart Recovery Email"}
                </h3>
                <p className="text-xs text-slate-500">
                  {isEs
                    ? `Carrito #${emailModalCart.token.slice(-6).toUpperCase()} • ${formatMoney(emailModalCart.subtotal, emailModalCart.currency)}`
                    : `Cart #${emailModalCart.token.slice(-6).toUpperCase()} • ${formatMoney(emailModalCart.subtotal, emailModalCart.currency)}`}
                </p>
              </div>
              <button
                type="button"
                disabled={Boolean(workingCartId)}
                onClick={() => setEmailModalCart(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  {isEs ? "Correo del cliente" : "Customer Email"}
                </label>
                <input
                  type="email"
                  value={emailRecipientInput}
                  onChange={(e) => setEmailRecipientInput(e.target.value)}
                  placeholder="customer@example.com"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  {isEs ? "Nombre del cliente (opcional)" : "Customer Name (optional)"}
                </label>
                <input
                  type="text"
                  value={emailCustomerNameInput}
                  onChange={(e) => setEmailCustomerNameInput(e.target.value)}
                  placeholder={isEs ? "Nombre..." : "Name..."}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  {isEs ? "Mensaje personalizado (opcional)" : "Custom Note (optional)"}
                </label>
                <textarea
                  rows={3}
                  value={emailCustomNoteInput}
                  onChange={(e) => setEmailCustomNoteInput(e.target.value)}
                  placeholder={
                    isEs
                      ? "Ej. Guardamos tus artículos en el carrito si deseas completar tu compra."
                      : "e.g. We saved your items in your cart whenever you're ready to complete your order."
                  }
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50/60 px-6 py-4">
              <button
                type="button"
                disabled={Boolean(workingCartId)}
                onClick={() => setEmailModalCart(null)}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                {isEs ? "Cancelar" : "Cancel"}
              </button>
              <button
                type="button"
                disabled={Boolean(workingCartId)}
                onClick={() => void handleSendRecoveryEmail()}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-50"
              >
                {workingCartId ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Mail className="h-3.5 w-3.5" />
                )}
                {isEs ? "Enviar correo" : "Send Email"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Convert to Order Modal */}
      {convertModalCart ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-xs"
          onClick={() => {
            if (!workingCartId) setConvertModalCart(null);
          }}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-4">
              <div>
                <h3 className="text-base font-bold text-slate-950">
                  {isEs ? "Convertir carrito en pedido" : "Convert Cart to Order"}
                </h3>
                <p className="text-xs text-slate-500">
                  {isEs
                    ? `${convertModalCart.itemsCount} artículos • ${formatMoney(convertModalCart.subtotal, convertModalCart.currency)}`
                    : `${convertModalCart.itemsCount} items • ${formatMoney(convertModalCart.subtotal, convertModalCart.currency)}`}
                </p>
              </div>
              <button
                type="button"
                disabled={Boolean(workingCartId)}
                onClick={() => setConvertModalCart(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <p className="text-xs text-slate-600">
                {isEs
                  ? "Se creará un nuevo pedido en la base de datos con los artículos de este carrito y se descontará el inventario correspondiente."
                  : "This will create a new order in the database with all items from this cart and deduct the corresponding inventory."}
              </p>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  {isEs ? "Correo del cliente" : "Customer Email"}
                </label>
                <input
                  type="email"
                  value={convertEmailInput}
                  onChange={(e) => setConvertEmailInput(e.target.value)}
                  placeholder="customer@example.com"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  {isEs ? "Nombre del cliente (opcional)" : "Customer Name (optional)"}
                </label>
                <input
                  type="text"
                  value={convertNameInput}
                  onChange={(e) => setConvertNameInput(e.target.value)}
                  placeholder={isEs ? "Nombre..." : "Name..."}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50/60 px-6 py-4">
              <button
                type="button"
                disabled={Boolean(workingCartId)}
                onClick={() => setConvertModalCart(null)}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                {isEs ? "Cancelar" : "Cancel"}
              </button>
              <button
                type="button"
                disabled={Boolean(workingCartId)}
                onClick={() => void handleConvertCartToOrder()}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-50"
              >
                {workingCartId ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <ArrowRightLeft className="h-3.5 w-3.5" />
                )}
                {isEs ? "Crear pedido" : "Create Order"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
