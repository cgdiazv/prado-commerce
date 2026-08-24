"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2, Search, Package } from "lucide-react";

type Store = {
  id: string;
  name: string;
  currency: string;
};

type Vendor = {
  id: string;
  name: string;
  storeId: string;
  contactEmail: string | null;
};

type ProductVariant = {
  id: string;
  title: string;
  sku: string | null;
  price: string;
  inventory: number;
};

type Product = {
  id: string;
  storeId: string;
  title: string;
  images: string[];
  variants: ProductVariant[];
};

type POLineItem = {
  id: string; // temp client key
  productId: string;
  variantId: string;
  title: string;
  sku: string;
  qtyOrdered: number;
  unitCost: number;
};

type POFormClientProps = {
  initialStores: Store[];
  initialVendors: Vendor[];
  initialProducts: Product[];
};

export default function POFormClient({ initialStores, initialVendors, initialProducts }: POFormClientProps) {
  const router = useRouter();

  const [selectedStoreId, setSelectedStoreId] = useState<string>(initialStores[0]?.id || "");
  const [selectedVendorId, setSelectedVendorId] = useState<string>("");
  const [poNumber, setPoNumber] = useState<string>("");
  const [expectedDate, setExpectedDate] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [tax, setTax] = useState<number>(0);
  const [shipping, setShipping] = useState<number>(0);

  const [lineItems, setLineItems] = useState<POLineItem[]>([]);
  const [productSearch, setProductSearch] = useState<string>("");
  const [isProductPickerOpen, setIsProductPickerOpen] = useState<boolean>(false);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const activeStore = initialStores.find((s) => s.id === selectedStoreId) || initialStores[0];
  const availableVendors = initialVendors.filter((v) => v.storeId === selectedStoreId);
  const availableProducts = initialProducts.filter((p) => p.storeId === selectedStoreId);

  const filteredVariants = availableProducts.flatMap((product) =>
    product.variants
      .filter((variant) => {
        if (!productSearch.trim()) return true;
        const q = productSearch.toLowerCase();
        return (
          product.title.toLowerCase().includes(q) ||
          variant.title.toLowerCase().includes(q) ||
          (variant.sku && variant.sku.toLowerCase().includes(q))
        );
      })
      .map((variant) => ({
        product,
        variant,
      }))
  );

  const handleAddVariant = (product: Product, variant: ProductVariant) => {
    const existingIndex = lineItems.findIndex((i) => i.variantId === variant.id);
    const itemTitle = variant.title.toLowerCase() === "default title" || variant.title === product.title
      ? product.title
      : `${product.title} - ${variant.title}`;

    if (existingIndex >= 0) {
      setLineItems((prev) =>
        prev.map((item, idx) => (idx === existingIndex ? { ...item, qtyOrdered: item.qtyOrdered + 1 } : item))
      );
    } else {
      setLineItems((prev) => [
        ...prev,
        {
          id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          productId: product.id,
          variantId: variant.id,
          title: itemTitle,
          sku: variant.sku || "",
          qtyOrdered: 1,
          unitCost: Math.round((Number(variant.price) * 0.5) * 100) / 100 || 10, // Default wholesale cost estimate
        },
      ]);
    }

    setIsProductPickerOpen(false);
    setProductSearch("");
  };

  const handleRemoveLineItem = (id: string) => {
    setLineItems((prev) => prev.filter((i) => i.id !== id));
  };

  const handleUpdateItem = (id: string, field: "qtyOrdered" | "unitCost", val: number) => {
    setLineItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: val } : item))
    );
  };

  const subtotal = lineItems.reduce((acc, item) => acc + item.qtyOrdered * item.unitCost, 0);
  const total = subtotal + Number(tax || 0) + Number(shipping || 0);

  const currencyFormatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: activeStore?.currency || "USD",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVendorId) {
      setError("Please select a vendor for this purchase order.");
      return;
    }

    if (lineItems.length === 0) {
      setError("Please add at least one product SKU to the purchase order.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/procurement/purchase-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId: selectedStoreId,
          vendorId: selectedVendorId,
          poNumber: poNumber.trim() || undefined,
          expectedDate: expectedDate || null,
          notes: notes.trim() || null,
          tax: Number(tax) || 0,
          shipping: Number(shipping) || 0,
          items: lineItems.map((item) => ({
            productId: item.productId,
            variantId: item.variantId,
            title: item.title,
            sku: item.sku || null,
            qtyOrdered: item.qtyOrdered,
            unitCost: item.unitCost,
          })),
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to create purchase order.");

      router.push(`/dashboard/procurement/purchase-orders/${data.purchaseOrder.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="min-w-0 max-w-5xl space-y-6">
      {/* Top Header & Breadcrumbs */}
      <div>
        <Link
          href="/dashboard/procurement/purchase-orders"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Purchase Orders
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">New Purchase Order</h1>
        <p className="mt-1 text-sm text-slate-500">
          Specify vendor, order lines, expected arrival date, and wholesale unit costs.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Vendor & Store Selection */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500 border-b border-slate-100 pb-3">
            1. Supplier & Store Details
          </h2>

          <div className="grid gap-4 sm:grid-cols-2">
            {initialStores.length > 1 && (
              <div>
                <label className="block text-xs font-semibold text-slate-700">Store *</label>
                <select
                  value={selectedStoreId}
                  onChange={(e) => {
                    setSelectedStoreId(e.target.value);
                    setSelectedVendorId("");
                    setLineItems([]);
                  }}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-sm outline-none focus:bg-white"
                >
                  {initialStores.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.currency})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700">Vendor / Supplier *</label>
              {availableVendors.length === 0 ? (
                <div className="mt-1 flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800">
                  <span>No vendor found for this store.</span>
                  <Link href="/dashboard/procurement/vendors" className="font-bold underline">
                    Add Vendor
                  </Link>
                </div>
              ) : (
                <select
                  required
                  value={selectedVendorId}
                  onChange={(e) => setSelectedVendorId(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-sm outline-none focus:bg-white"
                >
                  <option value="">Select a vendor...</option>
                  {availableVendors.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} {v.contactEmail ? `(${v.contactEmail})` : ""}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">PO Number (optional)</label>
              <input
                type="text"
                value={poNumber}
                onChange={(e) => setPoNumber(e.target.value)}
                placeholder="Auto-generated (e.g. PO-1001)"
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-sm outline-none focus:bg-white placeholder:text-slate-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">Expected Arrival Date</label>
              <input
                type="date"
                value={expectedDate}
                onChange={(e) => setExpectedDate(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-sm outline-none focus:bg-white"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Line Items Matrix */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                2. Order Line Items
              </h2>
              <p className="text-xs text-slate-500">Add products and variants you are ordering from the supplier.</p>
            </div>

            <button
              type="button"
              onClick={() => setIsProductPickerOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Product SKU
            </button>
          </div>

          {lineItems.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
              <Package className="mx-auto h-8 w-8 text-slate-400" />
              <p className="mt-2 text-xs font-medium text-slate-600">No items added to this PO yet.</p>
              <button
                type="button"
                onClick={() => setIsProductPickerOpen(true)}
                className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                <Plus className="h-3.5 w-3.5 text-slate-500" />
                Select Products
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-100 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Item / SKU</th>
                    <th className="px-4 py-3 w-32">Qty Ordered</th>
                    <th className="px-4 py-3 w-36">Unit Cost ({activeStore?.currency})</th>
                    <th className="px-4 py-3 w-36 text-right">Line Total</th>
                    <th className="px-4 py-3 w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {lineItems.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">{item.title}</div>
                        {item.sku && <p className="text-xs font-mono text-slate-500">SKU: {item.sku}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min={1}
                          value={item.qtyOrdered}
                          onChange={(e) => handleUpdateItem(item.id, "qtyOrdered", Math.max(1, Number.parseInt(e.target.value, 10) || 1))}
                          className="w-24 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-sm font-semibold outline-none focus:bg-white focus:border-slate-400"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          step="0.01"
                          min={0}
                          value={item.unitCost}
                          onChange={(e) => handleUpdateItem(item.id, "unitCost", Math.max(0, Number.parseFloat(e.target.value) || 0))}
                          className="w-28 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-sm font-semibold outline-none focus:bg-white focus:border-slate-400"
                        />
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-slate-900">
                        {currencyFormatter.format(item.qtyOrdered * item.unitCost)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleRemoveLineItem(item.id)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Section 3: Cost Totals & Notes */}
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500 border-b border-slate-100 pb-3">
              3. PO Notes & Payment Terms
            </h2>
            <textarea
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Net 30 terms. Deliver to Dock #2 between 8 AM and 4 PM."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none focus:bg-white placeholder:text-slate-400"
            />
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500 border-b border-slate-100 pb-3">
              Cost Summary ({activeStore?.currency})
            </h2>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Items Subtotal</span>
                <span className="font-semibold">{currencyFormatter.format(subtotal)}</span>
              </div>

              <div className="flex items-center justify-between text-slate-600">
                <span>Estimated Tax</span>
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  value={tax}
                  onChange={(e) => setTax(Math.max(0, Number.parseFloat(e.target.value) || 0))}
                  className="w-24 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-right text-xs font-semibold outline-none focus:bg-white"
                />
              </div>

              <div className="flex items-center justify-between text-slate-600">
                <span>Estimated Freight / Shipping</span>
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  value={shipping}
                  onChange={(e) => setShipping(Math.max(0, Number.parseFloat(e.target.value) || 0))}
                  className="w-24 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-right text-xs font-semibold outline-none focus:bg-white"
                />
              </div>

              <div className="flex justify-between border-t border-slate-100 pt-2 text-base font-bold text-slate-950">
                <span>Total PO Amount</span>
                <span>{currencyFormatter.format(total)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4">
          <Link
            href="/dashboard/procurement/purchase-orders"
            className="rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSubmitting || lineItems.length === 0 || !selectedVendorId}
            className="rounded-full bg-slate-950 px-6 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {isSubmitting ? "Creating PO..." : "Save & Generate PO"}
          </button>
        </div>
      </form>

      {/* Product SKU Selector Modal */}
      {isProductPickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Select Product SKUs</h3>
              <button
                type="button"
                onClick={() => setIsProductPickerOpen(false)}
                className="text-xs font-semibold text-slate-500 hover:text-slate-900"
              >
                Close
              </button>
            </div>

            <div className="relative mt-3">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                autoFocus
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="Search products by title or SKU..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-4 py-2 text-sm outline-none focus:bg-white"
              />
            </div>

            <div className="mt-4 flex-1 overflow-y-auto divide-y divide-slate-100 pr-1">
              {filteredVariants.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  No matching products or SKUs found in this store.
                </div>
              ) : (
                filteredVariants.map(({ product, variant }) => {
                  const title = variant.title.toLowerCase() === "default title" || variant.title === product.title
                    ? product.title
                    : `${product.title} - ${variant.title}`;

                  const isAlreadyAdded = lineItems.some((i) => i.variantId === variant.id);

                  return (
                    <div key={variant.id} className="flex items-center justify-between py-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{title}</p>
                        <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                          {variant.sku && <span className="font-mono">SKU: {variant.sku}</span>}
                          <span>Current Stock: {variant.inventory} units</span>
                          <span>Retail: {currencyFormatter.format(Number(variant.price))}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleAddVariant(product, variant)}
                        className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                          isAlreadyAdded
                            ? "bg-slate-100 text-slate-600 hover:bg-slate-200"
                            : "bg-slate-950 text-white hover:bg-slate-800"
                        }`}
                      >
                        {isAlreadyAdded ? "Add More" : "Add Line"}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
