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
    { media: "(prefers-color-scheme: dark)", color: "#020617" },
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
    icon: "/icon-192.png",
    shortcut: "/icon-192.png",
    apple: "/apple-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Prado Commerce",
    startupImage: [
      {
        url: "/splash/apple-splash-portrait.png",
      },
      {
        url: "/splash/apple-splash-1290-2796.png",
        media:
          "(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)",
      },
      {
        url: "/splash/apple-splash-1179-2556.png",
        media:
          "(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)",
      },
      {
        url: "/splash/apple-splash-1170-2532.png",
        media:
          "(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)",
      },
      {
        url: "/splash/apple-splash-1284-2778.png",
        media:
          "(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)",
      },
      {
        url: "/splash/apple-splash-1242-2688.png",
        media:
          "(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)",
      },
      {
        url: "/splash/apple-splash-828-1792.png",
        media:
          "(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)",
      },
      {
        url: "/splash/apple-splash-750-1334.png",
        media:
          "(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)",
      },
      {
        url: "/splash/apple-splash-2048-2732.png",
        media:
          "(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)",
      },
      {
        url: "/splash/apple-splash-1668-2388.png",
        media:
          "(device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)",
      },
    ],
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