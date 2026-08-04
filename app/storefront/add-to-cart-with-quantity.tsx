"use client";

import { useState } from "react";

type AddToCartWithQuantityProps = {
  variantId: string;
};

export default function AddToCartWithQuantity({ variantId }: AddToCartWithQuantityProps) {
  const [quantity, setQuantity] = useState(1);

  function decreaseQuantity() {
    setQuantity((current) => Math.max(1, current - 1));
  }

  function increaseQuantity() {
    setQuantity((current) => current + 1);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="inline-flex items-center rounded-full border border-slate-300 bg-white">
        <button
          type="button"
          onClick={decreaseQuantity}
          className="h-9 w-9 rounded-l-full text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          aria-label="Decrease quantity"
        >
          -
        </button>
        <span className="min-w-8 px-2 text-center text-sm font-semibold text-slate-900">{quantity}</span>
        <button
          type="button"
          onClick={increaseQuantity}
          className="h-9 w-9 rounded-r-full text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          aria-label="Increase quantity"
        >
          +
        </button>
      </div>

      <button
        type="button"
        data-prado-add={variantId}
        data-prado-add-to-cart={variantId}
        data-prado-qty={quantity}
        className="w-full rounded-full bg-[var(--store-main-color)] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--store-main-color-hover)]"
      >
        Add to cart
      </button>
    </div>
  );
}
