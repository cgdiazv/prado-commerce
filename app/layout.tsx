import type { Metadata, Viewport } from "next";
import { headers, cookies } from "next/headers";
import { Roboto } from "next/font/google";
import "./globals.css";
import { PublicFooter } from "@/components/public-footer";
import { CookieBanner } from "@/components/CookieBanner";
import { LanguageProvider } from "@/lib/i18n/LanguageContext";
import type { Language } from "@/lib/i18n/translations";

const roboto = Roboto({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-roboto",
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#ffffff" },
  ],
};

export const metadata: Metadata = {
  title: {
    template: "%s | Prado Commerce",
    default: "Prado Commerce | Streamlined E-commerce & Omnichannel Management",
  },
  description:
    "Prado Commerce gives you one control plane for stores, products, and embeddable cart flows. Ship features faster and more secure checkouts.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icon.png",
    shortcut: "/icon.png",
    apple: "/apple-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Prado Commerce",
  },
  formatDetection: { telephone: false },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const hdrs = await headers();
  const cookieStore = await cookies();
  const rawLang = cookieStore.get("prado_lang")?.value;
  const initialLanguage: Language = rawLang === "en" || rawLang === "es" ? rawLang : "es";

  const isStorefrontRequest =
    hdrs.get("x-storefront-subdomain") === "1" ||
    Boolean(hdrs.get("x-storefront-custom-domain"));

  return (
    <html lang={initialLanguage} className={roboto.variable} suppressHydrationWarning>
      <body suppressHydrationWarning>
        <LanguageProvider initialLanguage={initialLanguage}>
          {children}
          <PublicFooter forceHidden={isStorefrontRequest} />
          <CookieBanner />
        </LanguageProvider>
      </body>
    </html>
  );
}