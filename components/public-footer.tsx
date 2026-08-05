"use client";

import { usePathname } from "next/navigation";
import { Footer } from "@/components/footer";

type PublicFooterProps = {
  forceHidden?: boolean;
};

const PUBLIC_FOOTER_PREFIXES = [
  "/pricing",
  "/login",
  "/signup",
  "/forgot-password",
  "/privacy",
  "/terms",
  "/onboard",
  "/reset",
];

function shouldRenderPublicFooter(pathname: string): boolean {
  if (pathname === "/") {
    return true;
  }

  return PUBLIC_FOOTER_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export function PublicFooter({ forceHidden = false }: PublicFooterProps) {
  if (forceHidden) {
    return null;
  }

  const pathname = usePathname();

  if (!shouldRenderPublicFooter(pathname)) {
    return null;
  }

  return <Footer />;
}
