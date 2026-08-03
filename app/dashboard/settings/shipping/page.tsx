"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";

type ShippingZone = {
  name: string;
  regions: string;
  rateType: "free" | "flat" | "pickup";
  rateValue: string;
};

type CarrierConnection = {
  name: string;
  description: string;
  connected: boolean;
};

const initialZones: ShippingZone[] = [
  { name: "Domestic Standard", regions: "United States", rateType: "flat", rateValue: "$8.00" },
  { name: "Free Shipping Promo", regions: "United States", rateType: "free", rateValue: "$0.00" },
  { name: "Local Pickup", regions: "Local area", rateType: "pickup", rateValue: "Pickup at store" },
];

const initialCarriers: CarrierConnection[] = [
  { name: "ShipStation", description: "Sync orders and fulfillment workflows.", connected: false },
  { name: "FedEx", description: "Connect labels and live shipping rates.", connected: false },
  { name: "UPS", description: "Enable UPS service levels and tracking.", connected: false },
  { name: "DHL", description: "Use DHL for international deliveries.", connected: false },
  { name: "USPS", description: "Connect USPS for domestic postal services.", connected: false },
];

const carrierButtonClasses: Record<string, string> = {
  ShipStation: "bg-[#00A9E0] hover:bg-[#0093c2]",
  FedEx: "bg-[#4D148C] hover:bg-[#3f1073]",
  UPS: "bg-[#5C3A21] hover:bg-[#4a2f1b]",
  DHL: "bg-[#FFCC00] text-slate-900 hover:bg-[#e6b800]",
  USPS: "bg-[#333366] hover:bg-[#292952]",
};

export default function ShippingPage() {
  const router = useRouter();
  const [zones, setZones] = useState<ShippingZone[]>(initialZones);
  const [carriers, setCarriers] = useState<CarrierConnection[]>(initialCarriers);
  const [originName, setOriginName] = useState("Store profile origin");
  const [originAddress, setOriginAddress] = useState("Use the origin address from Store profile");
  const [originPhone, setOriginPhone] = useState("Use the phone number from Store profile");
  const [newZoneName, setNewZoneName] = useState("");
  const [newZoneRegions, setNewZoneRegions] = useState("");
  const [newZoneType, setNewZoneType] = useState<ShippingZone["rateType"]>("flat");
  const [newZoneValue, setNewZoneValue] = useState("");

  const carrierLabel = useMemo(() => (carrier: CarrierConnection) => (carrier.connected ? "Connected" : "Not connected"), []);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    router.push("/dashboard/settings");
  }

  function addZone() {
    if (!newZoneName.trim() || !newZoneRegions.trim()) return;

    setZones((current) => [
      ...current,
      {
        name: newZoneName.trim(),
        regions: newZoneRegions.trim(),
        rateType: newZoneType,
        rateValue: newZoneValue.trim() || (newZoneType === "free" ? "$0.00" : newZoneType === "pickup" ? "Pickup at store" : "$0.00"),
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

  function toggleCarrier(name: string) {
    setCarriers((current) => current.map((carrier) => (carrier.name === name ? { ...carrier, connected: !carrier.connected } : carrier)));
  }

  return (
    <section className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
            Settings
          </p>
          <h1 className="mt-4 text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">Shipping</h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-slate-600 sm:text-lg">
            Manage origin location, shipping zones, delivery methods, and carrier connections.
          </p>
        </div>

        <Link
          href="/dashboard/settings"
          className="inline-flex shrink-0 items-center rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          ← Back to settings
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="space-y-6">
          <article className="rounded-xl border border-slate-200 bg-slate-50 p-5">
            <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Origin location</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              This section uses the origin location from Store profile as the default shipping origin.
            </p>

            <div className="mt-4 grid gap-4 lg:grid-cols-3">
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-slate-700">Store profile name</span>
                <input
                  value={originName}
                  onChange={(event) => setOriginName(event.target.value)}
                  placeholder="Store profile origin"
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
                />
              </label>
              <label className="flex flex-col gap-2 lg:col-span-2">
                <span className="text-sm font-medium text-slate-700">Origin address</span>
                <input
                  value={originAddress}
                  onChange={(event) => setOriginAddress(event.target.value)}
                  placeholder="Origin address from Store profile"
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
                />
              </label>
              <label className="flex flex-col gap-2 lg:col-span-3">
                <span className="text-sm font-medium text-slate-700">Origin phone</span>
                <input
                  value={originPhone}
                  onChange={(event) => setOriginPhone(event.target.value)}
                  placeholder="Phone from Store profile"
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
                />
              </label>
            </div>
          </article>

          <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Shipping methods</h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Add, edit, or delete shipping methods with free shipping, flat rate, or customer pickup.
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-4">
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-slate-700">Zone name</span>
                <input
                  value={newZoneName}
                  onChange={(event) => setNewZoneName(event.target.value)}
                  placeholder="North America"
                  className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-slate-700">Regions</span>
                <input
                  value={newZoneRegions}
                  onChange={(event) => setNewZoneRegions(event.target.value)}
                  placeholder="United States, Canada"
                  className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-slate-700">Rate type</span>
                <select
                  value={newZoneType}
                  onChange={(event) => setNewZoneType(event.target.value as ShippingZone["rateType"])}
                  className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                >
                  <option value="free">Free shipping</option>
                  <option value="flat">Flat rate</option>
                  <option value="pickup">Customer pickup</option>
                </select>
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-slate-700">Rate value</span>
                <input
                  value={newZoneValue}
                  onChange={(event) => setNewZoneValue(event.target.value)}
                  placeholder={newZoneType === "pickup" ? "Pickup location text" : "$10.00"}
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
                Add shipping method
              </button>
            </div>

            <div className="mt-5 space-y-3">
              {zones.map((zone) => (
                <div key={zone.name} className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-950">{zone.name}</h3>
                    <p className="mt-1 text-sm text-slate-500">{zone.regions}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">
                      {zone.rateType === "free" ? "Free shipping" : zone.rateType === "flat" ? "Flat rate" : "Customer pickup"} • {zone.rateValue}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      aria-label={`Edit ${zone.name}`}
                      title={`Edit ${zone.name}`}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-300 text-slate-700 transition hover:bg-white"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteZone(zone.name)}
                      aria-label={`Delete ${zone.name}`}
                      title={`Delete ${zone.name}`}
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
            <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Carrier connections</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Connect shipping carriers and fulfillment services for label creation, rates, and tracking.
            </p>
            <div className="mt-4 grid gap-4">
              {carriers.map((carrier) => (
                <div key={carrier.name} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-950">{carrier.name}</h3>
                      <p className="mt-1 text-sm leading-6 text-slate-500">{carrier.description}</p>
                    </div>
                    <span className={`inline-flex min-w-28 items-center justify-center rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap ${carrier.connected ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                      {carrierLabel(carrier)}
                    </span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => toggleCarrier(carrier.name)}
                      className={`rounded-full px-4 py-2 text-sm font-semibold text-white transition ${carrierButtonClasses[carrier.name] ?? "bg-slate-900 hover:bg-slate-800"}`}
                    >
                      {carrier.connected ? "Disconnect" : "Connect"}
                    </button>
                    <button
                      type="button"
                      className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      Configure
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </article>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Link
            href="/dashboard/settings"
            className="rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Save changes
          </button>
        </div>
      </form>
    </section>
  );
}
