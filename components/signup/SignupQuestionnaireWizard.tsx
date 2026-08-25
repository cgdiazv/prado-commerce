"use client";

import Link from "next/link";
import { useState } from "react";
import {
  User,
  Mail,
  Building2,
  ShoppingBag,
  Sparkles,
  Check,
  ChevronRight,
  ChevronLeft,
  Store,
  Globe,
  Palette,
  CheckCircle2,
  Shirt,
  Zap,
  Heart,
  Home,
  Share2,
  Building,
  DollarSign,
  Lightbulb,
  ArrowRight,
} from "lucide-react";
import { PradoLogo } from "@/components/PradoLogo";

const CATEGORIES = [
  { id: "Fashion & Apparel", label: "Fashion & Apparel", icon: Shirt, desc: "Clothing, shoes, accessories" },
  { id: "Electronics & Tech", label: "Electronics & Tech", icon: Zap, desc: "Gadgets, hardware, components" },
  { id: "Beauty & Wellness", label: "Beauty & Wellness", icon: Heart, desc: "Cosmetics, skincare, supplements" },
  { id: "Home & Living", label: "Home & Living", icon: Home, desc: "Furniture, decor, kitchenware" },
  { id: "Digital & Services", label: "Digital Goods", icon: Sparkles, desc: "Software, courses, downloads" },
  { id: "General Retail", label: "General Retail", icon: ShoppingBag, desc: "Multi-category or specialized" },
];

const CATALOG_SIZES = [
  { id: "1-50", label: "1 – 50 products", desc: "Starter or boutique catalog" },
  { id: "51-1000", label: "51 – 1,000 products", desc: "Growing merchandise catalog" },
  { id: "1000+", label: "1,000+ products", desc: "Large scale or enterprise catalog" },
];

const CHANNEL_OPTIONS = [
  { id: "Online Web Storefront", label: "Online Storefront", icon: Globe, desc: "Direct-to-consumer website" },
  { id: "Social Media Commerce", label: "Social Channels", icon: Share2, desc: "Instagram, TikTok & Meta shop" },
  { id: "Retail & Physical POS", label: "Retail / POS", icon: Store, desc: "Physical stores & pop-ups" },
  { id: "B2B & Wholesale", label: "B2B / Wholesale", icon: Building, desc: "Bulk & merchant ordering" },
];

const THEMES = [
  {
    id: "MINIMAL" as const,
    label: "Minimal",
    tagline: "Clean, product-first layout with elegant whitespace.",
    colorClass: "from-cyan-500/20 to-blue-500/10 border-cyan-400/50",
  },
  {
    id: "BOLD" as const,
    label: "Bold",
    tagline: "High-contrast dynamic hero sections and vivid accents.",
    colorClass: "from-purple-500/20 to-pink-500/10 border-purple-400/50",
  },
  {
    id: "CLASSIC" as const,
    label: "Classic",
    tagline: "Structured e-commerce grid with extensive metadata filters.",
    colorClass: "from-emerald-500/20 to-teal-500/10 border-emerald-400/50",
  },
];

export function SignupQuestionnaireWizard() {
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1 State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");

  // Step 2 State (Business Questionnaire)
  const [businessCategory, setBusinessCategory] = useState<string>("Fashion & Apparel");
  const [catalogSize, setCatalogSize] = useState<string>("1-50");
  const [salesChannels, setSalesChannels] = useState<string[]>(["Online Web Storefront"]);

  // Step 3 State (Store Preferences)
  const [preferredTheme, setPreferredTheme] = useState<"MINIMAL" | "BOLD" | "CLASSIC">("MINIMAL");
  const [primaryCurrency, setPrimaryCurrency] = useState("USD");

  // Submission State
  const [status, setStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [onboardUrl, setOnboardUrl] = useState<string | null>(null);

  function toggleChannel(channelId: string) {
    setSalesChannels((current) =>
      current.includes(channelId)
        ? current.filter((c) => c !== channelId)
        : [...current, channelId]
    );
  }

  function handleNextStep(e: React.FormEvent) {
    e.preventDefault();
    if (step === 1) {
      if (!name.trim() || !email.trim()) {
        setMessage("Please fill in your name and email.");
        return;
      }
      setMessage(null);
      setStep(2);
    } else if (step === 2) {
      setMessage(null);
      setStep(3);
    } else if (step === 3) {
      handleSubmit();
    }
  }

  async function handleSubmit() {
    setStatus("saving");
    setMessage(null);

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          company,
          businessCategory,
          catalogSize,
          salesChannels,
          preferredTheme,
          questionnaireAnswers: {
            primaryCurrency,
            submittedAt: new Date().toISOString(),
          },
        }),
      });

      const result = (await response.json()) as { error?: string; onboardUrl?: string };

      if (!response.ok) {
        throw new Error(result.error ?? "Failed to create account");
      }

      setStatus("success");
      setOnboardUrl(result.onboardUrl ?? null);
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Failed to submit request");
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-12 text-slate-100 relative overflow-hidden">
      {/* Dynamic Ambient Background Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[400px] h-[400px] bg-purple-500/10 rounded-full blur-[120px] pointer-events-none" />

      <section className="relative w-full max-w-2xl rounded-2xl border border-white/15 bg-slate-900/80 p-6 md:p-10 backdrop-blur-xl shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
          <Link href="/" className="inline-block transition hover:opacity-85">
            <PradoLogo theme="dark" subtitle="Merchant Onboarding" size="md" />
          </Link>
          <div className="flex items-center gap-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-2">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-all ${
                    step === i
                      ? "bg-cyan-400 text-slate-950 ring-4 ring-cyan-400/20 shadow-lg shadow-cyan-400/30"
                      : step > i
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                      : "bg-slate-800 text-slate-400 border border-white/10"
                  }`}
                >
                  {step > i ? <Check className="h-4 w-4" /> : i}
                </div>
                {i < 3 && <div className={`h-0.5 w-6 md:w-10 ${step > i ? "bg-emerald-500/50" : "bg-slate-800"}`} />}
              </div>
            ))}
          </div>
        </div>

        {status === "success" && onboardUrl ? (
          <div className="mt-8 rounded-2xl border border-emerald-400/40 bg-emerald-950/40 p-8 text-center backdrop-blur-md animate-in fade-in zoom-in-95">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 mb-4 shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h2 className="text-2xl font-bold text-white">Account Created Successfully!</h2>
            <p className="mt-2 text-sm text-slate-300 max-w-md mx-auto">
              Your merchant profile and questionnaire preferences have been stored.
            </p>
            <div className="mt-6">
              <a
                href={onboardUrl}
                className="inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-6 py-3.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 shadow-lg shadow-cyan-400/25"
              >
                Set Your Password & Enter Dashboard <ChevronRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        ) : (
          <form onSubmit={handleNextStep} className="mt-6">
            {/* STEP 1: Account Information */}
            {step === 1 && (
              <div className="space-y-5 animate-in fade-in slide-in-from-left-4 duration-300">
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Create your Merchant Account</h1>
                  <p className="mt-1 text-sm text-slate-400">
                    Step 1 of 3: Enter your contact details to start setting up your store.
                  </p>
                </div>

                <div className="space-y-4 pt-2">
                  <label className="block">
                    <span className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-200">
                      <User className="h-4 w-4 text-cyan-400" /> Full Name <span className="text-cyan-400">*</span>
                    </span>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Jane Merchant"
                      className="w-full rounded-xl border border-white/15 bg-slate-950/60 px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-200">
                      <Mail className="h-4 w-4 text-cyan-400" /> Work Email <span className="text-cyan-400">*</span>
                    </span>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="jane@yourbrand.com"
                      className="w-full rounded-xl border border-white/15 bg-slate-950/60 px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-200">
                      <Building2 className="h-4 w-4 text-slate-400" /> Company or Store Name (Optional)
                    </span>
                    <input
                      type="text"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      placeholder="e.g. Acme Goods"
                      className="w-full rounded-xl border border-white/15 bg-slate-950/60 px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
                    />
                  </label>
                </div>
              </div>
            )}

            {/* STEP 2: Business Questionnaire */}
            {step === 2 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Tell us about your Business</h1>
                  <p className="mt-1 text-sm text-slate-400">
                    Step 2 of 3: Help us tailor your e-commerce dashboard and inventory setup.
                  </p>
                </div>

                {/* Business Category Selection */}
                <div>
                  <label className="block text-sm font-semibold text-slate-200 mb-3">
                    What is your primary industry or product category?
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {CATEGORIES.map((cat) => {
                      const Icon = cat.icon;
                      const selected = businessCategory === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setBusinessCategory(cat.id)}
                          className={`flex flex-col items-start p-3.5 rounded-xl border text-left transition-all ${
                            selected
                              ? "border-cyan-400 bg-cyan-950/30 ring-1 ring-cyan-400/50 shadow-md shadow-cyan-500/10"
                              : "border-white/10 bg-slate-950/40 hover:border-white/20 hover:bg-slate-950/70"
                          }`}
                        >
                          <div className={`p-2 rounded-lg mb-2 ${selected ? "bg-cyan-400 text-slate-950" : "bg-slate-800 text-slate-300"}`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <span className="text-xs font-semibold text-white">{cat.label}</span>
                          <span className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{cat.desc}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Catalog Size Selection */}
                <div>
                  <label className="block text-sm font-semibold text-slate-200 mb-3">
                    Estimated product catalog size:
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {CATALOG_SIZES.map((size) => {
                      const selected = catalogSize === size.id;
                      return (
                        <button
                          key={size.id}
                          type="button"
                          onClick={() => setCatalogSize(size.id)}
                          className={`p-3.5 rounded-xl border text-left transition-all ${
                            selected
                              ? "border-cyan-400 bg-cyan-950/30 ring-1 ring-cyan-400/50"
                              : "border-white/10 bg-slate-950/40 hover:border-white/20 hover:bg-slate-950/70"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-white">{size.label}</span>
                            {selected && <Check className="h-3.5 w-3.5 text-cyan-400" />}
                          </div>
                          <p className="text-[11px] text-slate-400 mt-1">{size.desc}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Sales Channels Multi-Select */}
                <div>
                  <label className="block text-sm font-semibold text-slate-200 mb-3">
                    Where do you plan to sell? <span className="text-xs font-normal text-slate-400">(Select all that apply)</span>
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {CHANNEL_OPTIONS.map((ch) => {
                      const Icon = ch.icon;
                      const isChecked = salesChannels.includes(ch.id);
                      return (
                        <button
                          key={ch.id}
                          type="button"
                          onClick={() => toggleChannel(ch.id)}
                          className={`flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all ${
                            isChecked
                              ? "border-cyan-400 bg-cyan-950/30 ring-1 ring-cyan-400/50"
                              : "border-white/10 bg-slate-950/40 hover:border-white/20"
                          }`}
                        >
                          <div className={`p-2 rounded-lg ${isChecked ? "bg-cyan-400 text-slate-950" : "bg-slate-800 text-slate-400"}`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-semibold text-white flex items-center justify-between">
                              {ch.label}
                              {isChecked && <Check className="h-3.5 w-3.5 text-cyan-400" />}
                            </div>
                            <div className="text-[11px] text-slate-400 truncate">{ch.desc}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: Storefront & Preferences */}
            {step === 3 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Storefront Theme & Currency</h1>
                  <p className="mt-1 text-sm text-slate-400">
                    Step 3 of 3: Choose your default theme look & currency. You can adjust these anytime.
                  </p>
                </div>

                {/* Theme Selection */}
                <div>
                  <label className="block text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
                    <Palette className="h-4 w-4 text-cyan-400" /> Storefront Design Preset:
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {THEMES.map((t) => {
                      const selected = preferredTheme === t.id;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setPreferredTheme(t.id)}
                          className={`relative p-4 rounded-xl border bg-gradient-to-b text-left transition-all ${
                            t.colorClass
                          } ${
                            selected
                              ? "ring-2 ring-cyan-400 border-cyan-400 shadow-lg shadow-cyan-500/20"
                              : "border-white/10 bg-slate-950/40 opacity-80 hover:opacity-100"
                          }`}
                        >
                          {selected && (
                            <div className="absolute top-3 right-3 bg-cyan-400 text-slate-950 p-1 rounded-full">
                              <Check className="h-3 w-3" />
                            </div>
                          )}
                          <div className="text-sm font-bold text-white uppercase tracking-wider">{t.label}</div>
                          <p className="text-xs text-slate-300 mt-2 leading-relaxed">{t.tagline}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Primary Currency */}
                <div>
                  <label className="block text-sm font-semibold text-slate-200 mb-2 flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-cyan-400" /> Default Store Currency:
                  </label>
                  <select
                    value={primaryCurrency}
                    onChange={(e) => setPrimaryCurrency(e.target.value)}
                    className="w-full rounded-xl border border-white/15 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
                  >
                    <option value="USD">USD ($) - US Dollar</option>
                    <option value="HNL">HNL (L) - Honduran Lempira</option>
                    <option value="MXN">MXN ($) - Mexican Peso</option>
                    <option value="ARS">ARS ($) - Argentine Peso</option>
                    <option value="EUR">EUR (€) - Euro</option>
                    <option value="GBP">GBP (£) - British Pound</option>
                    <option value="CAD">CAD ($) - Canadian Dollar</option>
                    <option value="AUD">AUD ($) - Australian Dollar</option>
                  </select>
                </div>

                <div className="rounded-xl border border-white/10 bg-slate-950/50 p-4 text-xs text-slate-400 leading-relaxed flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-cyan-400 shrink-0" />
                  <div>
                    <span className="text-slate-200 font-medium">Pro-tip:</span> You can create multiple storefronts and customize custom domains, Stripe connected payments, and inventory suppliers after completing account activation.
                  </div>
                </div>
              </div>
            )}

            {/* Error Message Display */}
            {message && (
              <div className="mt-4 rounded-xl border border-rose-500/40 bg-rose-950/40 px-4 py-3 text-sm text-rose-200">
                {message}
              </div>
            )}

            {/* Navigation & Submission Controls */}
            <div className="mt-8 flex items-center justify-between border-t border-white/10 pt-6">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={() => setStep((current) => (current - 1) as 1 | 2)}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-slate-900 px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
                >
                  <ChevronLeft className="h-4 w-4" /> Back
                </button>
              ) : (
                <div />
              )}

              <button
                type="submit"
                disabled={status === "saving"}
                className="inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:opacity-60 shadow-lg shadow-cyan-400/20"
              >
                {status === "saving" ? (
                  "Saving Profile..."
                ) : step < 3 ? (
                  <>
                    Continue <ChevronRight className="h-4 w-4" />
                  </>
                ) : (
                  <>
                    Complete Signup <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        <p className="mt-6 text-center text-xs text-slate-400">
          Already registered?{" "}
          <Link href="/login" className="font-semibold text-cyan-300 hover:underline">
            Sign in to Dashboard
          </Link>
        </p>
      </section>
    </main>
  );
}
