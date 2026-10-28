"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  Search,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  Maximize2,
  Minimize2,
  PauseCircle,
  PlayCircle,
  CheckCircle2,
  Printer,
  User,
  CreditCard,
  Banknote,
  QrCode,
  FileText,
  RotateCcw,
  Ban,
  Sparkles,
  ArrowLeft,
  Tag,
  Package,
  Clock,
  Layers,
  Percent,
  X,
  PlusCircle,
  AlertTriangle,
  Receipt,
  ScanBarcode,
  Store,
  DollarSign,
  ChevronDown,
  UserCheck,
  Settings,
  Wifi,
  WifiOff,
  RefreshCw,
  Database,
  Lock,
  KeyRound,
  ShieldCheck,
  Calculator,
} from "lucide-react";
import { InventoryItem, Customer, SalesRep, CompanySettings, PosStoreSettings } from "@/types/dashboard";
import { offlineSync } from "@/lib/offline-sync";
import { getSyncQueue, clearSyncedTickets, OfflineSyncTicket } from "@/lib/offline-db";
import { useLanguage } from "@/lib/i18n/LanguageContext";

export interface CartItem {
  id: string; // unique cart line id
  productId: string;
  sku: string;
  description: string;
  price: number;
  selectedTier?: "P1" | "P2" | "P3";
  quantity: number;
  taxRate: number; // calculated tax rate (0 for exempt)
  taxable?: boolean; // false if marked as exempt/no-tax (overrides general settings)
  trackingType?: string;
  selectedLot?: string;
  selectedSerial?: string;
  discountPercent?: number;
  imageUrl?: string | null;
  maxStock: number;
}

export interface ParkedTicket {
  id: string;
  ticketNumber: string;
  createdAt: string;
  createdTimestamp?: number;
  expiresAt?: string | null;
  customerName: string;
  customerId?: string;
  customerRtn?: string;
  items: CartItem[];
  total: number;
  notes?: string;
}

export interface POSModuleProps {
  inventory: InventoryItem[];
  setInventory?: React.Dispatch<React.SetStateAction<InventoryItem[]>>;
  customers: Customer[];
  salesReps?: SalesRep[];
  companySettings?: CompanySettings;
  companyLogo?: string | null;
  formatCurrency?: (val: number) => string;
  onRefreshData?: () => void;
  onNavigateBack?: () => void;
  isStandalone?: boolean;
  storeId?: string;
  language?: "es" | "en";
  posSettings?: PosStoreSettings;
  activeCashierName?: string;
  isCashier?: boolean;
  stores?: Array<{ id: string; name: string; currency: string }>;
  activeStoreId?: string;
  onSelectStore?: (storeId: string) => void;
}

export default function POSModule({
  inventory = [],
  setInventory,
  customers = [],
  salesReps = [],
  companySettings,
  companyLogo,
  formatCurrency = (val: number) =>
    `$${Number(val || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
  onRefreshData,
  onNavigateBack,
  isStandalone = false,
  storeId,
  language: propLanguage,
  posSettings,
  activeCashierName,
  isCashier = false,
  stores = [],
  activeStoreId,
  onSelectStore,
}: POSModuleProps) {
  const { language: contextLang } = useLanguage();
  const activeLang = propLanguage || contextLang || "en";
  const isEs = activeLang === "es";
  const allowZeroInventorySales = posSettings?.allowZeroInventorySales === true;

  // ----------------------------------------------------
  // Full-window state
  // ----------------------------------------------------
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(true);

  const toggleFullscreen = () => {
    setIsFullscreen((prev) => !prev);
  };

  useEffect(() => {
    // Prevent mobile/tablet pull-to-refresh swipe down while using POS
    const preventOverscrollSwipe = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        const touch = e.touches[0];
        if (touch.clientY < 50) {
          e.preventDefault();
        }
      }
    };
    window.addEventListener("touchmove", preventOverscrollSwipe, { passive: false });
    return () => window.removeEventListener("touchmove", preventOverscrollSwipe);
  }, []);

  // ----------------------------------------------------
  // Offline & Synchronization State
  // ----------------------------------------------------
  const [isOnline, setIsOnline] = useState<boolean>(() => offlineSync.getOnlineStatus());
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [showSyncQueueModal, setShowSyncQueueModal] = useState<boolean>(false);
  const [syncQueueList, setSyncQueueList] = useState<OfflineSyncTicket[]>([]);

  // ----------------------------------------------------
  // Search & Filtering State
  // ----------------------------------------------------
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Extract categories dynamically
  const categories = useMemo(() => {
    const set = new Set<string>();
    inventory.forEach((item) => {
      if (item.category && item.category.trim() !== "") {
        set.add(item.category.trim());
      }
    });
    return Array.from(set);
  }, [inventory]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) {
      return inventory.filter((item) => {
        return (
          selectedCategory === "all" ||
          (selectedCategory === "uncategorized" && (!item.category || item.category.trim() === "")) ||
          (item.category && item.category.toLowerCase() === selectedCategory.toLowerCase())
        );
      });
    }

    const strippedQ = q.replace(/^0+/, "");

    return inventory.filter((item) => {
      const skuClean = item.sku.toLowerCase().trim();
      const skuStripped = skuClean.replace(/^0+/, "");

      // Check if search matches a barcode or SKU (with or without leading zeros)
      const isBarcodeOrSkuMatch =
        skuClean === q ||
        (skuStripped !== "" && strippedQ !== "" && skuStripped === strippedQ) ||
        skuClean.includes(q) ||
        item.lookupCodes?.some((code) => {
          const c = code.toLowerCase().trim();
          const cStripped = c.replace(/^0+/, "");
          return (
            c === q ||
            (cStripped !== "" && strippedQ !== "" && cStripped === strippedQ) ||
            c.includes(q) ||
            (cStripped.length >= 6 && strippedQ.length >= 6 && (cStripped.includes(strippedQ) || strippedQ.includes(cStripped)))
          );
        });

      // Bypasses category filter if the query matches a barcode or SKU
      if (isBarcodeOrSkuMatch) {
        return true;
      }

      // Title or description text search respects selected category
      const matchCat =
        selectedCategory === "all" ||
        (selectedCategory === "uncategorized" && (!item.category || item.category.trim() === "")) ||
        (item.category && item.category.toLowerCase() === selectedCategory.toLowerCase());

      if (!matchCat) return false;

      return item.description.toLowerCase().includes(q);
    });
  }, [inventory, searchQuery, selectedCategory]);

  // ----------------------------------------------------
  // Live Ticket / Cart State
  // ----------------------------------------------------
  const defaultCustomerName = isEs ? "Consumidor Final" : "Walk-in Customer";
  const [cart, setCart] = useState<CartItem[]>([]);
  const [mobileActiveTab, setMobileActiveTab] = useState<"catalog" | "cart">("catalog");
  const [selectedCustomer, setSelectedCustomer] = useState<{
    id?: string;
    name: string;
    rtn?: string;
  }>({
    name: defaultCustomerName,
    rtn: "",
  });
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [newCustomerForm, setNewCustomerForm] = useState({ name: "", rtn: "", phone: "", email: "" });

  // Update default customer name when language changes if still on default
  useEffect(() => {
    setSelectedCustomer((prev) => {
      if (prev.name === "Consumidor Final" || prev.name === "Walk-in Customer") {
        return { ...prev, name: isEs ? "Consumidor Final" : "Walk-in Customer" };
      }
      return prev;
    });
  }, [isEs]);

  // Parked Orders ("En Espera")
  const [parkedTickets, setParkedTickets] = useState<ParkedTicket[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("prado_pos_parked_tickets");
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return [];
  });
  const [showParkedModal, setShowParkedModal] = useState(false);
  const [parkedSearchQuery, setParkedSearchQuery] = useState("");
  const [showVoidModal, setShowVoidModal] = useState(false);
  const [voidReason, setVoidReason] = useState<string>("Cliente desistió de la compra");
  const [voidFeedbackMessage, setVoidFeedbackMessage] = useState<string | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem("prado_pos_parked_tickets", JSON.stringify(parkedTickets));
    } catch {}
  }, [parkedTickets]);

  // ----------------------------------------------------
  // Barcode Auto-detection & Audio Feedback
  // ----------------------------------------------------
  const [scanFeedback, setScanFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  useEffect(() => {
    if (!scanFeedback) return;
    const timer = setTimeout(() => {
      setScanFeedback(null);
    }, scanFeedback.type === "error" ? 4500 : 2500);
    return () => clearTimeout(timer);
  }, [scanFeedback]);

  // Audio tone synthesizer for scanner feedback (pure Web Audio, zero external assets)
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

  // Helper to find a product by barcode or SKU with leading zero and check-digit tolerance
  const findScannedProduct = useCallback(
    (queryRaw: string): InventoryItem | undefined => {
      const query = queryRaw.trim().toLowerCase();
      if (!query) return undefined;
      const queryStripped = query.replace(/^0+/, "");

      // 1. Exact match on SKU or any lookupCode
      const exact = inventory.find((item) => {
        if (item.sku.trim().toLowerCase() === query) return true;
        return item.lookupCodes?.some((code) => code.trim().toLowerCase() === query);
      });
      if (exact) return exact;

      // 2. Normalized match with leading zeros stripped (e.g. UPC-A 12 vs EAN-13 13 digits)
      if (queryStripped) {
        const strippedMatch = inventory.find((item) => {
          const skuStripped = item.sku.trim().toLowerCase().replace(/^0+/, "");
          if (skuStripped && skuStripped === queryStripped) return true;
          return item.lookupCodes?.some((code) => {
            const codeStripped = code.trim().toLowerCase().replace(/^0+/, "");
            return Boolean(codeStripped && codeStripped === queryStripped);
          });
        });
        if (strippedMatch) return strippedMatch;
      }

      // 3. Check-digit tolerance (if barcode length >= 8 and differs only by 1 suffix digit)
      if (queryStripped && queryStripped.length >= 8) {
        const checkDigitMatch = inventory.find((item) => {
          return item.lookupCodes?.some((code) => {
            const codeStripped = code.trim().toLowerCase().replace(/^0+/, "");
            if (codeStripped && Math.abs(codeStripped.length - queryStripped.length) === 1) {
              const minLen = Math.min(codeStripped.length, queryStripped.length);
              return codeStripped.slice(0, minLen) === queryStripped.slice(0, minLen);
            }
            return false;
          });
        });
        if (checkDigitMatch) return checkDigitMatch;
      }

      return undefined;
    },
    [inventory]
  );

  const barcodeBufferRef = useRef<string>("");
  const lastKeyTimeRef = useRef<number>(0);
  const handleAddToCartRef = useRef<(product: InventoryItem) => void>(() => {});

  const handleProcessBarcode = useCallback(
    (rawCandidate: string) => {
      const candidate = rawCandidate.trim();
      if (candidate.length < 2) return false;

      const matchedItem = findScannedProduct(candidate);
      if (matchedItem) {
        handleAddToCartRef.current(matchedItem);
        playScanBeep();
        setScanFeedback({
          type: "success",
          message: isEs
            ? `"${matchedItem.description}" agregado a la venta`
            : `"${matchedItem.description}" added to sale`,
        });
        if (searchInputRef.current) {
          searchInputRef.current.value = "";
        }
        setSearchQuery("");
        return true;
      } else {
        playScanErrorBeep();
        setScanFeedback({
          type: "error",
          message: isEs
            ? `Código no encontrado: "${candidate}"`
            : `Barcode not found: "${candidate}"`,
        });
        return false;
      }
    },
    [findScannedProduct, isEs]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target &&
        target.tagName === "INPUT" &&
        target !== searchInputRef.current
      ) {
        return;
      }

      const now = Date.now();
      const diff = now - lastKeyTimeRef.current;
      lastKeyTimeRef.current = now;

      // Scanners send keys rapidly (< 80ms) and end with Enter
      if (e.key === "Enter") {
        const candidate =
          barcodeBufferRef.current.trim() ||
          (target === searchInputRef.current ? searchInputRef.current.value.trim() : (searchInputRef.current?.value || searchQuery).trim());

        barcodeBufferRef.current = "";

        if (candidate.length >= 2) {
          e.preventDefault();
          handleProcessBarcode(candidate);
        }
      } else if (e.key.length === 1) {
        // Scanners with inter-character delays up to 120ms
        if (diff > 120) {
          barcodeBufferRef.current = e.key;
        } else {
          barcodeBufferRef.current += e.key;
        }
      }

      // F2 shortcut to jump to barcode/search input
      if (e.key === "F2") {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleProcessBarcode, searchQuery]);

  // ----------------------------------------------------
  // Dynamic Tax Rate from Settings (Tax Settings & POS Settings)
  // ----------------------------------------------------
  const [localTaxPercent, setLocalTaxPercent] = useState<number | null>(null);

  useEffect(() => {
    const readStorageTax = () => {
      try {
        const saved = localStorage.getItem("prado_tax_settings");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed.taxCategories) && parsed.taxCategories.length > 0) {
            const cat =
              parsed.taxCategories.find((c: any) => c.code === "GEN" || c.name?.toLowerCase().includes("general")) ||
              parsed.taxCategories[0];
            const parsedRate = parseFloat(cat.defaultRate);
            if (!isNaN(parsedRate) && parsedRate >= 0) {
              setLocalTaxPercent(parsedRate);
              return;
            }
          }
        }
      } catch {}
      setLocalTaxPercent(null);
    };

    readStorageTax();

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "prado_tax_settings") {
        readStorageTax();
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const configuredTaxPercent = useMemo(() => {
    // 1. Check posSettings defaultTaxRate
    if (typeof posSettings?.defaultTaxRate === "number" && !isNaN(posSettings.defaultTaxRate)) {
      return posSettings.defaultTaxRate;
    }

    // 2. Read from localTaxPercent (from Dashboard > Settings > Tax)
    if (localTaxPercent !== null) {
      return localTaxPercent;
    }

    // 3. Fallback standard default: 15%
    return 15;
  }, [posSettings, localTaxPercent]);

  const displayTaxPercent = useMemo(() => {
    const rounded = Math.round(configuredTaxPercent * 100) / 100;
    return rounded.toString();
  }, [configuredTaxPercent]);

  const configuredTaxRate = configuredTaxPercent / 100;

  const isProductTaxable = useCallback((product?: { taxable?: boolean | string | number | null } | null): boolean => {
    if (!product) return true;
    if (
      product.taxable === false ||
      product.taxable === "false" ||
      product.taxable === 0 ||
      product.taxable === "0"
    ) {
      return false;
    }
    return true;
  }, []);

  const getProductTaxRate = useCallback(
    (product: { taxable?: boolean | string | number | null; category?: string | null }) => {
      // INDIVIDUAL OVERRIDE: If product is marked as no tax, tax is strictly 0%
      if (!isProductTaxable(product)) {
        return 0;
      }

      // Check if category has a matching rate in taxCategories
      if (product.category && typeof window !== "undefined") {
        try {
          const saved = localStorage.getItem("prado_tax_settings");
          if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed.taxCategories)) {
              const matched = parsed.taxCategories.find(
                (c: any) =>
                  c.name?.toLowerCase() === product.category?.toLowerCase() ||
                  c.code?.toLowerCase() === product.category?.toLowerCase()
              );
              if (matched) {
                const r = parseFloat(matched.defaultRate);
                if (!isNaN(r) && r >= 0) return r / 100;
              }
            }
          }
        } catch {}
      }

      return configuredTaxRate;
    },
    [configuredTaxRate, isProductTaxable]
  );

  // Sync active cart line items whenever configuredTaxRate or inventory updates
  useEffect(() => {
    setCart((prev) => {
      let changed = false;
      const updated = prev.map((item) => {
        const prod = inventory.find((p) => p.id === item.productId || p.sku === item.sku);
        const itemTaxable = prod ? isProductTaxable(prod) : isProductTaxable(item);
        const correctRate = itemTaxable ? getProductTaxRate(prod || item) : 0;
        if (item.taxRate !== correctRate || item.taxable !== itemTaxable) {
          changed = true;
          return { ...item, taxable: itemTaxable, taxRate: correctRate };
        }
        return item;
      });
      return changed ? updated : prev;
    });
  }, [configuredTaxRate, inventory, getProductTaxRate, isProductTaxable]);

  // ----------------------------------------------------
  // Cart Actions
  // ----------------------------------------------------
  const handleAddToCart = useCallback((product: InventoryItem) => {
    if (product.quantity <= 0 && !allowZeroInventorySales) {
      alert(isEs ? "Este producto no tiene inventario disponible." : "This product has no inventory available.");
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      if (existing) {
        const nextQty = existing.quantity + 1;
        return prev.map((item) =>
          item.id === existing.id
            ? { ...item, quantity: nextQty }
            : item
        );
      }

      const itemTaxable = isProductTaxable(product);
      const newItem: CartItem = {
        id: `line-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        productId: product.id,
        sku: product.sku,
        description: product.description,
        price: Number(product.price) || 0,
        selectedTier: "P1",
        quantity: 1,
        taxable: itemTaxable,
        taxRate: itemTaxable ? getProductTaxRate(product) : 0,
        trackingType: product.trackingType,
        imageUrl: product.imageUrl,
        maxStock: product.quantity,
      };

      return [newItem, ...prev];
    });
  }, [allowZeroInventorySales, getProductTaxRate, isEs, isProductTaxable]);

  useEffect(() => {
    handleAddToCartRef.current = handleAddToCart;
  }, [handleAddToCart]);

  const handleUpdateQuantity = (cartId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id === cartId) {
            const nextQty = item.quantity + delta;
            return nextQty > 0 ? { ...item, quantity: nextQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const handleSetExactQuantity = (cartId: string, qty: number) => {
    if (qty <= 0) {
      handleRemoveItem(cartId);
      return;
    }
    setCart((prev) =>
      prev.map((item) => (item.id === cartId ? { ...item, quantity: qty } : item))
    );
  };

  const handleRemoveItem = (cartId: string) => {
    setCart((prev) => prev.filter((item) => item.id !== cartId));
  };

  const handleClearCart = () => {
    setCart([]);
  };

  const handleSelectPriceTier = (cartId: string, tier: "P1" | "P2" | "P3") => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.id !== cartId) return item;
        const prod = inventory.find((p) => p.id === item.productId);
        if (!prod) return item;
        let newPrice = prod.price;
        if (tier === "P2" && prod.price2 && prod.price2 > 0) newPrice = prod.price2;
        if (tier === "P3" && prod.price3 && prod.price3 > 0) newPrice = prod.price3;
        return { ...item, price: newPrice, selectedTier: tier };
      })
    );
  };

  // ----------------------------------------------------
  // Park Order / En Espera
  // ----------------------------------------------------
  const handleParkOrder = (customNotes?: string) => {
    if (cart.length === 0) return;
    const holdDurationMinutes = posSettings?.holdDurationMinutes !== undefined && posSettings?.holdDurationMinutes !== null
      ? posSettings.holdDurationMinutes
      : 60;
    const now = Date.now();
    const expiresAt = holdDurationMinutes > 0 ? new Date(now + holdDurationMinutes * 60 * 1000).toISOString() : null;

    const ticket: ParkedTicket = {
      id: `parked-${now}`,
      ticketNumber: `TK-${Math.floor(1000 + Math.random() * 9000)}`,
      createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      createdTimestamp: now,
      expiresAt,
      customerName: selectedCustomer.name,
      customerId: selectedCustomer.id,
      customerRtn: selectedCustomer.rtn,
      items: [...cart],
      total: cartTotals.total,
      notes: typeof customNotes === "string" ? customNotes : undefined,
    };
    setParkedTickets((prev) => [ticket, ...prev]);
    setCart([]);
    setSelectedCustomer({ name: isEs ? "Consumidor Final" : "Walk-in Customer", rtn: "" });
  };

  const handleRestoreParkedOrder = (ticket: ParkedTicket) => {
    setCart(ticket.items);
    setSelectedCustomer({
      id: ticket.customerId,
      name: ticket.customerName,
      rtn: ticket.customerRtn || "",
    });
    setParkedTickets((prev) => prev.filter((t) => t.id !== ticket.id));
    setShowParkedModal(false);
  };

  const handleDeleteParkedOrder = (ticketId: string) => {
    setParkedTickets((prev) => prev.filter((t) => t.id !== ticketId));
  };

  const handleDiscardExpiredParkedOrders = () => {
    const now = Date.now();
    setParkedTickets((prev) => prev.filter((t) => {
      if (!t.expiresAt) return true;
      return new Date(t.expiresAt).getTime() > now;
    }));
  };

  const handleConfirmVoidSale = () => {
    if (cart.length === 0) return;
    const voidLog = {
      id: `void-${Date.now()}`,
      timestamp: new Date().toISOString(),
      cashier: activeCashierName || (isEs ? "Cajero Principal" : "Main Cashier"),
      register: activeRegister,
      customerName: selectedCustomer.name,
      itemsCount: cartTotals.totalItems,
      total: cartTotals.total,
      reason: voidReason,
    };

    try {
      const existing = localStorage.getItem("prado_pos_void_audit_log");
      const list = existing ? JSON.parse(existing) : [];
      list.unshift(voidLog);
      localStorage.setItem("prado_pos_void_audit_log", JSON.stringify(list.slice(0, 100)));
    } catch {}

    setCart([]);
    setSelectedCustomer({ name: isEs ? "Consumidor Final" : "Walk-in Customer", rtn: "" });
    setShowVoidModal(false);
    setVoidFeedbackMessage(
      isEs
        ? "Venta anulada correctamente (Sin registrar venta ni alterar caja)."
        : "Sale voided successfully (No sale recorded, cash unaffected)."
    );
    setTimeout(() => setVoidFeedbackMessage(null), 4000);
  };

  // ----------------------------------------------------
  // Totals Calculation
  // ----------------------------------------------------
  const cartTotals = useMemo(() => {
    let subtotal = 0;
    let isv15 = 0;

    cart.forEach((item) => {
      const lineSubtotal = item.price * item.quantity;
      subtotal += lineSubtotal;
      if (item.taxable !== false && item.taxRate > 0) {
        isv15 += lineSubtotal * item.taxRate;
      }
    });

    const total = subtotal + isv15;
    const totalItems = cart.reduce((acc, curr) => acc + curr.quantity, 0);

    return {
      subtotal,
      isv15,
      total,
      totalItems,
    };
  }, [cart]);

  // ----------------------------------------------------
  // Checkout & Payment Modal State
  // ----------------------------------------------------
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"EFECTIVO" | "TARJETA" | "TRANSFERENCIA" | "CREDITO">("EFECTIVO");
  const [amountReceived, setAmountReceived] = useState<string>("");
  const [convenienceFeePercent, setConvenienceFeePercent] = useState<string>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("prado_pos_card_fee_percent");
        if (saved) return saved;
        // Fallback check old key format if migrated
        const oldSaved = localStorage.getItem("prado_pos_saved_convenience_fee");
        if (oldSaved) {
          const parsed = JSON.parse(oldSaved);
          if (parsed && typeof parsed.percent === "number") return parsed.percent.toString();
        }
      } catch {}
    }
    return "";
  });

  const handleUpdateFeePercent = useCallback((val: string) => {
    setConvenienceFeePercent(val);
    if (typeof window !== "undefined") {
      try {
        if (val && parseFloat(val) > 0) {
          localStorage.setItem("prado_pos_card_fee_percent", val);
        } else {
          localStorage.removeItem("prado_pos_card_fee_percent");
        }
      } catch {}
    }
  }, []);
  const [documentType, setDocumentType] = useState<"TICKET" | "SAR_INVOICE">("TICKET");

  // Active Register & Shift/Cashier State with localStorage persistence
  const [activeRegister, setActiveRegister] = useState<string>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("prado_pos_active_shift");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.registerName) return parsed.registerName;
        }
      } catch {}
    }
    return isEs ? "Caja 01 - Principal" : "Register 01 - Main";
  });

  const [selectedSalesRep, setSelectedSalesRep] = useState<string>(() => {
    if (activeCashierName) {
      return activeCashierName;
    }
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("prado_pos_active_shift");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.cashierName) return parsed.cashierName;
        }
      } catch {}
    }
    return salesReps.length > 0 ? salesReps[0].name : (isEs ? "Cajero Principal" : "Main Cashier");
  });

  useEffect(() => {
    if (activeCashierName) {
      setSelectedSalesRep(activeCashierName);
    }
  }, [activeCashierName]);

  // Modal to change Register & Cashier
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [tempRegister, setTempRegister] = useState(activeRegister);
  const [tempCashier, setTempCashier] = useState(selectedSalesRep);
  const [registerSearchQuery, setRegisterSearchQuery] = useState("");
  const [cashierSearchQuery, setCashierSearchQuery] = useState("");
  const [isRegisterSearchOpen, setIsRegisterSearchOpen] = useState(false);
  const [isCashierSearchOpen, setIsCashierSearchOpen] = useState(false);

  const handleOpenShiftModal = () => {
    setTempRegister(activeRegister);
    setTempCashier(selectedSalesRep);
    setRegisterSearchQuery("");
    setCashierSearchQuery("");
    setIsRegisterSearchOpen(false);
    setIsCashierSearchOpen(false);
    setShowShiftModal(true);
  };

  const handleSaveShiftConfig = () => {
    const defaultReg = isEs ? "Caja 01 - Principal" : "Register 01 - Main";
    const defaultCashier = isEs ? "Cajero Principal" : "Main Cashier";
    const finalRegister = tempRegister || defaultReg;
    const finalCashier = tempCashier.trim() || defaultCashier;
    setActiveRegister(finalRegister);
    setSelectedSalesRep(finalCashier);
    try {
      localStorage.setItem(
        "prado_pos_active_shift",
        JSON.stringify({ registerName: finalRegister, cashierName: finalCashier })
      );
    } catch {}
    setShowShiftModal(false);
  };

  // ----------------------------------------------------
  // Dynamic Cashier PIN Verification State & Handlers
  // ----------------------------------------------------
  const [pinModal, setPinModal] = useState<{
    isOpen: boolean;
    cashierName: string;
    expectedPin: string;
    reason: "switch" | "checkout";
    targetAction?: () => void;
  } | null>(null);
  const [enteredPin, setEnteredPin] = useState("");
  const [pinError, setPinError] = useState(false);

  const handlePinKeyPress = (digit: string) => {
    if (pinError) setPinError(false);
    if (!pinModal) return;
    if (enteredPin.length < 8) {
      const next = enteredPin + digit;
      setEnteredPin(next);
      if (next.length === pinModal.expectedPin.length) {
        if (next === pinModal.expectedPin) {
          const action = pinModal.targetAction;
          setPinModal(null);
          setEnteredPin("");
          setPinError(false);
          if (action) action();
        } else {
          setPinError(true);
          setTimeout(() => {
            setEnteredPin("");
          }, 450);
        }
      }
    }
  };

  const handlePinBackspace = () => {
    if (pinError) setPinError(false);
    setEnteredPin((prev) => prev.slice(0, -1));
  };

  const handlePinClear = () => {
    if (pinError) setPinError(false);
    setEnteredPin("");
  };

  const handleVerifyPin = () => {
    if (!pinModal) return;
    if (enteredPin === pinModal.expectedPin) {
      const action = pinModal.targetAction;
      setPinModal(null);
      setEnteredPin("");
      setPinError(false);
      if (action) action();
    } else {
      setPinError(true);
      setTimeout(() => {
        setEnteredPin("");
      }, 450);
    }
  };

  // Keyboard shortcut listener for PIN pad
  useEffect(() => {
    if (!pinModal) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= "0" && e.key <= "9") {
        e.preventDefault();
        handlePinKeyPress(e.key);
      } else if (e.key === "Backspace") {
        e.preventDefault();
        handlePinBackspace();
      } else if (e.key === "Escape") {
        e.preventDefault();
        setPinModal(null);
        setEnteredPin("");
        setPinError(false);
      } else if (e.key === "Enter") {
        e.preventDefault();
        handleVerifyPin();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [pinModal, enteredPin]);

  const handleSelectCashierWithPinCheck = (rep: SalesRep) => {
    const matchingCashier = posSettings?.cashiers?.find(
      (c) => c.name.toLowerCase() === rep.name.toLowerCase() || c.id === rep.id
    );
    const configuredPin = (matchingCashier?.pin || (rep.code && !["000", "001", "002"].includes(rep.code) ? rep.code : null))?.trim();

    if (configuredPin) {
      setEnteredPin("");
      setPinError(false);
      setPinModal({
        isOpen: true,
        cashierName: rep.name,
        expectedPin: configuredPin,
        reason: "switch",
        targetAction: () => {
          setTempCashier(rep.name);
          setCashierSearchQuery(rep.name);
          const defaultReg = isEs ? "Caja 01 - Principal" : "Register 01 - Main";
          const finalRegister = tempRegister || defaultReg;
          setActiveRegister(finalRegister);
          setSelectedSalesRep(rep.name);
          try {
            localStorage.setItem(
              "prado_pos_active_shift",
              JSON.stringify({ registerName: finalRegister, cashierName: rep.name })
            );
          } catch {}
          setShowShiftModal(false);
        },
      });
    } else {
      setTempCashier(rep.name);
      setCashierSearchQuery(rep.name);
    }
  };

  // ----------------------------------------------------
  // Sync Status Listener
  // ----------------------------------------------------
  useEffect(() => {
    const unsubscribe = offlineSync.subscribe((state) => {
      setIsOnline(state.isOnline);
      setPendingSyncCount(state.pendingCount);
      setIsSyncing(state.isSyncing);
    });

    offlineSync.getPendingCount().then(setPendingSyncCount);

    return () => {
      unsubscribe();
    };
  }, []);

  const handleOpenSyncQueue = async () => {
    const queue = await getSyncQueue();
    setSyncQueueList(queue);
    setShowSyncQueueModal(true);
  };

  const handleManualSyncNow = async () => {
    setIsSyncing(true);
    const res = await offlineSync.syncNow();
    const updated = await getSyncQueue();
    setSyncQueueList(updated);
    setPendingSyncCount(updated.filter((t) => t.status === "PENDING" || t.status === "FAILED").length);
    setIsSyncing(false);
    if (onRefreshData && res.synced > 0) {
      onRefreshData();
    }
  };

  const handleClearSyncedHistory = async () => {
    await clearSyncedTickets();
    const updated = await getSyncQueue();
    setSyncQueueList(updated);
  };

  // Completed sale state for printing
  const [completedSale, setCompletedSale] = useState<any | null>(null);
  const [isProcessingSale, setIsProcessingSale] = useState(false);

  // Convenience Fee calculation for Card payments (percentage of total)
  const cardFee = useMemo(() => {
    if (paymentMethod !== "TARJETA") return 0;
    const parsedPercent = parseFloat(convenienceFeePercent);
    if (isNaN(parsedPercent) || parsedPercent <= 0) return 0;
    return Math.round(((cartTotals.total * parsedPercent) / 100) * 100) / 100;
  }, [paymentMethod, convenienceFeePercent, cartTotals.total]);

  const payableTotal = useMemo(() => {
    return cartTotals.total + cardFee;
  }, [cartTotals.total, cardFee]);

  const activeCustomerRecord = useMemo(() => {
    if (!selectedCustomer.id || selectedCustomer.id === "default") return null;
    return customers.find((c) => c.id === selectedCustomer.id) || null;
  }, [selectedCustomer.id, customers]);

  const creditValidation = useMemo(() => {
    if (paymentMethod !== "CREDITO") {
      return { isValid: true, error: null };
    }
    if (!activeCustomerRecord) {
      return {
        isValid: false,
        error: isEs
          ? "Para compras a crédito debes seleccionar un cliente registrado (no permitido para Consumidor Final)."
          : "For credit sales you must select a registered customer (not allowed for Walk-in Customer).",
      };
    }
    if (!activeCustomerRecord.allowCredit) {
      return {
        isValid: false,
        error: isEs
          ? `El cliente "${activeCustomerRecord.name}" no tiene compras al crédito autorizadas.`
          : `Customer "${activeCustomerRecord.name}" is not approved for credit purchases.`,
      };
    }
    const limit = Number(activeCustomerRecord.creditLimit || 0);
    const balance = Number(activeCustomerRecord.currentBalance || 0);
    const available = Math.max(0, limit - balance);
    const saleTotal = cartTotals.total;

    if (limit > 0 && saleTotal > available) {
      return {
        isValid: false,
        error: isEs
          ? `Límite de crédito excedido. Disponible: $${available.toFixed(2)} (Límite: $${limit.toFixed(2)}, Deuda actual: $${balance.toFixed(2)}). Total venta: $${saleTotal.toFixed(2)}`
          : `Credit limit exceeded. Available: $${available.toFixed(2)} (Limit: $${limit.toFixed(2)}, Current debt: $${balance.toFixed(2)}). Order: $${saleTotal.toFixed(2)}`,
        limit,
        balance,
        available,
      };
    }

    return {
      isValid: true,
      error: null,
      limit,
      balance,
      available,
      remainingAfterSale: Math.max(0, available - saleTotal),
      creditDays: activeCustomerRecord.creditDays || 30,
    };
  }, [paymentMethod, activeCustomerRecord, isEs, cartTotals.total]);

  const openCheckout = () => {
    if (cart.length === 0) return;
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("prado_pos_card_fee_percent");
        if (saved) {
          setConvenienceFeePercent(saved);
        } else {
          const oldSaved = localStorage.getItem("prado_pos_saved_convenience_fee");
          if (oldSaved) {
            const parsed = JSON.parse(oldSaved);
            if (parsed && typeof parsed.percent === "number") {
              setConvenienceFeePercent(parsed.percent.toString());
            }
          }
        }
      } catch {}
    }
    setAmountReceived(cartTotals.total.toFixed(2));
    setShowCheckoutModal(true);
  };

  const changeDue = useMemo(() => {
    const received = parseFloat(amountReceived) || 0;
    return Math.max(0, received - payableTotal);
  }, [amountReceived, payableTotal]);

  // Quick Cash Denominations
  const quickCashOptions = useMemo(() => {
    const exact = Math.ceil(cartTotals.total);
    return [
      cartTotals.total,
      exact,
      exact <= 50 ? 50 : exact <= 100 ? 100 : exact <= 200 ? 200 : 500,
      exact <= 50 ? 100 : exact <= 100 ? 200 : exact <= 200 ? 500 : 1000,
    ].filter((v, i, a) => a.indexOf(v) === i && v >= cartTotals.total);
  }, [cartTotals.total]);

  // ----------------------------------------------------
  // Process Completed Sale
  // ----------------------------------------------------
  const executeCompleteSale = async () => {
    setIsProcessingSale(true);
    try {
      const ticketNumber = `POS-${Date.now().toString().slice(-6)}`;
      const saleDate = new Date();
      const rep = salesReps.find((r) => r.name.toLowerCase() === selectedSalesRep.toLowerCase() || r.id === selectedSalesRep);
      const finalTotal = payableTotal;

      const invoicePayload = {
        storeId: storeId || undefined,
        customerId: selectedCustomer.id !== "default" ? selectedCustomer.id : undefined,
        invoiceNumber: ticketNumber,
        customerName: selectedCustomer.name || defaultCustomerName,
        customerRtn: selectedCustomer.rtn || null,
        salesRepId: rep ? rep.id : null,
        salesRepName: selectedSalesRep,
        invoiceDate: saleDate.toISOString().split("T")[0],
        dueDate: paymentMethod === "CREDITO" && activeCustomerRecord
          ? new Date(saleDate.getTime() + (activeCustomerRecord.creditDays || 30) * 86400000).toISOString()
          : undefined,
        paymentTerms: paymentMethod === "CREDITO"
          ? (isEs ? `Crédito ${activeCustomerRecord?.creditDays || 30} días` : `Credit ${activeCustomerRecord?.creditDays || 30} days`)
          : (isEs ? "Contado" : "Cash / Immediate"),
        paymentMethod: paymentMethod === "CREDITO" ? (isEs ? "Crédito" : "Credit") : paymentMethod === "TARJETA" ? (isEs ? "Tarjeta" : "Card") : paymentMethod === "TRANSFERENCIA" ? (isEs ? "Transferencia" : "Bank Transfer") : (isEs ? "Efectivo" : "Cash"),
        subtotal: cartTotals.subtotal,
        isv15: cartTotals.isv15,
        convenienceFee: cardFee > 0 ? cardFee : 0,
        total: finalTotal,
        status: paymentMethod === "CREDITO" ? "Pendiente" : "Pagada",
        lines: cart.map((c) => ({
          productId: c.productId,
          sku: c.sku,
          productName: c.description,
          description: c.description,
          quantity: c.quantity,
          rate: c.price,
          amount: c.price * c.quantity,
          selectedLot: c.selectedLot,
          selectedSerial: c.selectedSerial,
        })),
      };

      const saleResult = await offlineSync.recordSale(
        ticketNumber,
        invoicePayload,
        selectedCustomer.name || defaultCustomerName,
        finalTotal
      );

      // Update local inventory state
      if (setInventory) {
        setInventory((prev) => {
          return prev.map((item) => {
            const bought = cart.find((c) => c.productId === item.id);
            if (bought) {
              return { ...item, quantity: Math.max(0, item.quantity - bought.quantity) };
            }
            return item;
          });
        });
      }

      const completed = {
        ticketNumber,
        isOffline: saleResult.isOffline,
        date: saleDate.toLocaleString([], {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        }),
        customerName: selectedCustomer.name,
        customerRtn: selectedCustomer.rtn,
        register: activeRegister,
        cashier: selectedSalesRep,
        items: [...cart],
        subtotal: cartTotals.subtotal,
        isv15: cartTotals.isv15,
        convenienceFee: cardFee > 0 ? cardFee : 0,
        convenienceFeePercent: paymentMethod === "TARJETA" && cardFee > 0 ? (parseFloat(convenienceFeePercent) || 0) : 0,
        total: finalTotal,
        paymentMethod,
        taxRatePercent: configuredTaxPercent,
        amountReceived: paymentMethod === "EFECTIVO" ? (parseFloat(amountReceived) || finalTotal) : finalTotal,
        changeDue: paymentMethod === "EFECTIVO" ? changeDue : 0,
      };

      setCompletedSale(completed);
      setCart([]);
      setShowCheckoutModal(false);
      if (onRefreshData) {
        await onRefreshData();
      }
    } catch (err) {
      console.error("Error processing POS sale:", err);
      alert(err instanceof Error ? err.message : (isEs ? "No se pudo completar la venta." : "Could not complete the sale."));
    } finally {
      setIsProcessingSale(false);
    }
  };

  const handleCompleteSale = async () => {
    if (cart.length === 0) return;

    if (!selectedSalesRep || !selectedSalesRep.trim()) {
      alert(isEs ? "Debe seleccionar un cajero o vendedor antes de completar la venta." : "Please select a cashier or sales rep before completing sale.");
      setShowShiftModal(true);
      return;
    }

    // Security PIN authorization if requireCashierPin is enabled in store preferences
    if (posSettings?.requireCashierPin && (!isCashier || selectedSalesRep.toLowerCase() !== activeCashierName?.toLowerCase())) {
      const matchingCashier = posSettings?.cashiers?.find(
        (c) => c.name.toLowerCase() === selectedSalesRep.toLowerCase()
      );
      const cashierPin = (matchingCashier?.pin || (salesReps.find((r) => r.name.toLowerCase() === selectedSalesRep.toLowerCase())?.code))?.trim();

      if (cashierPin && !["000", "001", "002"].includes(cashierPin)) {
        setEnteredPin("");
        setPinError(false);
        setPinModal({
          isOpen: true,
          cashierName: selectedSalesRep,
          expectedPin: cashierPin,
          reason: "checkout",
          targetAction: () => {
            executeCompleteSale();
          },
        });
        return;
      }
    }

    executeCompleteSale();
  };

  const handlePrintTicket = () => {
    window.print();
  };

  return (
    <div
      ref={containerRef}
      className={`flex flex-col bg-slate-100 overflow-hidden select-none overscroll-none transition-all duration-150 ${
        isFullscreen
          ? "fixed inset-0 z-50 w-full h-full rounded-none border-0"
          : isStandalone
          ? "w-full h-screen min-h-[640px] rounded-none border-0"
          : "w-full h-[calc(100vh-5rem)] min-h-[640px] rounded-lg border border-slate-200 shadow-sm"
      }`}
      style={{
        overscrollBehavior: "none",
        touchAction: "pan-x pan-y",
      }}
    >
      {/* ================= 1. TOP OPERATIONAL BAR (Prado Commerce Theme) ================= */}
      <div className="bg-[#0c1624] text-white border-b border-slate-800 shadow-sm z-10 shrink-0">
        {/* Row 1: Back, Title & Shift info, and Desktop controls */}
        <div className="px-3 py-2 sm:px-4 sm:py-2.5 flex items-center justify-between gap-2 sm:gap-3">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {onNavigateBack && (
              <button
                type="button"
                onClick={onNavigateBack}
                className="p-1.5 rounded-md bg-white/10 hover:bg-white/20 text-white transition cursor-pointer shrink-0"
                title={isEs ? "Volver a Pedidos" : "Back to Orders"}
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-bold text-xs sm:text-sm tracking-wide whitespace-nowrap text-cyan-400">
                {isEs ? "Punto de Venta (POS)" : "Point of Sale (POS)"}
              </span>

              {/* Selector de Tienda Activa */}
              {!isCashier && stores && stores.length > 1 ? (
                <div className="flex items-center gap-1.5 bg-slate-800/90 hover:bg-slate-700/90 px-2 py-1 rounded-md border border-slate-700 text-[11px] text-white">
                  <Store className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <select
                    value={activeStoreId}
                    onChange={(e) => onSelectStore?.(e.target.value)}
                    className="bg-transparent text-xs font-semibold text-white focus:outline-none cursor-pointer"
                  >
                    {stores.map((s) => (
                      <option key={s.id} value={s.id} className="bg-slate-900 text-white">
                        {s.name} ({s.currency})
                      </option>
                    ))}
                  </select>
                </div>
              ) : stores && stores.length === 1 ? (
                <div className="hidden sm:flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1 rounded-md border border-slate-700 text-[11px] text-slate-300">
                  <Store className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span className="font-semibold text-slate-200 truncate max-w-[140px]">
                    {stores[0].name} ({stores[0].currency})
                  </span>
                </div>
              ) : null}
              <button
                type="button"
                onClick={handleOpenShiftModal}
                className="flex items-center gap-1.5 text-[11px] text-slate-200 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 px-2.5 py-1 rounded-md border border-slate-700 transition cursor-pointer group whitespace-nowrap truncate max-w-[150px] sm:max-w-none"
                title={isEs ? "Haz clic para seleccionar otra caja u otro cajero" : "Click to select another register or cashier"}
              >
                <span className="font-semibold text-cyan-400 truncate">{activeRegister}</span>
                <span className="text-slate-500 hidden xs:inline">•</span>
                <span className="truncate max-w-[100px] sm:max-w-[150px] hidden xs:inline text-slate-300">{selectedSalesRep}</span>
                <ChevronDown className="w-3 h-3 text-slate-400 group-hover:text-white transition-transform shrink-0" />
              </button>
              <a
                href={`/dashboard/settings/pos${storeId ? `?storeId=${storeId}` : ""}`}
                className="p-1.5 rounded-md bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition cursor-pointer shrink-0"
                title={isEs ? "Configuración de Cajas y Cajeros" : "POS Settings & Registers"}
              >
                <Settings className="w-3.5 h-3.5" />
              </a>
              <a
                href={`/dashboard/reports/day-end${storeId ? `?storeId=${storeId}` : ""}`}
                className="flex items-center gap-1.5 p-1.5 sm:px-2 rounded-md bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition cursor-pointer shrink-0"
                title={isEs ? "Cierre de Día (Day End Report)" : "Day End Report"}
              >
                <Calculator className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-[11px] font-semibold text-slate-200 hidden sm:inline">
                  {isEs ? "Cierre de Día" : "Day End"}
                </span>
              </a>
            </div>
          </div>

          {/* Desktop Controls (Hidden on Mobile) */}
          <div className="hidden md:flex items-center gap-2.5">
            {/* Indicador de Red / Offline */}
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold border transition ${
                isOnline
                  ? "bg-emerald-500/20 border-emerald-400/40 text-emerald-300"
                  : "bg-amber-500/20 border-amber-400/40 text-amber-300 animate-pulse"
              }`}
              title={isOnline ? (isEs ? "Conectado al servidor central" : "Connected to store server") : (isEs ? "Sin conexión a internet: operando en modo local (offline)" : "No internet connection: operating in offline local mode")}
            >
              {isOnline ? (
                <>
                  <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden xl:inline">{isEs ? "En Línea" : "Online"}</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-amber-400" />
                  <span>{isEs ? "Modo Offline" : "Offline Mode"}</span>
                </>
              )}
            </div>

            {/* Botón de Cola de Sincronización */}
            <button
              type="button"
              onClick={handleOpenSyncQueue}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold border transition cursor-pointer ${
                pendingSyncCount > 0
                  ? "bg-amber-500/20 border-amber-400/40 text-amber-200 hover:bg-amber-500/30 shadow-xs"
                  : "bg-slate-800/80 border-slate-700 text-slate-200 hover:bg-slate-700"
              }`}
              title={isEs ? "Ver cola de sincronización offline" : "View offline sync queue"}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin text-cyan-400" : ""}`} />
              <span className="hidden xl:inline">
                {pendingSyncCount > 0
                  ? `${pendingSyncCount} ${pendingSyncCount === 1 ? (isEs ? "pendiente" : "pending") : (isEs ? "pendientes" : "pending")}`
                  : (isEs ? "Sincronizado" : "Synced")}
              </span>
              {pendingSyncCount > 0 && (
                <span className="xl:hidden bg-amber-400 text-slate-900 text-[10px] font-extrabold px-1.5 py-0.2 rounded-full">
                  {pendingSyncCount}
                </span>
              )}
            </button>

            {/* Global Barcode Scanner Search Bar */}
            <div className="relative w-64 md:w-80 lg:w-96 hidden sm:block">
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleProcessBarcode(searchQuery);
                  }
                }}
                placeholder={isEs ? "Escanear código de barra o buscar producto (F2)..." : "Scan barcode or search product (F2)..."}
                className="w-full bg-slate-800/80 hover:bg-slate-800 focus:bg-slate-900 text-slate-100 placeholder:text-slate-400 text-xs rounded-md pl-9 pr-8 py-2 transition outline-none border border-slate-700 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/30"
              />
              <ScanBarcode className="w-4 h-4 text-cyan-400 absolute left-3 top-2.5 pointer-events-none" />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Parked Tickets Button */}
            <button
              type="button"
              onClick={() => setShowParkedModal(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold border border-slate-700 transition cursor-pointer"
              title={isEs ? "Ver tickets pausados en espera" : "View parked / held tickets"}
            >
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden xl:inline">{isEs ? "En Espera" : "Hold"}</span>
              {parkedTickets.length > 0 && (
                <span className="w-4 h-4 rounded-full bg-cyan-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {parkedTickets.length}
                </span>
              )}
            </button>

            {/* Fullscreen Toggle */}
            <button
              type="button"
              onClick={toggleFullscreen}
              className="p-1.5 rounded-md bg-slate-800/80 hover:bg-slate-700 text-slate-200 transition cursor-pointer border border-slate-700"
              title={isFullscreen ? (isEs ? "Salir de pantalla completa" : "Exit full screen") : (isEs ? "Pantalla completa" : "Full screen")}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Row 2: Mobile Search Bar & Quick Controls (Mobile Only) */}
        <div className="px-3 pb-2 flex sm:hidden items-center gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleProcessBarcode(searchQuery);
                }
              }}
              placeholder={isEs ? "Buscar producto o SKU..." : "Search product or SKU..."}
              className="w-full bg-slate-800/80 text-white placeholder:text-slate-400 text-xs rounded-md pl-8 pr-7 py-1.5 outline-none border border-slate-700 focus:border-cyan-500"
            />
            <Search className="w-3.5 h-3.5 text-cyan-400 absolute left-2.5 top-2 pointer-events-none" />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-2 text-slate-400 hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <div
            className={`flex items-center gap-1 px-2 py-1.5 rounded-md text-[10px] font-bold border ${
              isOnline
                ? "bg-emerald-500/20 border-emerald-400/40 text-emerald-300"
                : "bg-amber-500/20 border-amber-400/40 text-amber-300"
            }`}
          >
            {isOnline ? <Wifi className="w-3.5 h-3.5 text-emerald-400" /> : <WifiOff className="w-3.5 h-3.5 text-amber-400" />}
          </div>

          <button
            type="button"
            onClick={handleOpenSyncQueue}
            className="p-1.5 rounded-md bg-slate-800/80 border border-slate-700 text-slate-200 relative"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin text-cyan-400" : ""}`} />
            {pendingSyncCount > 0 && (
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-amber-400 text-slate-900 text-[8px] font-black rounded-full flex items-center justify-center">
                {pendingSyncCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setShowParkedModal(true)}
            className="p-1.5 rounded-md bg-slate-800/80 border border-slate-700 text-slate-200 relative"
          >
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            {parkedTickets.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-cyan-500 text-white text-[10px] font-bold flex items-center justify-center absolute -top-1 -right-1">
                {parkedTickets.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Offline Alert Strip */}
      {!isOnline && (
        <div className="bg-amber-500 text-slate-950 px-4 py-1.5 text-xs font-bold flex items-center justify-between shrink-0 shadow-inner">
          <div className="flex items-center gap-2">
            <WifiOff className="w-4 h-4" />
            <span>
              {isEs
                ? "Operando en modo local (sin internet). Las ventas se guardan en este dispositivo y se subirán automáticamente al reconectar."
                : "Operating in offline local mode. Sales are stored on this device and will sync automatically when back online."}
            </span>
          </div>
          <button
            type="button"
            onClick={handleOpenSyncQueue}
            className="underline hover:text-white cursor-pointer shrink-0 ml-2"
          >
            {isEs ? "Ver cola" : "View queue"} ({pendingSyncCount})
          </button>
        </div>
      )}

      {/* Barcode Scanner Feedback Alert Strip */}
      {scanFeedback && (
        <div
          className={`px-4 py-2 text-xs font-semibold flex items-center justify-between shrink-0 shadow-sm transition-all duration-200 animate-in slide-in-from-top-1 ${
            scanFeedback.type === "success"
              ? "bg-emerald-600 text-white"
              : "bg-rose-600 text-white"
          }`}
        >
          <div className="flex items-center gap-2">
            {scanFeedback.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-200" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-200" />
            )}
            <span>{scanFeedback.message}</span>
            {scanFeedback.type === "error" && (
              <span className="text-[11px] text-rose-100 font-normal hidden sm:inline ml-2">
                {isEs
                  ? "— Comprueba que el código de barras esté asignado a la variante del producto."
                  : "— Ensure the barcode is entered in the variant's Barcodes (Lookups) field."}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => setScanFeedback(null)}
            className="text-white/80 hover:text-white text-xs underline cursor-pointer ml-3 shrink-0"
          >
            {isEs ? "Cerrar" : "Dismiss"}
          </button>
        </div>
      )}

      <div className="flex min-h-0 flex-1 overflow-hidden">
      {/* ================= 2. MAIN WORKSPACE (CATALOG + TICKET) ================= */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* LEFT COLUMN: PRODUCT CATALOG */}
        <div
          className={`flex-1 flex flex-col bg-slate-100 overflow-hidden ${
            mobileActiveTab === "cart" ? "hidden lg:flex" : "flex"
          }`}
        >
          {/* Category Chips Bar */}
          <div className="p-2 sm:px-4 sm:py-2.5 bg-white border-b border-slate-200 flex items-center gap-1.5 overflow-x-auto shrink-0 shadow-2xs">
            <button
              type="button"
              onClick={() => setSelectedCategory("all")}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                selectedCategory === "all"
                  ? "bg-cyan-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {isEs ? "Todos" : "All"} ({inventory.length})
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition whitespace-nowrap cursor-pointer ${
                  selectedCategory.toLowerCase() === cat.toLowerCase()
                    ? "bg-cyan-600 text-white shadow-xs"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Product Cards Grid */}
          <div className="flex-1 p-2 sm:p-4 overflow-y-auto">
            {filteredProducts.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 p-6 text-center">
                <Package className="w-12 h-12 stroke-[1.2] mb-2 text-slate-300" />
                <p className="text-sm font-semibold text-slate-600">
                  {isEs ? "No se encontraron productos" : "No products found"}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {isEs ? "Prueba con otra búsqueda o selecciona otra categoría" : "Try a different search or select another category"}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2 sm:gap-3">
                {filteredProducts.map((product) => {
                  const cartLine = cart.find((c) => c.productId === product.id);
                  const isOutOfStock = product.quantity <= 0;
                  const isUnavailable = isOutOfStock && !allowZeroInventorySales;

                  return (
                    <button
                      key={product.id}
                      type="button"
                      disabled={isUnavailable}
                      onClick={() => handleAddToCart(product)}
                      className={`group relative flex flex-col justify-between text-left p-2.5 sm:p-3 rounded-md border transition duration-150 cursor-pointer ${
                        isUnavailable
                          ? "bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed"
                          : cartLine
                          ? "bg-cyan-50/60 border-cyan-500 shadow-xs"
                          : "bg-white border-slate-200/90 hover:border-cyan-500 hover:shadow-md active:scale-98"
                      }`}
                    >
                      {/* Active Quantity Badge in Cart */}
                      {cartLine && (
                        <div className="absolute -top-2 -right-2 min-w-6 h-6 px-1.5 rounded-full bg-cyan-600 text-white text-xs font-bold flex items-center justify-center shadow-md border-2 border-white z-10 animate-in zoom-in-75">
                          {cartLine.quantity}
                        </div>
                      )}

                      {/* Header: SKU & Stock */}
                      <div>
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="font-mono text-[10px] font-bold text-slate-400 group-hover:text-cyan-600 truncate">
                            {product.sku}
                          </span>
                          <div className="flex items-center gap-1 shrink-0">
                            {!isProductTaxable(product) && (
                              <span className="text-[9px] font-bold px-1 py-0.2 rounded bg-amber-50 text-amber-800 border border-amber-200" title={isEs ? "Exento de impuesto" : "Tax exempt"}>
                                {isEs ? "Exento" : "No Tax"}
                              </span>
                            )}
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                                isOutOfStock
                                  ? "bg-rose-100 text-rose-700"
                                  : product.quantity <= 5
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {isOutOfStock ? (isEs ? "Agotado" : "Out") : `${product.quantity}`}
                            </span>
                          </div>
                        </div>

                        {/* Title & Description */}
                        <p className="font-semibold text-xs text-slate-800 line-clamp-2 leading-tight group-hover:text-cyan-600">
                          {product.description}
                        </p>
                      </div>

                      {/* Price Section */}
                      <div className="mt-2.5 pt-1.5 border-t border-slate-100 flex items-baseline justify-between">
                        <span className="font-mono font-bold text-sm text-cyan-600">
                          {formatCurrency(product.price)}
                        </span>
                        {product.category && (
                          <span className="text-[10px] text-slate-400 truncate max-w-[80px]">
                            {product.category}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: ACTIVE TICKET / CART */}
        <div
          className={`w-full lg:w-96 xl:w-[410px] bg-white border-l border-slate-200 flex flex-col shrink-0 shadow-lg ${
            mobileActiveTab === "catalog" ? "hidden lg:flex" : "flex"
          }`}
        >
          {/* Ticket Header & Customer Bar */}
          <div className="p-3 sm:px-4 bg-slate-50 border-b border-slate-200 shrink-0 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-cyan-600" />
                <h2 className="font-bold text-xs sm:text-sm text-slate-800">
                  {isEs ? "Carrito de Venta" : "Sales Cart"}
                </h2>
                <span className="text-[11px] font-bold text-slate-400 bg-white border border-slate-200 px-2 py-0.2 rounded-full">
                  {cartTotals.totalItems} {isEs ? "art." : "items"}
                </span>
              </div>

              {/* Mobile Back-to-Catalog toggle */}
              <button
                type="button"
                onClick={() => setMobileActiveTab("catalog")}
                className="lg:hidden text-[11px] font-semibold text-cyan-600 hover:text-cyan-700 bg-cyan-50 hover:bg-cyan-100 px-2.5 py-1 rounded-md transition cursor-pointer flex items-center gap-1"
              >
                <ArrowLeft className="w-3 h-3" />
                <span>{isEs ? "Catálogo" : "Catalog"}</span>
              </button>
            </div>

            {/* Customer Selector Ribbon */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowCustomerModal(true)}
                className="flex-1 px-3 py-2 rounded-md bg-white border border-slate-200 hover:border-cyan-500 flex items-center justify-between transition cursor-pointer shadow-2xs text-left"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <User className="w-4 h-4 text-slate-400 shrink-0" />
                  <div className="truncate">
                    <div className="text-xs font-bold text-slate-800 truncate">
                      {selectedCustomer.name}
                    </div>
                    {selectedCustomer.rtn ? (
                      <div className="text-[10px] text-slate-400 font-mono">
                        {isEs ? "RTN:" : "Tax ID:"} {selectedCustomer.rtn}
                      </div>
                    ) : (
                      <div className="text-[10px] text-slate-400">
                        {isEs ? "Cliente Ocasional" : "Direct Sale"}
                      </div>
                    )}
                  </div>
                </div>
                <span className="text-[10px] font-bold text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded">
                  {isEs ? "Cambiar" : "Change"}
                </span>
              </button>
            </div>
          </div>

          {/* Ticket Items List */}
          <div className="flex-1 p-2 sm:p-3 overflow-y-auto space-y-2">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 p-6 text-center">
                <ShoppingCart className="w-12 h-12 stroke-[1.2] mb-2 text-slate-300" />
                <p className="text-sm font-semibold text-slate-600">
                  {isEs ? "El carrito está vacío" : "Your cart is empty"}
                </p>
                <p className="text-xs text-slate-400 mt-0.5 max-w-[200px]">
                  {isEs ? "Haz clic en los productos para agregarlos a la venta" : "Click products on the left or scan barcodes to add"}
                </p>
              </div>
            ) : (
              cart.map((item) => {
                const lineTotal = item.price * item.quantity;
                const currentTier = item.selectedTier || "P1";

                return (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-md bg-white border border-slate-200/90 shadow-2xs space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="font-mono text-[10px] font-bold text-slate-400">
                            {item.sku}
                          </span>
                          {!isProductTaxable(item) && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 border border-amber-200">
                              {isEs ? "Exento" : "No Tax"}
                            </span>
                          )}
                        </div>
                        <p className="font-semibold text-xs text-slate-800 leading-tight">
                          {item.description}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.id)}
                        className="text-slate-300 hover:text-rose-500 transition p-1 cursor-pointer shrink-0"
                        title={isEs ? "Quitar artículo" : "Remove item"}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Price Tiers (P1 / P2 / P3) */}
                    <div className="flex items-center justify-between gap-1 pt-1 border-t border-slate-100 text-[11px]">
                      <div className="flex items-center gap-1">
                        {(() => {
                          const prod = inventory.find((p) => p.id === item.productId);
                          const hasP2 = Boolean(prod?.price2 && prod.price2 > 0);
                          const hasP3 = Boolean(prod?.price3 && prod.price3 > 0);
                          return (
                            <>
                              <button
                                type="button"
                                onClick={() => handleSelectPriceTier(item.id, "P1")}
                                title={`P1: ${formatCurrency(prod?.price ?? item.price)}`}
                                className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                                  currentTier === "P1"
                                    ? "bg-cyan-600 text-white"
                                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                }`}
                              >
                                P1
                              </button>
                              <button
                                type="button"
                                disabled={!hasP2}
                                onClick={() => handleSelectPriceTier(item.id, "P2")}
                                title={hasP2 ? `P2: ${formatCurrency(prod!.price2!)}` : (isEs ? "P2 no configurado" : "P2 not set")}
                                className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition ${
                                  !hasP2
                                    ? "bg-slate-50 text-slate-300 cursor-not-allowed"
                                    : currentTier === "P2"
                                    ? "bg-cyan-600 text-white cursor-pointer"
                                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 cursor-pointer"
                                }`}
                              >
                                P2
                              </button>
                              <button
                                type="button"
                                disabled={!hasP3}
                                onClick={() => handleSelectPriceTier(item.id, "P3")}
                                title={hasP3 ? `P3: ${formatCurrency(prod!.price3!)}` : (isEs ? "P3 no configurado" : "P3 not set")}
                                className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition ${
                                  !hasP3
                                    ? "bg-slate-50 text-slate-300 cursor-not-allowed"
                                    : currentTier === "P3"
                                    ? "bg-cyan-600 text-white cursor-pointer"
                                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 cursor-pointer"
                                }`}
                              >
                                P3
                              </button>
                            </>
                          );
                        })()}
                        <span className="font-mono text-xs font-semibold text-slate-700 ml-1">
                          {formatCurrency(item.price)}
                        </span>
                      </div>

                      {/* Quantity Stepper */}
                      <div className="flex items-center gap-1.5 bg-slate-100 p-0.5 rounded">
                        <button
                          type="button"
                          onClick={() => handleUpdateQuantity(item.id, -1)}
                          className="w-5 h-5 rounded-xs bg-white hover:bg-slate-200 flex items-center justify-center text-slate-700 transition cursor-pointer shadow-2xs"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) =>
                            handleSetExactQuantity(item.id, parseInt(e.target.value, 10) || 1)
                          }
                          className="w-8 text-center text-xs font-bold font-mono bg-transparent outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleUpdateQuantity(item.id, 1)}
                          className="w-5 h-5 rounded-xs bg-white hover:bg-slate-200 flex items-center justify-center text-slate-700 transition cursor-pointer shadow-2xs"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Line Total */}
                      <span className="font-mono font-bold text-xs text-slate-900 shrink-0">
                        {formatCurrency(lineTotal)}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Ticket Footer (Totals & Checkout Trigger) */}
          <div className="p-3 sm:px-4 bg-slate-50 border-t border-slate-200 shrink-0 space-y-3">
            {/* Totals Breakdown */}
            <div className="space-y-1 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>{isEs ? "Subtotal:" : "Subtotal:"}</span>
                <span className="font-mono font-medium">{formatCurrency(cartTotals.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>{isEs ? `Impuestos (${displayTaxPercent}%):` : `Tax (${displayTaxPercent}%):`}</span>
                <span className="font-mono font-medium">{formatCurrency(cartTotals.isv15)}</span>
              </div>
              <div className="flex justify-between text-base font-bold text-slate-900 pt-1.5 border-t border-slate-200">
                <span>{isEs ? "Total a Pagar:" : "Total Amount:"}</span>
                <span className="font-mono text-cyan-600">{formatCurrency(cartTotals.total)}</span>
              </div>
            </div>

            {/* Void feedback toast/notice */}
            {voidFeedbackMessage && (
              <div className="rounded-md bg-amber-50 border border-amber-200 p-2 text-[11px] text-amber-900 flex items-center gap-1.5 animate-in fade-in">
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span className="font-medium">{voidFeedbackMessage}</span>
              </div>
            )}

            {/* Quick Actions (Clear, Hold, Void) */}
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                disabled={cart.length === 0}
                onClick={handleClearCart}
                className="py-1.5 px-2 rounded-md border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 text-slate-600 text-[11px] font-semibold flex items-center justify-center gap-1 transition cursor-pointer"
                title={isEs ? "Vaciar carrito" : "Clear cart"}
              >
                <Trash2 className="w-3 h-3 text-slate-500" />
                <span>{isEs ? "Vaciar" : "Clear"}</span>
              </button>

              <button
                type="button"
                disabled={cart.length === 0}
                onClick={() => handleParkOrder()}
                className="py-1.5 px-2 rounded-md border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 text-slate-600 text-[11px] font-semibold flex items-center justify-center gap-1 transition cursor-pointer"
                title={isEs ? "Poner venta en espera con tiempo configurable" : "Hold sale temporarily"}
              >
                <PauseCircle className="w-3 h-3 text-cyan-600" />
                <span>{isEs ? "En Espera" : "Hold"}</span>
              </button>

              <button
                type="button"
                disabled={cart.length === 0}
                onClick={() => setShowVoidModal(true)}
                className="py-1.5 px-2 rounded-md border border-rose-200 bg-rose-50/60 hover:bg-rose-100 disabled:opacity-40 text-rose-700 text-[11px] font-semibold flex items-center justify-center gap-1 transition cursor-pointer"
                title={isEs ? "Anulación rápida de transacción sin registrar venta" : "Void current transaction"}
              >
                <Ban className="w-3 h-3 text-rose-600" />
                <span>{isEs ? "Anular" : "Void"}</span>
              </button>
            </div>

            {/* Large Checkout Button (Prado Cyan Gradient) */}
            <button
              type="button"
              disabled={cart.length === 0}
              onClick={openCheckout}
              className="w-full py-3.5 px-4 rounded-md bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 disabled:from-slate-300 disabled:to-slate-300 disabled:cursor-not-allowed text-white font-bold text-sm flex items-center justify-between shadow-md shadow-cyan-600/20 active:scale-98 transition cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Banknote className="w-5 h-5" />
                <span>{isEs ? "COBRAR" : "CHECKOUT"}</span>
              </div>
              <span className="font-mono text-base">{formatCurrency(cartTotals.total)}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ================= 3. CHECKOUT & TENDER PANEL ================= */}
      {showCheckoutModal && (
        <aside className="flex h-full w-full shrink-0 animate-in fade-in slide-in-from-right duration-300 ease-out flex-col overflow-hidden border-l border-slate-200 bg-white shadow-xl sm:w-[min(30rem,45vw)]">
            {/* Modal Header */}
            <div className="p-4 bg-[#0c1624] text-white flex items-center justify-between border-b border-slate-800">
              <div>
                <h3 className="font-bold text-base text-cyan-400">
                  {isEs ? "Cobro de Ticket" : "Checkout & Payment"}
                </h3>
                <p className="text-xs text-slate-300">
                  {isEs ? "Cliente:" : "Customer:"} {selectedCustomer.name} • {cartTotals.totalItems} {isEs ? "artículos" : "items"} • <span className="text-cyan-400 font-semibold">{activeRegister}</span> ({selectedSalesRep})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCheckoutModal(false)}
                className="p-1 rounded-md hover:bg-white/10 text-slate-300 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
              {/* Grand Total Box */}
              <div className="p-4 rounded-md bg-cyan-50/70 border border-cyan-200 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-cyan-900 uppercase tracking-wider">
                    {isEs ? "Total a Cobrar" : "Total to Charge"}
                  </div>
                  <div className="text-3xl font-extrabold font-mono text-cyan-700 mt-0.5">
                    {formatCurrency(payableTotal)}
                  </div>
                  {paymentMethod === "TARJETA" && cardFee > 0 && (
                    <div className="text-[11px] text-cyan-800 font-medium mt-0.5">
                      {formatCurrency(cartTotals.total)} + {formatCurrency(cardFee)}{convenienceFeePercent ? ` (${convenienceFeePercent}%)` : ""} {isEs ? "(Comisión Tarjeta)" : "(Card Fee)"}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-[11px] text-cyan-800">{isEs ? `Impuestos (${displayTaxPercent}%):` : `Taxes (${displayTaxPercent}%):`}</div>
                  <div className="font-mono font-bold text-cyan-900">
                    {formatCurrency(cartTotals.isv15)}
                  </div>
                  {paymentMethod === "TARJETA" && cardFee > 0 && (
                    <div className="text-[11px] text-slate-600 mt-0.5">
                      {isEs ? "Comisión:" : "Fee:"} <span className="font-mono font-bold text-cyan-800">+{formatCurrency(cardFee)}{convenienceFeePercent ? ` (${convenienceFeePercent}%)` : ""}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Payment Methods */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {isEs ? "Forma de Pago" : "Payment Method"}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("EFECTIVO")}
                    className={`p-2.5 rounded-md border text-xs font-bold flex flex-col items-center gap-1.5 transition cursor-pointer ${
                      paymentMethod === "EFECTIVO"
                        ? "bg-cyan-600 text-white border-cyan-600 shadow-xs"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <Banknote className="w-5 h-5" />
                    <span>{isEs ? "Efectivo" : "Cash"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("TARJETA")}
                    className={`p-2.5 rounded-md border text-xs font-bold flex flex-col items-center gap-1.5 transition cursor-pointer ${
                      paymentMethod === "TARJETA"
                        ? "bg-cyan-600 text-white border-cyan-600 shadow-xs"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <CreditCard className="w-5 h-5" />
                    <span>{isEs ? "Tarjeta" : "Card"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("TRANSFERENCIA")}
                    className={`p-2.5 rounded-md border text-xs font-bold flex flex-col items-center gap-1.5 transition cursor-pointer ${
                      paymentMethod === "TRANSFERENCIA"
                        ? "bg-cyan-600 text-white border-cyan-600 shadow-xs"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <QrCode className="w-5 h-5" />
                    <span>{isEs ? "Transfer/QR" : "Transfer/QR"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("CREDITO")}
                    className={`p-2.5 rounded-md border text-xs font-bold flex flex-col items-center gap-1.5 transition cursor-pointer ${
                      paymentMethod === "CREDITO"
                        ? "bg-cyan-600 text-white border-cyan-600 shadow-xs"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <FileText className="w-5 h-5" />
                    <span>{isEs ? "Crédito" : "Credit"}</span>
                  </button>
                </div>
              </div>

              {/* Cash Tendering & Change Calculator */}
              {paymentMethod === "EFECTIVO" && (
                <div className="p-4 rounded-md bg-slate-50 border border-slate-200 space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {isEs ? "Monto Recibido del Cliente" : "Amount Tendered by Customer"}
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="any"
                        value={amountReceived}
                        onChange={(e) => setAmountReceived(e.target.value)}
                        className="w-full text-lg font-mono font-bold rounded-md px-3.5 py-2 bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      />
                    </div>
                  </div>

                  {/* Quick Bill Denominations */}
                  <div>
                    <div className="text-[11px] font-semibold text-slate-500 mb-1">
                      {isEs ? "Sugerencias de billetes rápidos:" : "Quick cash suggestions:"}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {quickCashOptions.map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setAmountReceived(opt.toString())}
                          className="px-2.5 py-1 rounded-md bg-white border border-slate-200 hover:bg-slate-100 text-xs font-mono font-semibold text-slate-800 transition cursor-pointer shadow-2xs"
                        >
                          {opt === cartTotals.total ? `${isEs ? "Exacto" : "Exact"} (${formatCurrency(opt)})` : formatCurrency(opt)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Change Due Display */}
                  <div className="p-3 rounded-md bg-white border border-slate-200 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">
                      {isEs ? "Cambio a Entregar:" : "Change Due:"}
                    </span>
                    <span
                      className={`text-xl font-bold font-mono ${
                        parseFloat(amountReceived) < cartTotals.total
                          ? "text-rose-600"
                          : "text-emerald-600"
                      }`}
                    >
                      {parseFloat(amountReceived) < cartTotals.total
                        ? (isEs ? "Monto insuficiente" : "Insufficient amount")
                        : formatCurrency(changeDue)}
                    </span>
                  </div>
                </div>
              )}

              {/* Card Payment & Convenience Fee Configuration */}
              {paymentMethod === "TARJETA" && (
                <div className="p-4 rounded-md bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-800 border-b border-slate-200 pb-2">
                    <CreditCard className="w-4 h-4 text-cyan-600 shrink-0" />
                    <span>
                      {isEs ? "Cobro con Tarjeta y Comisión de Procesador (%)" : "Card Payment & Processor Fee (%)"}
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-slate-700">
                        {isEs ? "Porcentaje de Comisión por Tarjeta (%):" : "Credit Card Processor Fee (%):"}
                      </label>
                      {convenienceFeePercent && parseFloat(convenienceFeePercent) > 0 && (
                        <span className="text-[10px] font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                          {isEs ? "✓ Guardado para siguientes ventas" : "✓ Saved for next sales"}
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        value={convenienceFeePercent}
                        onChange={(e) => handleUpdateFeePercent(e.target.value)}
                        placeholder="0.0"
                        className="w-full text-base font-mono font-bold rounded-md pl-3 pr-8 py-2 bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 font-mono font-bold text-slate-400 text-sm">
                        %
                      </span>
                    </div>
                  </div>

                  {/* Percentage Presets */}
                  <div>
                    <div className="text-[11px] font-semibold text-slate-500 mb-1">
                      {isEs ? "Porcentajes sugeridos rápidos:" : "Quick fee presets:"}
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {[3, 3.5, 4, 5].map((pct) => {
                        const isSelected = parseFloat(convenienceFeePercent) === pct;
                        const feeVal = Math.round(((cartTotals.total * pct) / 100) * 100) / 100;
                        return (
                          <button
                            key={pct}
                            type="button"
                            onClick={() => handleUpdateFeePercent(pct.toString())}
                            className={`px-2.5 py-1 rounded-md text-xs font-mono font-semibold transition cursor-pointer shadow-2xs border ${
                              isSelected
                                ? "bg-cyan-600 text-white border-cyan-600"
                                : "bg-white border-slate-200 hover:bg-slate-100 text-slate-800"
                            }`}
                          >
                            {pct}% (+{formatCurrency(feeVal)})
                          </button>
                        );
                      })}
                      {convenienceFeePercent && parseFloat(convenienceFeePercent) > 0 && (
                        <button
                          type="button"
                          onClick={() => handleUpdateFeePercent("")}
                          className="px-2 py-1 rounded-md text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 transition cursor-pointer ml-auto"
                        >
                          {isEs ? "Quitar cargo" : "Remove fee"}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Live Breakdown Box */}
                  <div className="p-3 rounded-md bg-white border border-slate-200 text-xs space-y-1 shadow-2xs">
                    <div className="flex justify-between text-slate-600">
                      <span>{isEs ? "Total productos + impuesto:" : "Products + tax subtotal:"}</span>
                      <span>{formatCurrency(cartTotals.total)}</span>
                    </div>
                    {cardFee > 0 && (
                      <div className="flex justify-between font-semibold text-cyan-800">
                        <span>
                          {isEs ? "Comisión de Procesamiento:" : "Card Processing Fee:"}
                          {convenienceFeePercent ? ` (${convenienceFeePercent}%)` : ""}
                        </span>
                        <span>+{formatCurrency(cardFee)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-sm text-slate-900 pt-1.5 border-t border-slate-100">
                      <span>{isEs ? "Total a Procesar en Terminal:" : "Total to Process on Terminal:"}</span>
                      <span className="font-mono text-cyan-700 text-base">{formatCurrency(payableTotal)}</span>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500 italic">
                    {isEs
                      ? "Procese este total en su lector o terminal POS físico. El cargo de comisión aparecerá desglosado en el ticket."
                      : "Process this amount on your physical card reader or terminal. The fee will be itemized on the ticket."}
                  </p>
                </div>
              )}

              {paymentMethod === "TRANSFERENCIA" && (
                <div className="p-3 rounded-md bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-center gap-2">
                  <QrCode className="w-4 h-4 text-cyan-600 shrink-0" />
                  <span>
                    {isEs
                      ? "Verifique la confirmación o comprobante de transferencia bancaria antes de cerrar la venta."
                      : "Verify bank transfer confirmation or receipt before completing the sale."}
                  </span>
                </div>
              )}

              {paymentMethod === "CREDITO" && (
                <div className="space-y-2">
                  {!creditValidation.isValid ? (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2.5">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold">{isEs ? "Crédito No Autorizado" : "Credit Not Authorized"}</p>
                        <p className="mt-0.5">{creditValidation.error}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200 text-xs text-indigo-950 space-y-2">
                      <div className="flex items-center justify-between font-bold text-indigo-900 border-b border-indigo-100 pb-1.5">
                        <span className="flex items-center gap-1.5">
                          <CreditCard className="w-4 h-4 text-indigo-600" />
                          {isEs ? "Venta a Crédito Autorizada" : "Credit Sale Authorized"}
                        </span>
                        <span className="text-[11px] font-normal text-indigo-700">
                          {isEs ? `Plazo: ${creditValidation.creditDays} días` : `Terms: ${creditValidation.creditDays} days`}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-[11px] pt-0.5">
                        <div>
                          <span className="text-slate-500 block">{isEs ? "Límite:" : "Limit:"}</span>
                          <span className="font-mono font-bold">${(creditValidation.limit || 0).toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">{isEs ? "Deuda Actual:" : "Current Debt:"}</span>
                          <span className="font-mono font-bold text-amber-800">${(creditValidation.balance || 0).toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">{isEs ? "Tras esta venta:" : "After sale:"}</span>
                          <span className="font-mono font-bold text-emerald-800">${(creditValidation.remainingAfterSale || 0).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCheckoutModal(false)}
                className="px-4 py-2 rounded-md border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition cursor-pointer"
              >
                {isEs ? "Cancelar" : "Cancel"}
              </button>
              <button
                type="button"
                disabled={
                  isProcessingSale ||
                  (paymentMethod === "EFECTIVO" && (parseFloat(amountReceived) || 0) < cartTotals.total) ||
                  (paymentMethod === "CREDITO" && !creditValidation.isValid)
                }
                onClick={handleCompleteSale}
                className="px-6 py-2 rounded-md bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-md shadow-cyan-600/20"
              >
                {isProcessingSale ? (
                  <span>{isEs ? "Procesando..." : "Processing..."}</span>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{isEs ? "Confirmar y Emitir Ticket" : "Confirm & Issue Receipt"}</span>
                  </>
                )}
              </button>
            </div>
        </aside>
      )}
      </div>

      {/* ================= 4. SALE COMPLETED / THERMAL RECEIPT MODAL ================= */}
      {completedSale && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl border border-slate-200 max-w-sm w-full overflow-hidden animate-in zoom-in-95 duration-150 relative">
            <button
              type="button"
              onClick={() => setCompletedSale(null)}
              className="absolute top-2.5 right-2.5 p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition cursor-pointer z-10"
              title={isEs ? "Cerrar" : "Close"}
            >
              <X className="w-4 h-4" />
            </button>

            {/* Printable Receipt Paper Container */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 pt-7">
              <div
                id="pos-thermal-receipt"
                className="bg-white p-4 rounded-md border border-dashed border-slate-300 font-mono text-[11px] text-slate-800 space-y-2 shadow-2xs"
              >
                {/* Store Header */}
                <div className="text-center pb-2 border-b border-dashed border-slate-300">
                  <div className="font-bold text-xs uppercase text-slate-950">
                    {companySettings?.nombre || "PRADO COMMERCE"}
                  </div>
                  {companySettings?.taxId && <div>{isEs ? "RTN:" : "Tax ID:"} {companySettings.taxId}</div>}
                  {companySettings?.direccion && <div className="text-[10px]">{companySettings.direccion}</div>}
                  <div className="text-[10px] text-slate-500 mt-1">{completedSale.date}</div>
                </div>

                {/* Metadata */}
                <div className="text-[10px] space-y-0.5 pb-2 border-b border-dashed border-slate-300">
                  <div>{isEs ? "Cliente:" : "Customer:"} {completedSale.customerName}</div>
                  {completedSale.customerRtn && <div>{isEs ? "RTN:" : "Tax ID:"} {completedSale.customerRtn}</div>}
                  <div>{isEs ? "Caja:" : "Register:"} {completedSale.register || activeRegister}</div>
                  <div>{isEs ? "Cajero:" : "Cashier:"} {completedSale.cashier}</div>
                  <div>{isEs ? "Ticket N°:" : "Receipt #:"} {completedSale.ticketNumber}</div>
                </div>

                {/* Items */}
                <div className="py-1 space-y-1">
                  {completedSale.items.map((item: CartItem) => (
                    <div key={item.id} className="flex justify-between items-start text-[10px]">
                      <div className="flex-1 pr-1 truncate">
                        {item.quantity}x {item.description}
                      </div>
                      <div className="font-bold shrink-0">{formatCurrency(item.price * item.quantity)}</div>
                    </div>
                  ))}
                </div>

                {/* Totals */}
                <div className="pt-2 border-t border-dashed border-slate-300 space-y-0.5 text-[10px]">
                  <div className="flex justify-between">
                    <span>{isEs ? "Subtotal:" : "Subtotal:"}</span>
                    <span>{formatCurrency(completedSale.subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{isEs ? `Impuestos (${completedSale.taxRatePercent ?? displayTaxPercent}%):` : `Tax (${completedSale.taxRatePercent ?? displayTaxPercent}%):`}</span>
                    <span>{formatCurrency(completedSale.isv15)}</span>
                  </div>
                  {completedSale.convenienceFee && completedSale.convenienceFee > 0 ? (
                    <div className="flex justify-between font-semibold text-slate-800">
                      <span>
                        {isEs ? "Comisión Tarjeta" : "Card Fee"}
                        {completedSale.convenienceFeePercent ? ` (${completedSale.convenienceFeePercent}%):` : ":"}
                      </span>
                      <span>{formatCurrency(completedSale.convenienceFee)}</span>
                    </div>
                  ) : null}
                  <div className="flex justify-between font-bold text-xs pt-1 border-t border-slate-200">
                    <span>TOTAL:</span>
                    <span>{formatCurrency(completedSale.total)}</span>
                  </div>
                  <div className="flex justify-between pt-1 text-[9px] text-slate-500">
                    <span>{isEs ? "Método de Pago:" : "Payment Method:"}</span>
                    <span className="font-semibold uppercase text-slate-700">
                      {completedSale.paymentMethod === "TARJETA"
                        ? (isEs ? "Tarjeta" : "Card")
                        : completedSale.paymentMethod === "EFECTIVO"
                        ? (isEs ? "Efectivo" : "Cash")
                        : completedSale.paymentMethod === "TRANSFERENCIA"
                        ? (isEs ? "Transferencia" : "Transfer")
                        : (isEs ? "Crédito" : "Credit")}
                    </span>
                  </div>
                  {completedSale.paymentMethod === "EFECTIVO" && (
                    <>
                      <div className="flex justify-between">
                        <span>{isEs ? "Recibido:" : "Tendered:"}</span>
                        <span>{formatCurrency(completedSale.amountReceived)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-cyan-700">
                        <span>{isEs ? "Cambio:" : "Change:"}</span>
                        <span>{formatCurrency(completedSale.changeDue)}</span>
                      </div>
                    </>
                  )}
                </div>

                {/* Offline Badge on Ticket */}
                {completedSale.isOffline && (
                  <div className="bg-amber-50 text-amber-900 border border-amber-300 p-2 rounded text-[9px] text-center font-bold">
                    {isEs
                      ? "⚡ MODO OFFLINE: Venta registrada localmente. Sincronización automática pendiente al volver la conexión."
                      : "⚡ OFFLINE MODE: Sale registered locally. Will synchronize automatically once connection is restored."}
                  </div>
                )}

                {/* Footer */}
                <div className="text-center text-[9px] text-slate-400 pt-2 border-t border-dashed border-slate-300">
                  {isEs ? "¡Gracias por su compra!" : "Thank you for your purchase!"}
                </div>
              </div>
            </div>

            {/* Offline / Online Status Notice */}
            {completedSale.isOffline ? (
              <div className="mx-4 mt-2 p-2 bg-amber-50 border border-amber-200 rounded-md flex items-center gap-2 text-[11px] text-amber-800 font-medium">
                <WifiOff className="w-4 h-4 shrink-0 text-amber-600" />
                <span>
                  {isEs
                    ? "Ticket guardado en memoria local. Se sincronizará automáticamente al volver el internet."
                    : "Receipt saved to local storage. It will synchronize automatically when internet returns."}
                </span>
              </div>
            ) : (
              <div className="mx-4 mt-2 p-2 bg-emerald-50 border border-emerald-200 rounded-md flex items-center gap-2 text-[11px] text-emerald-800 font-medium">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>
                  {isEs
                    ? "Venta confirmada y sincronizada en el servidor central."
                    : "Sale completed and synchronized with the central store server."}
                </span>
              </div>
            )}

            {/* Actions */}
            <div className="p-3 bg-white flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={handlePrintTicket}
                className="flex-1 py-2 px-3 rounded-md border border-slate-200 hover:bg-slate-100 text-xs font-bold text-slate-800 flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <Printer className="w-4 h-4 text-slate-600" />
                <span>{isEs ? "Imprimir Ticket" : "Print Receipt"}</span>
              </button>
              <button
                type="button"
                onClick={() => setCompletedSale(null)}
                className="flex-1 py-2 px-3 rounded-md bg-cyan-600 hover:bg-cyan-500 text-xs font-bold text-white flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs"
              >
                <span>{isEs ? "Nueva Venta" : "New Sale"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= 5. PARKED TICKETS MODAL (HOLD) ================= */}
      {showParkedModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col">
            <div className="p-4 bg-[#0c1624] text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-cyan-400" />
                <h3 className="font-bold text-sm text-cyan-400">
                  {isEs ? "Tickets en Espera (Hold)" : "Parked / Held Tickets"} ({parkedTickets.length})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowParkedModal(false)}
                className="p-1 rounded-md hover:bg-white/10 text-slate-300 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search & Bulk Discard Expired */}
            <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  value={parkedSearchQuery}
                  onChange={(e) => setParkedSearchQuery(e.target.value)}
                  placeholder={isEs ? "Buscar por ticket o cliente..." : "Search by ticket # or customer..."}
                  className="w-full text-xs pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 bg-white focus:border-cyan-500 focus:outline-none text-slate-800"
                />
              </div>

              {parkedTickets.some((t) => t.expiresAt && new Date(t.expiresAt).getTime() <= Date.now()) && (
                <button
                  type="button"
                  onClick={handleDiscardExpiredParkedOrders}
                  className="px-2.5 py-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-[11px] font-bold flex items-center gap-1 transition cursor-pointer shrink-0"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>{isEs ? "Descartar vencidos" : "Discard expired"}</span>
                </button>
              )}
            </div>

            <div className="p-4 max-h-96 overflow-y-auto space-y-2.5">
              {(() => {
                const filtered = parkedTickets.filter((ticket) => {
                  if (!parkedSearchQuery.trim()) return true;
                  const query = parkedSearchQuery.toLowerCase();
                  return (
                    ticket.ticketNumber.toLowerCase().includes(query) ||
                    ticket.customerName.toLowerCase().includes(query)
                  );
                });

                if (filtered.length === 0) {
                  return (
                    <div className="text-center py-10 text-slate-400 text-xs">
                      {parkedSearchQuery.trim()
                        ? (isEs ? "No se encontraron tickets con esa búsqueda" : "No tickets matching search query")
                        : (isEs ? "No hay tickets puestos en espera actualmente" : "No parked tickets currently held")}
                    </div>
                  );
                }

                return filtered.map((ticket) => {
                  const now = Date.now();
                  const isExpired = Boolean(ticket.expiresAt && new Date(ticket.expiresAt).getTime() <= now);
                  const remainingMinutes = ticket.expiresAt
                    ? Math.max(0, Math.ceil((new Date(ticket.expiresAt).getTime() - now) / 60000))
                    : null;

                  return (
                    <div
                      key={ticket.id}
                      className={`p-3 rounded-lg border transition flex items-center justify-between gap-3 shadow-2xs ${
                        isExpired
                          ? "border-rose-200 bg-rose-50/40"
                          : "border-slate-200 bg-white hover:border-cyan-400"
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold font-mono text-xs text-slate-900">{ticket.ticketNumber}</span>
                          {isExpired ? (
                            <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-rose-100 text-rose-700 border border-rose-200">
                              {isEs ? "Vencido" : "Expired"}
                            </span>
                          ) : remainingMinutes !== null ? (
                            <span className="text-[10px] font-semibold px-2 py-0.2 rounded-full bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5" />
                              <span>{isEs ? `Expira en ${remainingMinutes}m` : `Expires in ${remainingMinutes}m`}</span>
                            </span>
                          ) : (
                            <span className="text-[10px] font-medium px-2 py-0.2 rounded-full bg-slate-100 text-slate-600">
                              {isEs ? "Sin expiración" : "No expiry"}
                            </span>
                          )}
                        </div>

                        <div className="text-[11px] text-slate-700 mt-1 truncate">
                          <span className="font-semibold">{ticket.customerName}</span> • {ticket.items.length} {isEs ? "artículos" : "items"}
                        </div>

                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          {isEs ? "Guardado:" : "Held:"} {ticket.createdAt}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-bold font-mono text-xs text-cyan-700">
                          {formatCurrency(ticket.total)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRestoreParkedOrder(ticket)}
                          className="px-3 py-1.5 rounded-md bg-cyan-600 hover:bg-cyan-500 text-white text-[11px] font-bold transition cursor-pointer shadow-xs"
                        >
                          {isEs ? "Recuperar" : "Resume"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteParkedOrder(ticket.id)}
                          className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                          title={isEs ? "Descartar" : "Discard"}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ================= 5.5 VOID TRANSACTION MODAL ================= */}
      {showVoidModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-rose-200 max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-4 bg-rose-950 text-white flex items-center justify-between border-b border-rose-900">
              <div className="flex items-center gap-2">
                <Ban className="w-5 h-5 text-rose-400" />
                <h3 className="font-bold text-sm text-rose-200">
                  {isEs ? "Anular Transacción en Curso (Void)" : "Void Current Transaction"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowVoidModal(false)}
                className="p-1 rounded-md hover:bg-white/10 text-rose-300 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="rounded-lg bg-rose-50 border border-rose-200 p-3.5 text-xs text-rose-800 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-rose-900">
                    {isEs ? "¿Confirmas la anulación de esta venta?" : "Confirm voiding this sale?"}
                  </p>
                  <p className="mt-0.5 leading-relaxed">
                    {isEs
                      ? "Esta acción vaciará el carrito inmediatamente sin registrar factura, sin modificar el inventario y sin alterar el balance de caja. Se guardará un registro de auditoría."
                      : "This action immediately resets the cart without registering an invoice, modifying inventory, or affecting the cash drawer balance. An audit entry is recorded."}
                  </p>
                </div>
              </div>

              {/* Transaction Snapshot */}
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-1 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>{isEs ? "Cliente:" : "Customer:"}</span>
                  <span className="font-semibold text-slate-800">{selectedCustomer.name}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>{isEs ? "Artículos en carrito:" : "Cart items count:"}</span>
                  <span className="font-semibold text-slate-800">{cartTotals.totalItems}</span>
                </div>
                <div className="flex justify-between font-bold text-slate-900 pt-1 border-t border-slate-200">
                  <span>{isEs ? "Monto a anular:" : "Amount to void:"}</span>
                  <span className="font-mono text-rose-600">{formatCurrency(cartTotals.total)}</span>
                </div>
              </div>

              {/* Void Reason Selector */}
              <div className="space-y-1.5">
                <label htmlFor="void-reason-select" className="block text-xs font-bold text-slate-700">
                  {isEs ? "Motivo de la Anulación:" : "Void Reason:"}
                </label>
                <select
                  id="void-reason-select"
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 focus:border-rose-500 focus:outline-none"
                >
                  <option value="Cliente desistió de la compra">
                    {isEs ? "Cliente desistió de la compra" : "Customer changed mind / walked away"}
                  </option>
                  <option value="Error en digitación o productos duplicados">
                    {isEs ? "Error en digitación o productos duplicados" : "Entry error or duplicate items"}
                  </option>
                  <option value="Problema con el método de pago / Tarjeta rechazada">
                    {isEs ? "Problema con el método de pago / Tarjeta rechazada" : "Payment issue / Card declined"}
                  </option>
                  <option value="Cliente no contaba con fondos suficientes">
                    {isEs ? "Cliente no contaba con fondos suficientes" : "Insufficient funds"}
                  </option>
                  <option value="Prueba o demostración del sistema">
                    {isEs ? "Prueba o demostración del sistema" : "System testing or training"}
                  </option>
                  <option value="Otro motivo">
                    {isEs ? "Otro motivo" : "Other"}
                  </option>
                </select>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowVoidModal(false)}
                className="px-4 py-2 rounded-md border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition cursor-pointer"
              >
                {isEs ? "Volver a la venta" : "Back to sale"}
              </button>
              <button
                type="button"
                onClick={handleConfirmVoidSale}
                className="px-5 py-2 rounded-md bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
              >
                <Ban className="w-3.5 h-3.5" />
                <span>{isEs ? "Confirmar Anulación" : "Confirm Void"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= 6. CUSTOMER SELECTION MODAL ================= */}
      {showCustomerModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-4 bg-[#0c1624] text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-cyan-400" />
                <h3 className="font-bold text-sm text-cyan-400">
                  {isEs ? "Seleccionar Cliente" : "Select Customer"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCustomerModal(false)}
                className="p-1 rounded-md hover:bg-white/10 text-slate-300 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              {/* Default Option: Consumidor Final */}
              <button
                type="button"
                onClick={() => {
                  setSelectedCustomer({ name: defaultCustomerName, rtn: "" });
                  setShowCustomerModal(false);
                }}
                className={`w-full p-2.5 rounded-md border text-left flex items-center justify-between transition cursor-pointer ${
                  selectedCustomer.name === defaultCustomerName
                    ? "bg-cyan-50/70 border-cyan-500 text-cyan-950 font-bold"
                    : "border-slate-200 hover:bg-slate-50 text-slate-800"
                }`}
              >
                <div>
                  <div className="text-xs">{defaultCustomerName}</div>
                  <div className="text-[10px] text-slate-400 font-normal">
                    {isEs ? "Sin RTN / Venta Rápida" : "No Tax ID / Direct Sale"}
                  </div>
                </div>
                {selectedCustomer.name === defaultCustomerName && (
                  <CheckCircle2 className="w-4 h-4 text-cyan-600" />
                )}
              </button>

              {/* Existing customers list */}
              <div className="text-[11px] font-semibold text-slate-500 pt-1">
                {isEs ? "Clientes Registrados:" : "Registered Customers:"}
              </div>
              <div className="max-h-56 overflow-y-auto space-y-1 pr-1">
                {customers.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setSelectedCustomer({ id: c.id, name: c.name, rtn: c.rtn || "" });
                      setShowCustomerModal(false);
                    }}
                    className={`w-full p-2.5 rounded-md border text-left flex items-center justify-between transition cursor-pointer ${
                      selectedCustomer.id === c.id
                        ? "bg-cyan-50/70 border-cyan-500 text-cyan-950 font-bold"
                        : "border-slate-200 hover:bg-slate-50 text-slate-800"
                    }`}
                  >
                    <div className="truncate pr-2">
                      <div className="text-xs truncate">{c.name}</div>
                      {c.rtn && <div className="text-[10px] text-slate-400 font-mono">{isEs ? "RTN:" : "Tax ID:"} {c.rtn}</div>}
                    </div>
                    {selectedCustomer.id === c.id && (
                      <CheckCircle2 className="w-4 h-4 text-cyan-600 shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= 7. REGISTER & CASHIER (SHIFT) MODAL ================= */}
      {showShiftModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-4 bg-[#0c1624] text-white flex items-center justify-between border-b border-slate-800">
              <div>
                <h3 className="font-bold text-sm text-cyan-400">
                  {isEs ? "Configuración de Caja y Cajero" : "Configure Register & Cashier"}
                </h3>
                <p className="text-[11px] text-slate-300">
                  {isEs ? "Asigna la terminal física y el operador activo del turno" : "Assign the counter terminal and active cashier for this shift"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowShiftModal(false)}
                className="p-1 rounded-md hover:bg-white/10 text-slate-300 hover:text-white cursor-pointer transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-5 max-h-[75vh] overflow-y-auto">
              {/* 1. SELECCIÓN DE CAJA */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Store className="w-3.5 h-3.5 text-cyan-600" />
                  <span>{isEs ? "1. Seleccionar Caja / Terminal" : "1. Select Register / Terminal"}</span>
                </label>

                {(() => {
                  const activeTerminalList = posSettings?.terminals?.filter((t) => t.status !== "INACTIVE") || [];
                  const registersToDisplay = activeTerminalList.length > 0
                    ? activeTerminalList.map((t) => ({ id: t.id, name: t.name, code: t.code, location: t.location }))
                    : (isEs
                        ? ["Caja 01 - Principal", "Caja 02 - Mostrador", "Caja 03 - Rápida", "Caja 04 - Kiosco"]
                        : ["Register 01 - Main", "Register 02 - Counter", "Register 03 - Express", "Register 04 - Kiosk"]
                      ).map((name, i) => ({ id: `reg-${i + 1}`, name, code: `REG-0${i + 1}`, location: null }));
                  const filteredRegisters = registersToDisplay.filter((reg) =>
                    `${reg.name} ${reg.code} ${reg.location || ""}`
                      .toLowerCase()
                      .includes(registerSearchQuery.trim().toLowerCase())
                  );

                  return (
                    <div className="relative">
                      <div className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 focus-within:border-cyan-500 focus-within:ring-1 focus-within:ring-cyan-500">
                        <Search className="w-4 h-4 shrink-0 text-slate-400" aria-hidden />
                        <input
                          id="pos-register-search"
                          type="search"
                          role="combobox"
                          aria-label={isEs ? "Buscar caja o terminal" : "Search registers or terminals"}
                          aria-autocomplete="list"
                          aria-expanded={isRegisterSearchOpen}
                          aria-controls="pos-register-options"
                          value={isRegisterSearchOpen ? registerSearchQuery : tempRegister}
                          onFocus={() => {
                            setRegisterSearchQuery("");
                            setIsRegisterSearchOpen(true);
                          }}
                          onBlur={() => setIsRegisterSearchOpen(false)}
                          onChange={(event) => {
                            setRegisterSearchQuery(event.target.value);
                            setTempRegister("");
                            setIsRegisterSearchOpen(true);
                          }}
                          onKeyDown={(event) => {
                            if (event.key === "Escape") {
                              setIsRegisterSearchOpen(false);
                            } else if (event.key === "Enter" && filteredRegisters[0]) {
                              event.preventDefault();
                              setTempRegister(filteredRegisters[0].name);
                              setRegisterSearchQuery(filteredRegisters[0].name);
                              setIsRegisterSearchOpen(false);
                            }
                          }}
                          placeholder={isEs ? "Buscar caja o terminal..." : "Search registers or terminals..."}
                          className="w-full bg-transparent text-xs text-slate-700 outline-none placeholder:text-slate-400"
                        />
                      </div>
                      {isRegisterSearchOpen && (
                        <div
                          id="pos-register-options"
                          role="listbox"
                          aria-label={isEs ? "Cajas y terminales disponibles" : "Available registers and terminals"}
                          className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-md border border-slate-200 bg-white p-1 shadow-lg"
                        >
                          {filteredRegisters.length > 0 ? filteredRegisters.map((reg) => (
                            <button
                              key={reg.id}
                              type="button"
                              role="option"
                              aria-selected={tempRegister === reg.name}
                              onMouseDown={(event) => event.preventDefault()}
                              onClick={() => {
                                setTempRegister(reg.name);
                                setRegisterSearchQuery(reg.name);
                                setIsRegisterSearchOpen(false);
                              }}
                              className="flex w-full items-center justify-between rounded px-2.5 py-2 text-left text-xs text-slate-700 hover:bg-cyan-50"
                            >
                              <span className="flex min-w-0 items-center gap-2">
                                <span className="h-2 w-2 shrink-0 rounded-full bg-slate-300" aria-hidden />
                                <span className="min-w-0">
                                  <span className="block truncate font-semibold">{reg.name}</span>
                                  {reg.location && <span className="block truncate text-[10px] text-slate-400">{reg.location}</span>}
                                </span>
                              </span>
                              {tempRegister === reg.name && <CheckCircle2 className="h-4 w-4 shrink-0 text-cyan-600" />}
                            </button>
                          )) : (
                            <p className="px-2.5 py-2 text-xs text-slate-500">
                              {isEs ? "No se encontraron cajas o terminales." : "No matching registers or terminals."}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* 2. SELECCIÓN DE CAJERO */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-cyan-600" />
                  <span>{isEs ? "2. Seleccionar Cajero / Operador Activo" : "2. Select Active Cashier / Operator"}</span>
                </label>

                {salesReps && salesReps.some((rep) => rep.status !== "INACTIVE") ? (
                  (() => {
                    const filteredCashiers = salesReps
                      .filter((rep) => rep.status !== "INACTIVE")
                      .filter((rep) =>
                        `${rep.name} ${rep.email || ""} ${rep.phone || ""} ${rep.zone || ""}`
                          .toLowerCase()
                          .includes(cashierSearchQuery.trim().toLowerCase())
                      );

                    return (
                      <div className="relative">
                        <div className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 focus-within:border-cyan-500 focus-within:ring-1 focus-within:ring-cyan-500">
                          <Search className="w-4 h-4 shrink-0 text-slate-400" aria-hidden />
                          <input
                            id="pos-cashier-search"
                            type="search"
                            role="combobox"
                            aria-label={isEs ? "Buscar usuario o cajero" : "Search users or cashiers"}
                            aria-autocomplete="list"
                            aria-expanded={isCashierSearchOpen}
                            aria-controls="pos-cashier-options"
                            value={isCashierSearchOpen ? cashierSearchQuery : tempCashier}
                            onFocus={() => {
                              setCashierSearchQuery("");
                              setIsCashierSearchOpen(true);
                            }}
                            onBlur={() => setIsCashierSearchOpen(false)}
                            onChange={(event) => {
                              setCashierSearchQuery(event.target.value);
                              setTempCashier("");
                              setIsCashierSearchOpen(true);
                            }}
                            onKeyDown={(event) => {
                              if (event.key === "Escape") {
                                setIsCashierSearchOpen(false);
                              } else if (event.key === "Enter" && filteredCashiers[0]) {
                                event.preventDefault();
                                setIsCashierSearchOpen(false);
                                handleSelectCashierWithPinCheck(filteredCashiers[0]);
                              }
                            }}
                            placeholder={isEs ? "Buscar usuario o cajero..." : "Search users or cashiers..."}
                            className="w-full bg-transparent text-xs text-slate-700 outline-none placeholder:text-slate-400"
                          />
                        </div>
                        {isCashierSearchOpen && (
                          <div
                            id="pos-cashier-options"
                            role="listbox"
                            aria-label={isEs ? "Usuarios y cajeros disponibles" : "Available users and cashiers"}
                            className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-slate-200 bg-white p-1 shadow-lg"
                          >
                            {filteredCashiers.length > 0 ? filteredCashiers.map((rep) => {
                              const isSelected = tempCashier === rep.name;
                              const matchingCashier = posSettings?.cashiers?.find(
                                (c) => c.name.toLowerCase() === rep.name.toLowerCase() || c.id === rep.id
                              );
                              const hasPin = Boolean(matchingCashier?.pin || (rep.code && !["000", "001", "002"].includes(rep.code)));

                              return (
                                <button
                                  key={rep.id || rep.name}
                                  type="button"
                                  role="option"
                                  aria-selected={isSelected}
                                  onMouseDown={(event) => event.preventDefault()}
                                  onClick={() => {
                                    setIsCashierSearchOpen(false);
                                    handleSelectCashierWithPinCheck(rep);
                                  }}
                                  className="flex w-full items-center justify-between rounded px-2.5 py-2 text-left text-xs text-slate-700 hover:bg-cyan-50"
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 bg-slate-200 text-slate-600">
                                      {rep.name.slice(0, 2).toUpperCase()}
                                    </div>
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-1.5 min-w-0">
                                        <div className="truncate">{rep.name}</div>
                                        {hasPin && (
                                          <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5 shrink-0" title={isEs ? "Requiere PIN de seguridad para acceder" : "Requires security PIN to access"}>
                                            <Lock className="w-2.5 h-2.5 text-emerald-600" />
                                            <span>PIN</span>
                                          </span>
                                        )}
                                      </div>
                                      {rep.email && <div className="text-[10px] text-slate-400 font-normal truncate">{rep.email}</div>}
                                    </div>
                                  </div>
                                  {isSelected && <CheckCircle2 className="w-4 h-4 text-cyan-600 shrink-0" />}
                                </button>
                              );
                            }) : (
                              <p className="px-2.5 py-2 text-xs text-slate-500">
                                {isEs ? "No se encontraron usuarios o cajeros." : "No matching users or cashiers."}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })()
                ) : (
                  <div className="p-3 rounded-md bg-slate-50 border border-slate-200 text-xs text-slate-500 text-center">
                    {isEs ? "No hay cajeros configurados en Ajustes POS." : "No cashiers configured in POS Settings."}
                  </div>
                )}
              </div>

              {/* Informative Note */}
              <div className="p-3 rounded-md bg-cyan-50/80 border border-cyan-200/80 text-[11px] text-cyan-950 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-cyan-600 shrink-0 mt-0.5" />
                <span>
                  {isEs
                    ? "Los cambios se guardan automáticamente en la memoria de este navegador. Todas las ventas emitidas a partir de ahora quedarán registradas con esta caja y cajero."
                    : "Settings are saved automatically in your browser storage. All future tickets will be logged under this register and cashier."}
                </span>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2">
              <a
                href={`/dashboard/settings/pos${storeId ? `?storeId=${storeId}` : ""}`}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-cyan-600 hover:text-cyan-700 transition"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>{isEs ? "Administrar Cajas y Cajeros" : "Manage Registers & Cashiers"}</span>
              </a>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowShiftModal(false)}
                  className="px-4 py-2 rounded-md border border-slate-300 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition cursor-pointer"
                >
                  {isEs ? "Cancelar" : "Cancel"}
                </button>
                <button
                  type="button"
                  onClick={handleSaveShiftConfig}
                  className="px-5 py-2 rounded-md bg-cyan-600 hover:bg-cyan-500 text-xs font-bold text-white shadow-xs transition cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isEs ? "Guardar Cambios" : "Save Changes"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= 8. OFFLINE SYNC QUEUE MODAL ================= */}
      {showSyncQueueModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-4 bg-[#0c1624] text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-md bg-cyan-500/20 text-cyan-400">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-cyan-400">
                    {isEs ? "Cola de Sincronización Offline" : "Offline Sync Queue"}
                  </h3>
                  <p className="text-[11px] text-slate-300">
                    {syncQueueList.filter((t) => t.status === "PENDING" || t.status === "FAILED").length} {isEs ? "ventas pendientes de subir a la nube" : "sales pending cloud upload"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSyncQueueModal(false)}
                className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Network Banner */}
            <div className={`px-4 py-2 flex items-center justify-between text-xs font-semibold ${
              isOnline ? "bg-emerald-50 text-emerald-800 border-b border-emerald-100" : "bg-amber-50 text-amber-900 border-b border-amber-200"
            }`}>
              <div className="flex items-center gap-2">
                {isOnline ? <Wifi className="w-4 h-4 text-emerald-600" /> : <WifiOff className="w-4 h-4 text-amber-600" />}
                <span>{isOnline ? (isEs ? "Conexión a internet activa" : "Internet connection active") : (isEs ? "Terminal desconectada de internet" : "Terminal disconnected from internet")}</span>
              </div>
              <span className="text-[11px] font-mono">
                {isOnline ? (isEs ? "Auto-sync habilitado" : "Auto-sync enabled") : (isEs ? "Guardando en IndexedDB" : "Saving to IndexedDB")}
              </span>
            </div>

            {/* Ticket List Body */}
            <div className="p-4 max-h-80 overflow-y-auto space-y-2.5">
              {syncQueueList.length === 0 ? (
                <div className="py-8 text-center text-slate-400 space-y-2">
                  <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 opacity-80" />
                  <p className="text-xs font-medium text-slate-600">
                    {isEs ? "No hay transacciones pendientes" : "No pending transactions"}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {isEs ? "Todas las ventas de esta terminal están sincronizadas con la nube." : "All sales from this terminal are synchronized with the cloud."}
                  </p>
                </div>
              ) : (
                syncQueueList.map((ticket) => (
                  <div
                    key={ticket.id}
                    className="p-3 rounded-md border border-slate-200 bg-slate-50/60 hover:bg-white hover:border-slate-300 transition flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 font-mono">{ticket.ticketNumber}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          ticket.status === "SYNCED"
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                            : ticket.status === "SYNCING"
                            ? "bg-cyan-100 text-cyan-800 border border-cyan-200 animate-pulse"
                            : ticket.status === "FAILED"
                            ? "bg-rose-100 text-rose-800 border border-rose-200"
                            : "bg-amber-100 text-amber-800 border border-amber-200"
                        }`}>
                          {ticket.status === "SYNCED"
                            ? (isEs ? "Sincronizado" : "Synced")
                            : ticket.status === "SYNCING"
                            ? (isEs ? "Sincronizando..." : "Syncing...")
                            : ticket.status === "FAILED"
                            ? (isEs ? "Error" : "Error")
                            : (isEs ? "Pendiente" : "Pending")}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {ticket.customerName} • {new Date(ticket.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </div>
                      {ticket.lastError && (
                        <div className="text-[10px] text-rose-600 font-medium truncate max-w-xs">
                          {ticket.lastError}
                        </div>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-extrabold text-slate-900 font-mono">
                        {formatCurrency(ticket.total)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={handleClearSyncedHistory}
                disabled={!syncQueueList.some((t) => t.status === "SYNCED")}
                className="px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
              >
                {isEs ? "Limpiar sincronizados" : "Clear synced"}
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowSyncQueueModal(false)}
                  className="px-3.5 py-2 rounded-md border border-slate-300 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition cursor-pointer"
                >
                  {isEs ? "Cerrar" : "Close"}
                </button>
                <button
                  type="button"
                  onClick={handleManualSyncNow}
                  disabled={isSyncing || !isOnline}
                  className="px-4 py-2 rounded-md bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-xs font-bold text-white shadow-xs transition cursor-pointer flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
                  <span>{isSyncing ? (isEs ? "Sincronizando..." : "Syncing...") : (isEs ? "Sincronizar Ahora" : "Sync Now")}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= 9. CASHIER PIN KEYPAD MODAL ================= */}
      {pinModal && pinModal.isOpen && (
        <div className="fixed inset-0 z-60 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl border border-slate-200 max-w-xs w-full overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-5 bg-[#0c1624] text-white text-center relative border-b border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setPinModal(null);
                  setEnteredPin("");
                  setPinError(false);
                }}
                className="absolute top-3.5 right-3.5 p-1.5 rounded-md hover:bg-white/10 text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="inline-flex p-3 rounded-md bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 mb-2 shadow-xs">
                <Lock className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-white">
                {pinModal.reason === "checkout"
                  ? (isEs ? "Autorización de Venta" : "Authorize Transaction")
                  : (isEs ? "PIN de Seguridad de Cajero" : "Cashier Security PIN")}
              </h3>
              <p className="text-[11px] text-slate-300 mt-0.5">
                {isEs ? "Ingresa el PIN de" : "Enter security PIN for"}{" "}
                <span className="font-bold text-cyan-400">{pinModal.cashierName}</span>
              </p>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              {/* Visual PIN Dots */}
              <div className="flex flex-col items-center">
                <div className="flex items-center justify-center gap-2.5 py-1">
                  {Array.from({ length: Math.max(4, pinModal.expectedPin.length) }).map((_, idx) => {
                    const isFilled = idx < enteredPin.length;
                    return (
                      <div
                        key={idx}
                        className={`w-3.5 h-3.5 rounded-full transition-all duration-150 ${
                          pinError
                            ? "bg-rose-500 scale-110 shadow-xs shadow-rose-500/50"
                            : isFilled
                            ? "bg-cyan-600 scale-110 shadow-xs shadow-cyan-600/50"
                            : "border-2 border-slate-300 bg-slate-50"
                        }`}
                      />
                    );
                  })}
                </div>

                {/* Error Banner */}
                {pinError && (
                  <div className="mt-2 text-xs font-bold text-rose-600 flex items-center gap-1.5 animate-in fade-in">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>{isEs ? "PIN incorrecto. Inténtalo de nuevo." : "Incorrect PIN code. Try again."}</span>
                  </div>
                )}
                {!pinError && (
                  <p className="mt-1.5 text-[11px] text-slate-400">
                    {isEs ? "Teclado táctil o numérico" : "Touch keypad or keyboard"}
                  </p>
                )}
              </div>

              {/* Numeric Keypad Grid */}
              <div className="grid grid-cols-3 gap-2 max-w-[240px] mx-auto">
                {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
                  <button
                    key={digit}
                    type="button"
                    onClick={() => handlePinKeyPress(digit)}
                    className="h-12 rounded-md bg-slate-50 hover:bg-slate-100 border border-slate-200 text-base font-bold text-slate-800 shadow-2xs hover:shadow-xs active:scale-95 transition cursor-pointer flex items-center justify-center select-none"
                  >
                    {digit}
                  </button>
                ))}

                {/* Clear (C) */}
                <button
                  type="button"
                  onClick={handlePinClear}
                  className="h-12 rounded-md bg-rose-50/60 hover:bg-rose-100/70 border border-rose-200 text-xs font-bold text-rose-700 active:scale-95 transition cursor-pointer flex items-center justify-center select-none"
                >
                  {isEs ? "C" : "C"}
                </button>

                {/* Digit 0 */}
                <button
                  type="button"
                  onClick={() => handlePinKeyPress("0")}
                  className="h-12 rounded-md bg-slate-50 hover:bg-slate-100 border border-slate-200 text-base font-bold text-slate-800 shadow-2xs hover:shadow-xs active:scale-95 transition cursor-pointer flex items-center justify-center select-none"
                >
                  0
                </button>

                {/* Backspace ⌫ */}
                <button
                  type="button"
                  onClick={handlePinBackspace}
                  className="h-12 rounded-md bg-slate-100 hover:bg-slate-200 border border-slate-200 text-sm font-bold text-slate-700 active:scale-95 transition cursor-pointer flex items-center justify-center select-none"
                  title={isEs ? "Retroceso" : "Backspace"}
                >
                  ⌫
                </button>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPinModal(null);
                    setEnteredPin("");
                    setPinError(false);
                  }}
                  className="flex-1 py-2 rounded-md border border-slate-300 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition cursor-pointer"
                >
                  {isEs ? "Cancelar" : "Cancel"}
                </button>
                <button
                  type="button"
                  onClick={handleVerifyPin}
                  disabled={enteredPin.length === 0}
                  className="flex-1 py-2 rounded-md bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-xs font-bold text-white shadow-xs transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>{isEs ? "Verificar" : "Verify PIN"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
