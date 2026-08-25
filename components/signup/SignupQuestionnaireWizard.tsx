"use client";

import Link from "next/link";
import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
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
  ShieldCheck,
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
    colorClass: "from-cyan-50 to-blue-50/50 border-cyan-300",
  },
  {
    id: "BOLD" as const,
    label: "Bold",
    tagline: "High-contrast dynamic hero sections and vivid accents.",
    colorClass: "from-purple-50 to-pink-50/50 border-purple-300",
  },
  {
    id: "CLASSIC" as const,
    label: "Classic",
    tagline: "Structured e-commerce grid with extensive metadata filters.",
    colorClass: "from-emerald-50 to-teal-50/50 border-emerald-300",
  },
];

function SignupQuestionnaireWizardContent() {
  const searchParams = useSearchParams();
  const selectedPlan = searchParams.get("plan") || "Starter";
  const intervalParam = searchParams.get("interval") || "month";

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
            selectedPlan,
            billingInterval: intervalParam,
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
    <main className="relative flex min-h-screen items-center justify-center bg-[#f8fafc] px-4 py-12 text-slate-900 overflow-hidden">
      {/* Dynamic Ambient Background Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/5 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[400px] h-[400px] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none" />

      <section className="relative w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 md:p-10 shadow-xl shadow-slate-200/50 backdrop-blur-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-6">
          <Link href="/" className="inline-block transition hover:opacity-85">
            <PradoLogo theme="light" subtitle="Merchant Onboarding" size="md" />
          </Link>
          <div className="flex items-center gap-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-2">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all ${
                    step === i
                      ? "bg-cyan-600 text-white ring-4 ring-cyan-600/20 shadow-md shadow-cyan-600/30"
                      : step > i
                      ? "bg-emerald-100 text-emerald-700 border border-emerald-300"
                      : "bg-slate-100 text-slate-400 border border-slate-200"
                  }`}
                >
                  {step > i ? <Check className="h-4 w-4" /> : i}
                </div>
                {i < 3 && <div className={`h-0.5 w-6 md:w-10 ${step > i ? "bg-emerald-400" : "bg-slate-200"}`} />}
              </div>
            ))}
          </div>
        </div>

        {status === "success" && onboardUrl ? (
          <div className="mt-8 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-8 text-center backdrop-blur-md animate-in fade-in zoom-in-95">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 border border-emerald-300 mb-4 shadow-sm">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Account Created Successfully!</h2>
            <p className="mt-2 text-sm text-slate-600 max-w-md mx-auto">
              Your merchant profile and questionnaire preferences for the <span className="font-semibold text-cyan-700">{selectedPlan}</span> plan have been stored.
            </p>
            <div className="mt-6">
              <a
                href={onboardUrl}
                className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-cyan-700 shadow-md shadow-cyan-600/25"
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
                  {selectedPlan && selectedPlan !== "Starter" && (
                    <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-800">
                      <ShieldCheck className="h-3.5 w-3.5 text-cyan-600" />
                      Selected Plan: <span className="font-bold text-cyan-900">{selectedPlan}</span> ({intervalParam === "year" ? "Annual" : "Monthly"})
                    </div>
                  )}
                  <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">Create your Merchant Account</h1>
                  <p className="mt-1 text-sm text-slate-500">
                    Step 1 of 3: Enter your contact details to start setting up your store.
                  </p>
                </div>

                <div className="space-y-4 pt-2">
                  <label className="block">
                    <span className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-slate-700">
                      <User className="h-4 w-4 text-cyan-600" /> Full Name <span className="text-cyan-600">*</span>
                    </span>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Jane Merchant"
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-600 focus:ring-2 focus:ring-cyan-600/20"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-slate-700">
                      <Mail className="h-4 w-4 text-cyan-600" /> Work Email <span className="text-cyan-600">*</span>
                    </span>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="jane@yourbrand.com"
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-600 focus:ring-2 focus:ring-cyan-600/20"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-slate-700">
                      <Building2 className="h-4 w-4 text-slate-400" /> Company or Store Name (Optional)
                    </span>
                    <input
                      type="text"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      placeholder="e.g. Acme Goods"
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-600 focus:ring-2 focus:ring-cyan-600/20"
                    />
                  </label>
                </div>
              </div>
            )}

            {/* STEP 2: Business Questionnaire */}
            {step === 2 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">Tell us about your Business</h1>
                  <p className="mt-1 text-sm text-slate-500">
                    Step 2 of 3: Help us tailor your e-commerce dashboard and inventory setup.
                  </p>
                </div>

                {/* Business Category Selection */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-3">
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
                              ? "border-cyan-600 bg-cyan-50/80 ring-1 ring-cyan-600/40 shadow-xs"
                              : "border-slate-200 bg-slate-50/60 hover:border-slate-300 hover:bg-white"
                          }`}
                        >
                          <div className={`p-2 rounded-lg mb-2 ${selected ? "bg-cyan-600 text-white" : "bg-slate-200 text-slate-600"}`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <span className="text-xs font-bold text-slate-900">{cat.label}</span>
                          <span className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{cat.desc}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Catalog Size Selection */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-3">
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
                              ? "border-cyan-600 bg-cyan-50/80 ring-1 ring-cyan-600/40 shadow-xs"
                              : "border-slate-200 bg-slate-50/60 hover:border-slate-300 hover:bg-white"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-900">{size.label}</span>
                            {selected && <Check className="h-3.5 w-3.5 text-cyan-600" />}
                          </div>
                          <p className="text-[11px] text-slate-500 mt-1">{size.desc}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Sales Channels Multi-Select */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-3">
                    Where do you plan to sell? <span className="text-xs font-normal text-slate-500">(Select all that apply)</span>
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
                              ? "border-cyan-600 bg-cyan-50/80 ring-1 ring-cyan-600/40 shadow-xs"
                              : "border-slate-200 bg-slate-50/60 hover:border-slate-300 hover:bg-white"
                          }`}
                        >
                          <div className={`p-2 rounded-lg ${isChecked ? "bg-cyan-600 text-white" : "bg-slate-200 text-slate-600"}`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-bold text-slate-900 flex items-center justify-between">
                              {ch.label}
                              {isChecked && <Check className="h-3.5 w-3.5 text-cyan-600" />}
                            </div>
                            <div className="text-[11px] text-slate-500 truncate">{ch.desc}</div>
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
                  <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">Storefront Theme & Currency</h1>
                  <p className="mt-1 text-sm text-slate-500">
                    Step 3 of 3: Choose your default theme look & currency. You can adjust these anytime.
                  </p>
                </div>

                {/* Theme Selection */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                    <Palette className="h-4 w-4 text-cyan-600" /> Storefront Design Preset:
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
                              ? "ring-2 ring-cyan-600 border-cyan-600 shadow-md shadow-cyan-600/10"
                              : "border-slate-200 bg-white opacity-80 hover:opacity-100"
                          }`}
                        >
                          {selected && (
                            <div className="absolute top-3 right-3 bg-cyan-600 text-white p-1 rounded-full">
                              <Check className="h-3 w-3" />
                            </div>
                          )}
                          <div className="text-sm font-bold text-slate-900 uppercase tracking-wider">{t.label}</div>
                          <p className="text-xs text-slate-600 mt-2 leading-relaxed">{t.tagline}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Primary Currency */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-cyan-600" /> Default Store Currency:
                  </label>
                  <select
                    value={primaryCurrency}
                    onChange={(e) => setPrimaryCurrency(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-600/20"
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

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600 leading-relaxed flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-cyan-600 shrink-0" />
                  <div>
                    <span className="text-slate-900 font-semibold">Pro-tip:</span> You can create multiple storefronts and customize custom domains, Stripe connected payments, and inventory suppliers after completing account activation.
                  </div>
                </div>
              </div>
            )}

            {/* Error Message Display */}
            {message && (
              <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {message}
              </div>
            )}

            {/* Navigation & Submission Controls */}
            <div className="mt-8 flex items-center justify-between border-t border-slate-100 pt-6">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={() => setStep((current) => (current - 1) as 1 | 2)}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-slate-900"
                >
                  <ChevronLeft className="h-4 w-4" /> Back
                </button>
              ) : (
                <div />
              )}

              <button
                type="submit"
                disabled={status === "saving"}
                className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-cyan-700 disabled:opacity-60 shadow-md shadow-cyan-600/20"
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

        <p className="mt-6 text-center text-xs text-slate-500">
          Already registered?{" "}
          <Link href="/login" className="font-semibold text-cyan-600 hover:text-cyan-700 hover:underline">
            Sign in to Dashboard
          </Link>
        </p>
      </section>
    </main>
  );
}

export function SignupQuestionnaireWizard() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#f8fafc] px-6 py-16 text-slate-600">
          <p className="text-sm font-medium">Loading questionnaire...</p>
        </main>
      }
    >
      <SignupQuestionnaireWizardContent />
    </Suspense>
  );
}
