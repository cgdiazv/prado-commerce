"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

type Store = {
  id: string;
  name: string;
  currency: string;
};

type Customer = {
  id: string;
  storeId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  shippingAddress: unknown | null;
  billingAddress: unknown | null;
  createdAt: string | Date;
};

type CustomersDashboardProps = {
  initialStores: Store[];
  initialCustomers: Customer[];
  selectedStoreId: string | null;
  setupError?: string | null;
};

export function CustomersDashboard({
  initialStores,
  initialCustomers,
  selectedStoreId,
  setupError = null,
}: CustomersDashboardProps) {
  const router = useRouter();
  const [stores] = useState(initialStores);
  const [customers, setCustomers] = useState(initialCustomers);
  const [activeStoreId, setActiveStoreId] = useState(selectedStoreId ?? initialStores[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);

  const activeCustomers = useMemo(
    () => customers.filter((customer) => customer.storeId === activeStoreId),
    [customers, activeStoreId],
  );

  async function refreshCustomers(storeId: string) {
    const response = await fetch(`/api/customers?storeId=${encodeURIComponent(storeId)}`, {
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error("Failed to refresh customers");
    }

    const data = (await response.json()) as Customer[];
    setCustomers((current) => [
      ...current.filter((customer) => customer.storeId !== storeId),
      ...data,
    ]);
  }

  async function handleStoreChange(storeId: string) {
    setActiveStoreId(storeId);
    setError(null);

    try {
      await refreshCustomers(storeId);
    } catch {
      setError("Failed to load customers for this store.");
    }
  }

  const createHref = activeStoreId
    ? `/dashboard/customers/new?storeId=${encodeURIComponent(activeStoreId)}`
    : "/dashboard/customers/new";

  return (
    <section>
      {setupError ? (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {setupError}
        </div>
      ) : null}

      <div className="space-y-4">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
              Customers
            </p>
            <h1 className="mt-4 text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">
              Customers Manager
            </h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-slate-600 sm:text-lg">
              View and manage all your customers.
            </p>
          </div>

          <Link
            href={createHref}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            <Plus className="h-4 w-4" />
            New customer
          </Link>
        </div>

        <div className="mt-6 flex w-full max-w-md flex-col gap-2">
          <span className="text-sm font-medium text-slate-700">Store</span>
          <select
            value={activeStoreId}
            onChange={(event) => void handleStoreChange(event.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
          >
            {stores.map((store) => (
              <option key={store.id} value={store.id}>
                {store.name} / {store.currency}
              </option>
            ))}
          </select>
        </div>

        {error ? (
          <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <div className="mt-8 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {activeCustomers.length === 0 ? (
            <div className="p-10 text-center text-slate-500">
              No customers yet for this store.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Name</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Email</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Phone</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {activeCustomers.map((customer) => {
                    const fullName = `${customer.firstName ?? ""} ${customer.lastName ?? ""}`.trim();

                    return (
                      <tr
                        key={customer.id}
                        onClick={() => router.push(`/dashboard/customers/${customer.id}`)}
                        className="hover:bg-cyan-50/40 cursor-pointer transition-colors"
                      >
                        <td className="px-4 py-3 align-top text-slate-900">
                          {fullName || "-"}
                        </td>
                        <td className="px-4 py-3 align-top text-slate-700">{customer.email}</td>
                        <td className="px-4 py-3 align-top text-slate-700">{customer.phone || "-"}</td>
                        <td className="px-4 py-3 align-top text-slate-600">
                          {new Date(customer.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
