"use client";

import { useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import { useLanguage } from "@/lib/i18n/language-context";

type HeroImageManagerProps = {
  storeId: string;
  initialHeroImageUrl: string | null;
};

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_BYTES = 5 * 1024 * 1024;

export default function HeroImageManager({ storeId, initialHeroImageUrl }: HeroImageManagerProps) {
  const { language } = useLanguage();
  const isEs = language === "es";
  const inputRef = useRef<HTMLInputElement>(null);
  const [heroImageUrl, setHeroImageUrl] = useState<string | null>(initialHeroImageUrl);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function saveHeroImage(nextHeroImageUrl: string | null) {
    setIsSaving(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(`/api/stores/${storeId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          heroImageUrl: nextHeroImageUrl,
        }),
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? (isEs ? "No se pudo guardar la imagen principal." : "Unable to save hero image."));
      }

      setMessage(
        nextHeroImageUrl
          ? (isEs ? "Imagen principal guardada." : "Hero image saved.")
          : (isEs ? "Imagen principal eliminada." : "Hero image removed.")
      );
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : (isEs ? "No se pudo guardar la imagen principal." : "Unable to save hero image.")
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;

    const file = files[0];

    if (!ALLOWED_TYPES.includes(file.type)) {
      alert(
        isEs
          ? `\"${file.name}\" no está permitido. Usa JPEG, PNG, WebP o GIF.`
          : `\"${file.name}\" is not allowed. Use JPEG, PNG, WebP, or GIF.`
      );
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    if (file.size > MAX_BYTES) {
      alert(
        isEs
          ? `\"${file.name}\" supera el límite de 5 MB.`
          : `\"${file.name}\" exceeds the 5 MB limit.`
      );
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    setIsUploading(true);
    setError(null);
    setMessage(null);

    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const filename = `hero/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const blob = await upload(filename, file, {
        access: "public",
        handleUploadUrl: "/api/uploads/products",
      });

      if (!blob?.url) {
        throw new Error(isEs ? "Error al subir. No se recibió URL." : "Upload failed. No URL returned.");
      }

      setHeroImageUrl(blob.url);
      await saveHeroImage(blob.url);
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : (isEs ? "Error al subir la imagen." : "Upload failed.")
      );
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleRemove() {
    setHeroImageUrl(null);
    await saveHeroImage(null);
  }

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-base font-semibold text-slate-900">
        {isEs ? "Imagen principal (Hero)" : "Hero image"}
      </h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        {isEs
          ? "Sube una imagen principal para personalizar el encabezado de tu tienda en todos los temas."
          : "Upload a hero image to personalize the storefront header for all themes."}
      </p>

      {error ? (
        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {message ? (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {message}
        </div>
      ) : null}

      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="group relative flex h-28 w-full max-w-[220px] items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
          {heroImageUrl ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={heroImageUrl}
                alt={isEs ? "Vista previa de imagen principal" : "Hero image preview"}
                className="h-full w-full object-cover"
              />
              <button
                type="button"
                onClick={handleRemove}
                disabled={isUploading || isSaving}
                className="absolute inset-0 flex items-center justify-center bg-slate-950/55 text-xs font-semibold text-white opacity-0 transition group-hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isEs ? "Eliminar" : "Remove"}
              </button>
            </>
          ) : (
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              {isEs ? "Hero 16:9" : "16:9 Hero"}
            </span>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleUpload}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={isUploading || isSaving}
            className="inline-flex w-fit items-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isUploading
              ? (isEs ? "Subiendo..." : "Uploading...")
              : heroImageUrl
              ? (isEs ? "Reemplazar imagen" : "Replace image")
              : (isEs ? "Subir imagen" : "Upload image")}
          </button>
          <p className="text-xs text-slate-400">
            {isEs
              ? "JPEG, PNG, WebP o GIF - máx 5 MB. Proporción recomendada: 16:9."
              : "JPEG, PNG, WebP or GIF - max 5 MB. Recommended ratio: 16:9."}
          </p>
        </div>
      </div>
    </article>
  );
}
