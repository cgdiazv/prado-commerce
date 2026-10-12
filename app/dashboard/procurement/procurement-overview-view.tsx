"use client";

import React from "react";
import Link from "next/link";
import { Building2, FileText, PackageCheck, Plus, Truck, ArrowRight } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";

interface ProcurementOverviewViewProps {
  vendorsCount: number;
  openPOsCount: number;
  pendingUnitsToReceive: number;
  recentPOs: any[];
  recentVendors: any[];
  activeCurrency: string;
}

export function ProcurementOverviewView({
  vendorsCount,
  openPOsCount,
  pendingUnitsToReceive,
  recentPOs,
  recentVendors,
  activeCurrency,
}: ProcurementOverviewViewProps) {
  const { language } = useLanguage();
  const isEs = language === "es";

  const formatter = new Intl.NumberFormat(isEs ? "es-ES" : "en-US", {
    style: "currency",
    currency: activeCurrency || "USD",
  });

  const statusColors: Record<string, string> = {
    DRAFT: "bg-slate-100 text-slate-700 border-slate-200",
    SENT: "bg-blue-50 text-blue-700 border-blue-200",
    PARTIAL: "bg-amber-50 text-amber-700 border-amber-200",
    RECEIVED: "bg-emerald-50 text-emerald-700 border-emerald-200",
    CANCELLED: "bg-red-50 text-red-700 border-red-200",
  };

  const statusLabels: Record<string, string> = {
    DRAFT: isEs ? "Borrador" : "Draft",
    SENT: isEs ? "Enviada" : "Sent",
    PARTIAL: isEs ? "Parcial" : "Partial",
    RECEIVED: isEs ? "Recibida" : "Received",
    CANCELLED: isEs ? "Cancelada" : "Cancelled",
  };

  return (
    <section className="min-w-0 space-y-6">
      {/* Page Title & Quick Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950">
            {isEs ? "Centro de Compras" : "Procurement & ERP Center"}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {isEs
              ? "Administra relaciones con proveedores, órdenes de compra, costos unitarios y recepción de inventario."
              : "Manage vendor relations, purchase orders, unit cost tracking, and inventory receiving."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/procurement/vendors"
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Building2 className="h-4 w-4" />
            {isEs ? "Proveedores" : "Vendors"}
          </Link>
          <Link
            href="/dashboard/procurement/purchase-orders/new"
            className="inline-flex items-center gap-1.5 rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            <Plus className="h-4 w-4" />
            {isEs ? "Nueva OC" : "New Purchase Order"}
          </Link>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">
              {isEs ? "Proveedores Activos" : "Active Vendors"}
            </span>
            <Building2 className="h-5 w-5 text-blue-600" />
          </div>
          <p className="text-2xl font-black text-slate-900">{vendorsCount}</p>
          <p className="text-xs text-slate-500">
            {isEs ? "Perfiles de proveedores registrados" : "Registered supplier profiles"}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">
              {isEs ? "Órdenes Abiertas" : "Open POs"}
            </span>
            <FileText className="h-5 w-5 text-amber-600" />
          </div>
          <p className="text-2xl font-black text-slate-900">{openPOsCount}</p>
          <p className="text-xs text-slate-500">
            {isEs ? "Borradores, enviadas y parciales" : "Draft, sent & partial orders"}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">
              {isEs ? "Unidades Entrantes" : "Incoming Units"}
            </span>
            <PackageCheck className="h-5 w-5 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-slate-900">{pendingUnitsToReceive}</p>
          <p className="text-xs text-slate-500">
            {isEs ? "Unidades pendientes por recibir" : "Outstanding units to receive"}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">
              {isEs ? "Total de Órdenes" : "Receiving Status"}
            </span>
            <Truck className="h-5 w-5 text-purple-600" />
          </div>
          <p className="text-2xl font-black text-slate-900">{recentPOs.length}</p>
          <p className="text-xs text-slate-500">
            {isEs ? "Órdenes de compra registradas" : "Total recorded POs"}
          </p>
        </div>
      </div>

      {/* Grid Section: Recent POs & Top Vendors */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Purchase Orders Table */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-slate-900">
              {isEs ? "Órdenes de Compra Recientes" : "Recent Purchase Orders"}
            </h2>
            <Link
              href="/dashboard/procurement/purchase-orders"
              className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline"
            >
              {isEs ? "Ver todas las órdenes" : "View All POs"}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {recentPOs.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              {isEs ? "No hay órdenes de compra creadas todavía." : "No purchase orders created yet."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-100 bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="px-3 py-2.5">{isEs ? "Nº de Orden" : "PO #"}</th>
                    <th className="px-3 py-2.5">{isEs ? "Proveedor" : "Vendor"}</th>
                    <th className="px-3 py-2.5">{isEs ? "Estado" : "Status"}</th>
                    <th className="px-3 py-2.5 text-right">{isEs ? "Costo Total" : "Total Cost"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentPOs.map((po: any) => (
                    <tr key={po.id} className="hover:bg-slate-50">
                      <td className="px-3 py-3 font-semibold text-slate-900">
                        <Link href={`/dashboard/procurement/purchase-orders/${po.id}`} className="hover:text-blue-600">
                          {po.poNumber}
                        </Link>
                      </td>
                      <td className="px-3 py-3 text-slate-700">{po.vendor?.name}</td>
                      <td className="px-3 py-3">
                        <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold ${statusColors[po.status] || "bg-slate-100 text-slate-700"}`}>
                          {statusLabels[po.status] ?? po.status}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right font-bold text-slate-900">
                        {formatter.format(Number(po.total || 0))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Vendors Quick Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-slate-900">
              {isEs ? "Proveedores Activos" : "Active Suppliers"}
            </h2>
            <Link
              href="/dashboard/procurement/vendors"
              className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline"
            >
              {isEs ? "Administrar" : "Manage"}
            </Link>
          </div>

          {recentVendors.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              {isEs ? "No hay proveedores registrados." : "No vendors registered."}
            </div>
          ) : (
            <div className="space-y-3">
              {recentVendors.map((vendor: any) => (
                <div key={vendor.id} className="flex items-center justify-between rounded-xl bg-slate-50 p-3 text-xs">
                  <div>
                    <p className="font-bold text-slate-900">{vendor.name}</p>
                    <p className="text-[11px] text-slate-500">{vendor.store?.name}</p>
                  </div>
                  <span className="rounded-full bg-white border border-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                    {vendor._count?.purchaseOrders || 0} {isEs ? "órdenes" : "POs"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
