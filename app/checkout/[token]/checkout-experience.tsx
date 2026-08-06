"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import CheckoutForm from "./checkout-form";

type CheckoutItem = {
  variantId: string;
  title: string;
  price: number;
  quantity: number;
};

type CartSnapshot = {
  subtotal: number;
  items: Array<{
    variantId: string;
    title: string;
    price: number;
    quantity: number;
  }>;
};

type CheckoutExperienceProps = {
  cartId: string;
  currency: string;
  storeId: string;
  storeName: string;
  basePath: string;
  offlinePaymentsEnabled: boolean;
  stripeOnlinePaymentsEnabled: boolean;
  onlinePaymentProvider: "stripe" | "authorize_net" | null;
  authorizeNetConfig: {
    loginId: string;
    clientKey: string;
    environment: "sandbox" | "production";
  } | null;
  initialItems: CheckoutItem[];
};

function calculateSubtotal(items: CheckoutItem[]) {
  return Number(items.reduce((sum, item) => sum + item.price * item.quantity, 0).toFixed(2));
}

export default function CheckoutExperience({
  cartId,
  currency,
  storeId,
  storeName,
  basePath,
  offlinePaymentsEnabled,
  stripeOnlinePaymentsEnabled,
  onlinePaymentProvider,
  authorizeNetConfig,
  initialItems,
}: CheckoutExperienceProps) {
  const router = useRouter();
  const [items, setItems] = useState<CheckoutItem[]>(initialItems);
  const [subtotal, setSubtotal] = useState<number>(() => calculateSubtotal(initialItems));
  const [isUpdatingCart, setIsUpdatingCart] = useState(false);
  const [cartStatus, setCartStatus] = useState<string | null>(null);

  const formatter = useMemo(
    () =>
      new Intl.NumberFormat("en-US", {
        style: "currency",
        currency,
      }),
    [currency],
  );

  function applySnapshot(snapshot: CartSnapshot) {
    const nextItems = snapshot.items.map((item) => ({
      variantId: item.variantId,
      title: item.title,
      price: Number(item.price),
      quantity: Number(item.quantity),
    }));

    setItems(nextItems);
    setSubtotal(Number(snapshot.subtotal || 0));

    if (nextItems.length === 0) {
      router.push(basePath || "/");
    }
  }

  async function updateItemQuantity(variantId: string, quantity: number) {
    setIsUpdatingCart(true);
    setCartStatus(null);

    try {
      const response = await fetch("/api/v1/cart/items", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cartId,
          variantId,
          quantity,
        }),
      });

      const payload = (await response.json()) as CartSnapshot & { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || "Failed to update cart item.");
      }

      applySnapshot(payload);
    } catch (error) {
      setCartStatus(error instanceof Error ? error.message : "Failed to update cart item.");
    } finally {
      setIsUpdatingCart(false);
    }
  }

  async function removeItem(variantId: string) {
    setIsUpdatingCart(true);
    setCartStatus(null);

    try {
      const params = new URLSearchParams({ cartId, variantId });
      const response = await fetch(`/api/v1/cart/items?${params.toString()}`, {
        method: "DELETE",
      });

      const payload = (await response.json()) as CartSnapshot & { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || "Failed to remove cart item.");
      }

      applySnapshot(payload);
    } catch (error) {
      setCartStatus(error instanceof Error ? error.message : "Failed to remove cart item.");
    } finally {
      setIsUpdatingCart(false);
    }
  }

  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
      <CheckoutForm
        cartId={cartId}
        currency={currency}
        subtotal={subtotal}
        storeId={storeId}
        offlinePaymentsEnabled={offlinePaymentsEnabled}
        stripeOnlinePaymentsEnabled={stripeOnlinePaymentsEnabled}
        onlinePaymentProvider={onlinePaymentProvider}
        authorizeNetConfig={authorizeNetConfig}
        isCartEmpty={items.length === 0}
      />

      <div className="h-fit rounded-2xl border border-slate-200 bg-slate-50 p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-base font-semibold text-slate-900">{storeName}</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Subtotal</p>
            <p className="text-xl font-bold text-slate-900">{formatter.format(subtotal)}</p>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          {items.length === 0 ? (
            <p className="text-sm text-slate-500">Your cart is empty.</p>
          ) : (
            items.map((item) => (
              <div key={item.variantId} className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium text-slate-900">{item.title}</p>
                    <p className="text-sm text-slate-500">{formatter.format(item.price)} each</p>
                  </div>
                  <p className="text-sm font-semibold text-slate-900">
                    {formatter.format(item.price * item.quantity)}
                  </p>
                </div>

                <div className="mt-3 flex items-center justify-between gap-3">
                  <div className="inline-flex items-center rounded-full border border-slate-300 bg-white">
                    <button
                      type="button"
                      onClick={() => void updateItemQuantity(item.variantId, Math.max(0, item.quantity - 1))}
                      disabled={isUpdatingCart}
                      className="h-8 w-8 rounded-l-full text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                      aria-label={`Decrease quantity for ${item.title}`}
                    >
                      -
                    </button>
                    <span className="min-w-8 px-2 text-center text-sm font-semibold text-slate-900">{item.quantity}</span>
                    <button
                      type="button"
                      onClick={() => void updateItemQuantity(item.variantId, item.quantity + 1)}
                      disabled={isUpdatingCart}
                      className="h-8 w-8 rounded-r-full text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                      aria-label={`Increase quantity for ${item.title}`}
                    >
                      +
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => void removeItem(item.variantId)}
                    disabled={isUpdatingCart}
                    className="rounded-full border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {cartStatus ? <p className="mt-4 text-sm text-rose-600">{cartStatus}</p> : null}
      </div>
    </div>
  );
}
