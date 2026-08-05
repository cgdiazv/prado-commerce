import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    template: "%s | Prado Commerce",
    default: "Prado Commerce",
  },
  description:
    "Prado Commerce gives you one control plane for stores, products, and embeddable cart flows. Ship features faster and more secure checkouts.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}