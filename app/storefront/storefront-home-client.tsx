"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Heart,
  MessageCircle,
  Package,
  Plus,
  RotateCcw,
} from "lucide-react";
import {
  getStorefrontThemeClasses,
  getStorefrontThemeHeroContentWithOverrides,
  normalizeStorefrontTheme,
} from "@/lib/storefront-theme";
import { useLanguage } from "@/lib/i18n/LanguageContext";

type ProductVariant = {
  id: string;
  title: string;
  price: unknown;
  inventory?: number;
  trackInventory?: boolean;
};

type StorefrontProduct = {
  id: string;
  title: string;
  slug: string;
  description?: string | null;
  images: string[];
  category?: {
    id: string;
    name: string;
    slug: string;
  } | null;
  variants: ProductVariant[];
};

type FeaturedProduct = {
  id: string;
  title: string;
  slug: string;
  images: string[];
  category?: {
    id: string;
    name: string;
    slug: string;
  } | null;
  variants: Array<{
    id?: string;
    price: unknown;
    inventory?: number;
    trackInventory?: boolean;
  }>;
};

type StorefrontCategory = {
  id: string;
  name: string;
  slug: string;
};

type StorefrontHomeClientProps = {
  store: {
    id: string;
    name: string;
    slug: string;
    logoUrl?: string | null;
    heroImageUrl?: string | null;
    heroEyebrow?: string | null;
    heroTitle?: string | null;
    heroSubtitle?: string | null;
    heroButtonText?: string | null;
    activeTheme?: "MINIMAL" | "RECINTO" | "CLASSIC" | "BOLD" | null;
    mainColor?: string;
    currency?: string;
  };
  products: StorefrontProduct[];
  featuredProducts: FeaturedProduct[];
  categories: StorefrontCategory[];
  base: string;
};

const DEFAULT_CATEGORY_TILES = [
  {
    name: "Kitchen & dining",
    nameEs: "Cocina y mesa",
    desc: "For the everyday table",
    descEs: "Para la mesa de cada día",
    image: "/storefront/recinto/474792e727fcba8724b70698f83702f4fb2bf2ba.png",
  },
  {
    name: "Living",
    nameEs: "Sala y estar",
    desc: "Make yourself at home",
    descEs: "Siéntete como en casa",
    image: "/storefront/recinto/db872d7e3a0567b2582e1b94efeb5a3c4ace0182.png",
  },
  {
    name: "Bed & bath",
    nameEs: "Dormitorio y baño",
    desc: "Softer starts, slower ends",
    descEs: "Despertares suaves y calma",
    image: "/storefront/recinto/b4fc7192ba10e1a4fd2c4fb2ef03658ab9fba491.png",
  },
  {
    name: "Storage",
    nameEs: "Almacenaje",
    desc: "A place for everything",
    descEs: "Un lugar para cada cosa",
    image: "/storefront/recinto/fed30217b25bee0ee76680aed4eb7be62aad5bd0.png",
  },
  {
    name: "Lighting",
    nameEs: "Iluminación",
    desc: "Set a different mood",
    descEs: "Crea una atmósfera única",
    image: "/storefront/recinto/9a7a66923a08b439f1bbb4f21af9828409566f62.png",
  },
  {
    name: "Accessories",
    nameEs: "Accesorios",
    desc: "The finishing touches",
    descEs: "Los toques finales",
    image: "/storefront/recinto/54246031a1f73ab0390e66c4f87a1d84913bef23.png",
  },
];

export default function StorefrontHomeClient({
  store,
  products,
  featuredProducts,
  categories,
  base,
}: StorefrontHomeClientProps) {
  const { t, language } = useLanguage();
  const isEs = language === "es";
  const theme = normalizeStorefrontTheme(store.activeTheme);
  const themeClasses = getStorefrontThemeClasses(theme);
  const hasHeroImage = Boolean(store.heroImageUrl);

  // Interactive state for Recinto theme
  const [selectedBestsellerCategory, setSelectedBestsellerCategory] = useState<string>("all");
  const [wishlist, setWishlist] = useState<Record<string, boolean>>({});
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterSubscribed, setNewsletterSubscribed] = useState(false);

  function toggleWishlist(productId: string) {
    setWishlist((prev) => ({ ...prev, [productId]: !prev[productId] }));
  }

  function handleNewsletterSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (newsletterEmail.trim()) {
      setNewsletterSubscribed(true);
    }
  }

  const heroContent = getStorefrontThemeHeroContentWithOverrides(
    theme,
    store.name,
    {
      eyebrow: store.heroEyebrow,
      title: store.heroTitle,
      subtitle: store.heroSubtitle,
      buttonText: store.heroButtonText,
    },
    language,
  );

  const productGroups = categories
    .map((category) => ({
      ...category,
      products: products.filter((product) => product.category?.id === category.id),
    }))
    .filter((group) => group.products.length > 0);

  const uncategorizedProducts = products.filter((product) => !product.category);

  const formatter = new Intl.NumberFormat(language === "es" ? "es-ES" : "en-US", {
    style: "currency",
    currency: store.currency || "USD",
  });

  // Filter products for the Recinto Bestsellers section
  const filteredBestsellers =
    selectedBestsellerCategory === "all"
      ? (featuredProducts.length > 0 ? featuredProducts : products.slice(0, 4))
      : products.filter((p) => p.category?.id === selectedBestsellerCategory);

  // New arrivals products for Recinto
  const newArrivalsList = products.slice(-4).reverse();

  return (
    <div className="contents">
      {/* ================================================================ */}
      {/* THEME: MINIMAL HERO                                              */}
      {/* ================================================================ */}
      {theme === "minimal" ? (
        <section
          className={`w-full border-b px-6 py-14 text-center ${themeClasses.hero}`}
          style={
            hasHeroImage
              ? {
                  backgroundImage: `linear-gradient(rgba(15,23,42,0.55), rgba(15,23,42,0.55)), url(${store.heroImageUrl})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }
              : undefined
          }
        >
          <div className="mx-auto w-full max-w-6xl">
            <p
              className={`text-xs font-semibold uppercase tracking-[0.22em] ${
                hasHeroImage ? "text-white/90" : "opacity-80"
              }`}
            >
              {heroContent.eyebrow}
            </p>
            <h1
              className={`mt-3 text-3xl font-semibold tracking-tight sm:text-4xl ${
                hasHeroImage ? "text-white" : ""
              }`}
            >
              {heroContent.title}
            </h1>
            <p
              className={`mx-auto mt-3 max-w-2xl text-sm sm:text-base ${
                hasHeroImage ? "text-white/90" : ""
              }`}
            >
              {heroContent.subtitle}
            </p>
            <a
              href="#all-products"
              className={`mt-6 inline-block rounded-full px-5 py-2 text-sm font-semibold transition ${
                hasHeroImage
                  ? "bg-white text-slate-900 hover:bg-slate-100"
                  : "bg-[var(--store-main-color)] text-white hover:bg-[var(--store-main-color-hover)]"
              }`}
            >
              {heroContent.buttonText}
            </a>
          </div>
        </section>
      ) : null}

      <main
        className={`mx-auto w-full max-w-6xl flex-1 px-4 sm:px-6 lg:px-8 pb-16 ${
          theme === "minimal" ? "pt-8" : "py-6 sm:py-8"
        }`}
      >
        {/* ================================================================ */}
        {/* THEME: RECINTO (NEW FIGMA STOREFRONT THEME)                      */}
        {/* ================================================================ */}
        {theme === "recinto" ? (
          <div className="space-y-14 sm:space-y-16">
            {/* 1. HERO: Seasonal Campaign */}
            <section className="rounded-[4px] bg-[#ecede5] p-6 sm:p-10 lg:p-12 border border-[#e3e5de]/60">
              <div className="grid items-center gap-8 lg:grid-cols-[1.1fr_1.1fr]">
                <div className="flex flex-col justify-center">
                  <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.2em] text-[#344e41]">
                    {heroContent.eyebrow}
                  </p>
                  <h1 className="mt-3 text-3xl sm:text-4xl lg:text-[44px] font-medium leading-[1.15] text-[#252b27] tracking-tight">
                    {heroContent.title}
                  </h1>
                  <p className="mt-4 text-xs sm:text-[13px] leading-relaxed text-[#73766f] max-w-md">
                    {heroContent.subtitle}
                  </p>
                  <div className="mt-7 flex flex-wrap gap-3">
                    <a
                      href="#featured-products"
                      className="inline-flex items-center gap-2.5 rounded-[4px] bg-[#344e41] px-5 sm:px-6 py-3 text-xs font-medium text-white transition hover:bg-[#252b27] shadow-sm"
                    >
                      <span>{heroContent.buttonText}</span>
                      <ArrowRight size={14} />
                    </a>
                  </div>
                </div>

                <div className="relative overflow-hidden rounded-[4px] bg-[#f3f3ee] min-h-[260px] sm:min-h-[340px]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={store.heroImageUrl || "/storefront/recinto/d2c4bafd8e7067776b646ee7a00ea5a3b588493e.png"}
                    alt={`${store.name} collection`}
                    className="h-full w-full object-cover min-h-[260px] sm:min-h-[340px]"
                  />
                  <div className="absolute bottom-3 right-3 rounded-[4px] bg-white/95 backdrop-blur-sm px-3 py-1.5 text-[10px] text-[#252b27] shadow-sm">
                    {isEs ? "Hecho para mañanas lentas · Desde $18" : "Made for slow mornings · From $18"}
                  </div>
                </div>
              </div>
            </section>

            {/* 2. SHOP BY CATEGORY TILES */}
            <section>
              <div className="flex items-baseline justify-between mb-6">
                <h2 className="text-xl sm:text-[22px] font-medium text-[#252b27]">
                  {isEs ? "Encuentra tus esenciales cotidianos" : "Find your everyday essentials"}
                </h2>
                <a
                  href="#all-products"
                  className="text-xs font-medium text-[#344e41] hover:underline inline-flex items-center gap-1"
                >
                  <span>{isEs ? "Ver todos los productos" : "Shop all products"}</span>
                  <ArrowUpRight size={13} />
                </a>
              </div>

              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                {(categories.length > 0
                  ? categories.slice(0, 6).map((cat, idx) => {
                      const tile = DEFAULT_CATEGORY_TILES[idx % DEFAULT_CATEGORY_TILES.length];
                      return {
                        id: cat.id,
                        name: cat.name,
                        desc: isEs ? tile.descEs : tile.desc,
                        image: tile.image,
                        href: `${base}/category/${cat.slug}`,
                      };
                    })
                  : DEFAULT_CATEGORY_TILES.map((tile) => ({
                      id: tile.name,
                      name: isEs ? tile.nameEs : tile.name,
                      desc: isEs ? tile.descEs : tile.desc,
                      image: tile.image,
                      href: "#all-products",
                    }))
                ).map((catItem) => (
                  <Link
                    key={catItem.id}
                    href={catItem.href}
                    className="group flex flex-col gap-2.5 transition"
                  >
                    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[4px] bg-[#f3f3ee]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={catItem.image}
                        alt={catItem.name}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    </div>
                    <div className="space-y-0.5">
                      <div className="flex items-center justify-between text-xs font-medium text-[#252b27]">
                        <span>{catItem.name}</span>
                        <ArrowUpRight size={13} className="text-[#344e41] opacity-75 group-hover:opacity-100" />
                      </div>
                      <p className="text-[11px] text-[#73766f]">{catItem.desc}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>

            {/* 3. BESTSELLERS / EVERYDAY FAVORITES */}
            <section id="featured-products" className="scroll-mt-8">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 mb-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#73766f]">
                    {isEs ? "EN REPETICIÓN" : "ON REPEAT"}
                  </p>
                  <h2 className="text-2xl sm:text-[30px] font-medium text-[#252b27] mt-1">
                    {isEs ? "Favoritos de todos los días" : "Everyday favorites"}
                  </h2>
                </div>
                <a
                  href="#all-products"
                  className="text-xs font-medium text-[#344e41] hover:underline inline-flex items-center gap-1.5"
                >
                  <span>{isEs ? "Ver los más vendidos" : "Shop bestsellers"}</span>
                  <ArrowRight size={13} />
                </a>
              </div>

              {/* Category filter pills */}
              <div className="flex flex-wrap items-center gap-2 mb-6 text-xs">
                <button
                  type="button"
                  onClick={() => setSelectedBestsellerCategory("all")}
                  className={`rounded-full px-4 py-2 transition text-xs font-medium ${
                    selectedBestsellerCategory === "all"
                      ? "bg-[#344e41] text-white"
                      : "bg-white border border-[#e3e5de] text-[#73766f] hover:text-[#252b27]"
                  }`}
                >
                  {isEs ? "Todos los favoritos" : "All favorites"}
                </button>
                {categories.slice(0, 4).map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedBestsellerCategory(cat.id)}
                    className={`rounded-full px-4 py-2 transition text-xs font-medium ${
                      selectedBestsellerCategory === cat.id
                        ? "bg-[#344e41] text-white"
                        : "bg-white border border-[#e3e5de] text-[#73766f] hover:text-[#252b27]"
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
                <span className="ml-auto hidden sm:inline text-[11px] text-[#73766f]">
                  {isEs ? "Algunas de nuestras piezas más queridas" : "A few of our most-loved pieces"}
                </span>
              </div>

              {/* Product Grid */}
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {filteredBestsellers.map((product, idx) => {
                  const fallbackImages = [
                    "/storefront/recinto/cfefe7a3fe8d1e1d42901344975a19f6f3eb347d.png",
                    "/storefront/recinto/7897b31c40b18ba8300819178971c10c56377296.png",
                    "/storefront/recinto/6a74180f4aa38bb701d417055005420bf30a8832.png",
                    "/storefront/recinto/5226cd517f6c8381b9eb63b4837341254c3b2ba5.png",
                  ];
                  const img = product.images?.[0] || fallbackImages[idx % fallbackImages.length];
                  const primaryVariant = product.variants?.[0];
                  const price = primaryVariant?.price;
                  const variantId = primaryVariant?.id;
                  const isSaved = Boolean(wishlist[product.id]);

                  return (
                    <article
                      key={product.id}
                      className="group flex flex-col justify-between space-y-3"
                    >
                      <div className="relative aspect-square w-full overflow-hidden rounded-[4px] bg-[#f3f3ee]">
                        <Link href={`${base}/products/${product.id}`} className="absolute inset-0 z-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={img}
                            alt={product.title}
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        </Link>
                        <span className="absolute top-2.5 left-2.5 z-10 rounded-[4px] bg-white px-2 py-1 text-[10px] font-medium text-[#344e41] shadow-xs">
                          {isEs ? "Más vendido" : "Bestseller"}
                        </span>
                        <button
                          type="button"
                          onClick={() => toggleWishlist(product.id)}
                          aria-label="Wishlist"
                          className="absolute top-2.5 right-2.5 z-10 inline-flex h-7 w-7 items-center justify-center rounded-full bg-white text-[#252b27] shadow-xs transition hover:scale-110"
                        >
                          <Heart
                            size={14}
                            className={isSaved ? "fill-[#344e41] text-[#344e41]" : "text-[#252b27]"}
                          />
                        </button>
                      </div>

                      <div className="space-y-1 text-xs">
                        <div className="flex items-center justify-between font-medium text-[#252b27]">
                          <Link href={`${base}/products/${product.id}`} className="hover:underline">
                            {product.title}
                          </Link>
                          <span>{price != null ? formatter.format(Number(price)) : "$18"}</span>
                        </div>
                        <p className="text-[11px] text-[#73766f]">
                          {product.category?.name || (isEs ? "Gres esmaltado · 12 oz" : "Glazed stoneware · 12 oz")}
                        </p>
                        <div className="flex items-center gap-1.5 pt-1">
                          <span className="h-2.5 w-2.5 rounded-full bg-[#e6e0d2] ring-1 ring-[#252b27]" />
                          <span className="h-2.5 w-2.5 rounded-full bg-[#8c9987] ring-1 ring-[#e3e5de]" />
                          <span className="h-2.5 w-2.5 rounded-full bg-[#bda18d] ring-1 ring-[#e3e5de]" />
                          <span className="ml-1 text-[10px] text-[#73766f]">
                            {isEs ? "3 colores" : "3 colors"}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        data-prado-add={variantId || product.id}
                        data-prado-add-to-cart={variantId || product.id}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-[4px] border border-[#344e41] py-2 text-xs font-medium text-[#344e41] transition hover:bg-[#344e41] hover:text-white"
                      >
                        <Plus size={14} />
                        <span>{isEs ? "Añadir a la bolsa" : "Add to bag"}</span>
                      </button>
                    </article>
                  );
                })}
              </div>
            </section>

            {/* 4. SHOPPABLE SCENE FEATURE (DINING COLLECTION) */}
            <section className="rounded-[4px] bg-[#f3f3ee] overflow-hidden grid lg:grid-cols-2 border border-[#e3e5de]/60">
              <div className="relative min-h-[300px] sm:min-h-[380px] bg-slate-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/storefront/recinto/88ef5adf1fd38aa63c65d616eef77bc9fede7486.png"
                  alt="Considered dining"
                  className="h-full w-full object-cover"
                />
                {/* Floating mini product tag */}
                <div className="absolute bottom-4 left-4 z-10 flex items-center gap-3 rounded-[4px] bg-white px-3.5 py-2.5 shadow-sm">
                  <div className="text-xs">
                    <p className="font-medium text-[#252b27]">
                      {isEs ? "Taza cotidiana" : "Everyday mug"}
                    </p>
                    <p className="text-[11px] text-[#73766f]">
                      {isEs ? "Gres · $18" : "Stoneware · $18"}
                    </p>
                  </div>
                  <a
                    href="#featured-products"
                    className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#f3f3ee] text-[#344e41] hover:bg-[#344e41] hover:text-white transition"
                    aria-label="View product"
                  >
                    <ArrowUpRight size={13} />
                  </a>
                </div>
              </div>

              <div className="p-8 sm:p-12 lg:p-14 flex flex-col justify-center">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[#344e41]">
                  {isEs ? "UN LUGAR EN LA MESA" : "A PLACE AT THE TABLE"}
                </p>
                <h2 className="mt-3 text-3xl sm:text-4xl font-medium leading-[1.18] text-[#252b27] tracking-tight">
                  {isEs ? "Menos ocasión.\nMás cada día." : "Less occasion.\nMore everyday."}
                </h2>
                <p className="mt-4 text-xs sm:text-[13px] leading-relaxed text-[#73766f] max-w-md">
                  {isEs
                    ? "Capas sencillas, texturas naturales y piezas que se complementan. Prepara una mesa que invite a reunirse, cualquier día de la semana."
                    : "Easy layers, natural textures and pieces that belong together. Set a table worth gathering around, any day of the week."}
                </p>
                <div className="mt-7">
                  <a
                    href="#all-products"
                    className="inline-flex items-center gap-2.5 rounded-[4px] bg-[#344e41] px-5 sm:px-6 py-3 text-xs font-medium text-white transition hover:bg-[#252b27]"
                  >
                    <span>{isEs ? "Comprar cocina y mesa" : "Shop kitchen & dining"}</span>
                    <ArrowRight size={14} />
                  </a>
                </div>
              </div>
            </section>

            {/* 5. NEW ARRIVALS */}
            <section id="new-arrivals" className="scroll-mt-8">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 mb-6">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#73766f]">
                    {isEs ? "RECIÉN LLEGADO" : "JUST UNPACKED"}
                  </p>
                  <h2 className="text-2xl sm:text-[30px] font-medium text-[#252b27] mt-1">
                    {isEs ? "Una nueva perspectiva" : "A fresh perspective"}
                  </h2>
                </div>
                <a
                  href="#all-products"
                  className="text-xs font-medium text-[#344e41] hover:underline inline-flex items-center gap-1.5"
                >
                  <span>{isEs ? "Ver novedades" : "Shop new arrivals"}</span>
                  <ArrowRight size={13} />
                </a>
              </div>

              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {newArrivalsList.map((product, idx) => {
                  const fallbackImages = [
                    "/storefront/recinto/7fb212b3e091b3e592b2271ce2dc7232480f962c.png",
                    "/storefront/recinto/10a8f9c204e32c1307b70c58c21b13e4e4876d1c.png",
                    "/storefront/recinto/cdc5321fbceaf056f1d936f3cfa887afc3630746.png",
                    "/storefront/recinto/9a33499428150619401f80ba425d47a92d887170.png",
                  ];
                  const img = product.images?.[0] || fallbackImages[idx % fallbackImages.length];
                  const primaryVariant = product.variants?.[0];
                  const price = primaryVariant?.price;
                  const variantId = primaryVariant?.id;
                  const isSaved = Boolean(wishlist[product.id]);

                  return (
                    <article
                      key={product.id}
                      className="group flex flex-col justify-between space-y-3"
                    >
                      <div className="relative aspect-square w-full overflow-hidden rounded-[4px] bg-[#f3f3ee]">
                        <Link href={`${base}/products/${product.id}`} className="absolute inset-0 z-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={img}
                            alt={product.title}
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        </Link>
                        <span className="absolute top-2.5 left-2.5 z-10 rounded-[4px] bg-white px-2 py-1 text-[10px] font-medium text-[#344e41] shadow-xs">
                          {isEs ? "Nuevo" : "New"}
                        </span>
                        <button
                          type="button"
                          onClick={() => toggleWishlist(product.id)}
                          aria-label="Wishlist"
                          className="absolute top-2.5 right-2.5 z-10 inline-flex h-7 w-7 items-center justify-center rounded-full bg-white text-[#252b27] shadow-xs transition hover:scale-110"
                        >
                          <Heart
                            size={14}
                            className={isSaved ? "fill-[#344e41] text-[#344e41]" : "text-[#252b27]"}
                          />
                        </button>
                      </div>

                      <div className="space-y-1 text-xs">
                        <div className="flex items-center justify-between font-medium text-[#252b27]">
                          <Link href={`${base}/products/${product.id}`} className="hover:underline">
                            {product.title}
                          </Link>
                          <span>{price != null ? formatter.format(Number(price)) : "$32"}</span>
                        </div>
                        <p className="text-[11px] text-[#73766f]">
                          {product.category?.name || (isEs ? "Diseño orgánico contemporáneo" : "Organic contemporary design")}
                        </p>
                        <div className="flex items-center gap-1.5 pt-1">
                          <span className="h-2.5 w-2.5 rounded-full bg-[#9da88a] ring-1 ring-[#252b27]" />
                          <span className="h-2.5 w-2.5 rounded-full bg-[#d9dcd2] ring-1 ring-[#e3e5de]" />
                          <span className="ml-1 text-[10px] text-[#73766f]">
                            {isEs ? "2 colores" : "2 colors"}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        data-prado-add={variantId || product.id}
                        data-prado-add-to-cart={variantId || product.id}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-[4px] border border-[#344e41] py-2 text-xs font-medium text-[#344e41] transition hover:bg-[#344e41] hover:text-white"
                      >
                        <Plus size={14} />
                        <span>{isEs ? "Añadir a la bolsa" : "Add to bag"}</span>
                      </button>
                    </article>
                  );
                })}
              </div>
            </section>

            {/* 6. THE JOURNAL */}
            <section id="journal" className="rounded-[4px] bg-[#f3f3ee] p-6 sm:p-10 lg:p-12 border border-[#e3e5de]/60">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 mb-8">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#73766f]">
                    {isEs ? "UN POCO DE INSPIRACIÓN" : "A LITTLE INSPIRATION"}
                  </p>
                  <h2 className="text-2xl sm:text-[30px] font-medium text-[#252b27] mt-1">
                    {isEs ? `En casa con ${store.name}` : `At home with ${store.name}`}
                  </h2>
                </div>
                <a
                  href="#support"
                  className="text-xs font-medium text-[#344e41] hover:underline inline-flex items-center gap-1.5"
                >
                  <span>{isEs ? "Visitar el diario" : "Visit the journal"}</span>
                  <ArrowRight size={13} />
                </a>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <article className="group flex flex-col gap-3">
                  <div className="aspect-[16/10] overflow-hidden rounded-[4px] bg-slate-200">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/storefront/recinto/b9211076376472adace24db0c06db78e0874bc6a.png"
                      alt="A softer space"
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] uppercase tracking-wider text-[#73766f]">
                      {isEs ? "LA EDICIÓN · 4 MIN DE LECTURA" : "THE EDIT · 4 MIN READ"}
                    </p>
                    <h3 className="text-base sm:text-lg font-medium text-[#252b27] flex items-center justify-between group-hover:text-[#344e41] transition">
                      <span>{isEs ? "Pequeños cambios, un espacio más suave" : "Small changes, a softer space"}</span>
                      <ArrowUpRight size={15} />
                    </h3>
                    <p className="text-xs text-[#73766f]">
                      {isEs
                        ? "Formas sencillas de aportar textura y calidez al hogar."
                        : "Simple ways to bring texture and warmth home."}
                    </p>
                  </div>
                </article>

                <article className="group flex flex-col gap-3">
                  <div className="aspect-[16/10] overflow-hidden rounded-[4px] bg-slate-200">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/storefront/recinto/c512551358ec113f2ea35762868750f85667bbfa.png"
                      alt="Morning ritual"
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] uppercase tracking-wider text-[#73766f]">
                      {isEs ? "RITUALES DIARIOS · 3 MIN DE LECTURA" : "EVERYDAY RITUALS · 3 MIN READ"}
                    </p>
                    <h3 className="text-base sm:text-lg font-medium text-[#252b27] flex items-center justify-between group-hover:text-[#344e41] transition">
                      <span>{isEs ? "El arte de la mañana sin prisas" : "The art of the unhurried morning"}</span>
                      <ArrowUpRight size={15} />
                    </h3>
                    <p className="text-xs text-[#73766f]">
                      {isEs
                        ? "Un espacio para los rituales que hacen especial tu día."
                        : "A little room for the rituals that make your day."}
                    </p>
                  </div>
                </article>
              </div>
            </section>

            {/* 7. SHOPPING SUPPORT BADGES */}
            <section id="support" className="border-y border-[#e3e5de] py-8 grid gap-6 sm:grid-cols-3">
              <div className="flex items-start gap-4">
                <div className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f3f3ee] text-[#344e41]">
                  <Package size={18} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xs font-medium text-[#252b27]">
                    {isEs ? "Envíos claros y seguros" : "Delivery, made clear"}
                  </h3>
                  <p className="text-[11px] text-[#73766f]">
                    {isEs ? "Revisa tus opciones de envío al pagar." : "See shipping options at checkout."}
                  </p>
                  <a href="#support" className="inline-block text-[11px] font-medium text-[#344e41] hover:underline">
                    {isEs ? "Información de envíos" : "Shipping information"}
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f3f3ee] text-[#344e41]">
                  <RotateCcw size={18} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xs font-medium text-[#252b27]">
                    {isEs ? "Tu compra perfecta" : "Find your perfect fit"}
                  </h3>
                  <p className="text-[11px] text-[#73766f]">
                    {isEs ? "Todo lo que necesitas saber sobre cambios." : "Everything you need to know about returns."}
                  </p>
                  <a href="#support" className="inline-block text-[11px] font-medium text-[#344e41] hover:underline">
                    {isEs ? "Ver política de devoluciones" : "View return policy"}
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f3f3ee] text-[#344e41]">
                  <MessageCircle size={18} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xs font-medium text-[#252b27]">
                    {isEs ? "¿Necesitas ayuda?" : "A little help?"}
                  </h3>
                  <p className="text-[11px] text-[#73766f]">
                    {isEs ? "Desde detalles de producto hasta pedidos." : "From product details to order questions."}
                  </p>
                  <a href="#support" className="inline-block text-[11px] font-medium text-[#344e41] hover:underline">
                    {isEs ? "Contáctanos" : "Get in touch"}
                  </a>
                </div>
              </div>
            </section>

            {/* 8. NEWSLETTER SIGNUP */}
            <section className="rounded-[4px] bg-[#ecede5] p-6 sm:p-10 lg:p-12 border border-[#e3e5de]/60 grid items-center gap-8 lg:grid-cols-[1.2fr_1fr]">
              <div className="space-y-2">
                <h2 className="text-2xl sm:text-[28px] font-medium text-[#252b27] tracking-tight">
                  {isEs ? "Cosas buenas, en tu correo." : "Good things, in your inbox."}
                </h2>
                <p className="text-xs sm:text-[13px] leading-relaxed text-[#73766f] max-w-md">
                  {isEs
                    ? `Novedades, selecciones cuidadas e inspiración cotidiana. Una nota de ${store.name}, de vez en cuando.`
                    : `New arrivals, thoughtful edits and everyday inspiration. A note from ${store.name}, every so often.`}
                </p>
              </div>

              <div>
                {newsletterSubscribed ? (
                  <div className="inline-flex items-center gap-2 rounded-[4px] bg-[#344e41] px-4 py-3 text-xs font-medium text-white shadow-xs">
                    <Check size={16} />
                    <span>{isEs ? "¡Gracias por suscribirte!" : "Thank you for subscribing!"}</span>
                  </div>
                ) : (
                  <form onSubmit={handleNewsletterSubmit} className="space-y-2">
                    <div className="flex items-center rounded-[4px] border border-[#e3e5de] bg-white p-1 shadow-xs focus-within:border-[#344e41]">
                      <input
                        type="email"
                        required
                        value={newsletterEmail}
                        onChange={(e) => setNewsletterEmail(e.target.value)}
                        placeholder={isEs ? "Tu correo electrónico" : "Your email address"}
                        className="w-full px-3 py-1 text-xs text-[#252b27] placeholder-[#73766f] outline-none"
                      />
                      <button
                        type="submit"
                        className="inline-flex shrink-0 items-center gap-1.5 rounded-[2px] bg-[#344e41] px-4 py-2 text-xs font-medium text-white transition hover:bg-[#252b27]"
                      >
                        <span>{isEs ? "Suscribirse" : "Subscribe"}</span>
                        <ArrowRight size={13} />
                      </button>
                    </div>
                    <p className="text-[10px] text-[#73766f]">
                      {isEs
                        ? "Al suscribirte, aceptas nuestra Política de Privacidad. Cancela en cualquier momento."
                        : "By subscribing, you agree to our Privacy Policy. Unsubscribe anytime."}
                    </p>
                  </form>
                )}
              </div>
            </section>
          </div>
        ) : null}

        {/* ================================================================ */}
        {/* THEME: CLASSIC HERO                                              */}
        {/* ================================================================ */}
        {theme === "classic" ? (
          <section className={`mb-10 rounded-3xl border px-8 py-10 ${themeClasses.hero}`}>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-700">
              {heroContent.eyebrow}
            </p>
            <div className="mt-5 grid gap-6 lg:grid-cols-[1.4fr_0.9fr]">
              <div>
                <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                  {heroContent.title}
                </h1>
                <p className="mt-4 max-w-2xl text-sm text-slate-700 sm:text-base">
                  {heroContent.subtitle}
                </p>
              </div>
              {hasHeroImage ? (
                <div className="overflow-hidden rounded-2xl border border-amber-200 bg-white/70">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={store.heroImageUrl!}
                    alt={`${store.name} hero`}
                    className="h-52 w-full object-cover"
                  />
                </div>
              ) : (
                <div className="rounded-2xl border border-amber-200 bg-white/70 p-5">
                  <p className="text-xs uppercase tracking-[0.2em] text-amber-700">
                    {t.storefront.featuredSelection}
                  </p>
                  <p className="mt-3 text-sm text-slate-700">
                    {t.storefront.featuredSelectionDesc}
                  </p>
                  <a
                    href="#featured-products"
                    className="mt-5 inline-block text-sm font-semibold text-[var(--store-main-color)] hover:underline"
                  >
                    {heroContent.buttonText}
                  </a>
                </div>
              )}
            </div>
          </section>
        ) : null}

        {/* ================================================================ */}
        {/* MINIMAL & CLASSIC FEATURED PRODUCTS GRID                         */}
        {/* ================================================================ */}
        {theme !== "recinto" && featuredProducts.length > 0 ? (
          <section
            id="featured-products"
            className={`mb-10 ${
              theme === "minimal"
                ? ""
                : `rounded-3xl border px-6 py-6 ${themeClasses.featuredWrap}`
            }`}
          >
            <div className="mb-4">
              <h2 className="text-lg font-semibold">{t.storefront.featuredProducts}</h2>
            </div>
            {theme === "classic" ? (
              <div className="grid gap-3">
                {featuredProducts.map((product, index) => {
                  const featuredPrice = product.variants[0]?.price;
                  const isSoldOut = Boolean(
                    product.variants[0]?.trackInventory &&
                      (product.variants[0]?.inventory ?? 0) <= 0
                  );
                  return (
                    <Link
                      key={product.id}
                      href={`${base}/products/${product.id}`}
                      className={`relative grid items-center gap-4 rounded-lg border p-3 transition sm:grid-cols-[90px_1fr_auto] ${themeClasses.productCard}`}
                    >
                      {isSoldOut && (
                        <span className="absolute top-2 left-2 z-10 rounded-full bg-red-600/90 backdrop-blur-sm px-2 py-0.5 text-[10px] font-semibold text-white shadow-sm">
                          {language === "es" ? "Agotado" : "Sold Out"}
                        </span>
                      )}
                      {product.images[0] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={product.images[0]}
                          alt={product.title}
                          className="h-20 w-full rounded-md object-cover"
                        />
                      ) : (
                        <div className="flex h-20 items-center justify-center rounded-md bg-slate-100 text-xs text-slate-400">
                          {t.storefront.noImage}
                        </div>
                      )}
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-amber-700">
                          No. {index + 1}
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">
                          {product.title}
                        </p>
                      </div>
                      <p className="text-xs font-semibold text-slate-700">
                        {featuredPrice != null
                          ? formatter.format(Number(featuredPrice))
                          : t.storefront.selectOptions}
                      </p>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {featuredProducts.map((product) => {
                  const featuredPrice = product.variants[0]?.price;
                  const isSoldOut = Boolean(
                    product.variants[0]?.trackInventory &&
                      (product.variants[0]?.inventory ?? 0) <= 0
                  );
                  return (
                    <Link
                      key={product.id}
                      href={`${base}/products/${product.id}`}
                      className={`relative rounded-lg border p-3 transition ${themeClasses.productCard}`}
                    >
                      {isSoldOut && (
                        <span className="absolute top-2 left-2 z-10 rounded-full bg-red-600/90 backdrop-blur-sm px-2.5 py-0.5 text-xs font-semibold text-white shadow-sm">
                          {language === "es" ? "Agotado" : "Sold Out"}
                        </span>
                      )}
                      {product.images[0] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={product.images[0]}
                          alt={product.title}
                          className="h-28 w-full rounded-md object-cover"
                        />
                      ) : (
                        <div className="flex h-28 items-center justify-center rounded-md bg-slate-100 text-xs text-slate-400">
                          {t.storefront.noImage}
                        </div>
                      )}
                      <p className="mt-3 text-sm font-semibold text-slate-900">
                        {product.title}
                      </p>
                      <p className="mt-1 text-xs text-slate-600">
                        {featuredPrice != null
                          ? formatter.format(Number(featuredPrice))
                          : t.storefront.selectOptions}
                      </p>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>
        ) : null}

        {/* ================================================================ */}
        {/* ALL PRODUCTS CATALOG GRID                                        */}
        {/* ================================================================ */}
        <section id="all-products" className="pt-6">
          <div className="mb-6 flex items-baseline justify-between border-b border-slate-200 pb-3">
            <h2 className="text-xl font-semibold text-slate-900">
              {isEs ? "Catálogo completo" : "Complete Catalog"}
            </h2>
            <span className="text-xs text-slate-500">
              {products.length} {isEs ? "productos" : "products"}
            </span>
          </div>

          {products.length === 0 ? (
            <p className="text-center text-slate-500 py-12">{t.storefront.noProductsAvailable}</p>
          ) : (
            <div className="space-y-12">
              {[
                ...productGroups,
                ...(uncategorizedProducts.length > 0
                  ? [
                      {
                        id: "uncategorized",
                        name: t.storefront.otherProducts,
                        slug: "uncategorized",
                        products: uncategorizedProducts,
                      },
                    ]
                  : []),
              ].map((group) => (
                <section key={group.id} aria-labelledby={`category-${group.id}`}>
                  <h3 id={`category-${group.id}`} className="mb-4 text-lg font-medium text-slate-900">
                    {group.name}
                  </h3>
                  <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {group.products.map((product) => {
                      const primaryVariant = product.variants[0];
                      const isSoldOut = Boolean(
                        primaryVariant?.trackInventory &&
                          (primaryVariant?.inventory ?? 0) <= 0
                      );
                      const price = primaryVariant?.price;
                      const variantId = primaryVariant?.id;
                      return (
                        <div
                          key={product.id}
                          className={`relative overflow-hidden rounded-[4px] border transition ${themeClasses.productCard}`}
                        >
                          <Link
                            href={`${base}/products/${product.id}`}
                            className="absolute inset-0 z-0"
                            aria-label={product.title}
                          />
                          {isSoldOut && (
                            <span className="absolute top-2 left-2 z-10 rounded-full bg-red-600/90 backdrop-blur-sm px-2.5 py-0.5 text-xs font-semibold text-white shadow-sm">
                              {language === "es" ? "Agotado" : "Sold Out"}
                            </span>
                          )}
                          {product.images[0] ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={product.images[0]}
                              alt={product.title}
                              className="h-48 w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-48 items-center justify-center bg-[#f3f3ee] text-slate-400 text-xs">
                              {t.storefront.noImage}
                            </div>
                          )}
                          <div className="p-4">
                            <h4 className="font-medium text-slate-900 text-sm">{product.title}</h4>
                            <div className="mt-3 flex items-center justify-between">
                              {price != null ? (
                                <span className="text-sm font-semibold text-slate-700">
                                  {formatter.format(Number(price))}
                                </span>
                              ) : (
                                <span className="text-sm text-slate-400">
                                  {t.storefront.selectOptions}
                                </span>
                              )}
                              {isSoldOut ? (
                                <button
                                  type="button"
                                  disabled
                                  className="relative z-10 rounded-[4px] bg-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-500 cursor-not-allowed"
                                >
                                  {language === "es" ? "Agotado" : "Sold Out"}
                                </button>
                              ) : variantId ? (
                                <button
                                  type="button"
                                  data-prado-add={variantId}
                                  data-prado-add-to-cart={variantId}
                                  className={`relative z-10 px-3.5 py-1.5 text-xs font-medium transition ${
                                    theme === "recinto"
                                      ? "rounded-[4px] border border-[#344e41] text-[#344e41] hover:bg-[#344e41] hover:text-white"
                                      : "rounded-full bg-[var(--store-main-color)] text-white hover:bg-[var(--store-main-color-hover)]"
                                  }`}
                                >
                                  {t.storefront.addToCart}
                                </button>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
