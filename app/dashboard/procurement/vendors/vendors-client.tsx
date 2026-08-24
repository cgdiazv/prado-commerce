"use client";

import { useState } from "react";
import { Plus, Search, Building2, Mail, Phone, MapPin, Trash2, Edit } from "lucide-react";

type Store = {
  id: string;
  name: string;
  currency: string;
};

type Vendor = {
  id: string;
  storeId: string;
  name: string;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  address: string | null;
  notes: string | null;
  createdAt: string;
  store: { id: string; name: string };
  _count: { purchaseOrders: number };
};

type VendorsClientProps = {
  initialStores: Store[];
  initialVendors: Vendor[];
};

export default function VendorsClient({ initialStores, initialVendors }: VendorsClientProps) {
  const [vendors, setVendors] = useState<Vendor[]>(initialVendors);
  const [selectedStoreId, setSelectedStoreId] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formState, setFormState] = useState({
    storeId: initialStores[0]?.id || "",
    name: "",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    address: "",
    notes: "",
  });

  const filteredVendors = vendors.filter((vendor) => {
    const matchesStore = selectedStoreId === "ALL" || vendor.storeId === selectedStoreId;
    const matchesSearch =
      !searchQuery.trim() ||
      vendor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (vendor.contactName && vendor.contactName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (vendor.contactEmail && vendor.contactEmail.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesStore && matchesSearch;
  });

  const handleOpenCreateModal = () => {
    setEditingVendor(null);
    setFormState({
      storeId: initialStores[0]?.id || "",
      name: "",
      contactName: "",
      contactEmail: "",
      contactPhone: "",
      address: "",
      notes: "",
    });
    setError(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (vendor: Vendor) => {
    setEditingVendor(vendor);
    setFormState({
      storeId: vendor.storeId,
      name: vendor.name,
      contactName: vendor.contactName || "",
      contactEmail: vendor.contactEmail || "",
      contactPhone: vendor.contactPhone || "",
      address: vendor.address || "",
      notes: vendor.notes || "",
    });
    setError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.name.trim()) {
      setError("Vendor name is required");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      if (editingVendor) {
        const response = await fetch(`/api/procurement/vendors/${editingVendor.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formState.name,
            contactName: formState.contactName,
            contactEmail: formState.contactEmail,
            contactPhone: formState.contactPhone,
            address: formState.address,
            notes: formState.notes,
          }),
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Failed to update vendor");

        setVendors((prev) => prev.map((v) => (v.id === editingVendor.id ? { ...v, ...data.vendor } : v)));
      } else {
        const response = await fetch("/api/procurement/vendors", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formState),
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Failed to create vendor");

        setVendors((prev) => [data.vendor, ...prev]);
      }

      setIsModalOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (vendorId: string) => {
    if (!confirm("Are you sure you want to delete this vendor?")) return;

    try {
      const response = await fetch(`/api/procurement/vendors/${vendorId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete vendor");

      setVendors((prev) => prev.filter((v) => v.id !== vendorId));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete vendor");
    }
  };

  return (
    <section className="min-w-0 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950">Vendors & Suppliers</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage your merchandise manufacturers, distributors, and component suppliers.
          </p>
        </div>
        <button
          type="button"
          onClick={handleOpenCreateModal}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          <Plus className="h-4 w-4" />
          Add Vendor
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search vendor by name or email..."
            className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
          />
        </div>

        {initialStores.length > 1 && (
          <select
            value={selectedStoreId}
            onChange={(e) => setSelectedStoreId(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm outline-none transition focus:border-slate-400"
          >
            <option value="ALL">All Stores</option>
            {initialStores.map((store) => (
              <option key={store.id} value={store.id}>
                {store.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Vendors Grid */}
      {filteredVendors.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
          <Building2 className="mx-auto h-10 w-10 text-slate-400" />
          <h3 className="mt-3 text-sm font-semibold text-slate-900">No vendors found</h3>
          <p className="mt-1 text-xs text-slate-500">
            {searchQuery ? "No vendor matching your search criteria." : "Create your first supplier profile to start generating purchase orders."}
          </p>
          {!searchQuery && (
            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-xs font-semibold text-white"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Vendor
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredVendors.map((vendor) => (
            <div key={vendor.id} className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-slate-900">{vendor.name}</h3>
                    <p className="text-xs text-slate-500">{vendor.store.name}</p>
                  </div>
                  <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                    {vendor._count.purchaseOrders} POs
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-slate-600">
                  {vendor.contactName && (
                    <div className="flex items-center gap-2">
                      <Building2 className="h-3.5 w-3.5 text-slate-400" />
                      <span>{vendor.contactName}</span>
                    </div>
                  )}
                  {vendor.contactEmail && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5 text-slate-400" />
                      <a href={`mailto:${vendor.contactEmail}`} className="text-blue-600 hover:underline">
                        {vendor.contactEmail}
                      </a>
                    </div>
                  )}
                  {vendor.contactPhone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 text-slate-400" />
                      <span>{vendor.contactPhone}</span>
                    </div>
                  )}
                  {vendor.address && (
                    <div className="flex items-start gap-2">
                      <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span className="line-clamp-2">{vendor.address}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => handleOpenEditModal(vendor)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-950"
                >
                  <Edit className="h-3.5 w-3.5" />
                  Edit
                </button>

                <button
                  type="button"
                  onClick={() => handleDelete(vendor.id)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 hover:text-red-800"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Vendor Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-bold text-slate-900">{editingVendor ? "Edit Vendor" : "Add New Vendor"}</h2>
            <p className="mt-1 text-xs text-slate-500">
              Supplier details for generating purchase orders and inventory receiving docs.
            </p>

            {error && <div className="mt-3 rounded-lg bg-red-50 p-3 text-xs text-red-700">{error}</div>}

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              {!editingVendor && initialStores.length > 1 && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Store</label>
                  <select
                    value={formState.storeId}
                    onChange={(e) => setFormState({ ...formState, storeId: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-sm outline-none"
                  >
                    {initialStores.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700">Vendor / Company Name *</label>
                <input
                  type="text"
                  required
                  value={formState.name}
                  onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                  placeholder="e.g. Acme Apparel Corp"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-sm outline-none focus:bg-white"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Contact Person</label>
                  <input
                    type="text"
                    value={formState.contactName}
                    onChange={(e) => setFormState({ ...formState, contactName: e.target.value })}
                    placeholder="Jane Doe"
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-sm outline-none focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700">Contact Email</label>
                  <input
                    type="email"
                    value={formState.contactEmail}
                    onChange={(e) => setFormState({ ...formState, contactEmail: e.target.value })}
                    placeholder="orders@acmeapparel.com"
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-sm outline-none focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Contact Phone</label>
                <input
                  type="text"
                  value={formState.contactPhone}
                  onChange={(e) => setFormState({ ...formState, contactPhone: e.target.value })}
                  placeholder="+1 (555) 019-2834"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-sm outline-none focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Supplier Address</label>
                <textarea
                  rows={2}
                  value={formState.address}
                  onChange={(e) => setFormState({ ...formState, address: e.target.value })}
                  placeholder="100 Factory Blvd, Industrial Park, CA 90210"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-sm outline-none focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Notes / Payment Terms</label>
                <textarea
                  rows={2}
                  value={formState.notes}
                  onChange={(e) => setFormState({ ...formState, notes: e.target.value })}
                  placeholder="Net 30 payment terms. MOQ 50 units."
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-sm outline-none focus:bg-white"
                />
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-full bg-slate-950 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  {isSubmitting ? "Saving..." : editingVendor ? "Update Vendor" : "Save Vendor"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
