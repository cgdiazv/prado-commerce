"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Search } from "lucide-react";

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
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<"name" | "email" | "phone" | "createdAt">("createdAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [pageSize, setPageSize] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState<"" | "clear" | "delete">("");
  const [isApplyingBulkAction, setIsApplyingBulkAction] = useState(false);
  const selectAllRef = useRef<HTMLInputElement | null>(null);

  const activeCustomers = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const filtered = customers.filter((customer) => {
      if (customer.storeId !== activeStoreId) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const fullName = `${customer.firstName ?? ""} ${customer.lastName ?? ""}`.trim();
      return [fullName, customer.email, customer.phone ?? ""]
        .some((value) => value.toLowerCase().includes(normalizedQuery));
    });
    
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
  }, [customers, activeStoreId, searchQuery, sortField, sortDirection]);

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

  const paginatedCustomerIds = useMemo(
    () => paginatedCustomers.map((customer) => customer.id),
    [paginatedCustomers],
  );

  const selectedOnPageCount = useMemo(
    () => paginatedCustomerIds.filter((id) => selectedCustomerIds.includes(id)).length,
    [paginatedCustomerIds, selectedCustomerIds],
  );

  const allOnPageSelected = paginatedCustomerIds.length > 0 && selectedOnPageCount === paginatedCustomerIds.length;
  const someOnPageSelected = selectedOnPageCount > 0 && !allOnPageSelected;

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
    setSelectedCustomerIds([]);
    setBulkAction("");

    try {
      await refreshCustomers(storeId);
    } catch {
      setError("Failed to load customers for this store.");
    }
  }

  useEffect(() => {
    const activeCustomerIdSet = new Set(activeCustomers.map((customer) => customer.id));
    setSelectedCustomerIds((current) => current.filter((id) => activeCustomerIdSet.has(id)));
  }, [activeCustomers]);

  useEffect(() => {
    if (!selectAllRef.current) {
      return;
    }

    selectAllRef.current.indeterminate = someOnPageSelected;
  }, [someOnPageSelected]);

  function toggleCustomerSelection(customerId: string) {
    setSelectedCustomerIds((current) => {
      if (current.includes(customerId)) {
        return current.filter((id) => id !== customerId);
      }

      return [...current, customerId];
    });
  }

  function toggleSelectAllOnPage(checked: boolean) {
    if (!checked) {
      setSelectedCustomerIds((current) => current.filter((id) => !paginatedCustomerIds.includes(id)));
      return;
    }

    setSelectedCustomerIds((current) => Array.from(new Set([...current, ...paginatedCustomerIds])));
  }

  async function handleApplyBulkAction() {
    if (!bulkAction) {
      return;
    }

    if (bulkAction === "clear") {
      setSelectedCustomerIds([]);
      setBulkAction("");
      return;
    }

    if (selectedCustomerIds.length === 0) {
      return;
    }

    setError(null);
    setIsApplyingBulkAction(true);

    try {
      const responses = await Promise.all(
        selectedCustomerIds.map((customerId) =>
          fetch(`/api/customers/${customerId}`, {
            method: "DELETE",
          }),
        ),
      );

      if (responses.some((response) => !response.ok)) {
        throw new Error("Failed to delete selected customers");
      }

      const selectedIdSet = new Set(selectedCustomerIds);
      setCustomers((current) => current.filter((customer) => !selectedIdSet.has(customer.id)));
      setSelectedCustomerIds([]);
      setBulkAction("");
    } catch {
      setError("Failed to apply action to selected customers.");
    } finally {
      setIsApplyingBulkAction(false);
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

        <div className="mt-6 flex w-full flex-col gap-4 lg:flex-row lg:items-end">
          <div className="w-full max-w-md flex-col gap-2">
            <span className="text-sm font-medium text-slate-700">Store</span>
            <select
              value={activeStoreId}
              onChange={(event) => void handleStoreChange(event.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
            >
              {stores.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.name} / {store.currency}
                </option>
              ))}
            </select>
          </div>

          <label className="w-full max-w-md flex-col gap-2 lg:flex-1">
            <span className="text-sm font-medium text-slate-700">Search</span>
            <div className="relative mt-2">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => {
                  setSearchQuery(event.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Name, email, or phone"
                className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
              />
            </div>
          </label>

          <div className="w-full max-w-md flex-col gap-2 lg:ml-auto lg:w-auto">
            <div className="flex justify-end">
              <span className="whitespace-nowrap text-sm font-medium text-slate-700">Actions</span>
            </div>
            <div className="mt-2 flex items-center gap-3 lg:justify-end">
              <button
                type="button"
                onClick={() => void handleApplyBulkAction()}
                disabled={
                  isApplyingBulkAction ||
                  !bulkAction ||
                  (bulkAction === "delete" && selectedCustomerIds.length === 0)
                }
                className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Apply
              </button>
              <select
                value={bulkAction}
                onChange={(event) => setBulkAction(event.target.value as "" | "clear" | "delete")}
                className="w-44 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
              >
                <option value="">Select action</option>
                <option value="delete">Delete selected</option>
                <option value="clear">Clear selection</option>
              </select>
            </div>
          </div>
        </div>

        {error ? (
          <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <div className="mt-8 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {totalCustomers === 0 ? (
            <div className="p-10 text-center text-slate-500">
              {searchQuery.trim() ? "No customers match your search." : "No customers yet for this store."}
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs font-medium text-slate-600">
                  Showing {pageStart}-{pageEnd} of {totalCustomers} customers
                </p>
                <div className="flex items-center gap-4">
                  <p className="whitespace-nowrap text-xs font-medium text-slate-600">{selectedCustomerIds.length} selected</p>
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
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="w-12 px-4 py-3 text-left font-semibold text-slate-600">
                      <input
                        ref={selectAllRef}
                        type="checkbox"
                        checked={allOnPageSelected}
                        onChange={(event) => toggleSelectAllOnPage(event.target.checked)}
                        aria-label="Select all customers on this page"
                        className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                      />
                    </th>
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
                        className={`cursor-pointer transition-colors ${selectedCustomerIds.includes(customer.id) ? "bg-cyan-50/60" : "hover:bg-cyan-50/40"}`}
                      >
                        <td className="px-4 py-3 align-top">
                          <input
                            type="checkbox"
                            checked={selectedCustomerIds.includes(customer.id)}
                            onChange={() => toggleCustomerSelection(customer.id)}
                            onClick={(event) => event.stopPropagation()}
                            aria-label={`Select ${fullName || customer.email}`}
                            className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                          />
                        </td>
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
