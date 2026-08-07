"use client";

import { useEffect, useState } from "react";
import { User, UserCog, ShoppingBag, MapPin, LogOut, ChevronRight, CheckCircle2 } from "lucide-react";
import OrdersPanel from "./orders-panel";

type AddressEntry = {
  line1: string | null;
  line2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
};

type AccountCustomer = {
  id: string;
  storeId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  shippingAddress: Record<string, unknown> | null;
  billingAddress: Record<string, unknown> | null;
  savedAddresses: AddressEntry[] | null;
  updatedAt: string;
};

type TabType = "account" | "profile" | "orders" | "addresses";

export default function AccountSidebarLayout() {
  const [activeTab, setActiveTab] = useState<TabType>("account");
  const [customer, setCustomer] = useState<AccountCustomer | null>(null);
  const [loading, setLoading] = useState(true);

  // Profile form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");

  // Address form state
  const [line1, setLine1] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("");
  const [savedAddresses, setSavedAddresses] = useState<AddressEntry[]>([]);

  const [status, setStatus] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    async function loadAccount() {
      try {
        const response = await fetch("/api/storefront/account", { cache: "no-store" });
        const payload = await response.json();
        if (response.ok && payload.customer) {
          const nextCustomer = payload.customer as AccountCustomer;
          setCustomer(nextCustomer);
          setFirstName(nextCustomer.firstName ?? "");
          setLastName(nextCustomer.lastName ?? "");
          setPhone(nextCustomer.phone ?? "");
          const shipping = nextCustomer.shippingAddress as Record<string, unknown> | null;
          setLine1(String(shipping?.line1 ?? ""));
          setCity(String(shipping?.city ?? ""));
          setState(String(shipping?.state ?? ""));
          setPostalCode(String(shipping?.postalCode ?? ""));
          setCountry(String(shipping?.country ?? ""));
          setSavedAddresses(Array.isArray(nextCustomer.savedAddresses) ? nextCustomer.savedAddresses : []);
        }
      } catch {
        // Ignore fetch errors on load
      } finally {
        setLoading(false);
      }
    }

    void loadAccount();
  }, []);

  async function handleSaveAccount(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setStatus(null);

    try {
      const response = await fetch("/api/storefront/account", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          phone,
          shippingAddress: {
            line1,
            city,
            state,
            postalCode,
            country,
          },
          savedAddresses,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Unable to update your account.");
      }

      setCustomer(payload.customer);
      setSavedAddresses(Array.isArray(payload.customer?.savedAddresses) ? payload.customer.savedAddresses : []);
      setStatus("Account information updated successfully.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to update your account.");
    } finally {
      setIsSaving(false);
    }
  }

  function addSavedAddress() {
    const nextEntry: AddressEntry = {
      line1: line1 || null,
      line2: null,
      city: city || null,
      state: state || null,
      postalCode: postalCode || null,
      country: country || null,
    };

    if (!nextEntry.line1 && !nextEntry.city && !nextEntry.state && !nextEntry.postalCode && !nextEntry.country) {
      setStatus("Add at least a street, city, or country before saving an address.");
      return;
    }

    setSavedAddresses((current) => [...current, nextEntry]);
    setStatus("Address added to your saved addresses.");
  }

  function loadSavedAddress(address: AddressEntry) {
    setLine1(address.line1 ?? "");
    setCity(address.city ?? "");
    setState(address.state ?? "");
    setPostalCode(address.postalCode ?? "");
    setCountry(address.country ?? "");
    setStatus("Address loaded into form.");
  }

  function removeSavedAddress(index: number) {
    setSavedAddresses((current) => current.filter((_, currentIndex) => currentIndex !== index));
  }

  async function handleSignOut() {
    setIsSigningOut(true);
    try {
      await fetch("/api/storefront/auth", { method: "DELETE" });
      window.location.reload();
    } catch {
      setIsSigningOut(false);
    }
  }

  const displayName = [customer?.firstName, customer?.lastName].filter(Boolean).join(" ") || customer?.email || "Valued Customer";

  const navItems = [
    { id: "account" as const, label: "Account", icon: User, description: "Welcome & overview" },
    { id: "profile" as const, label: "Edit Profile", icon: UserCog, description: "Personal details" },
    { id: "orders" as const, label: "Orders", icon: ShoppingBag, description: "Purchase history" },
    { id: "addresses" as const, label: "Addresses", icon: MapPin, description: "Shipping & saved addresses" },
  ];

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
        Loading account details…
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
      {/* Side Menu */}
      <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="border-b border-slate-100 pb-4 mb-3 px-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Profile</p>
          <p className="mt-1 font-semibold text-slate-900 truncate">{displayName}</p>
          <p className="text-xs text-slate-500 truncate">{customer?.email}</p>
        </div>

        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActiveTab(item.id);
                  setStatus(null);
                }}
                className={`flex w-full items-center justify-between rounded-xl px-3.5 py-3 text-sm font-medium transition ${
                  isActive
                    ? "bg-slate-900 text-white shadow-xs"
                    : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`h-4 w-4 ${isActive ? "text-white" : "text-slate-400"}`} />
                  <span>{item.label}</span>
                </div>
                <ChevronRight className={`h-4 w-4 ${isActive ? "text-white/70" : "text-slate-300"}`} />
              </button>
            );
          })}

          <div className="pt-3 mt-3 border-t border-slate-100 flex justify-end sm:block">
            <button
              type="button"
              onClick={handleSignOut}
              disabled={isSigningOut}
              aria-label={isSigningOut ? "Signing out" : "Sign out"}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full text-rose-600 transition hover:bg-rose-50 disabled:opacity-50 sm:h-auto sm:w-full sm:justify-start sm:gap-3 sm:rounded-xl sm:px-3.5 sm:py-3"
            >
              <LogOut className="h-4 w-4 text-rose-500" />
              <span className="hidden sm:inline">{isSigningOut ? "Signing out…" : "Signout"}</span>
            </button>
          </div>
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="space-y-6">
        {status ? (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>{status}</span>
          </div>
        ) : null}

        {/* Tab 1: Account Overview */}
        {activeTab === "account" && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-700 to-slate-600 p-6 text-white shadow-sm">
              <span className="inline-block rounded-full bg-cyan-500/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-cyan-300">
                Account
              </span>
              <h1 className="mt-3 text-2xl font-bold text-white sm:text-3xl">
                Welcome back, {customer?.firstName || "shopper"}!
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-100">
                Welcome to your account dashboard. Here you can manage your profile information, track your past orders, update shipping addresses, and control your storefront access.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <button
                type="button"
                onClick={() => setActiveTab("profile")}
                className="group flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-xs transition hover:border-slate-300 hover:shadow-md"
              >
                <div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700 transition group-hover:bg-cyan-100">
                    <UserCog className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 font-semibold text-slate-900">Edit Profile</h3>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Update your first name, last name, and contact details.
                  </p>
                </div>
                <div className="mt-4 flex items-center text-xs font-semibold text-cyan-700">
                  <span>Go to profile</span>
                  <ChevronRight className="ml-1 h-3.5 w-3.5 transition group-hover:translate-x-1" />
                </div>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("orders")}
                className="group flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-xs transition hover:border-slate-300 hover:shadow-md"
              >
                <div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 transition group-hover:bg-indigo-100">
                    <ShoppingBag className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 font-semibold text-slate-900">Orders</h3>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    View order status, totals, and complete purchase history.
                  </p>
                </div>
                <div className="mt-4 flex items-center text-xs font-semibold text-indigo-700">
                  <span>View orders</span>
                  <ChevronRight className="ml-1 h-3.5 w-3.5 transition group-hover:translate-x-1" />
                </div>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("addresses")}
                className="group flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-xs transition hover:border-slate-300 hover:shadow-md"
              >
                <div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700 transition group-hover:bg-amber-100">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 font-semibold text-slate-900">Addresses</h3>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Manage default shipping address and saved checkout addresses.
                  </p>
                </div>
                <div className="mt-4 flex items-center text-xs font-semibold text-amber-700">
                  <span>Manage addresses</span>
                  <ChevronRight className="ml-1 h-3.5 w-3.5 transition group-hover:translate-x-1" />
                </div>
              </button>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
              <h2 className="text-base font-semibold text-slate-900">Account Overview</h2>
              <dl className="mt-4 grid gap-4 sm:grid-cols-2 text-sm">
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                  <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">Email Address</dt>
                  <dd className="mt-1 font-semibold text-slate-900">{customer?.email}</dd>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                  <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">Phone</dt>
                  <dd className="mt-1 font-semibold text-slate-900">{customer?.phone || "Not provided"}</dd>
                </div>
              </dl>
            </div>
          </div>
        )}

        {/* Tab 2: Edit Profile */}
        {activeTab === "profile" && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-lg font-semibold text-slate-900">Edit Profile</h2>
              <p className="text-sm text-slate-500">Update your personal account details.</p>
            </div>

            <form onSubmit={handleSaveAccount} className="mt-6 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">First name</label>
                  <input
                    value={firstName}
                    onChange={(event) => setFirstName(event.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                    placeholder="First name"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">Last name</label>
                  <input
                    value={lastName}
                    onChange={(event) => setLastName(event.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                    placeholder="Last name"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">Email address</label>
                <input
                  type="email"
                  readOnly
                  value={customer?.email ?? ""}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-500 cursor-not-allowed"
                />
                <p className="mt-1 text-xs text-slate-400">Email address is managed by your account sign-in.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">Phone number</label>
                <input
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                  placeholder="Phone number"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="rounded-full bg-slate-900 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSaving ? "Saving profile..." : "Save changes"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tab 3: Orders */}
        {activeTab === "orders" && <OrdersPanel />}

        {/* Tab 4: Addresses */}
        {activeTab === "addresses" && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-lg font-semibold text-slate-900">Addresses</h2>
              <p className="text-sm text-slate-500">Manage your shipping address and saved checkout locations.</p>
            </div>

            <form onSubmit={handleSaveAccount} className="mt-6 space-y-6">
              <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                <h3 className="text-sm font-semibold text-slate-900">Default Shipping Address</h3>
                <input
                  value={line1}
                  onChange={(event) => setLine1(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-slate-400"
                  placeholder="Street address"
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    value={city}
                    onChange={(event) => setCity(event.target.value)}
                    className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-slate-400"
                    placeholder="City"
                  />
                  <input
                    value={state}
                    onChange={(event) => setState(event.target.value)}
                    className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-slate-400"
                    placeholder="State / Province"
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    value={postalCode}
                    onChange={(event) => setPostalCode(event.target.value)}
                    className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-slate-400"
                    placeholder="Postal code"
                  />
                  <input
                    value={country}
                    onChange={(event) => setCountry(event.target.value)}
                    className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-slate-400"
                    placeholder="Country"
                  />
                </div>
              </div>

              <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">Saved Addresses</h3>
                    <p className="text-xs text-slate-500">Keep recurring addresses handy for fast checkout.</p>
                  </div>
                  <button
                    type="button"
                    onClick={addSavedAddress}
                    className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                  >
                    + Add current form address
                  </button>
                </div>

                {savedAddresses.length > 0 ? (
                  <div className="space-y-2">
                    {savedAddresses.map((address, index) => {
                      const label = [address.line1, address.city, address.state, address.country].filter(Boolean).join(", ");
                      return (
                        <div key={`${label}-${index}`} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3">
                          <p className="text-sm text-slate-700 truncate">{label || "Saved address"}</p>
                          <div className="flex shrink-0 gap-2">
                            <button
                              type="button"
                              onClick={() => loadSavedAddress(address)}
                              className="rounded-full border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
                            >
                              Use
                            </button>
                            <button
                              type="button"
                              onClick={() => removeSavedAddress(index)}
                              className="rounded-full border border-rose-200 px-3 py-1 text-xs font-medium text-rose-600 transition hover:bg-rose-50"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">No saved addresses yet.</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isSaving}
                className="rounded-full bg-slate-900 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSaving ? "Saving addresses..." : "Save address changes"}
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
