import type { Metadata } from "next";
import { headers } from "next/headers";
import { Roboto } from "next/font/google";
import "./globals.css";
import { PublicFooter } from "@/components/public-footer";

const roboto = Roboto({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-roboto",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    template: "%s | Prado Commerce",
    default: "Prado Commerce | Streamlined E-commerce & Omnichannel Management",
  },
  description:
    "Prado Commerce gives you one control plane for stores, products, and embeddable cart flows. Ship features faster and more secure checkouts.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const hdrs = await headers();
  const isStorefrontRequest =
    hdrs.get("x-storefront-subdomain") === "1" ||
    Boolean(hdrs.get("x-storefront-custom-domain"));

  return (
    <html lang="en" className={roboto.variable} suppressHydrationWarning>
      <body suppressHydrationWarning>
        {children}
        <PublicFooter forceHidden={isStorefrontRequest} />
      </body>
    </html>
  );
}