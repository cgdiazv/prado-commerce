"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, Plus, Search, Star, Store, SlidersHorizontal, X, Boxes, DollarSign, TrendingUp, Layers, ScanBarcode, CheckCircle2, AlertTriangle } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { setStoredActiveStoreId, subscribeToActiveStoreChange } from "@/lib/dashboard-store-selection";

type Store = {
  id: string;
  name: string;
  slug: string;
  currency: string;
};

type ProductVariant = {
  id: string;
  sku: string | null;
  barcode?: string | null;
  title: string;
  price: string;
  compareAtPrice: string | null;
  price3?: string | null;
  costPrice?: string | null;
  inventory: number;
  stockStatus: "IN_STOCK" | "OUT_OF_STOCK" | "ON_BACKORDER";
  options: unknown;
};

type Product = {
  id: string;
  storeId?: string;
  title: string;
  slug: string;
  description: string | null;
  dimension?: string | null;
  weight?: string | null;
  manufacturer?: string | null;
  condition?: string | null;
  conditionNotes?: string | null;
  images: string[];
  featured: boolean;
  status: "DRAFT" | "PUBLISHED" | "ACTIVE" | "ARCHIVED";
  categoryId: string | null;
  categoryName?: string | null;
  variants: ProductVariant[];
  createdAt: string | Date;
  updatedAt: string | Date;
};

type ProductsDashboardProps = {
  initialStores: Store[];
  initialProducts: Product[];
  selectedStoreId: string | null;
  currentPlan?: "STARTER" | "PRO" | "ENTERPRISE";
  setupError?: string | null;
};

type SortKey = "name" | "featured" | "sku" | "inventory" | "price" | "cost" | "stockValue" | "category" | "updated";
type SortDirection = "asc" | "desc";

function SortIndicator({ active, direction }: { active: boolean; direction: SortDirection }) {
  return (
    <span className="ml-1 flex flex-col leading-none text-[9px]">
      <span className={active && direction === "asc" ? "text-slate-950" : "text-slate-400"}>▲</span>
      <span className={active && direction === "desc" ? "text-slate-950" : "text-slate-400"}>▼</span>
    </span>
  );
}

export function ProductsDashboard({
  initialStores,
  initialProducts,
  selectedStoreId,
  currentPlan = "STARTER",
  setupError = null,
}: ProductsDashboardProps) {
  const router = useRouter();
  const { language } = useLanguage();
  const isEs = language === "es";
  const [stores] = useState(initialStores);
  const [products, setProducts] = useState(initialProducts);
  const [activeStoreId, setActiveStoreId] = useState(selectedStoreId ?? "ALL");
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("updated");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [pageSize, setPageSize] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState<"" | "clear" | "delete">("");
  const [isApplyingBulkAction, setIsApplyingBulkAction] = useState(false);
  const [planNotice, setPlanNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [updatingFeaturedIds, setUpdatingFeaturedIds] = useState<string[]>([]);
  const [mobileActiveFilter, setMobileActiveFilter] = useState<"store" | "search" | "actions" | null>(null);
  const selectAllRef = useRef<HTMLInputElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const barcodeBufferRef = useRef<string>("");
  const lastKeyTimeRef = useRef<number>(0);
  const isStarter = currentPlan === "STARTER";
  const hasReachedProductLimit = isStarter && products.length >= 50;

  const [scanNotice, setScanNotice] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  useEffect(() => {
    if (!scanNotice) return;
    const timer = setTimeout(() => {
      setScanNotice(null);
    }, scanNotice.type === "error" ? 4500 : 2500);
    return () => clearTimeout(timer);
  }, [scanNotice]);

  const playScanBeep = () => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(950, ctx.currentTime);
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.09);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } catch {}
  };

  const playScanErrorBeep = () => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;
      [0, 0.12].forEach((offset) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(220, now + offset);
        gain.gain.setValueAtTime(0.2, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.01, now + offset + 0.08);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + offset);
        osc.stop(now + offset + 0.09);
      });
    } catch {}
  };

  // Barcode Auto-detection (USB / Bluetooth Scanners on Products screen)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT") &&
        target !== searchInputRef.current
      ) {
        return;
      }

      const now = Date.now();
      const diff = now - lastKeyTimeRef.current;
      lastKeyTimeRef.current = now;

      if (e.key === "Enter") {
        const candidate =
          barcodeBufferRef.current.trim() ||
          (target === searchInputRef.current ? searchInputRef.current.value.trim() : query.trim());

        barcodeBufferRef.current = "";

        if (candidate.length >= 2) {
          const candLower = candidate.toLowerCase();
          const candStripped = candLower.replace(/^0+/, "");

          const match = products.find((p) => {
            if (activeStoreId !== "ALL" && p.storeId && p.storeId !== activeStoreId) return false;
            return p.variants.some((v) => {
              const sku = v.sku?.toLowerCase().trim();
              const skuStripped = sku?.replace(/^0+/, "");
              if (sku === candLower || (skuStripped && skuStripped === candStripped)) return true;

              const barcode = v.barcode?.toLowerCase().trim();
              if (!barcode) return false;
              const codes = barcode.split(/[,;\s]+/).map((c) => c.trim()).filter(Boolean);
              return codes.some((code) => {
                const codeStripped = code.replace(/^0+/, "");
                return (
                  code === candLower ||
                  (codeStripped !== "" && candStripped !== "" && codeStripped === candStripped) ||
                  (codeStripped.length >= 8 && candStripped.length >= 8 && Math.abs(codeStripped.length - candStripped.length) <= 1 && codeStripped.slice(0, 8) === candStripped.slice(0, 8))
                );
              });
            });
          });

          setQuery(candidate);
          setCurrentPage(1);

          if (match) {
            playScanBeep();
            setScanNotice({
              type: "success",
              message: isEs
                ? `Producto encontrado: "${match.title}" (código ${candidate})`
                : `Product found: "${match.title}" (code ${candidate})`,
            });
          } else {
            playScanErrorBeep();
            setScanNotice({
              type: "error",
              message: isEs
                ? `Código no encontrado: "${candidate}"`
                : `Barcode not found: "${candidate}"`,
            });
          }
        }
      } else if (e.key.length === 1) {
        if (diff > 120) {
          barcodeBufferRef.current = e.key;
        } else {
          barcodeBufferRef.current += e.key;
        }
      }

      if (e.key === "F2") {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeStoreId, isEs, products, query]);

  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const strippedQuery = normalizedQuery.replace(/^0+/, "");

    return products.filter((product) => {
      if (activeStoreId !== "ALL" && product.storeId && product.storeId !== activeStoreId) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      // Check title, slug, and status
      if (
        product.title.toLowerCase().includes(normalizedQuery) ||
        product.slug.toLowerCase().includes(normalizedQuery) ||
        product.status.toLowerCase().includes(normalizedQuery)
      ) {
        return true;
      }

      // Check variants: SKU and Barcodes (with leading-zero and check-digit tolerance)
      return product.variants.some((variant) => {
        // 1. Check SKU
        const sku = variant.sku?.toLowerCase().trim();
        if (sku) {
          const skuStripped = sku.replace(/^0+/, "");
          if (
            sku.includes(normalizedQuery) ||
            (skuStripped && strippedQuery && (skuStripped === strippedQuery || skuStripped.includes(strippedQuery) || strippedQuery.includes(skuStripped)))
          ) {
            return true;
          }
        }

        // 2. Check Barcode / Lookups
        const barcodeRaw = variant.barcode?.toLowerCase().trim();
        if (barcodeRaw) {
          const codes = barcodeRaw.split(/[,;\s]+/).map((c) => c.trim()).filter(Boolean);
          for (const code of codes) {
            const codeStripped = code.replace(/^0+/, "");
            if (
              code === normalizedQuery ||
              code.includes(normalizedQuery) ||
              (codeStripped !== "" && strippedQuery !== "" && (codeStripped === strippedQuery || codeStripped.includes(strippedQuery) || strippedQuery.includes(codeStripped))) ||
              (codeStripped.length >= 8 && strippedQuery.length >= 8 && Math.abs(codeStripped.length - strippedQuery.length) <= 1 && codeStripped.slice(0, 8) === strippedQuery.slice(0, 8))
            ) {
              return true;
            }
          }
        }

        return false;
      });
    });
  }, [products, query, activeStoreId]);

  const sortedProducts = useMemo(() => {
    const rows = [...filteredProducts];

    rows.sort((left, right) => {
      const leftCategory = left.categoryName ?? (left.categoryId ? "Assigned" : "Uncategorized");
      const rightCategory = right.categoryName ?? (right.categoryId ? "Assigned" : "Uncategorized");
      const leftSku = left.variants[0]?.sku ?? "";
      const rightSku = right.variants[0]?.sku ?? "";
      const leftInventory = left.variants.reduce((total, variant) => total + variant.inventory, 0);
      const rightInventory = right.variants.reduce((total, variant) => total + variant.inventory, 0);
      const leftPrice = Number(left.variants[0]?.price ?? 0);
      const rightPrice = Number(right.variants[0]?.price ?? 0);
      const leftCost = Number(left.variants[0]?.costPrice ?? 0);
      const rightCost = Number(right.variants[0]?.costPrice ?? 0);
      const leftStockValue = left.variants.reduce(
        (total, variant) => total + variant.inventory * (Number(variant.costPrice) || 0),
        0,
      );
      const rightStockValue = right.variants.reduce(
        (total, variant) => total + variant.inventory * (Number(variant.costPrice) || 0),
        0,
      );
      const leftUpdated = new Date(left.updatedAt).getTime();
      const rightUpdated = new Date(right.updatedAt).getTime();

      let comparison = 0;

      switch (sortKey) {
        case "name":
          comparison = left.title.localeCompare(right.title);
          break;
        case "featured":
          comparison = Number(left.featured) - Number(right.featured);
          break;
        case "sku":
          comparison = leftSku.localeCompare(rightSku);
          break;
        case "inventory":
          comparison = leftInventory - rightInventory;
          break;
        case "price":
          comparison = leftPrice - rightPrice;
          break;
        case "cost":
          comparison = leftCost - rightCost;
          break;
        case "stockValue":
          comparison = leftStockValue - rightStockValue;
          break;
        case "category":
          comparison = leftCategory.localeCompare(rightCategory);
          break;
        case "updated":
        default:
          comparison = leftUpdated - rightUpdated;
          break;
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });

    return rows;
  }, [filteredProducts, sortDirection, sortKey]);

  const activeStore = useMemo(() => {
    return stores.find((s) => s.id === activeStoreId) ?? stores[0];
  }, [stores, activeStoreId]);

  const currencyCode = activeStore?.currency || "USD";
  const currencyFormatter = useMemo(() => {
    return new Intl.NumberFormat(isEs ? "es-ES" : "en-US", {
      style: "currency",
      currency: currencyCode,
    });
  }, [isEs, currencyCode]);

  const inventoryStats = useMemo(() => {
    let totalUnits = 0;
    let totalCostValue = 0;
    let totalRetailValue = 0;
    let productsWithCost = 0;

    for (const p of products) {
      let productHasCost = false;
      for (const v of p.variants) {
        const qty = Number(v.inventory) || 0;
        const cost = Number(v.costPrice) || 0;
        const price = Number(v.price) || 0;
        if (qty > 0) {
          totalUnits += qty;
          totalCostValue += qty * cost;
          totalRetailValue += qty * price;
        }
        if (cost > 0) {
          productHasCost = true;
        }
      }
      if (productHasCost) {
        productsWithCost++;
      }
    }

    const potentialProfit = Math.max(0, totalRetailValue - totalCostValue);
    const potentialMargin = totalRetailValue > 0 ? (potentialProfit / totalRetailValue) * 100 : 0;

    return {
      totalUnits,
      totalCostValue,
      totalRetailValue,
      potentialProfit,
      potentialMargin,
      productsWithCost,
    };
  }, [products]);

  const totalProducts = sortedProducts.length;
  const totalPages = Math.max(1, Math.ceil(totalProducts / pageSize));
  const pageStart = totalProducts === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const pageEnd = Math.min(currentPage * pageSize, totalProducts);

  useEffect(() => {
    setCurrentPage((prev) => Math.min(prev, totalPages));
  }, [totalPages]);

  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedProducts.slice(start, start + pageSize);
  }, [sortedProducts, currentPage, pageSize]);

  const paginatedProductIds = useMemo(
    () => paginatedProducts.map((product) => product.id),
    [paginatedProducts],
  );

  const selectedOnPageCount = useMemo(
    () => paginatedProductIds.filter((id) => selectedProductIds.includes(id)).length,
    [paginatedProductIds, selectedProductIds],
  );

  const allOnPageSelected = paginatedProductIds.length > 0 && selectedOnPageCount === paginatedProductIds.length;
  const someOnPageSelected = selectedOnPageCount > 0 && !allOnPageSelected;

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      setCurrentPage(1);
      return;
    }

    setSortKey(key);
    setSortDirection("asc");
    setCurrentPage(1);
  }

  async function refreshProducts(storeId: string) {
    const response = await fetch(`/api/products?storeId=${encodeURIComponent(storeId)}`, {
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error("Failed to refresh products");
    }

    const data = (await response.json()) as Product[];
    setProducts(data);
  }

  async function handleStoreChange(storeId: string) {
    setActiveStoreId(storeId);
    setStoredActiveStoreId(storeId);
    setQuery("");
    setCurrentPage(1);
    setSelectedProductIds([]);
    setBulkAction("");
    setError(null);

    try {
      await refreshProducts(storeId);
    } catch {
      setError("Failed to load products for this store.");
    }
  }

  useEffect(() => {
    return subscribeToActiveStoreChange((newStoreId) => {
      if (newStoreId !== activeStoreId) {
        setActiveStoreId(newStoreId);
        void refreshProducts(newStoreId).catch(() => {});
      }
    });
  }, [activeStoreId]);

  async function handleToggleFeatured(productId: string, featured: boolean) {
    if (updatingFeaturedIds.includes(productId)) {
      return;
    }

    setUpdatingFeaturedIds((current) => [...current, productId]);

    try {
      const response = await fetch(`/api/products/${productId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ featured: !featured }),
      });

      if (!response.ok) {
        throw new Error("Failed to update featured status");
      }

      setProducts((current) =>
        current.map((product) =>
          product.id === productId ? { ...product, featured: !featured } : product,
        ),
      );
    } catch {
      setPlanNotice("Could not update featured status. Please try again.");
    } finally {
      setUpdatingFeaturedIds((current) => current.filter((id) => id !== productId));
    }
  }

  useEffect(() => {
    const activeProductIdSet = new Set(sortedProducts.map((product) => product.id));
    setSelectedProductIds((current) => current.filter((id) => activeProductIdSet.has(id)));
  }, [sortedProducts]);

  useEffect(() => {
    if (!selectAllRef.current) {
      return;
    }

    selectAllRef.current.indeterminate = someOnPageSelected;
  }, [someOnPageSelected]);

  function toggleProductSelection(productId: string) {
    setSelectedProductIds((current) => {
      if (current.includes(productId)) {
        return current.filter((id) => id !== productId);
      }

      return [...current, productId];
    });
  }

  function toggleSelectAllOnPage(checked: boolean) {
    if (!checked) {
      setSelectedProductIds((current) => current.filter((id) => !paginatedProductIds.includes(id)));
      return;
    }

    setSelectedProductIds((current) => Array.from(new Set([...current, ...paginatedProductIds])));
  }

  async function handleApplyBulkAction() {
    if (!bulkAction) {
      return;
    }

    if (bulkAction === "clear") {
      setSelectedProductIds([]);
      setBulkAction("");
      return;
    }

    if (selectedProductIds.length === 0) {
      return;
    }

    setError(null);
    setIsApplyingBulkAction(true);

    try {
      const responses = await Promise.all(
        selectedProductIds.map((productId) =>
          fetch(`/api/products/${productId}`, {
            method: "DELETE",
          }),
        ),
      );

      if (responses.some((response) => !response.ok)) {
        throw new Error("Failed to delete selected products");
      }

      const selectedIdSet = new Set(selectedProductIds);
      setProducts((current) => current.filter((product) => !selectedIdSet.has(product.id)));
      setSelectedProductIds([]);
      setBulkAction("");
    } catch {
      setError("Failed to apply action to selected products.");
    } finally {
      setIsApplyingBulkAction(false);
    }
  }

  return (
    <>
      <section>
        {setupError ? (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {setupError}
          </div>
        ) : null}
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <h1 className="text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">
              {isEs
                ? "Crea productos, variantes y precios para tus tiendas."
                : "Create products, variants, and storefront pricing."}
            </h1>
            <p className="mt-1 max-w-xl text-sm text-slate-500">
              {isEs
                ? "Administra catálogos de productos por tienda y mantén el inventario de variantes organizado."
                : "Manage product catalogs per store and keep variant inventory organized."}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href={`/dashboard/products/new${activeStoreId && activeStoreId !== "ALL" ? `?storeId=${encodeURIComponent(activeStoreId)}` : ""}`}
              onClick={(event) => {
                if (hasReachedProductLimit) {
                  event.preventDefault();
                  setPlanNotice(
                    isEs
                      ? "El plan Starter incluye hasta 50 productos por tienda. Actualiza a Prado Commerce Pro para agregar productos ilimitados."
                      : "Starter plan includes up to 50 products per store. Upgrade to Prado Commerce Pro to add unlimited products.",
                  );
                }
              }}
              className={`inline-flex w-full items-center justify-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 sm:w-auto ${
                hasReachedProductLimit ? "cursor-not-allowed opacity-60" : ""
              }`}
              aria-disabled={hasReachedProductLimit}
            >
              <Plus className="h-4 w-4" />
              {isEs ? "Nuevo producto" : "New product"}
            </Link>
          </div>
        </div>

        {isStarter ? (
          <div className="mt-4 rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm text-cyan-800">
            {isEs
              ? "El plan Starter incluye hasta 50 productos por tienda y subdominios estándar de Prado Commerce. Actualiza a Pro para productos ilimitados y dominios personalizados."
              : "Starter plan includes up to 50 products per store and standard Prado Commerce subdomains. Upgrade to Pro for unlimited products and custom domains."}
          </div>
        ) : null}

        {planNotice ? (
          <div className="rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm text-cyan-800">
            {planNotice}
          </div>
        ) : null}

        {/* Inventory Value & Metrics KPI Bar */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-3.5 sm:p-4 shadow-2xs">
            <div className="flex items-center justify-between gap-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 sm:text-xs leading-tight">
                {isEs ? "Catálogo" : "Catalog"}
              </span>
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700 sm:h-8 sm:w-8">
                <Layers className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </div>
            </div>
            <p className="mt-2 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
              {products.length} <span className="text-xs font-normal text-slate-500 sm:text-sm">{isEs ? "productos" : "products"}</span>
            </p>
            <p className="mt-1 text-[11px] text-slate-500 sm:text-xs leading-snug">
              {inventoryStats.productsWithCost} {isEs ? "con costo registrado" : "with cost recorded"}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-3.5 sm:p-4 shadow-2xs">
            <div className="flex items-center justify-between gap-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 sm:text-xs leading-tight">
                {isEs ? "Unidades en Stock" : "Units in Stock"}
              </span>
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700 sm:h-8 sm:w-8">
                <Boxes className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </div>
            </div>
            <p className="mt-2 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
              {inventoryStats.totalUnits.toLocaleString()}
            </p>
            <p className="mt-1 text-[11px] text-slate-500 sm:text-xs leading-snug">
              {isEs ? "Total físico disponible" : "Total available physical units"}
            </p>
          </div>

          <div className="rounded-xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/50 via-white to-emerald-50/30 p-3.5 sm:p-4 shadow-2xs">
            <div className="flex items-center justify-between gap-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-800 sm:text-xs leading-tight">
                {isEs ? "Inventario al Costo" : "Inventory at Cost"}
              </span>
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 sm:h-8 sm:w-8">
                <DollarSign className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </div>
            </div>
            <p className="mt-2 text-lg font-bold tracking-tight text-emerald-950 sm:text-2xl truncate" title={currencyFormatter.format(inventoryStats.totalCostValue)}>
              {currencyFormatter.format(inventoryStats.totalCostValue)}
            </p>
            <p className="mt-1 text-[11px] text-emerald-700 sm:text-xs leading-snug">
              {isEs ? "Valor total invertido (Stock × Costo)" : "Capital invested (Stock × Cost)"}
            </p>
          </div>

          <div className="rounded-xl border border-cyan-200/80 bg-gradient-to-br from-cyan-50/50 via-white to-cyan-50/30 p-3.5 sm:p-4 shadow-2xs">
            <div className="flex items-center justify-between gap-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-cyan-800 sm:text-xs leading-tight">
                {isEs ? "Valor Venta / Ganancia Est." : "Retail Value / Est. Profit"}
              </span>
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-cyan-100 text-cyan-700 sm:h-8 sm:w-8">
                <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </div>
            </div>
            <p className="mt-2 text-lg font-bold tracking-tight text-cyan-950 sm:text-2xl truncate" title={currencyFormatter.format(inventoryStats.totalRetailValue)}>
              {currencyFormatter.format(inventoryStats.totalRetailValue)}
            </p>
            <p className="mt-1 text-[11px] font-medium text-cyan-700 sm:text-xs leading-snug">
              {isEs ? "Ganancia pot.: " : "Pot. profit: "}
              <span className="font-semibold text-emerald-700">
                +{currencyFormatter.format(inventoryStats.potentialProfit)}
              </span>
              {" "}
              ({inventoryStats.potentialMargin.toFixed(0)}%)
            </p>
          </div>
        </div>

        {/* Desktop Controls (lg+) */}
        <div className="mt-8 hidden w-full flex-col gap-4 lg:flex lg:flex-row lg:items-center">
          <div className="w-full shrink-0 lg:w-56">
            <div className="relative">
              <Store className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <select
                value={activeStoreId}
                onChange={(event) => void handleStoreChange(event.target.value)}
                aria-label={isEs ? "Seleccionar tienda" : "Select store"}
                className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-9 text-sm font-medium text-slate-700 outline-none transition hover:bg-slate-50 focus:border-slate-400 shadow-2xs appearance-none cursor-pointer"
              >
                <option value="ALL">{isEs ? "Todas las tiendas" : "All Stores"}</option>
                {stores.map((store) => (
                  <option key={store.id} value={store.id}>
                    {store.name} {store.currency ? `(${store.currency})` : ""}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>
          </div>
          <label className="relative flex w-full min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              ref={searchInputRef}
              type="search"
              aria-label={isEs ? "Buscar productos" : "Search products"}
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setCurrentPage(1);
              }}
              placeholder={isEs ? "Buscar por código de barra, SKU, título... (F2 o escanear)" : "Search by barcode, SKU, title... (F2 or scan)"}
              className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-10 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
            />
            <ScanBarcode className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </label>

          <div className="flex w-full items-center gap-3 shrink-0 lg:ml-auto lg:w-auto">
            <button
              type="button"
              onClick={() => void handleApplyBulkAction()}
              disabled={
                isApplyingBulkAction ||
                !bulkAction ||
                (bulkAction === "delete" && selectedProductIds.length === 0)
              }
              className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isEs ? "Aplicar" : "Apply"}
            </button>
            <select
              value={bulkAction}
              onChange={(event) => setBulkAction(event.target.value as "" | "clear" | "delete")}
              aria-label={isEs ? "Acciones por lote" : "Bulk actions"}
              className="w-44 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
            >
              <option value="">{isEs ? "Seleccionar acción" : "Select action"}</option>
              <option value="delete">{isEs ? "Eliminar seleccionados" : "Delete selected"}</option>
              <option value="clear">{isEs ? "Limpiar selección" : "Clear selection"}</option>
            </select>
          </div>
        </div>

        {/* Mobile Controls (lg:hidden) - Icon triggers that reveal options on tap */}
        <div className="mt-4 space-y-3 lg:hidden">
          <div className="flex items-center gap-2">
            {/* Store Icon Button */}
            <button
              type="button"
              onClick={() => setMobileActiveFilter((prev) => (prev === "store" ? null : "store"))}
              aria-label={isEs ? "Seleccionar tienda" : "Select store"}
              className={`relative inline-flex h-11 w-11 items-center justify-center rounded-xl border transition ${
                mobileActiveFilter === "store"
                  ? "border-slate-950 bg-slate-950 text-white shadow-sm"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-2xs"
              }`}
            >
              <Store className="h-5 w-5" />
            </button>

            {/* Search Icon Button */}
            <button
              type="button"
              onClick={() => setMobileActiveFilter((prev) => (prev === "search" ? null : "search"))}
              aria-label={isEs ? "Buscar productos" : "Search products"}
              className={`relative inline-flex h-11 w-11 items-center justify-center rounded-xl border transition ${
                mobileActiveFilter === "search"
                  ? "border-slate-950 bg-slate-950 text-white shadow-sm"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-2xs"
              }`}
            >
              <Search className="h-5 w-5" />
              {query.trim().length > 0 && (
                <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-cyan-500" />
              )}
            </button>

            {/* Actions Icon Button */}
            <button
              type="button"
              onClick={() => setMobileActiveFilter((prev) => (prev === "actions" ? null : "actions"))}
              aria-label={isEs ? "Acciones por lote" : "Bulk actions"}
              className={`relative inline-flex h-11 w-11 items-center justify-center rounded-xl border transition ${
                mobileActiveFilter === "actions"
                  ? "border-slate-950 bg-slate-950 text-white shadow-sm"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-2xs"
              }`}
            >
              <SlidersHorizontal className="h-5 w-5" />
              {selectedProductIds.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-cyan-600 px-1 text-[11px] font-bold text-white shadow-xs">
                  {selectedProductIds.length}
                </span>
              )}
            </button>

            {/* Compact query pill if search is active but search panel is collapsed */}
            {query.trim() && mobileActiveFilter !== "search" && (
              <div className="flex min-w-0 flex-1 items-center justify-between gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                <span className="truncate">"{query}"</span>
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setCurrentPage(1);
                  }}
                  className="rounded p-0.5 text-slate-400 hover:text-slate-700"
                  aria-label={isEs ? "Limpiar búsqueda" : "Clear search"}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Revealed Store Selector */}
          {mobileActiveFilter === "store" && (
            <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  {isEs ? "Tienda" : "Store"}
                </span>
                <button
                  type="button"
                  onClick={() => setMobileActiveFilter(null)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  aria-label={isEs ? "Cerrar" : "Close"}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="relative">
                <Store className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <select
                  value={activeStoreId}
                  onChange={(event) => void handleStoreChange(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-8 text-sm outline-none transition focus:border-slate-400 appearance-none cursor-pointer"
                >
                  <option value="ALL">{isEs ? "Todas las tiendas" : "All Stores"}</option>
                  {stores.map((store) => (
                    <option key={store.id} value={store.id}>
                      {store.name} {store.currency ? `(${store.currency})` : ""}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>
            </div>
          )}

          {/* Revealed Search Input */}
          {mobileActiveFilter === "search" && (
            <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  {isEs ? "Buscar productos" : "Search products"}
                </span>
                <button
                  type="button"
                  onClick={() => setMobileActiveFilter(null)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  aria-label={isEs ? "Cerrar" : "Close"}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  autoFocus
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder={isEs ? "Buscar por código, SKU, título..." : "Search by barcode, SKU, title..."}
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-9 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => {
                      setQuery("");
                      setCurrentPage(1);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:text-slate-600"
                    aria-label={isEs ? "Limpiar" : "Clear"}
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Revealed Actions Controls */}
          {mobileActiveFilter === "actions" && (
            <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  {isEs ? "Acciones por lote" : "Bulk Actions"}
                  {selectedProductIds.length > 0 && ` (${selectedProductIds.length})`}
                </span>
                <button
                  type="button"
                  onClick={() => setMobileActiveFilter(null)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  aria-label={isEs ? "Cerrar" : "Close"}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={bulkAction}
                  onChange={(event) => setBulkAction(event.target.value as "" | "clear" | "delete")}
                  className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-slate-400"
                >
                  <option value="">{isEs ? "Seleccionar acción" : "Select action"}</option>
                  <option value="delete">{isEs ? "Eliminar seleccionados" : "Delete selected"}</option>
                  <option value="clear">{isEs ? "Limpiar selección" : "Clear selection"}</option>
                </select>
                <button
                  type="button"
                  onClick={() => void handleApplyBulkAction()}
                  disabled={
                    isApplyingBulkAction ||
                    !bulkAction ||
                    (bulkAction === "delete" && selectedProductIds.length === 0)
                  }
                  className="shrink-0 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isEs ? "Aplicar" : "Apply"}
                </button>
              </div>
            </div>
          )}
        </div>

        {error ? (
          <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        {/* Barcode Scan Feedback Toast */}
        {scanNotice && (
          <div
            className={`mt-4 rounded-xl p-3 text-xs font-semibold flex items-center justify-between shadow-sm transition-all duration-200 animate-in slide-in-from-top-1 ${
              scanNotice.type === "success"
                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                : "bg-rose-50 text-rose-800 border border-rose-200"
            }`}
          >
            <div className="flex items-center gap-2">
              {scanNotice.type === "success" ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              ) : (
                <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
              )}
              <span>{scanNotice.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setScanNotice(null)}
              className="text-slate-500 hover:text-slate-700 underline text-xs ml-3 cursor-pointer"
            >
              {isEs ? "Cerrar" : "Dismiss"}
            </button>
          </div>
        )}

        <div className="mt-8 overflow-hidden rounded-[8px] border border-slate-200 bg-white shadow-sm">
          {totalProducts === 0 ? (
            <div className="p-10 text-center text-slate-500">
              {isEs ? "Aún no hay productos para esta tienda." : "No products yet for this store."}
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs font-medium text-slate-600">
                  {isEs
                    ? `Mostrando ${pageStart}-${pageEnd} de ${totalProducts} productos`
                    : `Showing ${pageStart}-${pageEnd} of ${totalProducts} products`}
                </p>
                <div className="flex items-center gap-4">
                  <p className="whitespace-nowrap text-xs font-medium text-slate-600">
                    {isEs
                      ? `${selectedProductIds.length} seleccionado${selectedProductIds.length === 1 ? "" : "s"}`
                      : `${selectedProductIds.length} selected`}
                  </p>
                  <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
                    {isEs ? "Filas por página" : "Rows per page"}
                    <select
                      value={pageSize}
                      onChange={(event) => {
                        setPageSize(Number(event.target.value));
                        setCurrentPage(1);
                      }}
                      className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 outline-none transition focus:border-slate-400"
                    >
                      {[25, 50, 100, 500].map((size) => (
                        <option key={size} value={size}>
                          {size}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>

              <div className="hidden overflow-x-auto md:block">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="w-12 px-4 py-3 text-left font-semibold text-slate-600">
                        <input
                          ref={selectAllRef}
                          type="checkbox"
                          checked={allOnPageSelected}
                          onChange={(event) => toggleSelectAllOnPage(event.target.checked)}
                          aria-label={isEs ? "Seleccionar todos los productos de esta página" : "Select all products on this page"}
                          className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                        />
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">{isEs ? "Imagen" : "Thumbnail"}</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">
                        <button type="button" onClick={() => handleSort("name")} className="flex items-center gap-1 transition hover:text-slate-950">
                          {isEs ? "Nombre" : "Name"}
                          <SortIndicator active={sortKey === "name"} direction={sortDirection} />
                        </button>
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">
                        <button type="button" onClick={() => handleSort("featured")} className="flex items-center gap-1 transition hover:text-slate-950">
                          {isEs ? "Destacado" : "Featured"}
                          <SortIndicator active={sortKey === "featured"} direction={sortDirection} />
                        </button>
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">
                        <button type="button" onClick={() => handleSort("sku")} className="flex items-center gap-1 transition hover:text-slate-950">
                          SKU
                          <SortIndicator active={sortKey === "sku"} direction={sortDirection} />
                        </button>
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">
                        <button type="button" onClick={() => handleSort("inventory")} className="flex items-center gap-1 transition hover:text-slate-950">
                          {isEs ? "Inventario" : "Inventory"}
                          <SortIndicator active={sortKey === "inventory"} direction={sortDirection} />
                        </button>
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">
                        <button type="button" onClick={() => handleSort("price")} className="flex items-center gap-1 transition hover:text-slate-950">
                          {isEs ? "Precio" : "Price"}
                          <SortIndicator active={sortKey === "price"} direction={sortDirection} />
                        </button>
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">
                        <button type="button" onClick={() => handleSort("cost")} className="flex items-center gap-1 transition hover:text-slate-950">
                          {isEs ? "Costo" : "Cost"}
                          <SortIndicator active={sortKey === "cost"} direction={sortDirection} />
                        </button>
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">
                        <button type="button" onClick={() => handleSort("stockValue")} className="flex items-center gap-1 transition hover:text-slate-950">
                          {isEs ? "Valor Stock" : "Stock Value"}
                          <SortIndicator active={sortKey === "stockValue"} direction={sortDirection} />
                        </button>
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">
                        <button type="button" onClick={() => handleSort("category")} className="flex items-center gap-1 transition hover:text-slate-950">
                          {isEs ? "Categoría" : "Category"}
                          <SortIndicator active={sortKey === "category"} direction={sortDirection} />
                        </button>
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">
                        <button type="button" onClick={() => handleSort("updated")} className="flex items-center gap-1 transition hover:text-slate-950">
                          {isEs ? "Actualizado" : "Updated"}
                          <SortIndicator active={sortKey === "updated"} direction={sortDirection} />
                        </button>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {paginatedProducts.map((product) => {
                      const firstVariant = product.variants[0];
                      const thumbnailUrl = product.images[0];
                      const inventoryTotal = product.variants.reduce((acc, variant) => acc + variant.inventory, 0);
                      const firstSku = firstVariant?.sku ?? "—";
                      const firstBarcode = firstVariant?.barcode;
                      
                      const firstPrice = firstVariant ? currencyFormatter.format(Number(firstVariant.price)) : "—";
                      const firstCost = firstVariant?.costPrice ? currencyFormatter.format(Number(firstVariant.costPrice)) : "—";
                      const totalStockVal = product.variants.reduce((acc, v) => acc + (v.inventory * (Number(v.costPrice) || 0)), 0);
                      const formattedStockVal = totalStockVal > 0 ? currencyFormatter.format(totalStockVal) : "—";
                      const categoryLabel = product.categoryName ?? (product.categoryId ? (isEs ? "Asignada" : "Assigned") : (isEs ? "Sin categoría" : "Uncategorized"));

                      return (
                        <tr
                          key={product.id}
                          onClick={() => router.push(`/dashboard/products/${product.id}`)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              router.push(`/dashboard/products/${product.id}`);
                            }
                          }}
                          role="link"
                          tabIndex={0}
                          className={`cursor-pointer transition-colors ${selectedProductIds.includes(product.id) ? "bg-cyan-50/60" : "hover:bg-cyan-50/40"}`}
                        >
                          <td className="px-4 py-3 align-top">
                            <input
                              type="checkbox"
                              checked={selectedProductIds.includes(product.id)}
                              onChange={() => toggleProductSelection(product.id)}
                              onClick={(event) => event.stopPropagation()}
                              aria-label={`Select ${product.title}`}
                              className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                            />
                          </td>
                          <td className="px-4 py-3 align-top">
                            {thumbnailUrl ? (
                              <img src={thumbnailUrl} alt={product.title} className="h-12 w-12 rounded-lg object-cover" />
                            ) : (
                              <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-xs text-slate-400">
                                {isEs ? "Sin imagen" : "No image"}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 align-top text-xs text-slate-700">
                            <p className="font-medium text-slate-900">{product.title}</p>
                            <p className="text-slate-500">
                              /{product.slug}
                              {activeStoreId === "ALL" && stores.length > 1 && product.storeId && (
                                <span className="ml-1 text-slate-400">
                                  • {stores.find((s) => s.id === product.storeId)?.name}
                                </span>
                              )}
                            </p>
                          </td>
                          <td className="px-4 py-3 align-top">
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                void handleToggleFeatured(product.id, product.featured);
                              }}
                              onKeyDown={(event) => {
                                event.stopPropagation();
                              }}
                              disabled={updatingFeaturedIds.includes(product.id)}
                              aria-label={product.featured ? (isEs ? "Quitar de destacados" : "Unfeature product") : (isEs ? "Marcar como destacado" : "Feature product")}
                              className={`inline-flex h-8 w-8 items-center justify-center rounded-full transition ${
                                product.featured
                                  ? "bg-amber-50 text-amber-500 hover:bg-amber-100"
                                  : "text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                              } ${updatingFeaturedIds.includes(product.id) ? "cursor-not-allowed opacity-60" : ""}`}
                            >
                              <Star className={`h-4 w-4 ${product.featured ? "fill-current" : ""}`} />
                            </button>
                          </td>
                          <td className="px-4 py-3 align-top text-xs text-slate-700">
                            <span className="font-medium text-slate-900">{firstSku}</span>
                            {firstBarcode && (
                              <p className="mt-0.5 flex items-center gap-1 font-mono text-[11px] text-slate-500" title={isEs ? "Código de barra" : "Barcode"}>
                                <ScanBarcode className="h-3 w-3 shrink-0 text-slate-400" />
                                <span className="truncate max-w-[130px]">{firstBarcode}</span>
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-3 align-top text-xs text-slate-700">{inventoryTotal}</td>
                          <td className="px-4 py-3 align-top text-xs text-slate-700">{firstPrice}</td>
                          <td className="px-4 py-3 align-top text-xs text-slate-700">{firstCost}</td>
                          <td className="px-4 py-3 align-top text-xs font-semibold text-emerald-700">{formattedStockVal}</td>
                          <td className="px-4 py-3 align-top text-xs text-slate-700">{categoryLabel}</td>
                          <td className="px-4 py-3 align-top text-xs text-slate-700">
                            {new Date(product.updatedAt).toLocaleDateString(isEs ? "es-ES" : "en-US")}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col gap-3 p-3 md:hidden">
                {paginatedProducts.map((product) => {
                  const firstVariant = product.variants[0];
                  const thumbnailUrl = product.images[0];
                  const inventoryTotal = product.variants.reduce((acc, variant) => acc + variant.inventory, 0);
                  const firstSku = firstVariant?.sku ?? "—";
                  const firstBarcode = firstVariant?.barcode;
                  
                  const firstPrice = firstVariant ? currencyFormatter.format(Number(firstVariant.price)) : "—";
                  const firstCost = firstVariant?.costPrice ? currencyFormatter.format(Number(firstVariant.costPrice)) : "—";
                  const totalStockVal = product.variants.reduce((acc, v) => acc + (v.inventory * (Number(v.costPrice) || 0)), 0);
                  const formattedStockVal = totalStockVal > 0 ? currencyFormatter.format(totalStockVal) : "—";
                  const categoryLabel = product.categoryName ?? (product.categoryId ? (isEs ? "Asignada" : "Assigned") : (isEs ? "Sin categoría" : "Uncategorized"));

                  return (
                    <article
                      key={product.id}
                      onClick={() => router.push(`/dashboard/products/${product.id}`)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          router.push(`/dashboard/products/${product.id}`);
                        }
                      }}
                      role="link"
                      tabIndex={0}
                      className="cursor-pointer rounded-xl border border-slate-200 bg-slate-50/70 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          {thumbnailUrl ? (
                            <img src={thumbnailUrl} alt={product.title} className="h-12 w-12 rounded-lg object-cover" />
                          ) : (
                            <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white text-xs text-slate-400">
                              {isEs ? "Sin imagen" : "No image"}
                            </div>
                          )}
                          <div>
                            <p className="block font-semibold text-slate-900">{product.title}</p>
                            <p className="mt-1 text-xs text-slate-500">/{product.slug}</p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-slate-600">
                        <div>
                          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">{isEs ? "Destacado" : "Featured"}</p>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              void handleToggleFeatured(product.id, product.featured);
                            }}
                            disabled={updatingFeaturedIds.includes(product.id)}
                            aria-label={product.featured ? (isEs ? "Quitar de destacados" : "Unfeature product") : (isEs ? "Marcar como destacado" : "Feature product")}
                            className={`mt-1 inline-flex h-8 w-8 items-center justify-center rounded-full transition ${
                              product.featured
                                ? "bg-amber-50 text-amber-500"
                                : "text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                            } ${updatingFeaturedIds.includes(product.id) ? "cursor-not-allowed opacity-60" : ""}`}
                          >
                            <Star className={`h-4 w-4 ${product.featured ? "fill-current" : ""}`} />
                          </button>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">SKU</p>
                          <p className="mt-1 font-medium text-slate-700">{firstSku}</p>
                          {firstBarcode && (
                            <p className="mt-0.5 flex items-center gap-1 font-mono text-[11px] text-slate-500">
                              <ScanBarcode className="h-3 w-3 shrink-0 text-slate-400" />
                              <span>{firstBarcode}</span>
                            </p>
                          )}
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">{isEs ? "Inventario" : "Inventory"}</p>
                          <p className="mt-1 font-medium text-slate-700">{inventoryTotal}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">{isEs ? "Precio" : "Price"}</p>
                          <p className="mt-1 font-medium text-slate-700">{firstPrice}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">{isEs ? "Costo" : "Cost"}</p>
                          <p className="mt-1 font-medium text-slate-700">{firstCost}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">{isEs ? "Valor Stock" : "Stock Value"}</p>
                          <p className="mt-1 font-semibold text-emerald-700">{formattedStockVal}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">{isEs ? "Categoría" : "Category"}</p>
                          <p className="mt-1 font-medium text-slate-700">{categoryLabel}</p>
                        </div>
                      </div>

                      <div className="mt-3 border-t border-slate-200 pt-3">
                        <p className="text-sm text-slate-500">
                          {isEs ? "Actualizado " : "Updated "}
                          {new Date(product.updatedAt).toLocaleDateString(isEs ? "es-ES" : "en-US")}
                        </p>
                      </div>
                    </article>
                  );
                })}
              </div>

              <div className="flex items-center justify-between border-t border-slate-200 bg-white px-4 py-3">
                <button
                  type="button"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage <= 1}
                  className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isEs ? "Anterior" : "Previous"}
                </button>
                <p className="text-xs font-medium text-slate-600">
                  {isEs
                    ? `Página ${currentPage} de ${totalPages}`
                    : `Page ${currentPage} of ${totalPages}`}
                </p>
                <button
                  type="button"
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage >= totalPages}
                  className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isEs ? "Siguiente" : "Next"}
                </button>
              </div>
            </>
          )}
        </div>
      </section>
    </>
  );
}
