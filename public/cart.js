/**
 * Prado Commerce - Embeddable Shopping Cart Engine (v1.0.0)
 * https://cdn.pradocommerce.com/cart.js
 */
(function () {
  "use strict";

  const currentScript = document.currentScript || document.querySelector("script[data-store-id]");
  if (!currentScript) {
    console.error("[Prado Commerce] Script tag missing required attributes.");
    return;
  }

  const STORE_ID = currentScript.getAttribute("data-store-id");
  const PUBLISHABLE_KEY = currentScript.getAttribute("data-api-key");
  const API_HOST = currentScript.getAttribute("data-api-host") || "https://api.pradocommerce.com";

  if (!STORE_ID) {
    console.error("[Prado Commerce] Missing data-store-id on script tag.");
    return;
  }

  const STORAGE_KEY = "prado_cart_" + STORE_ID;

  const state = {
    cartId: localStorage.getItem(STORAGE_KEY) || null,
    items: [],
    subtotal: 0,
    currency: "USD",
    isOpen: false,
    loading: false,
  };

  const styles = `
    .prado-cart-overlay {
      position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
      background: rgba(15, 23, 42, 0.4); backdrop-filter: blur(4px);
      z-index: 999998; opacity: 0; pointer-events: none; transition: opacity 0.3s ease;
    }
    .prado-cart-overlay.prado-open { opacity: 1; pointer-events: auto; }

    .prado-cart-drawer {
      position: fixed; top: 0; right: -420px; width: 100%; max-width: 400px; height: 100vh;
      background: #ffffff; z-index: 999999; box-shadow: -10px 0 25px -5px rgba(0, 0, 0, 0.1);
      display: flex; flex-direction: column; transition: right 0.35s cubic-bezier(0.16, 1, 0.3, 1);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #0f172a;
    }
    .prado-cart-drawer.prado-open { right: 0; }

    .prado-header {
      padding: 20px; border-bottom: 1px solid #e2e8f0; display: flex;
      justify-content: space-between; align-items: center;
    }
    .prado-title { font-size: 18px; font-weight: 700; margin: 0; }
    .prado-close { background: none; border: none; font-size: 24px; cursor: pointer; color: #64748b; }

    .prado-body { flex: 1; overflow-y: auto; padding: 20px; }
    .prado-empty { text-align: center; color: #94a3b8; padding: 40px 0; font-size: 14px; }

    .prado-item {
      display: flex; justify-content: space-between; align-items: center;
      padding: 12px 0; border-bottom: 1px solid #f1f5f9;
    }
    .prado-item-info { flex: 1; padding-right: 12px; }
    .prado-item-title { font-size: 14px; font-weight: 600; margin: 0 0 4px 0; }
    .prado-item-price { font-size: 13px; color: #64748b; }

    .prado-qty-controls { display: flex; align-items: center; gap: 8px; }
    .prado-qty-btn {
      width: 26px; height: 26px; border: 1px solid #cbd5e1; background: #f8fafc;
      border-radius: 4px; cursor: pointer; font-weight: 600; display: flex;
      align-items: center; justify-content: center;
    }

    .prado-footer { padding: 20px; border-top: 1px solid #e2e8f0; background: #f8fafc; }
    .prado-subtotal { display: flex; justify-content: space-between; font-weight: 700; margin-bottom: 16px; }
    .prado-checkout-btn {
      width: 100%; padding: 14px; background: #0f172a; color: #ffffff; border: none;
      border-radius: 8px; font-weight: 600; font-size: 15px; cursor: pointer; transition: background 0.2s;
    }
    .prado-checkout-btn:hover { background: #1e293b; }
    .prado-checkout-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  `;

  function joinUrl(baseUrl, path) {
    return String(baseUrl || "").replace(/\/$/, "") + path;
  }

  function injectDOM() {
    const styleEl = document.createElement("style");
    styleEl.textContent = styles;
    document.head.appendChild(styleEl);

    const container = document.createElement("div");
    container.id = "prado-commerce-root";
    container.innerHTML = `
      <div class="prado-cart-overlay" id="prado-overlay"></div>
      <div class="prado-cart-drawer" id="prado-drawer">
        <div class="prado-header">
          <h3 class="prado-title">Your Cart</h3>
          <button class="prado-close" id="prado-close-btn" type="button">&times;</button>
        </div>
        <div class="prado-body" id="prado-cart-body">
          <div class="prado-empty">Your cart is currently empty.</div>
        </div>
        <div class="prado-footer">
          <div class="prado-subtotal">
            <span>Subtotal</span>
            <span id="prado-subtotal-val">$0.00</span>
          </div>
          <button class="prado-checkout-btn" id="prado-checkout-btn" type="button" disabled>Proceed to Checkout</button>
        </div>
      </div>
    `;
    document.body.appendChild(container);

    document.getElementById("prado-overlay").addEventListener("click", closeCart);
    document.getElementById("prado-close-btn").addEventListener("click", closeCart);
    document.getElementById("prado-checkout-btn").addEventListener("click", handleCheckout);

    document.addEventListener("click", function (event) {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      const addButton = target.closest("[data-prado-add]");
      if (addButton) {
        event.preventDefault();
        const variantId = addButton.getAttribute("data-prado-add");
        const quantity = Number.parseInt(addButton.getAttribute("data-prado-qty") || "1", 10);
        if (variantId) {
          void addItem(variantId, Number.isFinite(quantity) ? quantity : 1);
        }
      }

      const openTrigger = target.closest("[data-prado-cart-toggle]");
      if (openTrigger) {
        event.preventDefault();
        openCart();
      }
    });
  }

  async function apiFetch(endpoint, method, body) {
    const headers = {
      "Content-Type": "application/json",
      "X-Store-Id": STORE_ID,
    };

    if (PUBLISHABLE_KEY) {
      headers["X-Publishable-Key"] = PUBLISHABLE_KEY;
    }

    const config = {
      method: method || "GET",
      headers,
    };

    if (body) {
      config.body = JSON.stringify(body);
    }

    const response = await fetch(joinUrl(API_HOST, endpoint), config);

    let payload = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    if (!response.ok) {
      throw new Error((payload && payload.message) || (payload && payload.error) || "Prado Cart API Request Failed");
    }

    return payload || {};
  }

  async function initCart() {
    if (!state.cartId) {
      render();
      return;
    }

    try {
      const data = await apiFetch("/api/v1/cart?cartId=" + encodeURIComponent(state.cartId));
      updateState(data);
    } catch {
      console.warn("[Prado Commerce] Cart session expired or invalid. Resetting state.");
      localStorage.removeItem(STORAGE_KEY);
      state.cartId = null;
      updateState({ items: [], subtotal: 0, currency: state.currency });
    }
  }

  async function addItem(variantId, quantity) {
    openCart();
    setLoading(true);

    try {
      const data = await apiFetch("/api/v1/cart/items", "POST", {
        cartId: state.cartId,
        variantId,
        quantity: quantity || 1,
      });

      if (!state.cartId && data.cartId) {
        state.cartId = data.cartId;
        localStorage.setItem(STORAGE_KEY, data.cartId);
      }

      updateState(data);
    } catch (error) {
      alert("Could not add item to cart: " + (error instanceof Error ? error.message : "Unknown error"));
    } finally {
      setLoading(false);
    }
  }

  async function updateQuantity(variantId, newQty) {
    if (newQty < 1) {
      return removeItem(variantId);
    }

    setLoading(true);
    try {
      const data = await apiFetch("/api/v1/cart/items", "PATCH", {
        cartId: state.cartId,
        variantId,
        quantity: newQty,
      });
      updateState(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  async function removeItem(variantId) {
    setLoading(true);
    try {
      const data = await apiFetch(
        "/api/v1/cart/items?cartId=" + encodeURIComponent(String(state.cartId || "")) + "&variantId=" + encodeURIComponent(variantId),
        "DELETE"
      );
      updateState(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCheckout() {
    if (!state.cartId || state.items.length === 0) {
      return;
    }

    const checkoutBtn = document.getElementById("prado-checkout-btn");
    checkoutBtn.disabled = true;
    checkoutBtn.textContent = "Redirecting...";

    try {
      const res = await apiFetch("/api/v1/checkout", "POST", { cartId: state.cartId });
      if (res.checkoutUrl) {
        window.location.href = res.checkoutUrl;
      } else {
        throw new Error("Checkout URL was not returned");
      }
    } catch (error) {
      alert("Checkout Error: " + (error instanceof Error ? error.message : "Unknown error"));
      checkoutBtn.disabled = false;
      checkoutBtn.textContent = "Proceed to Checkout";
    }
  }

  function updateState(data) {
    state.items = Array.isArray(data.items) ? data.items : [];
    state.subtotal = Number(data.subtotal || 0);
    state.currency = data.currency || "USD";
    if (data.cartId) {
      state.cartId = data.cartId;
      localStorage.setItem(STORAGE_KEY, data.cartId);
    }
    render();
  }

  function render() {
    const bodyEl = document.getElementById("prado-cart-body");
    const subtotalEl = document.getElementById("prado-subtotal-val");
    const checkoutBtn = document.getElementById("prado-checkout-btn");

    if (!bodyEl || !subtotalEl || !checkoutBtn) {
      return;
    }

    const formatter = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: state.currency,
    });

    subtotalEl.textContent = formatter.format(state.subtotal);
    checkoutBtn.disabled = state.items.length === 0;

    const totalCount = state.items.reduce(function (sum, item) {
      return sum + Number(item.quantity || 0);
    }, 0);

    document.querySelectorAll("[data-prado-cart-count]").forEach(function (el) {
      el.textContent = String(totalCount);
    });

    if (state.items.length === 0) {
      bodyEl.innerHTML = '<div class="prado-empty">Your cart is currently empty.</div>';
      return;
    }

    bodyEl.innerHTML = state.items
      .map(function (item) {
        return `
      <div class="prado-item" data-variant-id="${escapeHTML(String(item.variantId || ""))}">
        <div class="prado-item-info">
          <p class="prado-item-title">${escapeHTML(String(item.title || "Item"))}</p>
          <span class="prado-item-price">${formatter.format(Number(item.price || 0))}</span>
        </div>
        <div class="prado-qty-controls">
          <button type="button" class="prado-qty-btn prado-minus">-</button>
          <span style="font-size:13px; font-weight:600; min-width:18px; text-align:center">${Number(item.quantity || 0)}</span>
          <button type="button" class="prado-qty-btn prado-plus">+</button>
        </div>
      </div>
    `;
      })
      .join("");

    bodyEl.querySelectorAll(".prado-item").forEach(function (itemEl) {
      const variantId = itemEl.getAttribute("data-variant-id");
      const item = state.items.find(function (entry) {
        return String(entry.variantId) === String(variantId);
      });
      if (!variantId || !item) {
        return;
      }

      const minus = itemEl.querySelector(".prado-minus");
      const plus = itemEl.querySelector(".prado-plus");

      if (minus) {
        minus.addEventListener("click", function () {
          void updateQuantity(variantId, Number(item.quantity) - 1);
        });
      }

      if (plus) {
        plus.addEventListener("click", function () {
          void updateQuantity(variantId, Number(item.quantity) + 1);
        });
      }
    });
  }

  function openCart() {
    state.isOpen = true;
    const overlay = document.getElementById("prado-overlay");
    const drawer = document.getElementById("prado-drawer");
    if (overlay) {
      overlay.classList.add("prado-open");
    }
    if (drawer) {
      drawer.classList.add("prado-open");
    }
  }

  function closeCart() {
    state.isOpen = false;
    const overlay = document.getElementById("prado-overlay");
    const drawer = document.getElementById("prado-drawer");
    if (overlay) {
      overlay.classList.remove("prado-open");
    }
    if (drawer) {
      drawer.classList.remove("prado-open");
    }
  }

  function setLoading(isLoading) {
    state.loading = isLoading;
    const checkoutBtn = document.getElementById("prado-checkout-btn");
    if (!checkoutBtn) {
      return;
    }
    checkoutBtn.style.opacity = isLoading ? "0.7" : "1";
  }

  function escapeHTML(str) {
    return String(str).replace(/[&<>"']/g, function (tag) {
      const entities = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      };
      return entities[tag] || tag;
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      injectDOM();
      void initCart();
    });
  } else {
    injectDOM();
    void initCart();
  }
})();