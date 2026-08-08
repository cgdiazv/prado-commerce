import type { CSSProperties, ReactNode } from "react";
import type { StorefrontTheme } from "@prisma/client";
import { getStoreBrandingCssVars } from "@/lib/branding";
import { getStorefrontThemeClasses, normalizeStorefrontTheme } from "@/lib/storefront-theme";
import StorefrontFooter from "./storefront-footer";
import StorefrontNavbar, { type StorefrontCategory } from "./storefront-navbar";

type StorefrontShellProps = {
  children: ReactNode;
  store: {
    id: string;
    name: string;
    logoUrl: string | null;
    activeTheme: StorefrontTheme;
    mainColor: string;
  };
  categories: StorefrontCategory[];
  basePath?: string;
};

export default function StorefrontShell({ children, store, categories, basePath = "" }: StorefrontShellProps) {
  const theme = normalizeStorefrontTheme(store.activeTheme);
  const themeClasses = getStorefrontThemeClasses(theme);

  return (
    <div
      style={getStoreBrandingCssVars(store.mainColor) as CSSProperties}
      className={`flex min-h-screen flex-col ${themeClasses.shell}`}
    >
      <StorefrontNavbar
        storeName={store.name}
        logoUrl={store.logoUrl}
        theme={theme}
        basePath={basePath}
        categories={categories}
        mainColor={store.mainColor}
      />
      {children}
      <script dangerouslySetInnerHTML={{ __html: `window.PRADO_STORE_CONFIG={storeId:${JSON.stringify(store.id)}};if(!window.__pradoCart){window.__pradoCart=1;var s=document.createElement('script');s.src='/cart.js';document.head.appendChild(s);}` }} />
      <StorefrontFooter storeName={store.name} />
    </div>
  );
}
