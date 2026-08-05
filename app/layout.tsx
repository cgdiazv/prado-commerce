import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";
import { PublicFooter } from "@/components/public-footer";

export const metadata: Metadata = {
  title: {
    template: "%s | Prado Commerce",
    default: "Prado Commerce",
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
    <html lang="en">
      <body>
        {children}
        <PublicFooter forceHidden={isStorefrontRequest} />
      </body>
    </html>
  );
}