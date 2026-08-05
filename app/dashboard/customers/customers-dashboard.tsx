"use client";

import { useEffect, useMemo, useState } from "react";
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
  const [sortField, setSortField] = useState<"name" | "email" | "phone" | "createdAt">("createdAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [pageSize, setPageSize] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);

  const activeCustomers = useMemo(() => {
    const filtered = customers.filter((customer) => customer.storeId === activeStoreId);
    
    return [...filtered].sort((a, b) => {
      let valA: any;
      let valB: any;

      if (sortField === "name") {
        valA = `${a.firstName ?? ""} ${a.lastName ?? ""}`.trim().toLowerCase();
        valB = `${b.firstName ?? ""} ${b.lastName ?? ""}`.trim().toLowerCase();
      } else if (sortField === "createdAt") {
        valA = new Date(a.createdAt).getTime();
        valB = new Date(b.createdAt).getTime();
      } else {
        valA = (a[sortField] ?? "").toLowerCase();
        valB = (b[sortField] ?? "").toLowerCase();
      }

      if (valA < valB) return sortDirection === "asc" ? -1 : 1;
      if (valA > valB) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [customers, activeStoreId, sortField, sortDirection]);

  const totalCustomers = activeCustomers.length;
  const totalPages = Math.max(1, Math.ceil(totalCustomers / pageSize));
  const pageStart = totalCustomers === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const pageEnd = Math.min(currentPage * pageSize, totalCustomers);

  useEffect(() => {
    setCurrentPage((prev) => Math.min(prev, totalPages));
  }, [totalPages]);

  const paginatedCustomers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return activeCustomers.slice(start, start + pageSize);
  }, [activeCustomers, currentPage, pageSize]);

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }

    setCurrentPage(1);
  };

  function SortIndicator({ active, direction }: { active: boolean; direction: "asc" | "desc" }) {
    return (
      <span className="ml-1 flex flex-col leading-none text-[9px]">
        <span className={active && direction === "asc" ? "text-slate-950" : "text-slate-400"}>▲</span>
        <span className={active && direction === "desc" ? "text-slate-950" : "text-slate-400"}>▼</span>
      </span>
    );
  }

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
    setCurrentPage(1);

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
          {totalCustomers === 0 ? (
            <div className="p-10 text-center text-slate-500">
              No customers yet for this store.
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs font-medium text-slate-600">
                  Showing {pageStart}-{pageEnd} of {totalCustomers} customers
                </p>
                <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
                  Rows per page
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

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">
                      <button
                        type="button"
                        onClick={() => handleSort("name")}
                        className="flex items-center gap-1 transition hover:text-slate-950"
                      >
                        Name
                        <SortIndicator active={sortField === "name"} direction={sortDirection} />
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">
                      <button
                        type="button"
                        onClick={() => handleSort("email")}
                        className="flex items-center gap-1 transition hover:text-slate-950"
                      >
                        Email
                        <SortIndicator active={sortField === "email"} direction={sortDirection} />
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">
                      <button
                        type="button"
                        onClick={() => handleSort("phone")}
                        className="flex items-center gap-1 transition hover:text-slate-950"
                      >
                        Phone
                        <SortIndicator active={sortField === "phone"} direction={sortDirection} />
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">
                      <button
                        type="button"
                        onClick={() => handleSort("createdAt")}
                        className="flex items-center gap-1 transition hover:text-slate-950"
                      >
                        Created
                        <SortIndicator active={sortField === "createdAt"} direction={sortDirection} />
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {paginatedCustomers.map((customer) => {
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

              <div className="flex items-center justify-between border-t border-slate-200 bg-white px-4 py-3">
                <button
                  type="button"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage <= 1}
                  className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Previous
                </button>
                <p className="text-xs font-medium text-slate-600">
                  Page {currentPage} of {totalPages}
                </p>
                <button
                  type="button"
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage >= totalPages}
                  className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
