"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function Footer() {
  const pathname = usePathname();
  const year = new Date().getFullYear();

  if (pathname?.startsWith("/storefront")) {
    return null;
  }

  return (
    <footer className="border-t border-white/12 bg-slate-950/35 px-6 py-8 backdrop-blur-sm sm:px-8 lg:px-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 text-sm text-slate-300 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-slate-400">Copyright © {year} Prado Commerce. All rights reserved.</p>

        <nav aria-label="Footer" className="flex flex-wrap items-center gap-4">
          <Link href="/privacy" className="transition hover:text-cyan-100">
            Privacy
          </Link>
          <Link href="/terms" className="transition hover:text-cyan-100">
            Terms
          </Link>
        </nav>
      </div>
    </footer>
  );
}