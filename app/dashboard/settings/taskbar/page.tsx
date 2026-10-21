"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Layout, Columns3, Rows3, Maximize2, Minimize2 } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import {
  getStoredTaskbarSettings,
  setStoredTaskbarSettings,
  subscribeToTaskbarSettingsChange,
  TaskbarPosition,
  TaskbarInitialState,
} from "@/lib/dashboard-taskbar-settings";

export default function TaskbarSettingsPage() {
  const { language } = useLanguage();
  const isEs = language === "es";

  const [position, setPosition] = useState<TaskbarPosition>("side");
  const [initialState, setInitialState] = useState<TaskbarInitialState>("expanded");

  useEffect(() => {
    const current = getStoredTaskbarSettings();
    setPosition(current.position);
    setInitialState(current.initialState);

    return subscribeToTaskbarSettingsChange((settings) => {
      setPosition(settings.position);
      setInitialState(settings.initialState);
    });
  }, []);

  function handlePositionChange(newPos: TaskbarPosition) {
    setPosition(newPos);
    setStoredTaskbarSettings({ position: newPos });
  }

  function handleInitialStateChange(newState: TaskbarInitialState) {
    setInitialState(newState);
    setStoredTaskbarSettings({ initialState: newState });
  }

  return (
    <div className="space-y-6">
      {/* Header and Back Link */}
      <div className="w-full">
        <div>
          <div className="flex items-start justify-between gap-4">
            <h1 className="text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">
              {isEs ? "Configuración de la barra de tareas" : "Taskbar Settings"}
            </h1>

            <Link
              href="/dashboard/settings"
              className="inline-flex shrink-0 items-center rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              {isEs ? "← Volver a configuración" : "← Back to settings"}
            </Link>
          </div>
          <p className="mt-1 max-w-xl text-sm text-slate-500">
            {isEs
              ? "Personaliza la posición de la barra de navegación y su estado al iniciar sesión o cargar el panel."
              : "Customize navigation taskbar position and its default state when loading the dashboard."}
          </p>
        </div>
      </div>

      {/* Position Section */}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-2">
            <Layout className="h-4 w-4 text-cyan-600" />
            <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-600">
              {isEs ? "Posición de la barra de tareas" : "Taskbar Position"}
            </h2>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {isEs
              ? "Elige si prefieres tener la barra como menú lateral a la izquierda o como barra horizontal debajo del encabezado superior."
              : "Choose whether navigation docks as a left sidebar or as a horizontal bar directly below the topbar."}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6">
          {/* Side Option */}
          <button
            type="button"
            onClick={() => handlePositionChange("side")}
            className={`group relative flex flex-col text-left rounded-xl border-2 p-5 transition-all cursor-pointer ${position === "side"
                ? "border-cyan-600 bg-cyan-50/20 ring-1 ring-cyan-600/30 shadow-sm"
                : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/60"
              }`}
          >
            <div className="flex items-start justify-between w-full mb-3">
              <div className="flex items-center gap-2">
                <Columns3 className={`h-5 w-5 ${position === "side" ? "text-cyan-600" : "text-slate-400"}`} />
                <span className="font-semibold text-sm text-slate-900">
                  {isEs ? "Lateral (Barra lateral)" : "Side (Sidebar)"}
                </span>
              </div>
              <div
                className={`flex h-5 w-5 items-center justify-center rounded-full border transition ${position === "side"
                    ? "border-cyan-600 bg-cyan-600 text-white"
                    : "border-slate-300 bg-white text-transparent"
                  }`}
              >
                <Check className="h-3 w-3" />
              </div>
            </div>

            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              {isEs
                ? "Diseño vertical clásico a la izquierda de la pantalla con submenús desplegables y acceso rápido."
                : "Classic vertical layout along the left edge of your screen with flyout submenus and quick actions."}
            </p>

            {/* Visual Schematic Diagram */}
            <div className="mt-auto w-full rounded-lg border border-slate-200 bg-slate-100 p-2.5">
              <div className="flex h-20 w-full flex-col rounded bg-white shadow-xs overflow-hidden border border-slate-200">
                {/* Header */}
                <div className="h-3.5 border-b border-slate-200 bg-slate-50 px-2 flex items-center justify-between">
                  <div className="h-1.5 w-8 rounded-full bg-slate-300" />
                  <div className="flex gap-1">
                    <div className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                    <div className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                  </div>
                </div>
                {/* Body with Side Nav */}
                <div className="flex flex-1 min-h-0">
                  <div className="w-9 border-r border-cyan-300 bg-cyan-50/80 p-1 space-y-1">
                    <div className="h-1.5 w-full rounded-xs bg-cyan-600" />
                    <div className="h-1.5 w-5 rounded-xs bg-cyan-400" />
                    <div className="h-1.5 w-6 rounded-xs bg-cyan-400" />
                    <div className="h-1.5 w-4 rounded-xs bg-cyan-400" />
                  </div>
                  <div className="flex-1 p-2 bg-slate-50/50">
                    <div className="h-2 w-16 rounded-xs bg-slate-200 mb-1" />
                    <div className="h-8 w-full rounded-xs bg-white border border-slate-200" />
                  </div>
                </div>
              </div>
            </div>
          </button>

          {/* Top Option */}
          <button
            type="button"
            onClick={() => handlePositionChange("top")}
            className={`group relative flex flex-col text-left rounded-xl border-2 p-5 transition-all cursor-pointer ${position === "top"
                ? "border-cyan-600 bg-cyan-50/20 ring-1 ring-cyan-600/30 shadow-sm"
                : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/60"
              }`}
          >
            <div className="flex items-start justify-between w-full mb-3">
              <div className="flex items-center gap-2">
                <Rows3 className={`h-5 w-5 ${position === "top" ? "text-cyan-600" : "text-slate-400"}`} />
                <span className="font-semibold text-sm text-slate-900">
                  {isEs ? "Superior (Bajo la barra superior)" : "Top (Below Topbar)"}
                </span>
              </div>
              <div
                className={`flex h-5 w-5 items-center justify-center rounded-full border transition ${position === "top"
                    ? "border-cyan-600 bg-cyan-600 text-white"
                    : "border-slate-300 bg-white text-transparent"
                  }`}
              >
                <Check className="h-3 w-3" />
              </div>
            </div>

            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              {isEs
                ? "Barra horizontal moderna situada inmediatamente debajo de la barra superior. Maximiza el ancho disponible para tus tablas y pedidos."
                : "Modern horizontal bar directly beneath the top header. Maximizes horizontal space for wide tables and catalog views."}
            </p>

            {/* Visual Schematic Diagram */}
            <div className="mt-auto w-full rounded-lg border border-slate-200 bg-slate-100 p-2.5">
              <div className="flex h-20 w-full flex-col rounded bg-white shadow-xs overflow-hidden border border-slate-200">
                {/* Header */}
                <div className="h-3.5 border-b border-slate-200 bg-slate-50 px-2 flex items-center justify-between">
                  <div className="h-1.5 w-8 rounded-full bg-slate-300" />
                  <div className="flex gap-1">
                    <div className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                    <div className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                  </div>
                </div>
                {/* Top Nav right below header */}
                <div className="h-3.5 border-b border-cyan-300 bg-cyan-50/80 px-2 flex items-center gap-1.5">
                  <div className="h-1.5 w-4 rounded-xs bg-cyan-600" />
                  <div className="h-1.5 w-4 rounded-xs bg-cyan-400" />
                  <div className="h-1.5 w-5 rounded-xs bg-cyan-400" />
                  <div className="h-1.5 w-4 rounded-xs bg-cyan-400" />
                </div>
                {/* Body filling full width */}
                <div className="flex-1 p-2 bg-slate-50/50">
                  <div className="h-2 w-16 rounded-xs bg-slate-200 mb-1" />
                  <div className="h-6 w-full rounded-xs bg-white border border-slate-200" />
                </div>
              </div>
            </div>
          </button>
        </div>
      </section>

      {/* Initial State Section */}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-2">
            <Maximize2 className="h-4 w-4 text-cyan-600" />
            <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-600">
              {isEs ? "Estado inicial al abrir el panel" : "Initial State on Load"}
            </h2>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {isEs
              ? "Selecciona si deseas que la barra inicie expandida con todos los títulos o colapsada en modo compacto al abrir una nueva pestaña."
              : "Choose whether the taskbar opens in expanded view with labels or compact collapsed mode by default."}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6">
          {/* Expanded */}
          <button
            type="button"
            onClick={() => handleInitialStateChange("expanded")}
            className={`group relative flex flex-col text-left rounded-xl border-2 p-5 transition-all cursor-pointer ${initialState === "expanded"
                ? "border-cyan-600 bg-cyan-50/20 ring-1 ring-cyan-600/30 shadow-sm"
                : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/60"
              }`}
          >
            <div className="flex items-start justify-between w-full mb-3">
              <div className="flex items-center gap-2">
                <Maximize2 className={`h-5 w-5 ${initialState === "expanded" ? "text-cyan-600" : "text-slate-400"}`} />
                <span className="font-semibold text-sm text-slate-900">
                  {isEs ? "Iniciar Expandida" : "Start Expanded"}
                </span>
              </div>
              <div
                className={`flex h-5 w-5 items-center justify-center rounded-full border transition ${initialState === "expanded"
                    ? "border-cyan-600 bg-cyan-600 text-white"
                    : "border-slate-300 bg-white text-transparent"
                  }`}
              >
                <Check className="h-3 w-3" />
              </div>
            </div>

            <p className="text-xs text-slate-500 mb-3 leading-relaxed">
              {isEs
                ? "Muestra nombres completos de los módulos, flechas desplegables y enlaces principales a la vista."
                : "Full section names, indicators, and labels are openly visible right from the start."}
            </p>

            <div className="mt-auto inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-600 bg-slate-100 rounded-md px-2.5 py-1">
              <span>{isEs ? "Recomendado para pantallas estándar o grandes" : "Recommended for desktop & laptop displays"}</span>
            </div>
          </button>

          {/* Collapsed */}
          <button
            type="button"
            onClick={() => handleInitialStateChange("collapsed")}
            className={`group relative flex flex-col text-left rounded-xl border-2 p-5 transition-all cursor-pointer ${initialState === "collapsed"
                ? "border-cyan-600 bg-cyan-50/20 ring-1 ring-cyan-600/30 shadow-sm"
                : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/60"
              }`}
          >
            <div className="flex items-start justify-between w-full mb-3">
              <div className="flex items-center gap-2">
                <Minimize2 className={`h-5 w-5 ${initialState === "collapsed" ? "text-cyan-600" : "text-slate-400"}`} />
                <span className="font-semibold text-sm text-slate-900">
                  {isEs ? "Iniciar Colapsada" : "Start Collapsed"}
                </span>
              </div>
              <div
                className={`flex h-5 w-5 items-center justify-center rounded-full border transition ${initialState === "collapsed"
                    ? "border-cyan-600 bg-cyan-600 text-white"
                    : "border-slate-300 bg-white text-transparent"
                  }`}
              >
                <Check className="h-3 w-3" />
              </div>
            </div>

            <p className="text-xs text-slate-500 mb-3 leading-relaxed">
              {isEs
                ? "Inicia en formato compacto con solo iconos, desplegando los menús al pasar el cursor (hover)."
                : "Opens in compact icon-only mode, showing section flyout popovers when hovering over icons."}
            </p>

            <div className="mt-auto inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-600 bg-slate-100 rounded-md px-2.5 py-1">
              <span>{isEs ? "Maximiza el área de trabajo útil" : "Maximizes workspace on smaller screens"}</span>
            </div>
          </button>
        </div>
      </section>
    </div>
  );
}
